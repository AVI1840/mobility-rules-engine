// =============================================================================
// Explainability Renderer — Legally Defensible Hebrew Explanations
//
// DESIGN PRINCIPLES:
// 1. Every statement must cite an exact legal source (document, section, paragraph)
// 2. Zero hallucinations — only facts derived from evaluated rules
// 3. No probabilistic language — deterministic statements only
// 4. Plain Hebrew accessible to non-legal audience
// 5. Full algorithmic accountability — every condition traced to source
// =============================================================================

import type {
  EvaluationContext,
  AuditTrail,
  EvaluatedRule,
  CertaintyClass,
} from '../core/types.js';

// ---------------------------------------------------------------------------
// Translation maps
// ---------------------------------------------------------------------------

const claimTypeMap: Record<string, string> = {
  mobility_allowance: 'קצבת ניידות',
  vehicle_grant: 'מענק רכב',
  loan: 'הלוואה מקרן הלוואות ניידות',
  vehicle_less_allowance: 'קצבת חסר רכב',
  continued_payment: 'המשך תשלום קצבה',
};

const outcomeMap: Record<string, string> = {
  eligible: 'עומד בתנאי הזכאות',
  not_eligible: 'אינו עומד בתנאי הזכאות',
  requires_discretion: 'נדרש שיקול דעת מקצועי',
  requires_additional_information: 'נדרש מידע נוסף',
};

const decisionMap: Record<string, string> = {
  eligible: 'זכאי',
  not_eligible: 'לא זכאי',
  partial: 'זכאות חלקית',
  pending_discretion: 'ממתין לשיקול דעת מקצועי',
  requires_additional_information: 'נדרש מידע נוסף',
};

const certaintyLabelMap: Record<string, string> = {
  A_deterministic: 'החלטה דטרמיניסטית — כל התנאים נבדקו ללא עמימות',
  B_recommendation: 'המלצת מדיניות — בסיס משפטי חזק, מומלץ לאישור גורם מוסמך',
  C_discretion_required: 'נדרש שיקול דעת מקצועי — לא ניתן להכריע אוטומטית',
};

const priorityLabelMap: Record<string, string> = {
  judicial_override: 'פסיקה שיפוטית (עדיפות עליונה)',
  statutory: 'הסכם/חקיקה',
  circular: 'חוזר מנהלי',
  procedural: 'נוהל תפעולי',
};

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------

/**
 * Generate a legally defensible Hebrew explanation for an eligibility decision.
 *
 * ALGORITHMIC ACCOUNTABILITY GUARANTEES:
 * - Every statement traces to a specific rule evaluation in the audit trail
 * - No text is generated that is not backed by evaluated rule data
 * - Certainty classification is explicitly stated
 * - Discretionary items are clearly separated from deterministic findings
 * - The explanation is suitable for administrative law review
 */
