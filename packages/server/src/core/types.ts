// =============================================================================
// Core Type Definitions — Mobility Rules-as-Code Engine
// Single source of truth for all types in the server package.
// All date fields are ISO 8601 strings for JSON serialization.
// String literal union types used instead of enums for JSON compatibility.
// =============================================================================

// ---------------------------------------------------------------------------
// Enums / String Literal Types
// ---------------------------------------------------------------------------

export type DocumentCategory =
  | 'eligibility_rule'
  | 'procedural_rule'
  | 'legal_override'
  | 'judicial_override'
  | 'appeals_rule'
  | 'administrative_circular'
  | 'loan_agreement'
  | 'opinion_document';

export type ClaimType =
  | 'mobility_allowance'
  | 'vehicle_grant'
  | 'loan'
  | 'vehicle_less_allowance'
  | 'continued_payment';

export type Decision =
  | 'eligible'
  | 'not_eligible'
  | 'partial'
  | 'pending_discretion'
  | 'requires_additional_information';

export type Outcome =
  | 'eligible'
  | 'not_eligible'
  | 'requires_discretion'
  | 'requires_additional_information';

export type RulePriority = 'judicial_override' | 'statutory' | 'circular' | 'procedural';

export type ConditionType = 'AND' | 'OR' | 'NOT' | 'COMPARISON' | 'EXISTS';

export type Operator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'between';

export type ActionType = 'determine_eligibility' | 'calculate_amount' | 'refer_to_review' | 'require_additional_info';

export type VariableCategory =
  | 'demographic' | 'medical' | 'vehicle' | 'geographic'
  | 'legal' | 'procedural' | 'financial' | 'operational';

export type LifecycleStage = 'draft' | 'legal_review' | 'hq_approval' | 'sandbox_testing' | 'production' | 'superseded';

export type FlagCategory = 'legal' | 'medical' | 'procedural';

// ---------------------------------------------------------------------------
// Certainty Classification — Decision Confidence System
// ---------------------------------------------------------------------------

/** CLASS A: Fully deterministic, automatable decision */
/** CLASS B: Policy-supported recommendation with strong legal basis */
/** CLASS C: Requires professional discretion (clerk, social worker, medical authority) */
export type CertaintyClass = 'A_deterministic' | 'B_recommendation' | 'C_discretion_required';

export interface CertaintyClassification {
  certainty_class: CertaintyClass;
  certainty_label_he: string;
  confidence_score: number; // 0.0 to 1.0
  reasoning: string;
  required_reviewer?: string | null;
  unresolved_ambiguities: string[];
  legal_support_strength: 'strong' | 'moderate' | 'weak';
  automatable: boolean;
}

export type AuthorityLevel = 'senior_legal_advisor' | 'legal_advisor' | 'senior_claims_officer' | 'claims_officer';

export type Role = 'system_admin' | 'policy_author' | 'legal_reviewer' | 'hq_approver' | 'claims_officer' | 'auditor' | 'api_consumer';

// ---------------------------------------------------------------------------
// Core Interfaces
// ---------------------------------------------------------------------------

export interface LegalCitation {
  document_name: string;
  section: string;
  paragraph: string;
  clause?: string | null;
}

export interface Condition {
  type: ConditionType;
  operands?: Condition[];
  variable?: string;
  operator?: Operator;
  value?: unknown;
}

export interface RuleAction {
  action_type: ActionType;
  parameters?: Record<string, unknown>;
}

export interface DecisionTreeNode {
  node_id: string;
  node_type: 'condition' | 'leaf';
  condition?: Condition;
  true_branch?: DecisionTreeNode;
  false_branch?: DecisionTreeNode;
  outcome?: Outcome;
  legal_citation?: LegalCitation;
  depth?: number;
}

export interface RuleDefinition {
  rule_id: string;
  rule_name: string;
  source_document_id: string;
  source_section: string;
  effective_date: string;
  expiry_date?: string | null;
  priority: RulePriority;
  conditions: Condition;
  actions: RuleAction[];
  legal_citation: LegalCitation;
  discretionary_flag: boolean;
  discretionary_reason?: string | null;
  decision_tree?: DecisionTreeNode;
}

