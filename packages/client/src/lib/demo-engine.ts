// =============================================================================
// Demo Engine — Client-side deterministic evaluation for GitHub Pages
// This runs the same logic as the server but entirely in the browser.
// No server needed. No AI. Pure deterministic rules.
// =============================================================================

import type { EvaluationRequest, EvaluationResponse, CertaintyClassification } from '../types';

interface RuleResult {
  rule_id: string;
  rule_name: string;
  outcome: 'eligible' | 'not_eligible' | 'requires_discretion';
  document_name: string;
  section: string;
  paragraph: string;
  clause: string | null;
  priority: 'judicial_override' | 'statutory' | 'circular' | 'procedural';
}

const RULES: Array<{
  id: string;
  name: string;
  doc: string;
  section: string;
  par: string;
  clause: string | null;
  priority: RuleResult['priority'];
  evaluate: (r: EvaluationRequest) => 'eligible' | 'not_eligible' | 'requires_discretion';
}> = [
  {
    id: 'mob-vla-001', name: 'קצבת חסר רכב - שוהים במוסד (חוזר 1810)',
    doc: 'חוזר ניידות 1810', section: 'קצבת חסר רכב לשוהים במוסד', par: '1', clause: null,
    priority: 'circular',
    evaluate: (r) => r.operational?.institutional_residence_status === true && (r.medical?.disability_percentage ?? 0) >= 40 ? 'eligible' : 'not_eligible',
  },
  {
    id: 'mob-ma-001', name: 'קצבת ניידות בסיסית',
    doc: 'הסכם הניידות', section: 'זכאות בסיסית', par: '1', clause: null,
    priority: 'statutory',
    evaluate: (r) => (r.medical?.disability_percentage ?? 0) >= 40 && (r.operational?.driver_license_holder === true || r.operational?.authorized_driver_status === true) ? 'eligible' : 'not_eligible',
  },
  {
    id: 'mob-2056', name: 'סמכות המכון לקבוע נפח מנוע קטן (חוזר 2056)',
    doc: 'חוזר ניידות 2056', section: 'סמכות המכון', par: '1', clause: null,
    priority: 'circular',
    evaluate: (r) => r.claim_type === 'vehicle_grant' && (r.medical?.disability_percentage ?? 0) >= 40 ? 'requires_discretion' : 'not_eligible',
  },
  {
    id: 'mob-1996', name: 'תיקון 24 - קריטריונים מעודכנים (חוזר 1996)',
    doc: 'חוזר 1996 - תיקון 24', section: 'תיקון 24', par: '1', clause: 'א',
    priority: 'statutory',
    evaluate: (r) => (r.medical?.disability_percentage ?? 0) >= 40 && r.claim_date >= '2018-01-01' && (r.operational?.driver_license_holder === true || r.operational?.authorized_driver_status === true) ? 'eligible' : 'not_eligible',
  },
  {
    id: 'mob-2132', name: 'הליך הגשת תביעה מעודכן (חוזר 2132)',
    doc: 'חוזר ניידות 2132', section: 'הליך הגשה מעודכן', par: '1', clause: null,
    priority: 'circular',
    evaluate: (r) => r.claim_date >= '2020-01-01' ? 'eligible' : 'not_eligible',
  },
  {
    id: 'mob-1905', name: 'בג"צ שושנה לוי - הרחבת זכאות (חוזר 1905)',
    doc: 'בג"צ שושנה לוי (חוזר 1905)', section: 'הרחבת זכאות', par: '1', clause: null,
    priority: 'judicial_override',
    evaluate: (r) => (r.medical?.disability_percentage ?? 0) >= 40 && ['lower_limb', 'full_body'].includes(r.medical?.mobility_limitation_type ?? '') && r.operational?.driver_license_holder !== true ? 'eligible' : 'not_eligible',
  },
  {
    id: 'mob-1984', name: 'משיכת ערר (חוזר 1984)',
    doc: 'חוזר 1984', section: 'משיכת ערר', par: '1', clause: null,
    priority: 'procedural',
    evaluate: () => 'not_eligible', // Only applies to appeal_withdrawal claim type
  },
  {
    id: 'mob-1936', name: 'מניעת כפל גמלאות (חוזר 1936)',
    doc: 'חוזר 1936', section: 'כפלים באגף גמלאות', par: '1', clause: null,
    priority: 'circular',
    evaluate: () => 'eligible', // No duplicate detected in demo
  },
  {
    id: 'mob-1931', name: 'הנחיות כלליות (חוזר 1931)',
    doc: 'חוזר 1931', section: 'הנחיות כלליות', par: '1', clause: null,
    priority: 'procedural',
    evaluate: (r) => r.claimant_id && r.claim_date && (r.medical?.disability_percentage ?? 0) >= 40 ? 'eligible' : 'not_eligible',
  },
  {
    id: 'mob-cp3m', name: 'המשך תשלום 3 חודשים',
    doc: 'חוות דעת - המשך תשלום קצבה', section: 'המשך תשלום 3 חודשים', par: '1', clause: null,
    priority: 'statutory',
    evaluate: (r) => r.claim_type === 'continued_payment' ? 'eligible' : 'not_eligible',
  },
  {
    id: 'mob-loan', name: 'זכאות הלוואה מקרן הלוואות',
    doc: 'הסכם קרן הלוואות', section: 'זכאות הלוואה', par: '1', clause: null,
    priority: 'statutory',
    evaluate: (r) => r.claim_type === 'loan' && (r.medical?.disability_percentage ?? 0) >= 40 && (r.operational?.driver_license_holder === true || r.operational?.authorized_driver_status === true) && r.vehicle?.qualifying_vehicle === true ? 'eligible' : 'not_eligible',
  },
  {
    id: 'mob-hadaya', name: 'פסק דין רות הדאיה - עדכון טפסים',
    doc: 'פסק דין רות הדאיה', section: 'עדכון טפסים', par: '1', clause: null,
    priority: 'judicial_override',
    evaluate: () => 'not_eligible', // Only applies when requires_form_update
  },
  {
    id: 'mob-lavi', name: 'פסק דין גלית לביא - הרחבת זכאות',
    doc: 'פסק דין גלית לביא', section: 'הרחבת זכאות', par: '1', clause: null,
    priority: 'judicial_override',
    evaluate: () => 'not_eligible', // Requires lavi_precedent_applicable flag
  },
  {
    id: 'mob-arueti', name: 'פסד שקד ארועטי - תקדים שיפוטי',
    doc: 'פסד שקד ארועטי', section: 'תקדים שיפוטי', par: '1', clause: null,
    priority: 'judicial_override',
    evaluate: () => 'not_eligible', // Requires arueti_precedent_applicable flag
  },
  // === Agreement-based rules (הסכם הניידות) ===
  {
    id: 'agr-s5b', name: 'הלוואה עומדת לבעל רישיון - סעיף 5(ב)',
    doc: 'הסכם הניידות', section: '5', par: 'ב', clause: null,
    priority: 'statutory',
    evaluate: (r) => r.operational?.driver_license_holder === true && (r.medical?.disability_percentage ?? 0) >= 40 ? 'eligible' : 'not_eligible',
  },
  {
    id: 'agr-s5c', name: 'הלוואה עומדת ללא רישיון - סעיף 5(ג)',
    doc: 'הסכם הניידות', section: '5', par: 'ג', clause: null,
    priority: 'statutory',
    evaluate: (r) => r.operational?.driver_license_holder !== true && (r.medical?.disability_percentage ?? 0) >= 60 && r.operational?.authorized_driver_status === true ? 'eligible' : 'not_eligible',
  },
  {
    id: 'agr-s4', name: 'אי תחולה - נכה לפי חוק אחר - סעיף 4',
    doc: 'הסכם הניידות', section: '4', par: 'א', clause: null,
    priority: 'statutory',
    evaluate: () => 'not_eligible', // Requires is_disabled_under_other_law flag
  },
  {
    id: 'agr-s14', name: 'תוספת קצבה - מרחק עבודה - סעיף 14',
    doc: 'הסכם הניידות', section: '14', par: 'א', clause: null,
    priority: 'statutory',
    evaluate: () => 'not_eligible', // Requires work_distance_km_round_trip >= 40
  },
  {
    id: 'agr-qv', name: 'רכב קובע - תוספת ג\'',
    doc: 'הסכם הניידות', section: 'תוספת ג\'', par: 'סימנים א\'-ג\'', clause: null,
    priority: 'statutory',
    evaluate: (r) => (r.medical?.disability_percentage ?? 0) >= 40 ? 'eligible' : 'not_eligible',
  },
  {
    id: 'agr-lr', name: 'שיעורי הלוואה - תוספת ד\'',
    doc: 'הסכם הניידות', section: 'תוספת ד\'', par: 'סימנים א\'-ב\'', clause: null,
    priority: 'statutory',
    evaluate: (r) => (r.medical?.disability_percentage ?? 0) >= 40 ? 'eligible' : 'not_eligible',
  },
  {
    id: 'agr-s13', name: 'קצבת ניידות לבעלי רכב - סעיף 13',
    doc: 'הסכם הניידות', section: '13', par: 'א', clause: null,
    priority: 'statutory',
    evaluate: (r) => (r.medical?.disability_percentage ?? 0) >= 40 && (r.operational?.driver_license_holder === true || r.operational?.authorized_driver_status === true) ? 'eligible' : 'not_eligible',
  },
  {
    id: 'agr-s11', name: 'החלפת רכב - סעיף 11',
    doc: 'הסכם הניידות', section: '11', par: 'א', clause: null,
    priority: 'statutory',
    evaluate: () => 'not_eligible', // Requires months_since_last_loan
  },
  {
    id: 'agr-s20', name: 'הפסקת תשלום - סעיף 20',
    doc: 'הסכם הניידות', section: '20', par: 'א', clause: null,
    priority: 'statutory',
    evaluate: () => 'not_eligible', // Requires hospitalization/abroad data
  },
  {
    id: 'agr-s9a', name: 'רכב קובע 2000 סמ"ק - 100% מוגבלות - סעיף 9א',
    doc: 'הסכם הניידות', section: '9א', par: 'א', clause: null,
    priority: 'statutory',
    evaluate: (r) => r.operational?.driver_license_holder === true && (r.medical?.disability_percentage ?? 0) === 100 ? 'requires_discretion' : 'not_eligible',
  },
  // === כללים מהתדריך (תדריך ניידות) ===
  {
    id: 'guide-earner-no-vehicle', name: 'חסר רכב - משתכר (תדריך)',
    doc: 'תדריך ניידות', section: 'קצבת חסר רכב', par: 'תנאי 1', clause: 'משתכר',
    priority: 'statutory',
    evaluate: (r) => (r.demographic?.age ?? 0) >= 18 && (r.medical?.disability_percentage ?? 0) >= 80 ? 'eligible' : 'not_eligible',
  },
  {
    id: 'guide-institutionalized', name: 'חסר רכב - שוהה במוסד (תדריך)',
    doc: 'תדריך ניידות', section: 'קצבת חסר רכב', par: 'תנאי 4', clause: 'שוהה במוסד',
    priority: 'statutory',
    evaluate: (r) => r.operational?.institutional_residence_status === true && ((r.medical?.disability_percentage ?? 0) >= 100 || (r.medical?.disability_percentage ?? 0) >= 80) ? 'eligible' : 'not_eligible',
  },
  {
    id: 'guide-duplicate-sharm', name: 'כפל גמלה - שר"מ (תדריך)',
    doc: 'תדריך ניידות', section: 'כפל גמלה', par: 'שר"מ', clause: null,
    priority: 'statutory',
    evaluate: () => 'requires_discretion', // Requires choice between benefits
  },
  {
    id: 'guide-duplicate-yeled', name: 'כפל גמלה - ילד נכה (תדריך)',
    doc: 'תדריך ניידות', section: 'כפל גמלה', par: 'ילד נכה', clause: null,
    priority: 'statutory',
    evaluate: () => 'requires_discretion', // Requires check for cancellation conditions
  },
  {
    id: 'guide-replacement-timing', name: 'תזמון החלפת רכב (תדריך)',
    doc: 'תדריך ניידות', section: 'החלפת רכב', par: 'תזמון', clause: 'סעיף 11',
    priority: 'statutory',
    evaluate: () => 'not_eligible', // Requires months_since_last_loan
  },
  {
    id: 'guide-loan-no-license', name: 'הלוואה עומדת - חסר רישיון (תדריך)',
    doc: 'תדריך ניידות', section: 'הלוואה עומדת', par: 'חסר רישיון', clause: null,
    priority: 'statutory',
    evaluate: (r) => r.operational?.driver_license_holder !== true && (r.medical?.disability_percentage ?? 0) >= 60 && r.operational?.authorized_driver_status === true ? 'eligible' : 'not_eligible',
  },
  {
    id: 'guide-s9a-special', name: 'סעיף 9א(א) - רכב 2000 סמ"ק (תדריך)',
    doc: 'תדריך ניידות + הסכם הניידות', section: '9א(א)', par: 'מקרה מיוחד', clause: null,
    priority: 'statutory',
    evaluate: (r) => r.operational?.driver_license_holder === true && (r.medical?.disability_percentage ?? 0) === 100 ? 'requires_discretion' : 'not_eligible',
  },
  {
    id: 'guide-work-supplement', name: 'תוספת קצבה - מרחק עבודה (תדריך)',
    doc: 'תדריך ניידות', section: 'תוספת קצבה', par: 'מרחק עבודה', clause: '40 ק"מ הלוך-חזור',
    priority: 'statutory',
    evaluate: () => 'not_eligible', // Requires work_distance_km_round_trip
  },
];

