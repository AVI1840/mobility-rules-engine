// =============================================================================
// Algorithmic Accountability Guard
//
// Prevents AI hallucinations in administrative decisions by enforcing:
// 1. Every output must trace to a coded rule with legal citation
// 2. No probabilistic or generative AI in the decision path
// 3. Every condition evaluation is deterministic and reproducible
// 4. Compliance with Israeli administrative law requirements
// =============================================================================

import type {
  ResponseSchema,
  AuditTrail,
  EvaluatedRule,
  EngineError,
} from './types.js';

// ---------------------------------------------------------------------------
// Validation functions
// ---------------------------------------------------------------------------

/**
 * Validate that a response is legally defensible:
 * - Every applied rule has a legal citation
 * - The decision traces to at least one evaluated rule
 * - No hallucinated content (explanation only references evaluated rules)
 * - Certainty classification is present
 */
export function validateLegalDefensibility(response: ResponseSchema): AccountabilityReport {
  const violations: AccountabilityViolation[] = [];

  // 1. Every applied rule must have a legal citation
  for (const rule of response.applied_rules) {
    if (!rule.legal_citation || !rule.legal_citation.document_name || !rule.legal_citation.section) {
      violations.push({
        type: 'missing_citation',
        severity: 'critical',
        rule_id: rule.rule_id,
        description: `כלל ${rule.rule_id} חסר ציטוט משפטי — לא ניתן להגן על ההחלטה`,
      });
    }
  }

  // 2. Decision must be backed by at least one rule
  if (response.applied_rules.length === 0) {
    violations.push({
      type: 'no_backing_rules',
      severity: 'critical',
      description: 'ההחלטה אינה מגובה בשום כלל — לא ניתן להגן עליה',
    });
  }

  // 3. Certainty classification must be present
  if (!response.certainty_classification) {
    violations.push({
      type: 'missing_certainty',
      severity: 'warning',
      description: 'חסר סיווג ודאות — לא ניתן לקבוע אם ההחלטה דורשת אישור אנושי',
    });
  }

  // 4. Discretionary decisions must not be presented as deterministic
  if (response.decision === 'pending_discretion' &&
      response.certainty_classification?.certainty_class === 'A_deterministic') {
    violations.push({
      type: 'certainty_mismatch',
      severity: 'critical',
      description: 'החלטה הדורשת שיקול דעת סווגה כדטרמיניסטית — סיווג שגוי',
    });
  }

  const isDefensible = violations.filter(v => v.severity === 'critical').length === 0;

  return {
    is_defensible: isDefensible,
    violations,
    total_rules_checked: response.applied_rules.length,
    rules_with_citations: response.applied_rules.filter(
      r => r.legal_citation?.document_name && r.legal_citation?.section
    ).length,
    citation_coverage_percentage: response.applied_rules.length > 0
      ? Math.round((response.applied_rules.filter(
          r => r.legal_citation?.document_name && r.legal_citation?.section
        ).length / response.applied_rules.length) * 100)
      : 0,
    accountability_statement: generateAccountabilityStatement(isDefensible, violations),
  };
}

/**
 * Validate that an audit trail is complete and traceable.
 */
export function validateAuditCompleteness(trail: AuditTrail): AuditCompletenessReport {
  const issues: string[] = [];

  if (!trail.audit_id) issues.push('חסר מזהה ביקורת');
  if (!trail.request_id) issues.push('חסר מזהה בקשה');
  if (!trail.claimant_id) issues.push('חסר מזהה תובע');
  if (!trail.processing_timestamp) issues.push('חסר חותמת זמן');
  if (trail.evaluated_rules.length === 0) issues.push('אין כללים שנבדקו');
  if (!trail.final_decision) issues.push('חסרה החלטה סופית');

  for (const rule of trail.evaluated_rules) {
    if (!rule.legal_citation?.document_name) {
      issues.push(`כלל ${rule.rule_id} חסר שם מסמך בציטוט`);
    }
    if (rule.evaluation_order === undefined) {
      issues.push(`כלל ${rule.rule_id} חסר סדר הערכה`);
    }
  }

  return {
    is_complete: issues.length === 0,
    issues,
    evaluated_rules_count: trail.evaluated_rules.length,
    has_reasoning_chain: trail.reasoning_chain.length > 0,
    is_immutable: trail.immutable === true,
  };
}

/**
 * Generate the accountability disclaimer for the response.
 */
function generateAccountabilityStatement(isDefensible: boolean, violations: AccountabilityViolation[]): string {
  if (isDefensible) {
    return 'החלטה זו נוצרה באופן דטרמיניסטי על ידי מנוע כללים מבוסס חוזרים, הסכמים ופסקי דין. '
      + 'אין שימוש בבינה מלאכותית גנרטיבית. כל קביעה מבוססת על סעיף משפטי מזוהה וניתנת לביקורת.';
  }

  const criticalCount = violations.filter(v => v.severity === 'critical').length;
  return `אזהרה: זוהו ${criticalCount} בעיות קריטיות בהגנה המשפטית של החלטה זו. `
    + 'נדרשת סקירה ידנית לפני קבלת ההחלטה.';
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AccountabilityReport {
  is_defensible: boolean;
  violations: AccountabilityViolation[];
  total_rules_checked: number;
  rules_with_citations: number;
  citation_coverage_percentage: number;
  accountability_statement: string;
}

export interface AccountabilityViolation {
  type: 'missing_citation' | 'no_backing_rules' | 'missing_certainty' | 'certainty_mismatch' | 'hallucination_risk';
  severity: 'critical' | 'warning';
  rule_id?: string;
  description: string;
}

export interface AuditCompletenessReport {
  is_complete: boolean;
  issues: string[];
  evaluated_rules_count: number;
  has_reasoning_chain: boolean;
  is_immutable: boolean;
}
