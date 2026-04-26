// =============================================================================
// Rules Engine — Mobility Rules-as-Code Engine
// Main orchestration class: load domains, evaluate requests, return responses.
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
} from './types.js';
import { traverseDecisionTree, evaluateCondition } from './evaluator.js';

// ---------------------------------------------------------------------------
// Variable flattening
// ---------------------------------------------------------------------------

function flattenRequest(request: RequestSchema): Record<string, unknown> {
  return {
    claimant_id: request.claimant_id,
    claim_date: request.claim_date,
    claim_type: request.claim_type,
    // demographic
    age: request.demographic?.age,
    residency: request.demographic?.residency,
    family_status: request.demographic?.family_status,
    // medical
    disability_percentage: request.medical?.disability_percentage,
    mobility_limitation_type: request.medical?.mobility_limitation_type,
    medical_institute_determination: request.medical?.medical_institute_determination,
    // vehicle
    engine_volume: request.vehicle?.engine_volume,
    vehicle_type: request.vehicle?.vehicle_type,
    vehicle_age: request.vehicle?.vehicle_age,
    qualifying_vehicle: request.vehicle?.qualifying_vehicle,
    // geographic
    residence_zone: request.geographic?.residence_zone,
    distance_to_services: request.geographic?.distance_to_services,
    // procedural
    claim_submission_date: request.procedural?.claim_submission_date,
    appeal_deadline: request.procedural?.appeal_deadline,
    // operational
    institutional_residence_status: request.operational?.institutional_residence_status,
    driver_license_holder: request.operational?.driver_license_holder,
    authorized_driver_status: request.operational?.authorized_driver_status,
  };
}

// ---------------------------------------------------------------------------
// Temporal selection helper
// ---------------------------------------------------------------------------

function selectRuleVersion(
  rule: RuleDefinition,
  versions: RuleVersion[],
  claimDate: Date,
): RuleVersion | undefined {
  const claimTime = claimDate.getTime();

  // Find versions for this rule
  const ruleVersions = versions.filter((v) => v.rule_id === rule.rule_id);

  // Filter by effective date range
  const matching = ruleVersions.filter((v) => {
    const start = new Date(v.effective_start_date).getTime();
    const end = v.effective_end_date ? new Date(v.effective_end_date).getTime() : Infinity;
    return claimTime >= start && claimTime <= end;
  });

  if (matching.length === 0) {
    // Fall back: use rule's own effective_date / expiry_date
    const start = new Date(rule.effective_date).getTime();
    const end = rule.expiry_date ? new Date(rule.expiry_date).getTime() : Infinity;
    if (claimTime >= start && claimTime <= end) {
      // Synthesize a version wrapper
      return {
        version_id: `synthetic-${rule.rule_id}`,
        rule_id: rule.rule_id,
        effective_start_date: rule.effective_date,
        effective_end_date: rule.expiry_date ?? null,
        source_amendment: {
          document_id: rule.source_document_id,
          document_name: rule.source_document_id,
          circular_number: null,
        },
        rule_definition: rule,
        lifecycle_stage: 'production',
        created_by: 'system',
        approved_by: null,
        deployment_timestamp: null,
      };
    }
    return undefined;
  }

  // Pick latest start date among matching
  matching.sort(
    (a, b) =>
      new Date(b.effective_start_date).getTime() - new Date(a.effective_start_date).getTime(),
  );
  return matching[0];
}

// ---------------------------------------------------------------------------
// Decision determination
// ---------------------------------------------------------------------------

function determineDecision(evaluations: RuleEvaluation[]): Decision {
  const outcomes = evaluations.map((e) => e.outcome);
  if (outcomes.includes('eligible')) return 'eligible';
  if (outcomes.includes('requires_discretion')) return 'pending_discretion';
  if (outcomes.includes('requires_additional_information')) return 'requires_additional_information';
  return 'not_eligible';
}

// ---------------------------------------------------------------------------
// RulesEngine class
// ---------------------------------------------------------------------------

export class RulesEngine {
  private domains: Map<string, DomainModule> = new Map();
  private startTime: number = Date.now();

