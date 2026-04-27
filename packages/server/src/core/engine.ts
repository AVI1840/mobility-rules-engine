// =============================================================================
// Rules Engine — Mobility Rules-as-Code Engine
// Deterministic evaluation pipeline with claim_type filtering,
// real conflict resolution, and complete audit trail.
// =============================================================================

import { v4 as uuidv4 } from 'uuid';
import type {
  DomainModule,
  RequestSchema,
  ResponseSchema,
  RuleMetadata,
  HealthStatus,
  RuleDefinition,
  RuleVersion,
  RuleEvaluation,
  AuditStep,
  AppliedRule,
  Decision,
  DiscretionaryFlagRecord,
  ConflictRecord,
  ReasoningStep,
} from './types.js';
import { traverseDecisionTree, evaluateCondition } from './evaluator.js';
import { classifyCertainty } from './certainty.js';
import { detectConflicts, resolveConflict } from './conflict.js';

// ---------------------------------------------------------------------------
// Claim-type to applicable rule mapping
// Rules that check claim_type internally are always evaluated.
// Rules that are general (procedural/governance) apply to all claim types.
// ---------------------------------------------------------------------------

/** Rules that are specific to certain claim types */
const CLAIM_TYPE_RULE_MAP: Record<string, string[]> = {
  vehicle_less_allowance: [
    '00000000-0000-0000-0000-000000000001', // circular 1810
  ],
  mobility_allowance: [
    '00000000-0000-0000-0000-000000000002', // basic mobility
    '00000000-0000-0000-0000-000000000004', // amendment 24
    '00000000-0000-0000-0000-000000000006', // shoshana levy
  ],
  vehicle_grant: [
    '00000000-0000-0000-0000-000000000003', // engine volume 2056
  ],
  loan: [
    '00000000-0000-0000-0000-000000000011', // loan fund
  ],
  continued_payment: [
    '00000000-0000-0000-0000-000000000010', // continued payment 3m
  ],
};

/** Rules that apply universally regardless of claim type */
const UNIVERSAL_RULE_IDS = new Set([
  '00000000-0000-0000-0000-000000000005', // claims process 2132
  '00000000-0000-0000-0000-000000000007', // appeal withdrawal 1984
  '00000000-0000-0000-0000-000000000008', // duplicate benefits 1936
  '00000000-0000-0000-0000-000000000009', // general 1931
  '00000000-0000-0000-0000-000000000012', // ruth hadaya
  '00000000-0000-0000-0000-000000000013', // galit lavi
  '00000000-0000-0000-0000-000000000014', // shaked arueti
]);

function isRuleApplicable(ruleId: string, claimType: string): boolean {
  if (UNIVERSAL_RULE_IDS.has(ruleId)) return true;
  const specific = CLAIM_TYPE_RULE_MAP[claimType];
  if (!specific) return true; // unknown claim type — evaluate all
  return specific.includes(ruleId);
}

// ---------------------------------------------------------------------------
// Variable flattening
// ---------------------------------------------------------------------------

function flattenRequest(request: RequestSchema): Record<string, unknown> {
  return {
    claimant_id: request.claimant_id,
    claim_date: request.claim_date,
    claim_type: request.claim_type,
    age: request.demographic?.age,
    residency: request.demographic?.residency,
    family_status: request.demographic?.family_status,
    disability_percentage: request.medical?.disability_percentage,
    mobility_limitation_type: request.medical?.mobility_limitation_type,
    medical_institute_determination: request.medical?.medical_institute_determination,
    engine_volume: request.vehicle?.engine_volume,
    vehicle_type: request.vehicle?.vehicle_type,
    vehicle_age: request.vehicle?.vehicle_age,
    qualifying_vehicle: request.vehicle?.qualifying_vehicle,
    residence_zone: request.geographic?.residence_zone,
    distance_to_services: request.geographic?.distance_to_services,
    claim_submission_date: request.procedural?.claim_submission_date,
    appeal_deadline: request.procedural?.appeal_deadline,
    institutional_residence_status: request.operational?.institutional_residence_status,
    driver_license_holder: request.operational?.driver_license_holder,
    authorized_driver_status: request.operational?.authorized_driver_status,
    authorized_driver_deceased_or_hospitalized: request.operational?.authorized_driver_deceased_or_hospitalized,
    months_since_event: request.operational?.months_since_event,
    has_existing_benefit: request.existing_benefits?.has_existing_benefit,
    existing_benefit_type: request.existing_benefits?.existing_benefit_type,
    appeal_status: request.appeal?.appeal_status,
    requires_form_update: request.precedents?.requires_form_update,
    lavi_precedent_applicable: request.precedents?.lavi_precedent_applicable,
    arueti_precedent_applicable: request.precedents?.arueti_precedent_applicable,
  };
}

