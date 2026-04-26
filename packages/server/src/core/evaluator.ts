// =============================================================================
// Condition Evaluator — Mobility Rules-as-Code Engine
// Evaluates boolean expression trees against variable bindings.
// Supports: AND, OR, NOT, COMPARISON, EXISTS
// Operators: eq, neq, gt, gte, lt, lte, in, not_in, between
// =============================================================================

import type {
  Condition,
  DecisionTreeNode,
  DecisionOutcome,
  AuditStep,
  EngineError,
  LegalCitation,
} from './types.js';

const MAX_DEPTH = 50;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Evaluate a boolean condition tree against a flat variable map.
 * Returns true/false.
 * Throws EngineError with code EVALUATION_ERROR for unknown condition types or operators.
 */
export function evaluateCondition(
  condition: Condition,
  variables: Record<string, unknown>,
): boolean {
  return _evalCondition(condition, variables);
}

/**
 * Traverse a DecisionTree against variable bindings.
 * Records each step in the auditSteps array.
 * Returns DecisionOutcome from the matching leaf node.
 * Throws EngineError with code TREE_DEPTH_EXCEEDED if depth > 50.
 */
export function traverseDecisionTree(
  tree: DecisionTreeNode,
  variables: Record<string, unknown>,
  auditSteps: AuditStep[],
  depth = 0,
): DecisionOutcome {
  if (depth > MAX_DEPTH) {
    const err: EngineError = {
      code: 'TREE_DEPTH_EXCEEDED',
      message: `Decision tree traversal exceeded max depth of ${MAX_DEPTH}`,
      details: [{ error_type: 'out_of_range', field: 'depth', provided_value: depth, expected: `<= ${MAX_DEPTH}` }],
      timestamp: new Date().toISOString(),
    };
    throw err;
  }

  if (tree.node_type === 'leaf') {
    const outcome = tree.outcome ?? 'not_eligible';
    auditSteps.push({
      step: auditSteps.length + 1,
      node_id: tree.node_id,
      description: `Leaf node reached: outcome = ${outcome}`,
      result: outcome,
      legal_citation: tree.legal_citation,
    });
    return {
      outcome,
      legal_citation: tree.legal_citation,
      discretionary: outcome === 'requires_discretion',
    };
  }

  // Condition node
  if (!tree.condition) {
    auditSteps.push({
      step: auditSteps.length + 1,
      node_id: tree.node_id,
      description: 'Condition node missing condition — defaulting to not_eligible',
      result: 'not_eligible',
    });
    return { outcome: 'not_eligible', discretionary: false };
  }

  const conditionResult = evaluateCondition(tree.condition, variables);
  auditSteps.push({
    step: auditSteps.length + 1,
    node_id: tree.node_id,
    description: `Condition node ${tree.node_id}: ${conditionResult ? 'true → following true_branch' : 'false → following false_branch'}`,
    result: conditionResult ? 'true' : 'false',
    legal_citation: tree.legal_citation,
  });

  if (conditionResult) {
    if (!tree.true_branch) {
      return { outcome: 'eligible', legal_citation: tree.legal_citation, discretionary: false };
    }
    return traverseDecisionTree(tree.true_branch, variables, auditSteps, depth + 1);
  } else {
    if (!tree.false_branch) {
      return { outcome: 'not_eligible', legal_citation: tree.legal_citation, discretionary: false };
    }
    return traverseDecisionTree(tree.false_branch, variables, auditSteps, depth + 1);
  }
}

// ---------------------------------------------------------------------------
// Internal recursive evaluator
// ---------------------------------------------------------------------------

function _evalCondition(condition: Condition, variables: Record<string, unknown>): boolean {
  switch (condition.type) {
    case 'AND': {
      const operands = condition.operands ?? [];
      return operands.every((op) => _evalCondition(op, variables));
    }

    case 'OR': {
      const operands = condition.operands ?? [];
      return operands.some((op) => _evalCondition(op, variables));
    }

    case 'NOT': {
      const operand = condition.operands?.[0];
      if (!operand) return true;
      return !_evalCondition(operand, variables);
    }

    case 'EXISTS': {
      const variable = condition.variable ?? '';
      const value = resolveVariable(variable, variables);
      return value !== undefined && value !== null;
    }

    case 'COMPARISON': {
      const variable = condition.variable ?? '';
      const operator = condition.operator;
      const expected = condition.value;
      const actual = resolveVariable(variable, variables);
      return applyOperator(operator, actual, expected);
    }

    default: {
      const err: EngineError = {
        code: 'EVALUATION_ERROR',
        message: `Unknown condition type: ${(condition as Condition).type}`,
        details: [{ error_type: 'schema_violation', field: 'type', provided_value: (condition as Condition).type, expected: 'AND | OR | NOT | COMPARISON | EXISTS' }],
        timestamp: new Date().toISOString(),
      };
      throw err;
    }
  }
}

// ---------------------------------------------------------------------------
// Operator evaluation
// ---------------------------------------------------------------------------

function applyOperator(operator: string | undefined, actual: unknown, expected: unknown): boolean {
  switch (operator) {
    case 'eq':
      return actual === expected;
    case 'neq':
      return actual !== expected;
    case 'gt':
      return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
    case 'gte':
      return typeof actual === 'number' && typeof expected === 'number' && actual >= expected;
    case 'lt':
      return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
    case 'lte':
      return typeof actual === 'number' && typeof expected === 'number' && actual <= expected;
    case 'in': {
      if (!Array.isArray(expected)) return false;
      return expected.includes(actual);
    }
    case 'not_in': {
      if (!Array.isArray(expected)) return true;
      return !expected.includes(actual);
    }
    case 'between': {
      if (!Array.isArray(expected) || expected.length !== 2) return false;
      const [min, max] = expected as [number, number];
      return typeof actual === 'number' && actual >= min && actual <= max;
    }
    default: {
      const err: EngineError = {
        code: 'EVALUATION_ERROR',
        message: `Unknown operator: ${operator}`,
        details: [{ error_type: 'schema_violation', field: 'operator', provided_value: operator, expected: 'eq | neq | gt | gte | lt | lte | in | not_in | between' }],
        timestamp: new Date().toISOString(),
      };
      throw err;
    }
  }
}

// ---------------------------------------------------------------------------
// Variable resolution
// ---------------------------------------------------------------------------

/**
 * Resolve a variable from a flat variable map.
 * Supports dot-notation for nested paths (e.g. "medical.disability_percentage").
 */
export function resolveVariable(variable: string, variables: Record<string, unknown>): unknown {
  if (variable in variables) return variables[variable];

  // Try dot-notation traversal
  const parts = variable.split('.');
  let current: unknown = variables;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Flatten a RequestSchema-like object into a flat variable map.
 * Merges all nested sections into a single flat map.
 * Also preserves nested paths for dot-notation access.
 */
export function flattenBindings(request: Record<string, unknown>): Record<string, unknown> {
  const flat: Record<string, unknown> = {};

  for (const [section, value] of Object.entries(request)) {
    if (value != null && typeof value === 'object' && !Array.isArray(value)) {
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        flat[key] = val;
        flat[`${section}.${key}`] = val;
      }
      flat[section] = value;
    } else {
      flat[section] = value;
    }
  }

  return flat;
}
