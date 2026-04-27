import { describe, it, expect } from 'vitest';
import { selectVersion, isVersionEffective, supersede } from '../../src/core/temporal.js';
import type { RuleVersion, RuleDefinition } from '../../src/core/types.js';

const mockRule: RuleDefinition = {
  rule_id: 'r1', rule_name: 'test', source_document_id: 'doc1', source_section: 's1',
  effective_date: '2020-01-01', expiry_date: null, priority: 'circular',
  conditions: { type: 'EXISTS', variable: 'claimant_id' },
  actions: [{ action_type: 'determine_eligibility' }],
  legal_citation: { document_name: 'test', section: '1', paragraph: '1' },
  discretionary_flag: false,
};

function makeVersion(id: string, ruleId: string, start: string, end: string | null, stage: 'production' | 'superseded' = 'production'): RuleVersion {
  return {
    version_id: id, rule_id: ruleId, effective_start_date: start, effective_end_date: end,
    source_amendment: { document_id: 'doc', document_name: 'doc' },
    rule_definition: mockRule, lifecycle_stage: stage, created_by: 'system',
  };
}

describe('selectVersion', () => {
  it('selects version containing claim date', () => {
    const versions = [makeVersion('v1', 'r1', '2020-01-01', '2021-12-31'), makeVersion('v2', 'r1', '2022-01-01', null)];
    const result = selectVersion('r1', new Date('2022-06-01'), versions);
    expect(result.version_id).toBe('v2');
  });

  it('throws when no version matches', () => {
    const versions = [makeVersion('v1', 'r1', '2020-01-01', '2020-12-31')];
    expect(() => selectVersion('r1', new Date('2023-01-01'), versions)).toThrow();
  });

  it('ignores superseded versions', () => {
    const versions = [makeVersion('v1', 'r1', '2020-01-01', null, 'superseded'), makeVersion('v2', 'r1', '2020-01-01', null, 'production')];
    const result = selectVersion('r1', new Date('2022-01-01'), versions);
    expect(result.version_id).toBe('v2');
  });
});

describe('isVersionEffective', () => {
  it('returns true within range', () => {
    const v = makeVersion('v1', 'r1', '2020-01-01', '2021-12-31');
    expect(isVersionEffective(v, new Date('2020-06-01'))).toBe(true);
  });

  it('returns false outside range', () => {
    const v = makeVersion('v1', 'r1', '2020-01-01', '2021-12-31');
    expect(isVersionEffective(v, new Date('2022-06-01'))).toBe(false);
  });

  it('returns true when no end date', () => {
    const v = makeVersion('v1', 'r1', '2020-01-01', null);
    expect(isVersionEffective(v, new Date('2030-01-01'))).toBe(true);
  });
});

describe('supersede', () => {
  it('sets end date on previous version and adds new', () => {
    const versions = [makeVersion('v1', 'r1', '2020-01-01', null)];
    const newV = makeVersion('v2', 'r1', '2022-01-01', null);
    const result = supersede('r1', newV, versions);
    expect(result.length).toBe(2);
    expect(result[0].effective_end_date).toBe('2021-12-31');
    expect(result[1].version_id).toBe('v2');
  });
});
