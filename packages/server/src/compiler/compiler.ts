// =============================================================================
// Rule Compiler — Mobility Rules-as-Code Engine
// Compiles PolicyInterpretation into RuleDefinition with boolean expression trees.
// Marks discretionary conditions with discretionary_flag: true.
// =============================================================================

import { v4 as uuidv4 } from 'uuid';
import type { RuleDefinition, Condition, RuleAction, LegalCitation, RulePriority } from '../core/types.js';
import type { PolicyInterpretation } from './types.js';

// ---------------------------------------------------------------------------
// compileRule / compileRules — high-level API
// ---------------------------------------------------------------------------

/**
 * Compile a single PolicyInterpretation into a RuleDefinition.
 *
 * All fields can be overridden via the optional `overrides` parameter.
 * When an override is absent, sensible defaults are derived from the interpretation.
 *
 * @param interpretation - The intermediate policy representation to compile.
 * @param overrides      - Optional partial RuleDefinition to override defaults.
 * @returns A complete, valid RuleDefinition.
 */
export function compileRule(
  interpretation: PolicyInterpretation,
  overrides?: Partial<RuleDefinition>,
): RuleDefinition {
  const rule_id = uuidv4();

  const rule_name =
    overrides?.rule_name ?? deriveRuleName(interpretation.source_section);

  const priority: RulePriority =
    (overrides?.priority as RulePriority | undefined) ?? 'circular';

  const conditions: Condition =
    overrides?.conditions ?? buildDefaultCondition();

  const actions: RuleAction[] =
    overrides?.actions ?? buildDefaultActions();

  const legal_citation: LegalCitation =
    overrides?.legal_citation ?? deriveLegalCitation(interpretation.source_section);

  const discretionary_flag: boolean =
    overrides?.discretionary_flag ?? interpretation.requires_review;

  const discretionary_reason: string | null | undefined =
    overrides?.discretionary_reason !== undefined
      ? overrides.discretionary_reason
      : (interpretation.review_notes ?? null);

  const decision_tree = overrides?.decision_tree ?? undefined;

  return {
    rule_id,
    rule_name,
    source_document_id: interpretation.source_document_id,
    source_section: interpretation.source_section,
    effective_date: interpretation.effective_date,
    expiry_date: interpretation.expiry_date ?? null,
    priority,
    conditions,
    actions,
    legal_citation,
    discretionary_flag,
    discretionary_reason: discretionary_reason ?? null,
    decision_tree,
  };
}

/**
 * Compile an array of PolicyInterpretations into RuleDefinitions.
 *
 * Each interpretation is compiled independently. When `overrides` is provided,
 * the override at index `i` is applied to interpretation at index `i`.
 * If the overrides array is shorter than the interpretations array, remaining
 * interpretations are compiled with no overrides.
 *
 * @param interpretations - Array of policy interpretations to compile.
 * @param overrides       - Optional array of partial overrides, one per interpretation.
 * @returns Array of compiled RuleDefinitions in the same order.
 */
export function compileRules(
  interpretations: PolicyInterpretation[],
  overrides?: Partial<RuleDefinition>[],
): RuleDefinition[] {
  return interpretations.map((interp, i) =>
    compileRule(interp, overrides?.[i]),
  );
}

// ---------------------------------------------------------------------------
// Low-level compile helper (used internally and by tests)
// ---------------------------------------------------------------------------

/**
 * Compile a PolicyInterpretation into a RuleDefinition using explicit options.
 * Prefer `compileRule` for most use-cases; use this when you need full control.
 */
export function compile(
  interpretation: PolicyInterpretation,
  options: CompileOptions,
): RuleDefinition {
  const rule: RuleDefinition = {
    rule_id: options.rule_id ?? uuidv4(),
    rule_name: options.rule_name,
    source_document_id: interpretation.source_document_id,
    source_section: interpretation.source_section,
    effective_date: interpretation.effective_date,
    expiry_date: interpretation.expiry_date ?? null,
    priority: options.priority,
    conditions: options.conditions,
    actions: options.actions,
    legal_citation: options.legal_citation,
    discretionary_flag: options.discretionary_flag ?? false,
    discretionary_reason: options.discretionary_reason ?? null,
    decision_tree: options.decision_tree,
  };

  return rule;
}

// ---------------------------------------------------------------------------
// Condition builders
// ---------------------------------------------------------------------------

/** Build a simple COMPARISON condition node. */
export function buildComparison(
  variable: string,
  operator: Condition['operator'],
  value: unknown,
): Condition {
  return { type: 'COMPARISON', variable, operator, value };
}

/** Build an AND condition combining multiple operands. */
export function buildAnd(...operands: Condition[]): Condition {
  return { type: 'AND', operands };
}

/** Build an OR condition combining multiple operands. */
export function buildOr(...operands: Condition[]): Condition {
  return { type: 'OR', operands };
}

/** Build a NOT condition wrapping a single operand. */
export function buildNot(operand: Condition): Condition {
  return { type: 'NOT', operands: [operand] };
}

/** Build an EXISTS condition checking that a variable is present and non-null. */
export function buildExists(variable: string): Condition {
  return { type: 'EXISTS', variable };
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/** Derive a human-readable rule name from a source section string. */
function deriveRuleName(sourceSection: string): string {
  return `Rule — ${sourceSection}`;
}

/** Default condition: claimant_id must exist. */
function buildDefaultCondition(): Condition {
  return buildExists('claimant_id');
}

/** Default action: determine_eligibility with no extra parameters. */
function buildDefaultActions(): RuleAction[] {
  return [{ action_type: 'determine_eligibility' }];
}

/** Derive a minimal LegalCitation from a source section string. */
function deriveLegalCitation(sourceSection: string): LegalCitation {
  return {
    document_name: sourceSection,
    section: sourceSection,
    paragraph: '1',
    clause: null,
  };
}

// ---------------------------------------------------------------------------
// CompileOptions (low-level API)
// ---------------------------------------------------------------------------

export interface CompileOptions {
  rule_id?: string;
  rule_name: string;
  priority: RulePriority;
  conditions: Condition;
  actions: RuleAction[];
  legal_citation: LegalCitation;
  discretionary_flag?: boolean;
  discretionary_reason?: string | null;
  decision_tree?: RuleDefinition['decision_tree'];
}
