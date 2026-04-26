// =============================================================================
// Certainty Classifier — Mobility Rules-as-Code Engine
// Classifies every decision into one of three certainty classes:
//   A: Deterministic (fully automatable)
//   B: Policy Recommendation (strong legal basis, needs interpretation)
//   C: Professional Discretion Required (clerk/medical/social worker review)
// =============================================================================

import type {
  CertaintyClass,
  CertaintyClassification,
  Decision,
  DiscretionaryFlagRecord,
  ConflictRecord,
  RuleEvaluation,
} from './types.js';

const CLASS_LABELS: Record<CertaintyClass, string> = {
  A_deterministic: 'החלטה דטרמיניסטית - ניתנת לאוטומציה מלאה',
  B_recommendation: 'המלצת מדיניות - בסיס משפטי חזק, נדרש אישור',
  C_discretion_required: 'נדרש שיקול דעת מקצועי - סקירה ידנית',
};

/**
 * Classify the certainty level of a decision based on evaluation results.
 *
 * Classification logic:
 * - CLASS A: No discretionary flags, no unresolved conflicts, clear binary outcome
 * - CLASS B: Has resolved conflicts or mixed rule outcomes, but deterministic resolution exists
 * - CLASS C: Has discretionary flags, unresolved conflicts, or requires human judgment
 */
export function classifyCertainty(
  decision: Decision,
  evaluations: RuleEvaluation[],
  discretionaryFlags: DiscretionaryFlagRecord[],
  conflictsResolved: ConflictRecord[],
  hasUnresolvableConflicts: boolean,
): CertaintyClassification {
  const ambiguities: string[] = [];

  // CLASS C: Professional discretion required
  if (discretionaryFlags.length > 0 || hasUnresolvableConflicts || decision === 'pending_discretion') {
    if (discretionaryFlags.length > 0) {
      for (const flag of discretionaryFlags) {
        ambiguities.push(`${flag.flag_category}: ${flag.reason}`);
      }
    }
    if (hasUnresolvableConflicts) {
      ambiguities.push('קונפליקט בין כללים שלא ניתן לפתרון אוטומטי');
    }

    const reviewer = determineReviewer(discretionaryFlags);

    return {
      certainty_class: 'C_discretion_required',
      certainty_label_he: CLASS_LABELS.C_discretion_required,
      confidence_score: calculateConfidence(evaluations, 'C_discretion_required'),
      reasoning: buildReasoning('C_discretion_required', discretionaryFlags, conflictsResolved, ambiguities),
      required_reviewer: reviewer,
      unresolved_ambiguities: ambiguities,
      legal_support_strength: 'weak',
      automatable: false,
    };
  }

  // CLASS B: Policy recommendation
  if (
    conflictsResolved.length > 0 ||
    decision === 'partial' ||
    decision === 'requires_additional_information' ||
    hasMixedOutcomes(evaluations)
  ) {
    if (conflictsResolved.length > 0) {
      ambiguities.push(`${conflictsResolved.length} קונפליקטים נפתרו לפי היררכיה משפטית`);
    }
    if (decision === 'requires_additional_information') {
      ambiguities.push('חסר מידע להשלמת ההערכה');
    }

    return {
      certainty_class: 'B_recommendation',
      certainty_label_he: CLASS_LABELS.B_recommendation,
      confidence_score: calculateConfidence(evaluations, 'B_recommendation'),
      reasoning: buildReasoning('B_recommendation', discretionaryFlags, conflictsResolved, ambiguities),
      required_reviewer: 'senior_claims_officer',
      unresolved_ambiguities: ambiguities,
      legal_support_strength: 'moderate',
      automatable: false,
    };
  }

  // CLASS A: Deterministic decision
  return {
    certainty_class: 'A_deterministic',
    certainty_label_he: CLASS_LABELS.A_deterministic,
    confidence_score: calculateConfidence(evaluations, 'A_deterministic'),
    reasoning: buildReasoning('A_deterministic', discretionaryFlags, conflictsResolved, ambiguities),
    required_reviewer: null,
    unresolved_ambiguities: [],
    legal_support_strength: 'strong',
    automatable: true,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hasMixedOutcomes(evaluations: RuleEvaluation[]): boolean {
  const outcomes = new Set(evaluations.map(e => e.outcome));
  return outcomes.has('eligible') && outcomes.has('not_eligible') && outcomes.size > 1;
}

function determineReviewer(flags: DiscretionaryFlagRecord[]): string {
  const categories = new Set(flags.map(f => f.flag_category));
  if (categories.has('medical')) return 'medical_authority';
  if (categories.has('legal')) return 'senior_legal_advisor';
  return 'senior_claims_officer';
}

function calculateConfidence(evaluations: RuleEvaluation[], certaintyClass: CertaintyClass): number {
  if (evaluations.length === 0) return 0;

  const eligibleCount = evaluations.filter(e => e.outcome === 'eligible').length;
  const totalCount = evaluations.length;
  const agreementRatio = Math.max(eligibleCount, totalCount - eligibleCount) / totalCount;

  switch (certaintyClass) {
    case 'A_deterministic':
      return Math.min(0.95, 0.7 + agreementRatio * 0.25);
    case 'B_recommendation':
      return Math.min(0.8, 0.5 + agreementRatio * 0.3);
    case 'C_discretion_required':
      return Math.min(0.6, 0.2 + agreementRatio * 0.4);
  }
}

function buildReasoning(
  certaintyClass: CertaintyClass,
  flags: DiscretionaryFlagRecord[],
  conflicts: ConflictRecord[],
  ambiguities: string[],
): string {
  const parts: string[] = [];

  switch (certaintyClass) {
    case 'A_deterministic':
      parts.push('ההחלטה מבוססת על כללים דטרמיניסטיים ברורים.');
      parts.push('כל התנאים נבדקו ללא עמימות.');
      parts.push('ניתנת לאוטומציה מלאה ללא התערבות אנושית.');
      break;
    case 'B_recommendation':
      parts.push('ההחלטה מבוססת על בסיס משפטי חזק אך דורשת אישור.');
      if (conflicts.length > 0) {
        parts.push(`נפתרו ${conflicts.length} קונפליקטים לפי היררכיה משפטית.`);
      }
      parts.push('מומלץ לאישור פקיד בכיר.');
      break;
    case 'C_discretion_required':
      parts.push('ההחלטה דורשת שיקול דעת מקצועי.');
      if (flags.length > 0) {
        parts.push(`זוהו ${flags.length} נקודות הדורשות סקירה ידנית.`);
      }
      if (ambiguities.length > 0) {
        parts.push(`עמימויות שלא נפתרו: ${ambiguities.length}.`);
      }
      break;
  }

  return parts.join(' ');
}
