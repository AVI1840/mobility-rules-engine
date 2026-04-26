// =============================================================================
// Decision Tree Builder — Mobility Rules-as-Code Engine
// Generates DecisionTree from RuleDefinition[] for each eligibility pathway.
// Every leaf node produces a deterministic outcome.
// Validates max depth of 50 nodes.
// =============================================================================

import type { RuleDefinition, DecisionTreeNode, Condition, Outcome, LegalCitation, EngineError } from '../core/types.js';
import { v4 as uuidv4 } from 'uuid';

const MAX_DEPTH = 50;

/**
 * Build a DecisionTree from an array of RuleDefinitions.
 * Returns the root DecisionTreeNode.
 * Throws EngineError if any path exceeds MAX_DEPTH.
 */
export function buildDecisionTree(rules: RuleDefinition[]): DecisionTreeNode {
  if (rules.length === 0) {
    return makeLeaf('node-empty', 'not_eligible', undefined, 0);
  }

  // Chain rules: each rule is evaluated in sequence.
  // If a rule's condition is true → follow its action outcome.
  // If false → try next rule.
  const root = chainRules(rules, 0, 0);
  validateDepth(root, 0);
  return root;
}

/**
 * Build a decision tree for a single rule.
 * Returns a condition node with true/false branches.
 */
export function buildRuleTree(rule: RuleDefinition): DecisionTreeNode {
  const eligibleOutcome = getEligibleOutcome(rule);
  const notEligibleOutcome = getNotEligibleOutcome(rule);

  const node: DecisionTreeNode = {
    node_id: `node-${rule.rule_id}`,
    node_type: 'condition',
    condition: rule.conditions,
    true_branch: makeLeaf(
      `leaf-${rule.rule_id}-true`,
      eligibleOutcome,
      rule.legal_citation,
      1,
    ),
    false_branch: makeLeaf(
      `leaf-${rule.rule_id}-false`,
      notEligibleOutcome,
      rule.legal_citation,
      1,
    ),
    legal_citation: rule.legal_citation,
    depth: 0,
  };

  return node;
}

/**
 * Validate that no path in the tree exceeds MAX_DEPTH.
 * Throws EngineError if depth limit is exceeded.
 */
export function validateDepth(node: DecisionTreeNode, currentDepth: number): void {
  if (currentDepth > MAX_DEPTH) {
    const err: EngineError = {
      code: 'TREE_DEPTH_EXCEEDED',
      message: `Decision tree exceeds maximum depth of ${MAX_DEPTH} at node '${node.node_id}'`,
      details: [
        {
          error_type: 'out_of_range',
          field: 'depth',
          provided_value: currentDepth,
          expected: `<= ${MAX_DEPTH}`,
        },
      ],
      timestamp: new Date().toISOString(),
    };
    throw err;
  }

  if (node.node_type === 'condition') {
    if (node.true_branch) validateDepth(node.true_branch, currentDepth + 1);
    if (node.false_branch) validateDepth(node.false_branch, currentDepth + 1);
  }
}

/**
 * Collect all leaf nodes from a decision tree.
 */