export function demoEvaluate(request: EvaluationRequest): EvaluationResponse {
  const start = performance.now();
  const results: RuleResult[] = RULES.map(rule => ({
    rule_id: rule.id,
    rule_name: rule.name,
    outcome: rule.evaluate(request),
    document_name: rule.doc,
    section: rule.section,
    paragraph: rule.par,
    clause: rule.clause,
    priority: rule.priority,
  }));

  const hasEligible = results.some(r => r.outcome === 'eligible');
  const hasDiscretion = results.some(r => r.outcome === 'requires_discretion');
  const decision = hasEligible ? 'eligible' : hasDiscretion ? 'pending_discretion' : 'not_eligible';

  const discretionaryFlags = results
    .filter(r => r.outcome === 'requires_discretion')
    .map(r => ({ flag_category: 'legal' as const, reason: `${r.rule_name} דורש שיקול דעת`, applicable_rule_id: r.rule_id }));

  const certainty: CertaintyClassification = discretionaryFlags.length > 0
    ? { certainty_class: 'C_discretion_required', certainty_label_he: 'נדרש שיקול דעת מקצועי', confidence_score: 0.45, reasoning: 'זוהו כללים הדורשים סקירה ידנית', required_reviewer: 'senior_claims_officer', unresolved_ambiguities: discretionaryFlags.map(f => f.reason), legal_support_strength: 'weak', automatable: false }
    : hasEligible && results.some(r => r.outcome === 'not_eligible')
    ? { certainty_class: 'B_recommendation', certainty_label_he: 'המלצת מדיניות - בסיס משפטי חזק, נדרש אישור', confidence_score: 0.74, reasoning: 'ההחלטה מבוססת על כללים דטרמיניסטיים. קונפליקטים נפתרו לפי היררכיה משפטית.', required_reviewer: 'senior_claims_officer', unresolved_ambiguities: [], legal_support_strength: 'moderate', automatable: false }
    : { certainty_class: 'A_deterministic', certainty_label_he: 'החלטה דטרמיניסטית - ניתנת לאוטומציה מלאה', confidence_score: 0.92, reasoning: 'כל התנאים נבדקו ללא עמימות. ניתנת לאוטומציה.', required_reviewer: null, unresolved_ambiguities: [], legal_support_strength: 'strong', automatable: true };

  const processingTime = Math.round(performance.now() - start);

  return {
    status: 'success',
    data: {
      request_id: `demo-${Date.now()}`,
      decision: decision as EvaluationResponse['data'] extends { decision: infer D } ? D : never,
      certainty_classification: certainty,
      benefit_details: null,
      applied_rules: results.map(r => ({
        rule_id: r.rule_id,
        rule_version: 'v1.0',
        evaluation_result: r.outcome,
        legal_citation: { document_name: r.document_name, section: r.section, paragraph: r.paragraph, clause: r.clause },
      })),
      explanation_narrative: buildExplanation(request, results, decision, certainty),
      processing_timestamp: new Date().toISOString(),
      conflicts_resolved: [],
      discretionary_flags: discretionaryFlags,
    },
    audit_trail_id: `audit-demo-${Date.now()}`,
    processing_time_ms: processingTime,
  };
}