  /**
   * Load a domain module into the engine.
   * Validates that the module has domain_id, rules array, and rule_versions array.
   */
  loadDomainModule(module: DomainModule): void {
    if (!module.domain_id) {
      const err = { code: 'INVALID_MODULE', message: 'DomainModule must have a domain_id', details: [], timestamp: new Date().toISOString() };
      throw err;
    }
    if (!Array.isArray(module.rules)) {
      const err = { code: 'INVALID_MODULE', message: 'DomainModule must have a rules array', details: [], timestamp: new Date().toISOString() };
      throw err;
    }
    if (!Array.isArray(module.rule_versions)) {
      const err = { code: 'INVALID_MODULE', message: 'DomainModule must have a rule_versions array', details: [], timestamp: new Date().toISOString() };
      throw err;
    }
    this.domains.set(module.domain_id, module);
  }

  /**
   * Evaluate a request against all loaded domain rules.
   * Returns a full ResponseSchema.
   */
  evaluate(request: RequestSchema): ResponseSchema {
    const request_id = uuidv4();
    const processing_start = Date.now();
    const claimDate = new Date(request.claim_date);
    const variables = flattenRequest(request);

    const evaluations: RuleEvaluation[] = [];
    const appliedRules: AppliedRule[] = [];

    // Collect all rules from all loaded domains
    for (const domain of this.domains.values()) {
      for (const rule of domain.rules) {
        // Temporal selection
        const version = selectRuleVersion(rule, domain.rule_versions, claimDate);
        if (!version) continue; // Rule not effective on claim date

        const effectiveRule = version.rule_definition ?? rule;
        const auditSteps: AuditStep[] = [];
        const evalStart = Date.now();

        let outcome: string = 'not_eligible';

        try {
          if (effectiveRule.decision_tree) {
            const result = traverseDecisionTree(effectiveRule.decision_tree, variables, auditSteps);
            outcome = result.outcome;
          } else {
            // Evaluate top-level conditions directly
            const condResult = evaluateCondition(effectiveRule.conditions, variables);
            if (condResult) {
              outcome = effectiveRule.discretionary_flag ? 'requires_discretion' : 'eligible';
            } else {
              outcome = 'not_eligible';
            }
          }
        } catch {
          outcome = 'not_eligible';
        }

        const evalTime = Date.now() - evalStart;

        evaluations.push({
          rule_id: effectiveRule.rule_id,
          rule_version: version.version_id,
          priority: effectiveRule.priority,
          effective_start_date: version.effective_start_date,
          outcome,
          legal_citation: effectiveRule.legal_citation,
          input_values: variables,
          evaluation_time_ms: evalTime,
        });

        appliedRules.push({
          rule_id: effectiveRule.rule_id,
          rule_version: version.version_id,
          evaluation_result: outcome,
          legal_citation: effectiveRule.legal_citation,
        });
      }
    }

    const decision = determineDecision(evaluations);

    return {
      request_id,
      decision,
      benefit_details: null,
      applied_rules: appliedRules,
      explanation_narrative: 'הסבר יופיע בקרוב',
      processing_timestamp: new Date(processing_start).toISOString(),
      data_quality_score: null,
      evidence_validation: null,
      conflicts_resolved: [],
      discretionary_flags: [],
    };
  }

  /**
   * Returns metadata for all rules in all loaded domains.
   */
  getActiveRules(): RuleMetadata[] {
    const metadata: RuleMetadata[] = [];
    for (const domain of this.domains.values()) {
      for (const rule of domain.rules) {
        // Find the latest version for lifecycle_stage
        const versions = domain.rule_versions.filter((v) => v.rule_id === rule.rule_id);
        const latestVersion = versions.sort(
          (a, b) =>
            new Date(b.effective_start_date).getTime() - new Date(a.effective_start_date).getTime(),
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

  /**
   * Returns engine health status.
   */
  getHealth(): HealthStatus {
    const loadedDomains = Array.from(this.domains.keys());
    let activeRuleVersions = 0;
    for (const domain of this.domains.values()) {
      activeRuleVersions += domain.rule_versions.filter(
        (v) => v.lifecycle_stage !== 'superseded',
      ).length;
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