export function collectLeaves(node: DecisionTreeNode): DecisionTreeNode[] {
  if (node.node_type === 'leaf') return [node];
  const leaves: DecisionTreeNode[] = [];
  if (node.true_branch) leaves.push(...collectLeaves(node.true_branch));
  if (node.false_branch) leaves.push(...collectLeaves(node.false_branch));
  return leaves;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function chainRules(rules: RuleDefinition[], index: number, depth: number): DecisionTreeNode {
  const rule = rules[index];

  if (depth > MAX_DEPTH) {
    const err: EngineError = {
      code: 'TREE_DEPTH_EXCEEDED',
      message: `Decision tree exceeds maximum depth of ${MAX_DEPTH}`,
      details: [{ error_type: 'out_of_range', field: 'depth', provided_value: depth, expected: `<= ${MAX_DEPTH}` }],
      timestamp: new Date().toISOString(),
    };
    throw err;
  }

  const eligibleOutcome = getEligibleOutcome(rule);
  const notEligibleOutcome = getNotEligibleOutcome(rule);

  // If this is the last rule, both branches are leaves
  if (index === rules.length - 1) {
    return {
      node_id: `node-${rule.rule_id}-d${depth}`,
      node_type: 'condition',
      condition: rule.conditions,
      true_branch: makeLeaf(`leaf-${rule.rule_id}-true`, eligibleOutcome, rule.legal_citation, depth + 1),
      false_branch: makeLeaf(`leaf-${rule.rule_id}-false`, notEligibleOutcome, rule.legal_citation, depth + 1),
      legal_citation: rule.legal_citation,
      depth,
    };
  }

  // Otherwise, false branch continues to next rule
  return {
    node_id: `node-${rule.rule_id}-d${depth}`,
    node_type: 'condition',
    condition: rule.conditions,
    true_branch: makeLeaf(`leaf-${rule.rule_id}-true`, eligibleOutcome, rule.legal_citation, depth + 1),
    false_branch: chainRules(rules, index + 1, depth + 1),
    legal_citation: rule.legal_citation,
    depth,
  };
}

function makeLeaf(
  nodeId: string,
  outcome: Outcome,
  citation: LegalCitation | undefined,
  depth: number,
): DecisionTreeNode {
  return {
    node_id: nodeId,
    node_type: 'leaf',
    outcome,
    legal_citation: citation,
    depth,
  };
}

function getEligibleOutcome(rule: RuleDefinition): Outcome {
  if (rule.discretionary_flag) return 'requires_discretion';
  // Check actions for explicit outcome
  for (const action of rule.actions) {
    if (action.action_type === 'determine_eligibility') {
      const outcome = (action.parameters as Record<string, string> | undefined)?.outcome;
      if (outcome === 'eligible') return 'eligible';
      if (outcome === 'not_eligible') return 'not_eligible';
      if (outcome === 'requires_discretion') return 'requires_discretion';
    }
    if (action.action_type === 'refer_to_review') return 'requires_discretion';
    if (action.action_type === 'require_additional_info') return 'requires_additional_information';
  }
  return 'eligible';
}

function getNotEligibleOutcome(rule: RuleDefinition): Outcome {
  // Check actions for explicit not-eligible outcome
  for (const action of rule.actions) {
    if (action.action_type === 'determine_eligibility') {
      const notEligibleOutcome = (action.parameters as Record<string, string> | undefined)?.not_eligible_outcome;
      if (notEligibleOutcome) return notEligibleOutcome as Outcome;
    }
  }
  return 'not_eligible';
}

// ---------------------------------------------------------------------------
// Task 4.5 — Required exports
// ---------------------------------------------------------------------------

const VALID_OUTCOMES: Outcome[] = [
  'eligible',
  'not_eligible',
  'requires_discretion',
  'requires_additional_information',
];

/**
 * Creates a leaf node with a deterministic outcome.
 * @param outcome - The eligibility outcome for this leaf.
 * @param legalCitation - The legal citation backing this outcome.
 * @param depth - The depth of this node in the tree.
 */
export function buildLeafNode(
  outcome: Outcome,
  legalCitation: LegalCitation,
  depth: number,
): DecisionTreeNode {
  return {
    node_id: uuidv4(),
    node_type: 'leaf',
    outcome,
    legal_citation: legalCitation,
    depth,
  };
}

/**
 * Creates a condition node with true and false branches.
 * @param condition - The condition to evaluate.
 * @param trueBranch - The branch to follow when the condition is true.
 * @param falseBranch - The branch to follow when the condition is false.
 * @param legalCitation - The legal citation for this decision point.
 * @param depth - The depth of this node in the tree.
 */
export function buildConditionNode(
  condition: Condition,
  trueBranch: DecisionTreeNode,
  falseBranch: DecisionTreeNode,
  legalCitation: LegalCitation,
  depth: number,
): DecisionTreeNode {
  return {
    node_id: uuidv4(),
    node_type: 'condition',
    condition,
    true_branch: trueBranch,
    false_branch: falseBranch,
    legal_citation: legalCitation,
    depth,
  };
}

/**
 * Validates a decision tree for structural correctness.
 * Throws an EngineError with code 'INVALID_DECISION_TREE' if any violation is found:
 * - Every path must terminate at a leaf node
 * - No path may exceed depth 50
 * - Every leaf node must have a valid outcome
 * - Every condition node must have both true_branch and false_branch
 * @param tree - The root node of the decision tree to validate.
 */
export function validateDecisionTree(tree: DecisionTreeNode): void {
  function throwInvalid(message: string): never {
    const err: EngineError = {
      code: 'INVALID_DECISION_TREE',
      message,
      details: [{ error_type: 'schema_violation', field: 'decision_tree', expected: message }],
      timestamp: new Date().toISOString(),
    };
    throw err;
  }

  function walk(node: DecisionTreeNode, depth: number): void {
    if (depth > 50) {
      throwInvalid(`Tree path exceeds maximum depth of 50 at node '${node.node_id}'`);
    }

    if (node.node_type === 'leaf') {
      if (!node.outcome || !VALID_OUTCOMES.includes(node.outcome)) {
        throwInvalid(
          `Leaf node '${node.node_id}' has invalid outcome '${node.outcome}'. ` +
          `Must be one of: ${VALID_OUTCOMES.join(', ')}`,
        );
      }
      return;
    }

    // condition node
    if (!node.true_branch) {
      throwInvalid(`Condition node '${node.node_id}' is missing true_branch`);
    }
    if (!node.false_branch) {
      throwInvalid(`Condition node '${node.node_id}' is missing false_branch`);
    }

    walk(node.true_branch!, depth + 1);
    walk(node.false_branch!, depth + 1);
  }

  walk(tree, tree.depth ?? 0);
}

/**
 * Builds a simple 2-level eligibility decision tree from a RuleDefinition.
 * Root is a condition node at depth 0; leaves are at depth 1.
 * The true branch outcome is 'requires_discretion' when the rule has
 * discretionary_flag set, otherwise 'eligible'. The false branch is always
 * 'not_eligible'. Validates the tree before returning.
 * @param rule - The rule definition to build the tree from.
 */
export function buildSimpleEligibilityTree(rule: RuleDefinition): DecisionTreeNode {
  const trueOutcome: Outcome = rule.discretionary_flag ? 'requires_discretion' : 'eligible';

  const trueBranch = buildLeafNode(trueOutcome, rule.legal_citation, 1);
  const falseBranch = buildLeafNode('not_eligible', rule.legal_citation, 1);
  const root = buildConditionNode(rule.conditions, trueBranch, falseBranch, rule.legal_citation, 0);

  validateDecisionTree(root);
  return root;
}

/**
 * Returns the maximum depth of the tree.
 * A leaf node at the root returns 0.
 * @param tree - The root node of the decision tree.
 */
export function getTreeDepth(tree: DecisionTreeNode): number {
  if (tree.node_type === 'leaf') return 0;
  const trueDepth = tree.true_branch ? getTreeDepth(tree.true_branch) + 1 : 0;
  const falseDepth = tree.false_branch ? getTreeDepth(tree.false_branch) + 1 : 0;
  return Math.max(trueDepth, falseDepth);
}

/**
 * Returns the total number of leaf nodes in the tree.
 * @param tree - The root node of the decision tree.
 */
export function countLeafNodes(tree: DecisionTreeNode): number {
  if (tree.node_type === 'leaf') return 1;
  const trueCount = tree.true_branch ? countLeafNodes(tree.true_branch) : 0;
  const falseCount = tree.false_branch ? countLeafNodes(tree.false_branch) : 0;
  return trueCount + falseCount;
}