// ---------------------------------------------------------------------------
// Temporal selection
// ---------------------------------------------------------------------------

function selectRuleVersion(
  rule: RuleDefinition,
  versions: RuleVersion[],
  claimDate: Date,
): RuleVersion | undefined {
  const claimTime = claimDate.getTime();
  const ruleVersions = versions.filter((v) => v.rule_id === rule.rule_id);

  const matching = ruleVersions.filter((v) => {
    const start = new Date(v.effective_start_date).getTime();
    const end = v.effective_end_date ? new Date(v.effective_end_date).getTime() : Infinity;
    return claimTime >= start && claimTime <= end;
  });

  if (matching.length === 0) {
    const start = new Date(rule.effective_date).getTime();
    const end = rule.expiry_date ? new Date(rule.expiry_date).getTime() : Infinity;
    if (claimTime >= start && claimTime <= end) {
      return {
        version_id: `synthetic-${rule.rule_id}`,
        rule_id: rule.rule_id,
        effective_start_date: rule.effective_date,
        effective_end_date: rule.expiry_date ?? null,
        source_amendment: { document_id: rule.source_document_id, document_name: rule.source_document_id, circular_number: null },
        rule_definition: rule,
        lifecycle_stage: 'production',
        created_by: 'system',
        approved_by: null,
        deployment_timestamp: null,
      };
    }
    return undefined;
  }

  matching.sort((a, b) => new Date(b.effective_start_date).getTime() - new Date(a.effective_start_date).getTime());
  return matching[0];
}

// ---------------------------------------------------------------------------
// Decision determination — considers only applicable eligibility rules
// ---------------------------------------------------------------------------

function determineDecision(
  evaluations: RuleEvaluation[],
  claimType: string,
): Decision {
  // Only consider rules that are specific to this claim type for the eligibility decision
  const specificRuleIds = CLAIM_TYPE_RULE_MAP[claimType] ?? [];
  const specificEvals = evaluations.filter(e => specificRuleIds.includes(e.rule_id));

  // If we have specific rules, use them for the decision
  if (specificEvals.length > 0) {
    const outcomes = specificEvals.map(e => e.outcome);
    if (outcomes.includes('requires_discretion')) return 'pending_discretion';
    if (outcomes.includes('requires_additional_information')) return 'requires_additional_information';
    if (outcomes.some(o => o === 'eligible')) return 'eligible';
    return 'not_eligible';
  }

  // Fallback: use all evaluations
  const outcomes = evaluations.map(e => e.outcome);
  if (outcomes.includes('requires_discretion')) return 'pending_discretion';
  if (outcomes.includes('requires_additional_information')) return 'requires_additional_information';
  if (outcomes.includes('eligible')) return 'eligible';
  return 'not_eligible';
}

// ---------------------------------------------------------------------------
// RulesEngine class
// ---------------------------------------------------------------------------

export class RulesEngine {
  private domains: Map<string, DomainModule> = new Map();
  private startTime: number = Date.now();

  loadDomainModule(module: DomainModule): void {
    if (!module.domain_id || !Array.isArray(module.rules) || !Array.isArray(module.rule_versions)) {
      throw { code: 'INVALID_MODULE', message: 'DomainModule must have domain_id, rules[], and rule_versions[]', details: [], timestamp: new Date().toISOString() };
    }
    this.domains.set(module.domain_id, module);
  }

