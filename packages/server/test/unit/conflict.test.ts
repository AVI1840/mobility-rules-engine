import { describe, it, expect } from 'vitest';
import { detectConflicts, resolveConflict } from '../../src/core/conflict.js';
import type { RuleEvaluation, LegalCitation } from '../../src/core/types.js';

const citation: LegalCitation = { document_name: 'test', section: '1', paragraph: '1', clause: null };

function makeEval(id: string, outcome: string, priority: 'judicial_override' | 'statutory' | 'circular' | 'procedural', date: string): RuleEvaluation {
  return {
    rule_id: id, rule_version: 'v1', priority, effective_start_date: date,
    outcome, legal_citation: citation, input_values: {}, evaluation_time_ms: 0,
  };
}

describe('detectConflicts', () => {
  it('returns empty for no evaluations', () => {
    expect(detectConflicts([])).toEqual([]);
  });

  it('returns empty when all agree', () => {
    const evals = [makeEval('a', 'eligible', 'circular', '2020-01-01'), makeEval('b', 'eligible', 'statutory', '2020-01-01')];
    expect(detectConflicts(evals)).toEqual([]);
  });

  it('detects conflict when outcomes differ', () => {
    const evals = [makeEval('a', 'eligible', 'circular', '2020-01-01'), makeEval('b', 'not_eligible', 'statutory', '2020-01-01')];
    const conflicts = detectConflicts(evals);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].conflicting_evaluations.length).toBe(2);
  });
});

describe('resolveConflict', () => {
  it('higher priority wins', () => {
    const evals = [makeEval('a', 'eligible', 'circular', '2020-01-01'), makeEval('b', 'not_eligible', 'statutory', '2020-01-01')];
    const conflict = { conflicting_evaluations: evals };
    const resolution = resolveConflict(conflict);
    expect(resolution.resolvable).toBe(true);
    expect(resolution.winning_rule_id).toBe('b'); // statutory > circular
    expect(resolution.resolution_method).toBe('priority_hierarchy');
  });

  it('lex posterior for equal priority', () => {
    const evals = [makeEval('a', 'eligible', 'circular', '2020-01-01'), makeEval('b', 'not_eligible', 'circular', '2021-01-01')];
    const conflict = { conflicting_evaluations: evals };
    const resolution = resolveConflict(conflict);
    expect(resolution.resolvable).toBe(true);
    expect(resolution.winning_rule_id).toBe('b'); // later date
    expect(resolution.resolution_method).toBe('lex_posterior');
  });

  it('judicial override always wins', () => {
    const evals = [makeEval('a', 'not_eligible', 'statutory', '2020-01-01'), makeEval('b', 'eligible', 'judicial_override', '2019-01-01')];
    const conflict = { conflicting_evaluations: evals };
    const resolution = resolveConflict(conflict);
    expect(resolution.resolvable).toBe(true);
    expect(resolution.winning_rule_id).toBe('b');
  });

  it('contradictory judicial overrides are unresolvable', () => {
    const evals = [makeEval('a', 'eligible', 'judicial_override', '2020-01-01'), makeEval('b', 'not_eligible', 'judicial_override', '2021-01-01')];
    const conflict = { conflicting_evaluations: evals };
    const resolution = resolveConflict(conflict);
    expect(resolution.resolvable).toBe(false);
  });
});
