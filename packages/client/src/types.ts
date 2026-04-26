export type ClaimType = 'vehicle_less_allowance' | 'mobility_allowance' | 'vehicle_grant' | 'loan' | 'continued_payment';
export type Decision = 'eligible' | 'not_eligible' | 'partial' | 'pending_discretion' | 'requires_additional_information';

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

export interface EvaluationResponse {
  status: 'success' | 'error';
  data?: {
    request_id: string;
    decision: Decision;
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
  medical?: { disability_percentage?: number; mobility_limitation_type?: string };
  operational?: { institutional_residence_status?: boolean; driver_license_holder?: boolean; authorized_driver_status?: boolean };
  vehicle?: { engine_volume?: number; qualifying_vehicle?: boolean };
  demographic?: { age?: number };
}