  evaluate(request: RequestSchema): ResponseSchema {
    const request_id = uuidv4();
    const processing_start = Date.now();
    const claimDate = new Date(request.claim_date);
    const variables = flattenRequest(request);
    const reasoningChain: ReasoningStep[] = [];

    const evaluations: RuleEvaluation[] = [];
    const appliedRules: AppliedRule[] = [];
    let stepCounter = 0;

    for (const domain of this.domains.values()) {
      for (const rule of domain.rules) {
        // 1. Claim-type applicability filter
        if (!isRuleApplicable(rule.rule_id, request.claim_type)) {
          reasoningChain.push({
            step: ++stepCounter,
            description: `כלל ${rule.rule_name} לא רלוונטי לסוג תביעה ${request.claim_type} — דילוג`,
            rule_id: rule.rule_id,
            result: 'skipped',
          });
          continue;
        }

        // 2. Temporal selection
        const version = selectRuleVersion(rule, domain.rule_versions, claimDate);
        if (!version) {
          reasoningChain.push({
            step: ++stepCounter,
            description: `כלל ${rule.rule_name} לא בתוקף בתאריך ${request.claim_date} — דילוג`,
            rule_id: rule.rule_id,
            result: 'not_effective',
          });
          continue;
        }

        const effectiveRule = version.rule_definition ?? rule;
        const auditSteps: AuditStep[] = [];
        const evalStart = performance.now();
        let outcome: string = 'not_eligible';

        try {
          if (effectiveRule.decision_tree) {
            const result = traverseDecisionTree(effectiveRule.decision_tree, variables, auditSteps);
            outcome = result.outcome;
          } else {
            const condResult = evaluateCondition(effectiveRule.conditions, variables);
            outcome = condResult
              ? (effectiveRule.discretionary_flag ? 'requires_discretion' : 'eligible')
              : 'not_eligible';
          }
        } catch (err) {
          outcome = 'not_eligible';
          reasoningChain.push({
            step: ++stepCounter,
            description: `שגיאה בהערכת כלל ${rule.rule_name}: ${err instanceof Error ? err.message : 'unknown'}`,
            rule_id: rule.rule_id,
            result: 'error',
          });
        }

        const evalTimeMs = Math.round((performance.now() - evalStart) * 100) / 100;

        // Collect only the variables actually used by this rule's conditions
        const relevantInputs = extractRelevantInputs(effectiveRule.conditions, variables);

        evaluations.push({
          rule_id: effectiveRule.rule_id,
          rule_version: version.version_id,
          priority: effectiveRule.priority,
          effective_start_date: version.effective_start_date,
          outcome,
          legal_citation: effectiveRule.legal_citation,
          input_values: relevantInputs,
          evaluation_time_ms: evalTimeMs,
        });

        appliedRules.push({
          rule_id: effectiveRule.rule_id,
          rule_version: version.version_id,
          evaluation_result: outcome,
          legal_citation: effectiveRule.legal_citation,
        });

        reasoningChain.push({
          step: ++stepCounter,
          description: `כלל ${effectiveRule.rule_name}: ${outcome === 'eligible' ? 'עומד בתנאים' : outcome === 'not_eligible' ? 'לא עומד בתנאים' : outcome === 'requires_discretion' ? 'דורש שיקול דעת' : outcome}`,
          rule_id: effectiveRule.rule_id,
          result: outcome,
        });
      }
    }

    // 3. Conflict detection and resolution
    const conflicts = detectConflicts(evaluations);
    const conflictRecords: ConflictRecord[] = [];
    let hasUnresolvable = false;

    for (const conflict of conflicts) {
      const resolution = resolveConflict(conflict);
      if (!resolution.resolvable) {
        hasUnresolvable = true;
        reasoningChain.push({
          step: ++stepCounter,
          description: `קונפליקט בלתי פתיר: ${resolution.reason ?? 'unknown'}`,
          result: 'unresolvable_conflict',
        });
      } else if (resolution.winning_rule_id) {
        conflictRecords.push({
          conflicting_rule_ids: conflict.conflicting_evaluations.map(e => e.rule_id),
          winning_rule_id: resolution.winning_rule_id,
          resolution_method: resolution.resolution_method ?? 'priority_hierarchy',
          legal_basis: resolution.legal_basis ?? '',
        });
        reasoningChain.push({
          step: ++stepCounter,
          description: `קונפליקט נפתר: כלל ${resolution.winning_rule_id} גובר (${resolution.resolution_method})`,
          result: 'conflict_resolved',
        });
      }
    }

    // 4. Decision
    const decision = determineDecision(evaluations, request.claim_type);

    // 5. Discretionary flags
    const discretionaryFlags: DiscretionaryFlagRecord[] = evaluations
      .filter(e => e.outcome === 'requires_discretion')
      .map(e => ({
        flag_category: 'legal' as const,
        reason: `כלל ${e.rule_id} דורש שיקול דעת מקצועי`,
        applicable_rule_id: e.rule_id,
      }));

    // 6. Certainty classification
    const certaintyClassification = classifyCertainty(
      decision, evaluations, discretionaryFlags, conflictRecords, hasUnresolvable,
    );

    reasoningChain.push({
      step: ++stepCounter,
      description: `החלטה סופית: ${decision} | ודאות: ${certaintyClassification.certainty_class} | ${evaluations.length} כללים נבדקו`,
      result: decision,
    });

    const processing_time_ms = Date.now() - processing_start;

    return {
      request_id,
      decision,
      certainty_classification: certaintyClassification,
      benefit_details: null,
      applied_rules: appliedRules,
      explanation_narrative: '', // filled by handler after audit trail creation
      processing_timestamp: new Date(processing_start).toISOString(),
      data_quality_score: null,
      evidence_validation: null,
      conflicts_resolved: conflictRecords,
      discretionary_flags: discretionaryFlags,
    };
  }

