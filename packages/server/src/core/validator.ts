import Ajv, { type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { RequestSchema, ResponseSchema, AuditTrail, RuleDefinition, EngineError, ErrorDetail } from './types.js';

// ---------------------------------------------------------------------------
// AJV setup
// ---------------------------------------------------------------------------

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// ---------------------------------------------------------------------------
// Schema loading
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const schemasDir = join(__dirname, '../../schemas');

function loadSchema(filename: string): object {
  // Strip UTF-8 BOM if present (\uFEFF)
  const raw = readFileSync(join(schemasDir, filename), 'utf-8').replace(/^\uFEFF/, '');
  return JSON.parse(raw) as object;
}

const requestSchema = loadSchema('request.schema.json');
const responseSchema = loadSchema('response.schema.json');
const ruleLogicSchema = loadSchema('rule-logic.schema.json');
const auditTrailSchema = loadSchema('audit-trail.schema.json');

const validateRequestFn = ajv.compile(requestSchema);
const validateResponseFn = ajv.compile(responseSchema);
const validateRuleLogicFn = ajv.compile(ruleLogicSchema);
const validateAuditTrailFn = ajv.compile(auditTrailSchema);

// ---------------------------------------------------------------------------
// Error mapping
// ---------------------------------------------------------------------------

const OUT_OF_RANGE_KEYWORDS = new Set([
  'minimum', 'maximum', 'minLength', 'maxLength', 'minItems',
]);

const INVALID_TYPE_KEYWORDS = new Set(['type', 'enum', 'format']);

function mapErrorType(keyword: string): ErrorDetail['error_type'] {
  if (keyword === 'required') return 'missing_required';
  if (OUT_OF_RANGE_KEYWORDS.has(keyword)) return 'out_of_range';
  if (INVALID_TYPE_KEYWORDS.has(keyword)) return 'invalid_type';
  return 'schema_violation';
}

function buildEngineError(errors: ErrorObject[] | null | undefined, data: unknown): EngineError {
  const details: ErrorDetail[] = (errors ?? []).map((err: ErrorObject) => {
    const field = err.instancePath || (err.params && 'missingProperty' in err.params
      ? `/${err.params.missingProperty as string}`
      : '');

    // For 'required' errors the provided_value is the parent object
    let providedValue: unknown = undefined;
    if (err.instancePath && data !== null && typeof data === 'object') {
      const parts = err.instancePath.split('/').filter(Boolean);
      let cursor: unknown = data;
      for (const part of parts) {
        if (cursor !== null && typeof cursor === 'object') {
          cursor = (cursor as Record<string, unknown>)[part];
        } else {
          cursor = undefined;
          break;
        }
      }
      providedValue = cursor;
    }

    return {
      field,
      error_type: mapErrorType(err.keyword),
      provided_value: providedValue,
      expected: err.message ?? undefined,
    };
  });

  return {
    code: 'VALIDATION_ERROR',
    message: 'Schema validation failed',
    details,
    timestamp: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Public validators
// ---------------------------------------------------------------------------

export function validateRequest(request: unknown): RequestSchema {
  if (!validateRequestFn(request)) {
    throw buildEngineError(validateRequestFn.errors, request);
  }
  return request as RequestSchema;
}

export function validateResponse(response: unknown): ResponseSchema {
  if (!validateResponseFn(response)) {
    throw buildEngineError(validateResponseFn.errors, response);
  }
  return response as ResponseSchema;
}

export function validateRuleLogic(rule: unknown): RuleDefinition {
  if (!validateRuleLogicFn(rule)) {
    throw buildEngineError(validateRuleLogicFn.errors, rule);
  }
  return rule as RuleDefinition;
}

export function validateAuditTrail(audit: unknown): AuditTrail {
  if (!validateAuditTrailFn(audit)) {
    throw buildEngineError(validateAuditTrailFn.errors, audit);
  }
  return audit as AuditTrail;
}

export function isValidRequest(request: unknown): request is RequestSchema {
  return validateRequestFn(request) as boolean;
}

export function isValidResponse(response: unknown): response is ResponseSchema {
  return validateResponseFn(response) as boolean;
}
