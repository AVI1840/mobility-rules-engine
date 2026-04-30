export type ClaimType = 'vehicle_less_allowance' | 'mobility_allowance' | 'vehicle_grant' | 'loan' | 'continued_payment';
export type Decision = 'eligible' | 'not_eligible' | 'partial' | 'pending_discretion' | 'requires_additional_information';
export type CertaintyClass = 'A_deterministic' | 'B_recommendation' | 'C_discretion_required';

export interface LegalCitation {
  document_name: string;
  section: string;
  paragraph: string;
  clause?: string | null;
}

export interface AppliedRule {
  rule_id: string;
  rule_version?: string;
  evaluation_result: string;
  legal_citation: LegalCitation;
}

export interface CertaintyClassification {
  certainty_class: CertaintyClass;
  certainty_label_he: string;
  confidence_score: number;
  reasoning: string;
  required_reviewer?: string | null;
  unresolved_ambiguities: string[];
  legal_support_strength: 'strong' | 'moderate' | 'weak';
  automatable: boolean;
}

export interface EvaluationResponse {
  status: 'success' | 'error';
  data?: {
    request_id: string;
    decision: Decision;
    certainty_classification?: CertaintyClassification;
    benefit_details?: { type: string; amount: number; duration?: string } | null;
    applied_rules: AppliedRule[];
    explanation_narrative: string;
    processing_timestamp: string;
    conflicts_resolved: Array<{ conflicting_rule_ids: string[]; winning_rule_id: string; resolution_method: string; legal_basis: string }>;
    discretionary_flags: Array<{ flag_category: string; reason: string; applicable_rule_id: string }>;
  };
  audit_trail_id?: string;
  processing_time_ms?: number;
  error?: { code: string; message: string; details: unknown[] };
}

export interface EvaluationRequest {
  claimant_id: string;
  claim_date: string;
  claim_type: ClaimType;
  medical?: {
    disability_percentage?: number;
    mobility_limitation_type?: string;
    wheelchair_user?: boolean;
    permanently_wheelchair_bound?: boolean;
  };
  operational?: {
    institutional_residence_status?: boolean;
    driver_license_holder?: boolean;
    authorized_driver_status?: boolean;
    is_disabled_under_other_law?: boolean;
    receives_sharm?: boolean;
    receives_yeled_nake?: boolean;
    months_since_last_loan?: number;
    months_hospitalized?: number;
    months_abroad?: number;
    months_imprisoned?: number;
  };
  vehicle?: {
    engine_volume?: number;
    qualifying_vehicle?: boolean;
    has_vehicle?: boolean;
    special_equipment_vehicle?: boolean;
  };
  demographic?: {
    age?: number;
  };
  employment?: {
    is_earner?: boolean;
    work_distance_km_round_trip?: number;
    consecutive_months_employed?: number;
    earned_income_months_of_24?: number;
  };
}
