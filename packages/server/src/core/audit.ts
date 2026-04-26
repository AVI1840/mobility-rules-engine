// =============================================================================
// Audit Trail Writer — Mobility Rules-as-Code Engine
// Creates immutable AuditTrail objects and appends them to daily JSONL files.
// =============================================================================

import { appendFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import type {
  AuditTrail,
  EvaluationContext,
  EvaluatedRule,
  ReasoningStep,
  RequestSchema,
  ConflictRecord,
  Decision,
  BenefitDetails,
  DiscretionaryFlagRecord,
} from './types.js';

const AUDIT_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../data/audit');

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create an immutable AuditTrail from an EvaluationContext.
 */
export function createAuditTrail(context: EvaluationContext): AuditTrail {
  const evaluatedRules: EvaluatedRule[] = context.evaluated_rules.map((r) => ({ ...r }));
  const reasoningChain: ReasoningStep[] = context.reasoning_chain.map((s) => ({ ...s }));

  return {
    audit_id: uuidv4(),
    request_id: context.request_id,
    claimant_id: context.request.claimant_id,
    processing_timestamp: new Date(context.processing_start).toISOString(),
    evaluated_rules: evaluatedRules,
    conflicts: context.conflicts,
    final_decision: context.final_decision,
    reasoning_chain: reasoningChain,
    evidence_validation: null,
    immutable: true,
  };
}

/**
 * Append an AuditTrail as a single JSON line to the daily audit log file.
 * Ensures the audit directory exists before writing.
 */
export function writeAuditTrail(trail: AuditTrail): void {
  mkdirSync(AUDIT_DIR, { recursive: true });

  const date = new Date(trail.processing_timestamp).toISOString().slice(0, 10);
  const filePath = join(AUDIT_DIR, `audit-${date}.jsonl`);

  appendFileSync(filePath, JSON.stringify(trail) + '\n', { encoding: 'utf8' });
}

/**
 * Assemble an EvaluationContext from all evaluation components.
 */
export function buildEvaluationContext(
  request: RequestSchema,
  request_id: string,
  evaluatedRules: EvaluatedRule[],
  conflicts: ConflictRecord[],
  reasoningChain: ReasoningStep[],
  finalDecision: Decision,
  benefitDetails?: BenefitDetails | null,
  discretionaryFlags?: DiscretionaryFlagRecord[],
): EvaluationContext {
  return {
    request,
    request_id,
    evaluated_rules: evaluatedRules,
    conflicts,
    reasoning_chain: reasoningChain,
    final_decision: finalDecision,
    benefit_details: benefitDetails ?? null,
    discretionary_flags: discretionaryFlags ?? [],
    processing_start: Date.now(),
  };
}