export interface RuleVersion {
  version_id: string;
  rule_id: string;
  effective_start_date: string;
  effective_end_date?: string | null;
  source_amendment: {
    document_id: string;
    document_name: string;
    circular_number?: string | null;
  };
  rule_definition: RuleDefinition;
  lifecycle_stage: LifecycleStage;
  created_by: string;
  approved_by?: string | null;
  deployment_timestamp?: string | null;
}

// ---------------------------------------------------------------------------
// Request Schema
// ---------------------------------------------------------------------------

export interface RequestSchema {
  claimant_id: string;
  claim_date: string;
  claim_type: ClaimType;
  demographic?: {
    age?: number;
    residency?: string;
    family_status?: 'single' | 'married' | 'divorced' | 'widowed';
  };
  medical?: {
    disability_percentage?: number;
    mobility_limitation_type?: string;
    medical_institute_determination?: string;
  };
  vehicle?: {
    engine_volume?: number;
    vehicle_type?: string;
    vehicle_age?: number;
    qualifying_vehicle?: boolean;
  };
  geographic?: {
    residence_zone?: string;
    distance_to_services?: number;
  };
  procedural?: {
    claim_submission_date?: string;
    appeal_deadline?: string | null;
    required_forms?: string[];
  };
  operational?: {
    institutional_residence_status?: boolean;
    driver_license_holder?: boolean;
    authorized_driver_status?: boolean;
    /** Whether the authorized driver is deceased or hospitalized (for continued_payment claims) */
    authorized_driver_deceased_or_hospitalized?: boolean;
    /** Months since the driver death/hospitalization event */
    months_since_event?: number;
  };
  /** Existing benefit information for duplicate detection (circular 1936) */
  existing_benefits?: {
    has_existing_benefit?: boolean;
    existing_benefit_type?: string;
  };
  /** Appeal-related fields (circular 1984) */
  appeal?: {
    appeal_status?: 'pending' | 'withdrawn' | 'decided';
  };
  /** Judicial precedent applicability flags — set by intake officer */
  precedents?: {
    requires_form_update?: boolean;
    lavi_precedent_applicable?: boolean;
    arueti_precedent_applicable?: boolean;
  };
  evidence?: Array<{
    document_type: string;
    document_date: string;
    source?: string;
  }>;
}

// ---------------------------------------------------------------------------
// Response Schema
// ---------------------------------------------------------------------------

export interface AppliedRule {
  rule_id: string;
  rule_version?: string;
  evaluation_result: string;
  legal_citation: LegalCitation;
}

export interface BenefitDetails {
  type: string;
  amount: number;
  duration?: string;
  conditions?: string[];
}

export interface ConflictRecord {
  conflicting_rule_ids: string[];
  winning_rule_id: string;
  resolution_method: string;
  legal_basis: string;
}

export interface DiscretionaryFlagRecord {
  flag_category: FlagCategory;
  reason: string;
  applicable_rule_id: string;
}

export interface ResponseSchema {
  request_id: string;
  decision: Decision;
  certainty_classification: CertaintyClassification;
  benefit_details?: BenefitDetails | null;
  applied_rules: AppliedRule[];
  explanation_narrative: string;
  processing_timestamp: string;
  data_quality_score?: number | null;
  evidence_validation?: {
    missing_documents: Array<Record<string, unknown>>;
    contradictions: Array<Record<string, unknown>>;
    stale_documents: Array<Record<string, unknown>>;
  } | null;
  conflicts_resolved: ConflictRecord[];
  discretionary_flags: DiscretionaryFlagRecord[];
}

// ---------------------------------------------------------------------------
// Audit Trail
// ---------------------------------------------------------------------------

export interface EvaluatedRule {
  rule_id: string;
  rule_version: string;
  input_values: Record<string, unknown>;
  evaluation_result: string;
  legal_citation: LegalCitation;
  evaluation_order: number;
  evaluation_time_ms: number;
}

