import { describe, it, expect } from 'vitest';
import { evaluateCondition } from '../../src/core/evaluator.js';
import type { Condition } from '../../src/core/types.js';

describe('evaluateCondition', () => {
  const vars = {
    disability_percentage: 50,
    institutional_residence_status: true,
    driver_license_holder: false,
    authorized_driver_status: true,
    claim_type: 'vehicle_less_allowance',
    claimant_id: '123456789',
  };

  it('COMPARISON eq true', () => {
    const cond: Condition = { type: 'COMPARISON', variable: 'institutional_residence_status', operator: 'eq', value: true };
    expect(evaluateCondition(cond, vars)).toBe(true);
  });

  it('COMPARISON eq false', () => {
    const cond: Condition = { type: 'COMPARISON', variable: 'driver_license_holder', operator: 'eq', value: true };
    expect(evaluateCondition(cond, vars)).toBe(false);
  });

  it('COMPARISON gte passes', () => {
    const cond: Condition = { type: 'COMPARISON', variable: 'disability_percentage', operator: 'gte', value: 40 };
    expect(evaluateCondition(cond, vars)).toBe(true);
  });

  it('COMPARISON gte fails at boundary', () => {
    const cond: Condition = { type: 'COMPARISON', variable: 'disability_percentage', operator: 'gte', value: 51 };
    expect(evaluateCondition(cond, vars)).toBe(false);
  });

  it('AND with all true', () => {
    const cond: Condition = {
      type: 'AND',
      operands: [
        { type: 'COMPARISON', variable: 'institutional_residence_status', operator: 'eq', value: true },
        { type: 'COMPARISON', variable: 'disability_percentage', operator: 'gte', value: 40 },
      ],
    };
    expect(evaluateCondition(cond, vars)).toBe(true);
  });

  it('AND with one false', () => {
    const cond: Condition = {
      type: 'AND',
      operands: [
        { type: 'COMPARISON', variable: 'driver_license_holder', operator: 'eq', value: true },
        { type: 'COMPARISON', variable: 'disability_percentage', operator: 'gte', value: 40 },
      ],
    };
    expect(evaluateCondition(cond, vars)).toBe(false);
  });

  it('OR with one true', () => {
    const cond: Condition = {
      type: 'OR',
      operands: [
        { type: 'COMPARISON', variable: 'driver_license_holder', operator: 'eq', value: true },
        { type: 'COMPARISON', variable: 'authorized_driver_status', operator: 'eq', value: true },
      ],
    };
    expect(evaluateCondition(cond, vars)).toBe(true);
  });

  it('NOT inverts', () => {
    const cond: Condition = {
      type: 'NOT',
      operands: [{ type: 'COMPARISON', variable: 'driver_license_holder', operator: 'eq', value: true }],
    };
    expect(evaluateCondition(cond, vars)).toBe(true);
  });

  it('EXISTS for present variable', () => {
    const cond: Condition = { type: 'EXISTS', variable: 'claimant_id' };
    expect(evaluateCondition(cond, vars)).toBe(true);
  });

  it('EXISTS for missing variable', () => {
    const cond: Condition = { type: 'EXISTS', variable: 'nonexistent' };
    expect(evaluateCondition(cond, vars)).toBe(false);
  });

  it('in operator', () => {
    const cond: Condition = { type: 'COMPARISON', variable: 'claim_type', operator: 'in', value: ['vehicle_less_allowance', 'mobility_allowance'] };
    expect(evaluateCondition(cond, vars)).toBe(true);
  });

  it('between operator', () => {
    const cond: Condition = { type: 'COMPARISON', variable: 'disability_percentage', operator: 'between', value: [40, 60] };
    expect(evaluateCondition(cond, vars)).toBe(true);
  });

  it('throws on unknown condition type', () => {
    const cond = { type: 'UNKNOWN' } as unknown as Condition;
    expect(() => evaluateCondition(cond, vars)).toThrow();
  });
});
