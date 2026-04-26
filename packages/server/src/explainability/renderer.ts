import type { EvaluationContext, AuditTrail } from '../core/types.js';

// ---------------------------------------------------------------------------
// Translation maps
// ---------------------------------------------------------------------------

const claimTypeMap: Record<string, string> = {
  mobility_allowance: 'קצבת ניידות',
  vehicle_grant: 'מענק רכב',
  loan: 'הלוואה',
  vehicle_less_allowance: 'קצבת חסר רכב',
  continued_payment: 'המשך תשלום',
};

const outcomeMap: Record<string, string> = {
  eligible: 'זכאי',
  not_eligible: 'לא זכאי',
  requires_discretion: 'נדרש שיקול דעת',
  requires_additional_information: 'נדרש מידע נוסף',
};

const decisionMap: Record<string, string> = {
  eligible: 'זכאי',
  not_eligible: 'לא זכאי',
  partial: 'זכאות חלקית',
  pending_discretion: 'ממתין לשיקול דעת',
  requires_additional_information: 'נדרש מידע נוסף',
};

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

/**
 * Generates a Hebrew narrative explanation string from an evaluation context
 * and its associated audit trail.
 */
export function renderExplanation(context: EvaluationContext, auditTrail: AuditTrail): string {
  const lines: string[] = [];

  // Header
  const claimTypeHe = claimTypeMap[context.request.claim_type] ?? context.request.claim_type;
  lines.push(`שאלת הזכאות: ${claimTypeHe}`);
  lines.push(`תאריך תביעה: ${context.request.claim_date}`);
  lines.push('');

  // Evaluated rules section
  lines.push('בדיקת תנאים:');
  for (const rule of auditTrail.evaluated_rules) {
    const outcomeHe = outcomeMap[rule.evaluation_result] ?? rule.evaluation_result;
    const { document_name, section, paragraph } = rule.legal_citation;
    lines.push(
      `  - ${rule.rule_id}: ${outcomeHe} (מקור: ${document_name} סעיף ${section}/${paragraph})`
    );
  }
  lines.push('');

  // Discretionary flags (if any)
  if (context.discretionary_flags.length > 0) {
    lines.push('⚠️ נדרש שיקול דעת אנושי:');
    for (const flag of context.discretionary_flags) {
      lines.push(`  - ${flag.flag_category}: ${flag.reason}`);
    }
    lines.push('');
  }

  // Decision
  const decisionHe = decisionMap[context.final_decision] ?? context.final_decision;
  lines.push(`החלטה: ${decisionHe}`);

  switch (context.final_decision) {
    case 'eligible':
      lines.push('הזכאי/ה זכאי/ת לקבל את ההטבה.');
      break;
    case 'not_eligible':
      lines.push('הזכאי/ה אינו/ה עומד/ת בתנאי הזכאות.');
      break;
    case 'pending_discretion':
      lines.push('התיק מועבר לבדיקה ידנית.');
      break;
    case 'requires_additional_information':
      lines.push('נדרש מידע נוסף להשלמת הבדיקה.');
      break;
  }
  lines.push('');

  // Legal citations — deduplicated by document+section+paragraph+clause
  lines.push('ציטוטים משפטיים:');
  const seen = new Set<string>();
  for (const rule of auditTrail.evaluated_rules) {
    const { document_name, section, paragraph, clause } = rule.legal_citation;
    const key = `${document_name}|${section}|${paragraph}|${clause ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const clausePart = clause ? `, סעיף קטן ${clause}` : '';
    lines.push(`  - ${document_name}, סעיף ${section}, פסקה ${paragraph}${clausePart}`);
  }

  return lines.join('\n');
}