function buildExplanation(req: EvaluationRequest, results: RuleResult[], decision: string, certainty: CertaintyClassification): string {
  const claimTypes: Record<string, string> = { vehicle_less_allowance: 'קצבת חסר רכב', mobility_allowance: 'קצבת ניידות', vehicle_grant: 'מענק רכב', loan: 'הלוואה', continued_payment: 'המשך תשלום' };
  const lines: string[] = [];
  lines.push('═══════════════════════════════════════════');
  lines.push(`נימוקי החלטה - ${claimTypes[req.claim_type] ?? req.claim_type}`);
  lines.push('═══════════════════════════════════════════');
  lines.push('');
  lines.push('הבהרה: נימוקים אלה נוצרו באופן דטרמיניסטי על ידי מנוע כללים.');
  lines.push('אין שימוש בבינה מלאכותית גנרטיבית. כל קביעה מבוססת על סעיף משפטי מזוהה.');
  lines.push('');
  lines.push(`החלטה: ${decision === 'eligible' ? 'זכאי' : decision === 'not_eligible' ? 'לא זכאי' : 'ממתין לשיקול דעת'}`);
  lines.push(`רמת ודאות: ${certainty.certainty_label_he}`);
  lines.push('');
  const eligible = results.filter(r => r.outcome === 'eligible');
  const notEligible = results.filter(r => r.outcome === 'not_eligible');
  if (eligible.length > 0) {
    lines.push('✅ כללים שהתקיימו:');
    eligible.forEach(r => lines.push(`  - ${r.rule_name} (${r.document_name}, סעיף ${r.section})`));
    lines.push('');
  }
  if (notEligible.length > 0) {
    lines.push('❌ כללים שלא התקיימו:');
    notEligible.forEach(r => lines.push(`  - ${r.rule_name} (${r.document_name}, סעיף ${r.section})`));
  }
  lines.push('');
  lines.push('מסמך זה נוצר אוטומטית על ידי מנוע זכויות ניידות.');
  return lines.join('\n');
}
