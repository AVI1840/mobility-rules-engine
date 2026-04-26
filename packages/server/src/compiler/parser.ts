// =============================================================================
// Rule Parser — Mobility Rules-as-Code Engine
// Parses RuleLogic.json strings into internal RuleDefinition objects.
// Validates against rule-logic.schema.json using Ajv.
// =============================================================================

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { RuleDefinition, EngineError, ErrorDetail } from '../core/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load schema once at module init
const schemaPath = join(__dirname, '../../schemas/rule-logic.schema.json');
const ruleLogicSchema = JSON.parse(readFileSync(schemaPath, 'utf-8').replace(/^\uFEFF/, ''));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateSchema = ajv.compile(ruleLogicSchema);

/**
 * Parse a RuleLogic.json string into an internal RuleDefinition.
 *
 * Returns the parsed RuleDefinition on success.
 * Throws an EngineError on JSON syntax errors or schema validation failures.
 */
export function parseRuleLogic(json: string): RuleDefinition {
  // --- Step 1: JSON syntax parsing ---
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    const syntaxError = err as SyntaxError;
    const { line, character } = extractLineChar(json, syntaxError);
    const detail: ErrorDetail = {
      error_type: 'parse_error',
      expected: 'valid JSON',
      line,
      character,
    };
    // Include the native message for error nature
    if (syntaxError.message) {
      detail.field = syntaxError.message;
    }
    const engineError: EngineError = {
      code: 'PARSE_ERROR',
      message: `JSON syntax error: ${syntaxError.message}`,
      details: [detail],
      timestamp: new Date().toISOString(),
    };
    throw engineError;
  }

  // --- Step 2: Schema validation ---
  const valid = validateSchema(parsed);
  if (!valid && validateSchema.errors) {
    const details: ErrorDetail[] = validateSchema.errors.map((e) => {
      const detail: ErrorDetail = {
        error_type: 'schema_violation',
        field: e.instancePath || e.schemaPath,
        expected: buildExpectedMessage(e),
        provided_value: e.data,
      };
      return detail;
    });

    const engineError: EngineError = {
      code: 'SCHEMA_VALIDATION_ERROR',
      message: `RuleLogic.json schema validation failed with ${details.length} error(s)`,
      details,
      timestamp: new Date().toISOString(),
    };
    throw engineError;
  }

  return parsed as RuleDefinition;
}

/**
 * Parse a RuleLogic.json file from disk.
 */
export function parseRuleLogicFile(filePath: string): RuleDefinition {
  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch (err) {
    const ioError = err as NodeJS.ErrnoException;
    const engineError: EngineError = {
      code: 'FILE_READ_ERROR',
      message: `Failed to read rule file: ${ioError.message}`,
      details: [{ error_type: 'parse_error', field: filePath, expected: 'readable file' }],
      timestamp: new Date().toISOString(),
    };
    throw engineError;
  }
  return parseRuleLogic(content);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Attempt to extract line/character position from a JSON SyntaxError.
 * V8 embeds position info in the message as "at position N" or "line N column N".
 */
function extractLineChar(
  json: string,
  err: SyntaxError,
): { line: number | undefined; character: number | undefined } {
  // Try "line X column Y" format (Node 20+)
  const lineColMatch = err.message.match(/line (\d+) column (\d+)/i);
  if (lineColMatch) {
    return { line: parseInt(lineColMatch[1], 10), character: parseInt(lineColMatch[2], 10) };
  }

  // Try "at position N" format
  const posMatch = err.message.match(/at position (\d+)/i);
  if (posMatch) {
    const pos = parseInt(posMatch[1], 10);
    return positionToLineChar(json, pos);
  }

  return { line: undefined, character: undefined };
}

function positionToLineChar(
  json: string,
  position: number,
): { line: number; character: number } {
  const lines = json.slice(0, position).split('\n');
  return {
    line: lines.length,
    character: (lines[lines.length - 1]?.length ?? 0) + 1,
  };
}

function buildExpectedMessage(error: Ajv['errors'] extends Array<infer E> ? E : never): string {
  switch (error.keyword) {
    case 'required':
      return `required field '${(error.params as { missingProperty: string }).missingProperty}' is missing`;
    case 'type':
      return `expected type '${(error.params as { type: string }).type}'`;
    case 'enum':
      return `expected one of: ${JSON.stringify((error.params as { allowedValues: unknown[] }).allowedValues)}`;
    case 'format':
      return `expected format '${(error.params as { format: string }).format}'`;
    case 'minLength':
      return `minimum length ${(error.params as { limit: number }).limit}`;
    case 'minimum':
      return `minimum value ${(error.params as { limit: number }).limit}`;
    case 'maximum':
      return `maximum value ${(error.params as { limit: number }).limit}`;
    case 'minItems':
      return `minimum ${(error.params as { limit: number }).limit} item(s)`;
    case 'additionalProperties':
      return `no additional property '${(error.params as { additionalProperty: string }).additionalProperty}'`;
    default:
      return error.message ?? error.keyword;
  }
}