export function renderExplanation(context: EvaluationContext, auditTrail: AuditTrail): string {
  const lines: string[] = [];

  // ── Header ──
  const claimTypeHe = claimTypeMap[context.request.claim_type] ?? context.request.claim_type;
  lines.push('═══════════════════════════════════════════');
  lines.push(`נימוקי החלטה — ${claimTypeHe}`);
  lines.push('═══════════════════════════════════════════');
  lines.push('');
  lines.push(`מספר בקשה: ${context.request_id}`);
  lines.push(`תאריך תביעה: ${context.request.claim_date}`);
  lines.push(`סוג תביעה: ${claimTypeHe}`);
  lines.push('');

  // ── Algorithmic accountability notice ──
  lines.push('הבהרה: נימוקים אלה נוצרו באופן דטרמיניסטי על ידי מנוע כללים מבוסס');
  lines.push('חוזרים, הסכמים ופסקי דין. אין שימוש בבינה מלאכותית גנרטיבית.');
  lines.push('כל קביעה מבוססת על סעיף משפטי מזוהה.');
  lines.push('');

  // ── Decision ──
  const decisionHe = decisionMap[context.final_decision] ?? context.final_decision;
  lines.push(`החלטה: ${decisionHe}`);
  lines.push('');

  // ── Certainty classification ──
  const certaintyClass = (context as unknown as Record<string, unknown>).certainty_class as CertaintyClass | undefined;
  if (certaintyClass) {
    lines.push(`רמת ודאות: ${certaintyLabelMap[certaintyClass] ?? certaintyClass}`);
    lines.push('');
  }

  // ── Decision narrative ──
  switch (context.final_decision) {
    case 'eligible':
      lines.push('על סמך בדיקת כל התנאים הרלוונטיים, התובע/ת עומד/ת בתנאי הזכאות.');
      break;
    case 'not_eligible':
      lines.push('על סמך בדיקת כל התנאים הרלוונטיים, התובע/ת אינו/ה עומד/ת בתנאי הזכאות.');
      break;
    case 'pending_discretion':
      lines.push('חלק מהתנאים דורשים שיקול דעת מקצועי שלא ניתן להכרעה אוטומטית.');
      lines.push('התיק מועבר לסקירה ידנית על ידי גורם מוסמך.');
      break;
    case 'requires_additional_information':
      lines.push('לא ניתן להשלים את הבדיקה — חסרים נתונים או מסמכים נדרשים.');
      break;
    case 'partial':
      lines.push('התובע/ת עומד/ת בחלק מתנאי הזכאות. נדרשת בדיקה נוספת.');
      break;
  }
  lines.push('');

  // ── Detailed rule-by-rule analysis ──
  lines.push('───────────────────────────────────────────');
  lines.push('פירוט בדיקת כללים');
  lines.push('───────────────────────────────────────────');
  lines.push('');

  // Separate rules by outcome for clarity
  const eligibleRules = auditTrail.evaluated_rules.filter(r => r.evaluation_result === 'eligible');
  const notEligibleRules = auditTrail.evaluated_rules.filter(r => r.evaluation_result === 'not_eligible');
  const discretionRules = auditTrail.evaluated_rules.filter(r =>
    r.evaluation_result === 'requires_discretion' || r.evaluation_result === 'requires_additional_information'
  );

  if (eligibleRules.length > 0) {
    lines.push('✅ כללים שהתקיימו (תנאי זכאות מתמלאים):');
    for (const rule of eligibleRules) {
      lines.push(formatRuleExplanation(rule, 'eligible'));
    }
    lines.push('');
  }

  if (notEligibleRules.length > 0) {
    lines.push('❌ כללים שלא התקיימו:');
    for (const rule of notEligibleRules) {
      lines.push(formatRuleExplanation(rule, 'not_eligible'));
    }
    lines.push('');
  }

  if (discretionRules.length > 0) {
    lines.push('⚠️ כללים הדורשים שיקול דעת מקצועי:');
    for (const rule of discretionRules) {
      lines.push(formatRuleExplanation(rule, 'discretion'));
    }
    lines.push('');
  }

  // ── Discretionary flags ──
  if (context.discretionary_flags.length > 0) {
    lines.push('───────────────────────────────────────────');
    lines.push('נקודות הדורשות שיקול דעת אנושי');
    lines.push('───────────────────────────────────────────');
    lines.push('');
    for (const flag of context.discretionary_flags) {
      const categoryHe = flag.flag_category === 'legal' ? 'משפטי'
        : flag.flag_category === 'medical' ? 'רפואי'
        : 'תפעולי';
      lines.push(`  ⚠️ [${categoryHe}] ${flag.reason}`);
      lines.push(`     כלל מפנה: ${flag.applicable_rule_id}`);
    }
    lines.push('');
    lines.push('הערה: המערכת אינה מחליפה שיקול דעת מקצועי. הסעיפים לעיל');
    lines.push('מסומנים לסקירה ידנית על ידי גורם מוסמך.');
    lines.push('');
  }

  // ── Conflict resolution ──
  if (context.conflicts.length > 0) {
    lines.push('───────────────────────────────────────────');
    lines.push('קונפליקטים בין כללים ופתרונם');
    lines.push('───────────────────────────────────────────');
    lines.push('');
    for (const conflict of context.conflicts) {
      lines.push(`  כללים מתנגשים: ${conflict.conflicting_rule_ids.join(', ')}`);
      lines.push(`  כלל גובר: ${conflict.winning_rule_id}`);
      lines.push(`  שיטת פתרון: ${conflict.resolution_method === 'priority_hierarchy' ? 'היררכיה משפטית' : 'כלל מאוחר גובר (lex posterior)'}`);
      lines.push(`  בסיס משפטי: ${conflict.legal_basis}`);
      lines.push('');
    }
  }

  // ── Full legal citations ──
  lines.push('───────────────────────────────────────────');
  lines.push('ציטוטים משפטיים מלאים');
  lines.push('───────────────────────────────────────────');
  lines.push('');
  lines.push('כל קביעה במסמך זה מבוססת על המקורות המשפטיים הבאים:');
  lines.push('');

  const seen = new Set<string>();
  for (const rule of auditTrail.evaluated_rules) {
    const { document_name, section, paragraph, clause } = rule.legal_citation;
    const key = `${document_name}|${section}|${paragraph}|${clause ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const clausePart = clause ? `, סעיף קטן ${clause}` : '';
    lines.push(`  📄 ${document_name}`);
    lines.push(`     סעיף ${section}, פסקה ${paragraph}${clausePart}`);
    lines.push('');
  }

  // ── Footer ──
  lines.push('═══════════════════════════════════════════');
  lines.push('מסמך זה נוצר אוטומטית על ידי מנוע זכויות ניידות.');
  lines.push('המנוע פועל על בסיס כללים דטרמיניסטיים בלבד — ללא בינה מלאכותית גנרטיבית.');
  lines.push('כל קביעה ניתנת למעקב ולביקורת באמצעות שביל הביקורת המצורף.');
  lines.push('═══════════════════════════════════════════');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRuleExplanation(rule: EvaluatedRule, context: 'eligible' | 'not_eligible' | 'discretion'): string {
  const { document_name, section, paragraph, clause } = rule.legal_citation;
  const clauseRef = clause ? `, סעיף קטן ${clause}` : '';
  const citation = `${document_name}, סעיף ${section}, פסקה ${paragraph}${clauseRef}`;

  const prefix = context === 'eligible' ? '  ✅'
    : context === 'not_eligible' ? '  ❌'
    : '  ⚠️';

  const outcomeHe = outcomeMap[rule.evaluation_result] ?? rule.evaluation_result;

  return `${prefix} ${outcomeHe}\n     מקור משפטי: ${citation}\n     זמן בדיקה: ${rule.evaluation_time_ms}ms`;
}
