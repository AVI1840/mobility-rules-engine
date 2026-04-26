// =============================================================================
// Conflict Resolver — Mobility Rules-as-Code Engine
// Detects contradictory outcomes and resolves via priority hierarchy.
// Priority: judicial_override > statutory > circular > procedural
// Lex posterior: later effective_start_date wins for equal-priority conflicts.
// =============================================================================

import type {
  RuleEvaluation,
  Conflict,
  ConflictResolution,
  RulePriority,
  ConflictRecord,
} from './types.js';

export const PRIORITY_ORDER: Record<RulePriority, number> = {
  judicial_override: 4,
  statutory: 3,
  circular: 2,
  procedural: 1,
};

// ---------------------------------------------------------------------------
// Standalone functional API (required by spec task 8.1)
// ---------------------------------------------------------------------------

/**
 * Detect contradictory outcomes among a set of rule evaluations.
 * Groups by outcome — if all agree, returns []. Otherwise returns one Conflict
 * containing all conflicting evaluations.
 */
export function detectConflicts(evaluations: RuleEvaluation[]): Conflict[] {
  if (evaluations.length <= 1) return [];

  const outcomeGroups = new Map<string, RuleEvaluation[]>();
  for (const ev of evaluations) {
    const group = outcomeGroups.get(ev.outcome) ?? [];
    group.push(ev);
    outcomeGroups.set(ev.outcome, group);
  }

  if (outcomeGroups.size <= 1) return [];

  return [{ conflicting_evaluations: evaluations }];
}

/**
 * Resolve a single conflict using priority hierarchy and lex posterior.
 * - Sorts by priority desc, then effective_start_date desc.
 * - Multiple judicial_override with different outcomes → unresolvable.
 * - Otherwise → resolvable with winning rule.
 */
export function resolveConflict(conflict: Conflict): ConflictResolution {
  const evaluations = conflict.conflicting_evaluations;

  if (evaluations.length === 0) {
    return { resolvable: false, reason: 'No evaluations to resolve', conflicting_rule_ids: [] };
  }

  // Sort by priority desc, then effective_start_date desc (lex posterior)
  const sorted = [...evaluations].sort((a, b) => {
    const pDiff = (PRIORITY_ORDER[b.priority] ?? 0) - (PRIORITY_ORDER[a.priority] ?? 0);
    if (pDiff !== 0) return pDiff;
    return (
      new Date(b.effective_start_date).getTime() - new Date(a.effective_start_date).getTime()
    );
  });

  const maxPriority = PRIORITY_ORDER[sorted[0].priority] ?? 0;
  const topPriorityEvals = sorted.filter(
    (e) => (PRIORITY_ORDER[e.priority] ?? 0) === maxPriority,
  );

  // Multiple judicial_override with contradictory holdings → unresolvable
  if (maxPriority === PRIORITY_ORDER.judicial_override && topPriorityEvals.length > 1) {
    const uniqueOutcomes = new Set(topPriorityEvals.map((e) => e.outcome));
    if (uniqueOutcomes.size > 1) {
      return {
        resolvable: false,
        conflicting_rule_ids: evaluations.map((e) => e.rule_id),
        reason: 'Multiple judicial overrides with contradictory holdings',
      };
    }
  }

  const winner = sorted[0];
  const losers = sorted.slice(1);

  // Determine resolution method
  const allSamePriority = sorted.every(
    (e) => (PRIORITY_ORDER[e.priority] ?? 0) === maxPriority,
  );
  const resolutionMethod = allSamePriority ? 'lex_posterior' : 'priority_hierarchy';

  const legalBasis =
    resolutionMethod === 'priority_hierarchy'
      ? `${getPriorityName(winner.priority)} takes precedence over lower-priority rules`
      : `Lex posterior: rule effective from ${winner.effective_start_date} supersedes earlier rules of equal priority`;

  return {
    resolvable: true,
    winning_rule_id: winner.rule_id,
    losing_rule_ids: losers.map((e) => e.rule_id),
    resolution_method: resolutionMethod,
    legal_basis: legalBasis,
  };
}

/**
 * Detect all conflicts among evaluations, resolve each one.
 * Returns ConflictRecord[] for the audit trail and a flag for unresolvable conflicts.
 */
export function resolveConflicts(evaluations: RuleEvaluation[]): {
  resolved: ConflictRecord[];
  hasUnresolvable: boolean;
} {
  const conflicts = detectConflicts(evaluations);
  const records: ConflictRecord[] = [];
  let hasUnresolvable = false;

  for (const conflict of conflicts) {
    const resolution = resolveConflict(conflict);
    if (!resolution.resolvable) {
      hasUnresolvable = true;
    } else if (resolution.winning_rule_id) {
      records.push({
        conflicting_rule_ids: conflict.conflicting_evaluations.map((e) => e.rule_id),
        winning_rule_id: resolution.winning_rule_id,
        resolution_method: resolution.resolution_method ?? 'priority_hierarchy',
        legal_basis: resolution.legal_basis ?? '',
      });
    }
  }

  return { resolved: records, hasUnresolvable };
}

// ---------------------------------------------------------------------------
// Legacy aliases (kept for backward compatibility)
// ---------------------------------------------------------------------------

/** @deprecated Use detectConflicts */
export const detect = detectConflicts;

/** @deprecated Use resolveConflict */
export const resolve = resolveConflict;

/**
 * Convert a list of ConflictResolutions to ConflictRecord[] for the response/audit.
 */
export function toConflictRecords(resolutions: ConflictResolution[]): ConflictRecord[] {
  return resolutions
    .filter((r) => r.resolvable && r.winning_rule_id)
    .map((r) => ({
      conflicting_rule_ids: r.conflicting_rule_ids ?? [],
      winning_rule_id: r.winning_rule_id!,
      resolution_method: r.resolution_method ?? 'priority_hierarchy',
      legal_basis: r.legal_basis ?? '',
    }));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPriorityName(priority: RulePriority): string {
  const names: Record<RulePriority, string> = {
    judicial_override: 'Judicial override',
    statutory: 'Statutory rule',
    circular: 'Administrative circular',
    procedural: 'Procedural rule',
  };
  return names[priority] ?? priority;
}