  getActiveRules(): RuleMetadata[] {
    const metadata: RuleMetadata[] = [];
    for (const domain of this.domains.values()) {
      for (const rule of domain.rules) {
        const versions = domain.rule_versions.filter((v) => v.rule_id === rule.rule_id);
        const latestVersion = versions.sort(
          (a, b) => new Date(b.effective_start_date).getTime() - new Date(a.effective_start_date).getTime(),
        )[0];
        metadata.push({
          rule_id: rule.rule_id,
          rule_name: rule.rule_name,
          effective_date: rule.effective_date,
          expiry_date: rule.expiry_date ?? null,
          source_document: rule.source_document_id,
          priority: rule.priority,
          lifecycle_stage: latestVersion?.lifecycle_stage ?? 'production',
        });
      }
    }
    return metadata;
  }

  getHealth(): HealthStatus {
    const loadedDomains = Array.from(this.domains.keys());
    let activeRuleVersions = 0;
    for (const domain of this.domains.values()) {
      activeRuleVersions += domain.rule_versions.filter(v => v.lifecycle_stage !== 'superseded').length;
    }
    return {
      status: 'ok',
      engine_version: '1.0.0',
      loaded_domains: loadedDomains,
      active_rule_versions: activeRuleVersions,
      uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// Extract only the variables that a condition tree actually references
// ---------------------------------------------------------------------------

function extractRelevantInputs(
  condition: { type: string; variable?: string; operands?: unknown[] },
  variables: Record<string, unknown>,
): Record<string, unknown> {
  const names = new Set<string>();
  collectVariableNames(condition, names);
  const result: Record<string, unknown> = {};
  for (const name of names) {
    if (name in variables && variables[name] !== undefined) {
      result[name] = variables[name];
    }
  }
  return result;
}

function collectVariableNames(
  node: { type: string; variable?: string; operands?: unknown[] },
  names: Set<string>,
): void {
  if (node.variable) names.add(node.variable);
  if (Array.isArray(node.operands)) {
    for (const op of node.operands) {
      collectVariableNames(op as { type: string; variable?: string; operands?: unknown[] }, names);
    }
  }
}