export interface ReasoningStep {
  step: number;
  description: string;
  rule_id?: string;
  result: string;
}

export interface AuditTrail {
  audit_id: string;
  request_id: string;
  claimant_id: string;
  processing_timestamp: string;
  evaluated_rules: EvaluatedRule[];
  conflicts: ConflictRecord[];
  final_decision: string;
  reasoning_chain: ReasoningStep[];
  evidence_validation?: {
    items_checked: Array<{
      evidence_type: string;
      status: 'present' | 'missing' | 'stale' | 'contradictory';
      legal_requirement: string;
    }>;
  } | null;
  immutable: true;
}

// ---------------------------------------------------------------------------
// Engine Types
// ---------------------------------------------------------------------------

export interface RuleEvaluation {
  rule_id: string;
  rule_version: string;
  priority: RulePriority;
  effective_start_date: string;
  outcome: string;
  legal_citation: LegalCitation;
  input_values: Record<string, unknown>;
  evaluation_time_ms: number;
}

export interface Conflict {
  conflicting_evaluations: RuleEvaluation[];
}

export interface ConflictResolution {
  resolvable: boolean;
  winning_rule_id?: string;
  losing_rule_ids?: string[];
  resolution_method?: 'priority_hierarchy' | 'lex_posterior' | 'manual_review';
  legal_basis?: string;
  reason?: string;
  conflicting_rule_ids?: string[];
}

export interface DecisionOutcome {
  outcome: Outcome;
  legal_citation?: LegalCitation;
  discretionary: boolean;
}

export interface EvaluationContext {
  request: RequestSchema;
  request_id: string;
  evaluated_rules: EvaluatedRule[];
  conflicts: ConflictRecord[];
  reasoning_chain: ReasoningStep[];
  final_decision: Decision;
  benefit_details?: BenefitDetails | null;
  discretionary_flags: DiscretionaryFlagRecord[];
  processing_start: number;
}

export interface DomainModule {
  domain_id: string;
  domain_name: string;
  rules: RuleDefinition[];
  rule_versions: RuleVersion[];
  variable_catalog?: Record<string, unknown>;
}

export interface RuleMetadata {
  rule_id: string;
  rule_name: string;
  effective_date: string;
  expiry_date?: string | null;
  source_document: string;
  priority: RulePriority;
  lifecycle_stage: LifecycleStage;
}

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'unavailable';
  engine_version: string;
  loaded_domains: string[];
  active_rule_versions: number;
  uptime_seconds: number;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Error Types
// ---------------------------------------------------------------------------

export interface EngineError {
  code: string;
  message: string;
  details: ErrorDetail[];
  timestamp: string;
  request_id?: string;
}

export interface ErrorDetail {
  field?: string;
  error_type: 'missing_required' | 'out_of_range' | 'invalid_type' | 'parse_error' | 'schema_violation';
  provided_value?: unknown;
  expected?: string;
  line?: number;
  character?: number;
}

// ---------------------------------------------------------------------------
// Backtesting Types
// ---------------------------------------------------------------------------

export interface TestCase {
  test_case_id: string;
  description: string;
  request: RequestSchema;
  expected_response: {
    decision: Decision;
    benefit_type?: string;
  };
}

export interface TestSuite {
  suite_id: string;
  suite_name: string;
  test_cases: TestCase[];
}

export interface TestFailure {
  test_case_id: string;
  expected_decision: string;
  actual_decision: string;
  differing_rules: string[];
  rule_version_causing_divergence: string;
}

export interface BacktestReport {
  total_cases_run: number;
  passed_count: number;
  failed_count: number;
  failure_rate_percentage: number;
  failures: TestFailure[];
}

// ---------------------------------------------------------------------------
// Audit Step (used during evaluation)
// ---------------------------------------------------------------------------

export interface AuditStep {
  step: number;
  description: string;
  node_id?: string;
  result: string;
  legal_citation?: LegalCitation;
}
