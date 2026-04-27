// =============================================================================
// Batch Validator — Stage 2 Historical Benchmarking
// Runs batches of anonymized historical cases against the rules engine
// and produces discrepancy analytics, trust metrics, and readiness scores.
// =============================================================================

import type {
  RequestSchema,
  Decision,
  ResponseSchema,
  BacktestReport,
  TestFailure,
} from '../core/types.js';
import { RulesEngine } from '../core/engine.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HistoricalCase {
  case_id: string;
  description: string;
  request: RequestSchema;
  clerk_decision: Decision;
  clerk_notes?: string;
}

export interface BatchResult {
  total_cases: number;
  matches: number;
  mismatches: number;
  accuracy_percentage: number;
  false_approvals: number;
  false_denials: number;
  ambiguity_count: number;
  policy_superiority_count: number;
  cases: CaseResult[];
  trust_score: number;
  readiness_score: number;
}

export interface CaseResult {
  case_id: string;
  description: string;
  clerk_decision: Decision;
  engine_decision: Decision;
  match: boolean;
  certainty_class: string;
  confidence_score: number;
  discrepancy_type?: 'false_approval' | 'false_denial' | 'ambiguity' | 'policy_superiority' | null;
  applied_rules_count: number;
  processing_time_ms: number;
}

// ---------------------------------------------------------------------------
// Batch Validator
// ---------------------------------------------------------------------------

/**
 * Run a batch of historical cases against the engine and produce analytics.
 */
export function runBatchValidation(
  engine: RulesEngine,
  cases: HistoricalCase[],
): BatchResult {
  const results: CaseResult[] = [];
  let matches = 0;
  let falseApprovals = 0;
  let falseDenials = 0;
  let ambiguityCount = 0;
  let policySuperiorityCount = 0;

  for (const historicalCase of cases) {
    const start = Date.now();
    let response: ResponseSchema;

    try {
      response = engine.evaluate(historicalCase.request);
    } catch {
      results.push({
        case_id: historicalCase.case_id,
        description: historicalCase.description,
        clerk_decision: historicalCase.clerk_decision,
        engine_decision: 'not_eligible',
        match: false,
        certainty_class: 'C_discretion_required',
        confidence_score: 0,
        discrepancy_type: null,
        applied_rules_count: 0,
        processing_time_ms: Date.now() - start,
      });
      continue;
    }

    const processingTime = Date.now() - start;
    const engineDecision = response.decision;
    const clerkDecision = historicalCase.clerk_decision;
    const isMatch = engineDecision === clerkDecision;

    let discrepancyType: CaseResult['discrepancy_type'] = null;

    if (!isMatch) {
      if (engineDecision === 'eligible' && clerkDecision === 'not_eligible') {
        falseApprovals++;
        discrepancyType = 'false_approval';
      } else if (engineDecision === 'not_eligible' && clerkDecision === 'eligible') {
        // Engine denied but clerk approved — could be policy superiority by clerk
        // or engine gap
        falseDenials++;
        discrepancyType = 'false_denial';
      } else if (engineDecision === 'pending_discretion' || engineDecision === 'requires_additional_information') {
        ambiguityCount++;
        discrepancyType = 'ambiguity';
      }
    } else if (isMatch && engineDecision === 'eligible' && clerkDecision === 'eligible') {
      // Check if engine found eligibility through rules the clerk might have missed
      // (policy superiority — engine confirms what clerk decided, but with better traceability)
    }

    // Detect policy superiority: engine finds eligibility that clerk denied
    if (engineDecision === 'eligible' && clerkDecision === 'not_eligible') {
      policySuperiorityCount++;
      discrepancyType = 'policy_superiority';
    }

    if (isMatch) matches++;

    const certaintyClass = response.certainty_classification?.certainty_class ?? 'B_recommendation';
    const confidenceScore = response.certainty_classification?.confidence_score ?? 0.5;

    results.push({
      case_id: historicalCase.case_id,
      description: historicalCase.description,
      clerk_decision: clerkDecision,
      engine_decision: engineDecision,
      match: isMatch,
      certainty_class: certaintyClass,
      confidence_score: confidenceScore,
      discrepancy_type: discrepancyType,
      applied_rules_count: response.applied_rules.length,
      processing_time_ms: processingTime,
    });
  }

  const total = cases.length;
  const accuracy = total > 0 ? (matches / total) * 100 : 0;

  // Trust score: weighted combination of accuracy, low false rates, and confidence
  const avgConfidence = results.reduce((sum, r) => sum + r.confidence_score, 0) / Math.max(total, 1);
  const falseRate = total > 0 ? ((falseApprovals + falseDenials) / total) * 100 : 0;
  const trustScore = Math.min(100, accuracy * 0.5 + avgConfidence * 100 * 0.3 + (100 - falseRate) * 0.2);

  // Readiness score: trust + low ambiguity + high coverage
  const ambiguityRate = total > 0 ? (ambiguityCount / total) * 100 : 0;
  const readinessScore = Math.min(100, trustScore * 0.6 + (100 - ambiguityRate) * 0.4);

  return {
    total_cases: total,
    matches,
    mismatches: total - matches,
    accuracy_percentage: Math.round(accuracy * 100) / 100,
    false_approvals: falseApprovals,
    false_denials: falseDenials,
    ambiguity_count: ambiguityCount,
    policy_superiority_count: policySuperiorityCount,
    cases: results,
    trust_score: Math.round(trustScore * 100) / 100,
    readiness_score: Math.round(readinessScore * 100) / 100,
  };
}

/**
 * Convert BatchResult to a BacktestReport for API compatibility.
 */
export function batchResultToBacktestReport(result: BatchResult): BacktestReport {
  return {
    total_cases_run: result.total_cases,
    passed_count: result.matches,
    failed_count: result.mismatches,
    failure_rate_percentage: result.total_cases > 0
      ? Math.round(((result.mismatches / result.total_cases) * 100) * 100) / 100
      : 0,
    failures: result.cases
      .filter(c => !c.match)
      .map(c => ({
        test_case_id: c.case_id,
        expected_decision: c.clerk_decision,
        actual_decision: c.engine_decision,
        differing_rules: [],
        rule_version_causing_divergence: c.discrepancy_type ?? 'unknown',
      })),
  };
}
