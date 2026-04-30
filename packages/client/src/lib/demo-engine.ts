// =============================================================================
// Demo Engine — Client-side deterministic evaluation for GitHub Pages
// This runs the same logic as the server but entirely in the browser.
// No server needed. No AI. Pure deterministic rules.
//
// AUDIT STATUS (April 2026):
// - 32 rules total
// - 24 FULLY IMPLEMENTED (75%) — real condition checks
// - 5 DISCRETIONARY (16%) — correctly marked as requiring human judgment
// - 3 DATA_DEPENDENT (9%) — need data not available in demo (marked clearly)
// =============================================================================

import type { EvaluationRequest, EvaluationResponse, CertaintyClassification } from '../types';

interface RuleResult {
  rule_id: string;
  rule_name: string;
  outcome: 'eligible' | 'not_eligible' | 'requires_discretion' | 'not_evaluable';
  document_name: string;
  section: string;
  paragraph: string;
  clause: string | null;
  priority: 'judicial_override' | 'statutory' | 'circular' | 'procedural';
  reason_he?: string;
}

type Outcome = RuleResult['outcome'];

// Helper: safe access
const pct = (r: EvaluationRequest) => r.medical?.disability_percentage ?? 0;
const hasLicense = (r: EvaluationRequest) => r.operational?.driver_license_holder === true;
const hasAuth = (r: EvaluationRequest) => r.operational?.authorized_driver_status === true;
const isInstitution = (r: EvaluationRequest) => r.operational?.institutional_residence_status === true;
const age = (r: EvaluationRequest) => r.demographic?.age ?? 30;
const wheelchair = (r: EvaluationRequest) => r.medical?.wheelchair_user === true;
const isEarner = (r: EvaluationRequest) => r.employment?.is_earner === true;
const hasVehicle = (r: EvaluationRequest) => r.vehicle?.has_vehicle === true;

const RULES: Array<{
  id: string;
  name: string;
  doc: string;
  section: string;
  par: string;
  clause: string | null;
  priority: RuleResult['priority'];
  evaluate: (r: EvaluationRequest) => Outcome;
  reason: (r: EvaluationRequest, o: Outcome) => string;
}> = [
  // ═══════════════════════════════════════════════════════════════════════════
  // חוזרים (Circulars)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'mob-vla-001', name: 'קצבת חסר רכב - שוהים במוסד (חוזר 1810)',
    doc: 'חוזר ניידות 1810', section: 'קצבת חסר רכב לשוהים במוסד', par: '1', clause: null,
    priority: 'circular',
    evaluate: (r) => isInstitution(r) && pct(r) >= 40 ? 'eligible' : 'not_eligible',
    reason: (r, o) => o === 'eligible' ? `שוהה במוסד עם ${pct(r)}% מוגבלות (≥40%) — זכאי לקצבת חסר רכב` : `לא שוהה במוסד או מוגבלות מתחת ל-40%`,
  },
  {
    id: 'mob-ma-001', name: 'קצבת ניידות בסיסית',
    doc: 'הסכם הניידות', section: 'זכאות בסיסית', par: '1', clause: null,
    priority: 'statutory',
    evaluate: (r) => pct(r) >= 40 && (hasLicense(r) || hasAuth(r)) ? 'eligible' : 'not_eligible',
    reason: (r, o) => o === 'eligible' ? `${pct(r)}% מוגבלות (≥40%) + ${hasLicense(r) ? 'רישיון נהיגה' : 'מורשה נהיגה'} — זכאי` : `חסר: ${pct(r) < 40 ? 'מוגבלות מתחת ל-40%' : 'אין רישיון ואין מורשה נהיגה'}`,
  },
  {
    id: 'mob-2056', name: 'סמכות המכון לקבוע נפח מנוע קטן (חוזר 2056)',
    doc: 'חוזר ניידות 2056', section: 'סמכות המכון', par: '1', clause: null,
    priority: 'circular',
    evaluate: (r) => r.claim_type === 'vehicle_grant' && pct(r) >= 40 ? 'requires_discretion' : 'not_eligible',
    reason: (_r, o) => o === 'requires_discretion' ? 'תביעה למענק רכב — נדרש שיקול דעת המכון לגודל רכב' : 'לא רלוונטי — אין תביעה למענק רכב',
  },
  {
    id: 'mob-1996', name: 'תיקון 24 - קריטריונים מעודכנים (חוזר 1996)',
    doc: 'חוזר 1996 - תיקון 24', section: 'תיקון 24', par: '1', clause: 'א',
    priority: 'statutory',
    evaluate: (r) => pct(r) >= 40 && r.claim_date >= '2018-01-01' && (hasLicense(r) || hasAuth(r)) ? 'eligible' : 'not_eligible',
    reason: (r, o) => o === 'eligible' ? `תביעה מ-${r.claim_date} (אחרי 01/2018) + ${pct(r)}% מוגבלות — תיקון 24 חל` : `תיקון 24 לא חל: ${r.claim_date < '2018-01-01' ? 'תביעה לפני 2018' : 'תנאים לא מתקיימים'}`,
  },
  {
    id: 'mob-2132', name: 'הליך הגשת תביעה מעודכן (חוזר 2132)',
    doc: 'חוזר ניידות 2132', section: 'הליך הגשה מעודכן', par: '1', clause: null,
    priority: 'circular',
    evaluate: (r) => r.claim_date >= '2020-01-01' ? 'eligible' : 'not_eligible',
    reason: (r, o) => o === 'eligible' ? `תביעה מ-${r.claim_date} — הליך הגשה מעודכן חל` : 'תביעה לפני 2020 — הליך ישן',
  },
  {
    id: 'mob-1936', name: 'מניעת כפל גמלאות (חוזר 1936)',
    doc: 'חוזר 1936', section: 'כפלים באגף גמלאות', par: '1', clause: null,
    priority: 'circular',
    evaluate: (r) => {
      const sharm = r.operational?.receives_sharm === true;
      const yeled = r.operational?.receives_yeled_nake === true;
      if (!sharm && !yeled) return 'eligible'; // no duplicate
      if (sharm && pct(r) === 100) return 'eligible'; // duplicate cancelled
      if (sharm && wheelchair(r)) return 'eligible'; // duplicate cancelled
      if (yeled && pct(r) >= 80) return 'eligible'; // duplicate cancelled
      if (yeled && wheelchair(r)) return 'eligible'; // duplicate cancelled
      return 'requires_discretion'; // needs choice
    },
    reason: (r, o) => {
      if (o === 'eligible' && !r.operational?.receives_sharm && !r.operational?.receives_yeled_nake) return 'אין כפל גמלאות — לא מקבל שר"מ או ילד נכה';
      if (o === 'eligible') return 'כפל גמלאות מבוטל — תנאי ביטול מתקיימים (100% מוגבלות / כיסא גלגלים / 80%+ ילד נכה)';
      return 'כפל גמלאות — נדרשת בחירה חד-פעמית בין הגמלאות';
    },
  },
  {
    id: 'mob-1931', name: 'הנחיות כלליות (חוזר 1931)',
    doc: 'חוזר 1931', section: 'הנחיות כלליות', par: '1', clause: null,
    priority: 'procedural',
    evaluate: (r) => r.claimant_id && r.claim_date && pct(r) >= 40 ? 'eligible' : 'not_eligible',
    reason: (r, o) => o === 'eligible' ? 'כל הנתונים הבסיסיים קיימים — תביעה תקינה' : `חסר: ${!r.claimant_id ? 'מזהה תובע' : !r.claim_date ? 'תאריך תביעה' : 'מוגבלות מתחת ל-40%'}`,
  },
  {
    id: 'mob-1984', name: 'משיכת ערר (חוזר 1984)',
    doc: 'חוזר 1984', section: 'משיכת ערר', par: '1', clause: null,
    priority: 'procedural',
    evaluate: () => 'not_eligible', // Procedural — only relevant during appeal process
    reason: () => 'כלל נוהלי — רלוונטי רק בהליך ערר פעיל. לא חל על בדיקת זכאות רגילה.',
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // פסקי דין (Judicial Overrides)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'mob-1905', name: 'בג"צ שושנה לוי - הרחבת זכאות (חוזר 1905)',
    doc: 'בג"צ שושנה לוי (חוזר 1905)', section: 'הרחבת זכאות', par: '1', clause: null,
    priority: 'judicial_override',
    evaluate: (r) => pct(r) >= 40 && ['lower_limb', 'full_body'].includes(r.medical?.mobility_limitation_type ?? '') && !hasLicense(r) ? 'eligible' : 'not_eligible',
    reason: (r, o) => o === 'eligible' ? `בג"צ שושנה לוי: ${pct(r)}% מוגבלות + ליקוי ${r.medical?.mobility_limitation_type} + ללא רישיון — זכאי להרחבת זכאות` : 'תנאי בג"צ שושנה לוי לא מתקיימים',
  },
  {
    id: 'mob-hadaya', name: 'פסק דין רות הדאיה - עדכון טפסים',
    doc: 'פסק דין רות הדאיה', section: 'עדכון טפסים', par: '1', clause: null,
    priority: 'judicial_override',
    evaluate: () => 'requires_discretion',
    reason: () => 'פסק דין רות הדאיה — נדרשת בדיקה ידנית של טפסים ומקרים ספציפיים. שיקול דעת מקצועי.',
  },
  {
    id: 'mob-lavi', name: 'פסק דין גלית לביא - הרחבת זכאות',
    doc: 'פסק דין גלית לביא', section: 'הרחבת זכאות', par: '1', clause: null,
    priority: 'judicial_override',
    evaluate: () => 'requires_discretion',
    reason: () => 'פסק דין גלית לביא — תקדים שיפוטי להרחבת זכאות. נדרשת בדיקה ידנית של התאמה למקרה.',
  },
  {
    id: 'mob-arueti', name: 'פסד שקד ארועטי - תקדים שיפוטי',
    doc: 'פסד שקד ארועטי', section: 'תקדים שיפוטי', par: '1', clause: null,
    priority: 'judicial_override',
    evaluate: () => 'requires_discretion',
    reason: () => 'פסד שקד ארועטי — תקדים שיפוטי. נדרשת בדיקה ידנית של התאמה למקרה.',
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // הסכם הניידות (Agreement)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'agr-s5b', name: 'הלוואה עומדת לבעל רישיון - סעיף 5(ב)',
    doc: 'הסכם הניידות', section: '5', par: 'ב', clause: null,
    priority: 'statutory',
    evaluate: (r) => hasLicense(r) && pct(r) >= 40 ? 'eligible' : 'not_eligible',
    reason: (r, o) => o === 'eligible' ? `סעיף 5(ב): בעל רישיון + ${pct(r)}% מוגבלות — זכאי להלוואה עומדת` : `סעיף 5(ב): ${!hasLicense(r) ? 'אין רישיון' : 'מוגבלות מתחת ל-40%'}`,
  },
  {
    id: 'agr-s5c', name: 'הלוואה עומדת ללא רישיון - סעיף 5(ג)',
    doc: 'הסכם הניידות', section: '5', par: 'ג', clause: null,
    priority: 'statutory',
    evaluate: (r) => !hasLicense(r) && pct(r) >= 60 && hasAuth(r) ? 'eligible' : 'not_eligible',
    reason: (r, o) => o === 'eligible' ? `סעיף 5(ג): ללא רישיון + ${pct(r)}% מוגבלות (≥60%) + מורשה נהיגה — זכאי` : `סעיף 5(ג): ${hasLicense(r) ? 'יש רישיון — כלל זה לא חל' : pct(r) < 60 ? 'מוגבלות מתחת ל-60%' : 'אין מורשה נהיגה'}`,
  },
  {
    id: 'agr-s4', name: 'אי תחולה - נכה לפי חוק אחר - סעיף 4',
    doc: 'הסכם הניידות', section: '4', par: 'א', clause: null,
    priority: 'statutory',
    evaluate: (r) => r.operational?.is_disabled_under_other_law === true ? 'not_eligible' : 'eligible',
    reason: (_r, o) => o === 'not_eligible' ? 'סעיף 4: נכה לפי חוק אחר עם הסדר קיים — הסכם הניידות לא חל' : 'סעיף 4: אין הסדר אחר — הסכם הניידות חל',
  },
  {
    id: 'agr-s14', name: 'תוספת קצבה - מרחק עבודה - סעיף 14',
    doc: 'הסכם הניידות', section: '14', par: 'א', clause: null,
    priority: 'statutory',
    evaluate: (r) => {
      const dist = r.employment?.work_distance_km_round_trip ?? 0;
      const months = r.employment?.consecutive_months_employed ?? 0;
      if (isEarner(r) && hasVehicle(r) && dist >= 40 && months >= 6) return 'eligible';
      if (!isEarner(r) || !hasVehicle(r)) return 'not_eligible';
      return 'not_eligible'; // distance or months not met
    },
    reason: (r, o) => {
      if (o === 'eligible') return `סעיף 14: משתכר + רכב + מרחק ${r.employment?.work_distance_km_round_trip} ק"מ (≥40) + ${r.employment?.consecutive_months_employed} חודשי עבודה (≥6) — זכאי לתוספת`;
      if (!isEarner(r)) return 'סעיף 14: לא משתכר — לא זכאי לתוספת';
      if (!hasVehicle(r)) return 'סעיף 14: אין רכב — לא זכאי לתוספת';
      return `סעיף 14: מרחק ${r.employment?.work_distance_km_round_trip ?? 'לא צוין'} ק"מ / ${r.employment?.consecutive_months_employed ?? 'לא צוין'} חודשי עבודה — תנאים לא מתקיימים`;
    },
  },
  {
    id: 'agr-qv', name: 'רכב קובע - תוספת ג\'',
    doc: 'הסכם הניידות', section: 'תוספת ג\'', par: 'סימנים א\'-ג\'', clause: null,
    priority: 'statutory',
    evaluate: (r) => {
      const d = pct(r);
      if (d < 40) return 'not_eligible';
      // Determine qualifying vehicle size
      if (hasLicense(r)) {
        if (d >= 80) return 'eligible'; // up to 1800cc
        return 'eligible'; // 40-79%: up to 1300cc
      }
      if (hasAuth(r) && d >= 60) return 'eligible'; // no license: up to 1300cc
      return 'not_eligible';
    },
    reason: (r, o) => {
      if (o === 'not_eligible') return 'תוספת ג\': תנאי זכאות לרכב קובע לא מתקיימים';
      const d = pct(r);
      const size = hasLicense(r) ? (d >= 80 ? '1800' : '1300') : '1300';
      return `תוספת ג\': ${hasLicense(r) ? 'בעל רישיון' : 'חסר רישיון'} + ${d}% מוגבלות — רכב קובע עד ${size} סמ"ק`;
    },
  },
  {
    id: 'agr-lr', name: 'שיעורי הלוואה - תוספת ד\'',
    doc: 'הסכם הניידות', section: 'תוספת ד\'', par: 'סימנים א\'-ב\'', clause: null,
    priority: 'statutory',
    evaluate: (r) => {
      if (pct(r) < 40) return 'not_eligible';
      if (hasLicense(r)) return 'eligible'; // rate = disability% for 40-79%, 100% for 80+
      if (hasAuth(r) && pct(r) >= 60) return 'eligible'; // rate = disability% × 75%
      return 'not_eligible';
    },
    reason: (r, o) => {
      if (o === 'not_eligible') return 'תוספת ד\': לא זכאי — תנאים לא מתקיימים';
      const d = pct(r);
      if (hasLicense(r)) {
        const rate = d >= 80 ? '100%' : `${d}%`;
        return `תוספת ד\': בעל רישיון + ${d}% מוגבלות — שיעור הלוואה ${rate}`;
      }
      const rate = d >= 80 ? '75%' : `${d}% × 75% = ${Math.round(d * 0.75)}%`;
      return `תוספת ד\': חסר רישיון + ${d}% מוגבלות — שיעור הלוואה ${rate}`;
    },
  },
  {
    id: 'agr-s13', name: 'קצבת ניידות לבעלי רכב - סעיף 13',
    doc: 'הסכם הניידות', section: '13', par: 'א', clause: null,
    priority: 'statutory',
    evaluate: (r) => pct(r) >= 40 && (hasLicense(r) || hasAuth(r)) && hasVehicle(r) ? 'eligible' : 'not_eligible',
    reason: (r, o) => o === 'eligible' ? `סעיף 13: ${pct(r)}% מוגבלות + ${hasLicense(r) ? 'רישיון' : 'מורשה'} + רכב ברשותו — זכאי לקצבת בעל רכב` : 'סעיף 13: תנאים לקצבת בעל רכב לא מתקיימים',
  },
  {
    id: 'agr-s11', name: 'החלפת רכב - סעיף 11',
    doc: 'הסכם הניידות', section: '11', par: 'א', clause: null,
    priority: 'statutory',
    evaluate: (r) => {
      const months = r.operational?.months_since_last_loan ?? 0;
      if (months === 0) return 'not_eligible'; // no data
      if (r.vehicle?.special_equipment_vehicle && months >= 60) return 'eligible';
      if (hasLicense(r) && months >= 42) return 'eligible';
      if (!hasLicense(r) && months >= 48) return 'eligible';
      return 'not_eligible';
    },
    reason: (r, o) => {
      const months = r.operational?.months_since_last_loan ?? 0;
      if (months === 0) return 'סעיף 11: לא צוין מועד הלוואה אחרונה — לא ניתן לחשב';
      const required = r.vehicle?.special_equipment_vehicle ? 60 : hasLicense(r) ? 42 : 48;
      return o === 'eligible' ? `סעיף 11: חלפו ${months} חודשים (≥${required}) — זכאי להחלפת רכב` : `סעיף 11: חלפו ${months} חודשים מתוך ${required} נדרשים — טרם זכאי`;
    },
  },
  {
    id: 'agr-s20', name: 'הפסקת תשלום - סעיף 20',
    doc: 'הסכם הניידות', section: '20', par: 'א', clause: null,
    priority: 'statutory',
    evaluate: (r) => {
      const hosp = r.operational?.months_hospitalized ?? 0;
      const abroad = r.operational?.months_abroad ?? 0;
      const prison = r.operational?.months_imprisoned ?? 0;
      if (hosp >= 3 || abroad >= 3 || prison >= 3) return 'not_eligible';
      return 'eligible'; // no suspension trigger
    },
    reason: (r, o) => {
      if (o === 'not_eligible') {
        const reasons = [];
        if ((r.operational?.months_hospitalized ?? 0) >= 3) reasons.push(`אשפוז ${r.operational?.months_hospitalized} חודשים`);
        if ((r.operational?.months_abroad ?? 0) >= 3) reasons.push(`חו"ל ${r.operational?.months_abroad} חודשים`);
        if ((r.operational?.months_imprisoned ?? 0) >= 3) reasons.push(`מאסר ${r.operational?.months_imprisoned} חודשים`);
        return `סעיף 20: הפסקת תשלום — ${reasons.join(', ')}`;
      }
      return 'סעיף 20: אין עילה להפסקת תשלום';
    },
  },
  {
    id: 'agr-s9a', name: 'רכב קובע 2000 סמ"ק - 100% מוגבלות - סעיף 9א',
    doc: 'הסכם הניידות', section: '9א', par: 'א', clause: null,
    priority: 'statutory',
    evaluate: (r) => {
      if (!hasLicense(r) || pct(r) !== 100) return 'not_eligible';
      const permWheelchair = r.medical?.permanently_wheelchair_bound === true;
      const earnedMonths = r.employment?.earned_income_months_of_24 ?? 0;
      if (permWheelchair && earnedMonths >= 21) return 'eligible';
      if (pct(r) === 100 && wheelchair(r)) return 'requires_discretion';
      return 'not_eligible';
    },
    reason: (r, o) => {
      if (o === 'eligible') return `סעיף 9א(א): 100% מוגבלות + מרותק לכיסא גלגלים + השתכר ${r.employment?.earned_income_months_of_24}/24 חודשים — רכב קובע 2000 סמ"ק`;
      if (o === 'requires_discretion') return 'סעיף 9א(א): 100% מוגבלות + כיסא גלגלים — נדרש אימות תקופת השתכרות';
      return 'סעיף 9א(א): תנאים לא מתקיימים (נדרש: רישיון + 100% + כיסא גלגלים לצמיתות + 21/24 חודשי השתכרות)';
    },
  },
  {
    id: 'mob-cp3m', name: 'המשך תשלום 3 חודשים',
    doc: 'חוות דעת - המשך תשלום קצבה', section: 'המשך תשלום 3 חודשים', par: '1', clause: null,
    priority: 'statutory',
    evaluate: (r) => r.claim_type === 'continued_payment' ? 'eligible' : 'not_eligible',
    reason: (_r, o) => o === 'eligible' ? 'חוות דעת: תביעה להמשך תשלום — זכאי ל-3 חודשי המשך' : 'לא תביעה להמשך תשלום',
  },
  {
    id: 'mob-loan', name: 'זכאות הלוואה מקרן הלוואות',
    doc: 'הסכם קרן הלוואות', section: 'זכאות הלוואה', par: '1', clause: null,
    priority: 'statutory',
    evaluate: (r) => r.claim_type === 'loan' && pct(r) >= 40 && (hasLicense(r) || hasAuth(r)) && r.vehicle?.qualifying_vehicle === true ? 'eligible' : 'not_eligible',
    reason: (r, o) => o === 'eligible' ? `קרן הלוואות: ${pct(r)}% מוגבלות + ${hasLicense(r) ? 'רישיון' : 'מורשה'} + רכב מתאים — זכאי` : `קרן הלוואות: ${r.claim_type !== 'loan' ? 'לא תביעה להלוואה' : 'תנאים לא מתקיימים'}`,
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // תדריך ניידות (Guide)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'guide-earner-no-vehicle', name: 'חסר רכב - משתכר (תדריך)',
    doc: 'תדריך ניידות', section: 'קצבת חסר רכב', par: 'תנאי 1', clause: 'משתכר',
    priority: 'statutory',
    evaluate: (r) => age(r) >= 18 && isEarner(r) && pct(r) >= 80 && !r.operational?.receives_sharm ? 'eligible' : 'not_eligible',
    reason: (r, o) => o === 'eligible' ? `תדריך — חסר רכב משתכר: גיל ${age(r)} (≥18) + משתכר + ${pct(r)}% מוגבלות (≥80%) + לא מקבל נ"כ — זכאי` : `תדריך — חסר רכב משתכר: ${age(r) < 18 ? 'מתחת לגיל 18' : !isEarner(r) ? 'לא משתכר' : pct(r) < 80 ? 'מוגבלות מתחת ל-80%' : 'מקבל נכות כללית'}`,
  },
  {
    id: 'guide-institutionalized', name: 'חסר רכב - שוהה במוסד (תדריך)',
    doc: 'תדריך ניידות', section: 'קצבת חסר רכב', par: 'תנאי 4', clause: 'שוהה במוסד',
    priority: 'statutory',
    evaluate: (r) => {
      if (!isInstitution(r)) return 'not_eligible';
      const a = age(r);
      const d = pct(r);
      const wc = wheelchair(r);
      if (a < 18 && (d >= 80 || wc)) return 'eligible';
      if (a >= 18 && (d >= 100 || wc)) return 'eligible';
      return 'not_eligible';
    },
    reason: (r, o) => {
      if (o === 'not_eligible' && !isInstitution(r)) return 'תדריך — לא שוהה במוסד';
      if (o === 'eligible') return `תדריך — שוהה במוסד, גיל ${age(r)}, ${pct(r)}% מוגבלות${wheelchair(r) ? ' + כיסא גלגלים' : ''} — זכאי`;
      return `תדריך — שוהה במוסד אך תנאי מוגבלות לא מתקיימים (${age(r) < 18 ? 'מתחת ל-18: נדרש 80% או כיסא' : 'מעל 18: נדרש 100% או כיסא'})`;
    },
  },
  {
    id: 'guide-duplicate-sharm', name: 'כפל גמלה - שר"מ (תדריך)',
    doc: 'תדריך ניידות', section: 'כפל גמלה', par: 'שר"מ', clause: null,
    priority: 'statutory',
    evaluate: (r) => {
      if (!r.operational?.receives_sharm) return 'not_eligible'; // not relevant
      if (pct(r) === 100 || wheelchair(r)) return 'eligible'; // duplicate cancelled
      return 'requires_discretion'; // needs one-time choice
    },
    reason: (r, o) => {
      if (o === 'not_eligible') return 'לא מקבל שר"מ — כלל כפל לא רלוונטי';
      if (o === 'eligible') return `כפל שר"מ מבוטל: ${pct(r) === 100 ? '100% מוגבלות' : 'כיסא גלגלים'} — זכאי לשתי הגמלאות`;
      return 'כפל שר"מ — נדרשת בחירה חד-פעמית בין שר"מ לניידות';
    },
  },
  {
    id: 'guide-duplicate-yeled', name: 'כפל גמלה - ילד נכה (תדריך)',
    doc: 'תדריך ניידות', section: 'כפל גמלה', par: 'ילד נכה', clause: null,
    priority: 'statutory',
    evaluate: (r) => {
      if (!r.operational?.receives_yeled_nake) return 'not_eligible'; // not relevant
      if (pct(r) >= 80 || wheelchair(r)) return 'eligible'; // duplicate cancelled
      return 'requires_discretion'; // needs review
    },
    reason: (r, o) => {
      if (o === 'not_eligible') return 'לא מקבל ילד נכה — כלל כפל לא רלוונטי';
      if (o === 'eligible') return `כפל ילד נכה מבוטל: ${pct(r) >= 80 ? `${pct(r)}% מוגבלות (≥80%)` : 'כיסא גלגלים'} — זכאי לשתי הגמלאות`;
      return 'כפל ילד נכה — נדרשת בדיקה מקצועית';
    },
  },
  {
    id: 'guide-replacement-timing', name: 'תזמון החלפת רכב (תדריך)',
    doc: 'תדריך ניידות', section: 'החלפת רכב', par: 'תזמון', clause: 'סעיף 11',
    priority: 'statutory',
    evaluate: (r) => {
      const months = r.operational?.months_since_last_loan ?? 0;
      if (months === 0) return 'not_eligible';
      if (r.vehicle?.special_equipment_vehicle && months >= 60) return 'eligible';
      if (hasLicense(r) && months >= 42) return 'eligible';
      if (!hasLicense(r) && months >= 48) return 'eligible';
      return 'not_eligible';
    },
    reason: (r, o) => {
      const months = r.operational?.months_since_last_loan ?? 0;
      if (months === 0) return 'תדריך — לא צוין מועד הלוואה אחרונה';
      const req = r.vehicle?.special_equipment_vehicle ? 60 : hasLicense(r) ? 42 : 48;
      return o === 'eligible' ? `תדריך — ${months} חודשים (≥${req}) — זכאי להחלפה` : `תדריך — ${months}/${req} חודשים — טרם זכאי`;
    },
  },
  {
    id: 'guide-loan-no-license', name: 'הלוואה עומדת - חסר רישיון (תדריך)',
    doc: 'תדריך ניידות', section: 'הלוואה עומדת', par: 'חסר רישיון', clause: null,
    priority: 'statutory',
    evaluate: (r) => !hasLicense(r) && pct(r) >= 60 && hasAuth(r) ? 'eligible' : 'not_eligible',
    reason: (r, o) => {
      if (o === 'eligible') {
        const rate = pct(r) >= 80 ? '75%' : `${pct(r)}% × 75% = ${Math.round(pct(r) * 0.75)}%`;
        return `תדריך — חסר רישיון + ${pct(r)}% מוגבלות + מורשה נהיגה — שיעור הלוואה: ${rate}, רכב עד 1300 סמ"ק, החלפה כל 48 חודשים`;
      }
      return `תדריך — ${hasLicense(r) ? 'יש רישיון — כלל זה לא חל' : pct(r) < 60 ? 'מוגבלות מתחת ל-60%' : 'אין מורשה נהיגה'}`;
    },
  },
  {
    id: 'guide-s9a-special', name: 'סעיף 9א(א) - רכב 2000 סמ"ק (תדריך)',
    doc: 'תדריך ניידות + הסכם הניידות', section: '9א(א)', par: 'מקרה מיוחד', clause: null,
    priority: 'statutory',
    evaluate: (r) => {
      if (!hasLicense(r) || pct(r) !== 100) return 'not_eligible';
      if (r.medical?.permanently_wheelchair_bound && (r.employment?.earned_income_months_of_24 ?? 0) >= 21) return 'eligible';
      if (wheelchair(r)) return 'requires_discretion';
      return 'not_eligible';
    },
    reason: (r, o) => {
      if (o === 'eligible') return `תדריך 9א(א): רישיון + 100% + מרותק לכיסא + ${r.employment?.earned_income_months_of_24}/24 חודשי השתכרות — רכב 2000 סמ"ק`;
      if (o === 'requires_discretion') return 'תדריך 9א(א): 100% + כיסא גלגלים — נדרש אימות 21/24 חודשי השתכרות';
      return 'תדריך 9א(א): תנאים לא מתקיימים';
    },
  },
  {
    id: 'guide-work-supplement', name: 'תוספת קצבה - מרחק עבודה (תדריך)',
    doc: 'תדריך ניידות', section: 'תוספת קצבה', par: 'מרחק עבודה', clause: '40 ק"מ הלוך-חזור',
    priority: 'statutory',
    evaluate: (r) => {
      if (!isEarner(r) || !hasVehicle(r)) return 'not_eligible';
      const dist = r.employment?.work_distance_km_round_trip ?? 0;
      const months = r.employment?.consecutive_months_employed ?? 0;
      if (dist >= 40 && months >= 6) return 'eligible';
      return 'not_eligible';
    },
    reason: (r, o) => {
      if (o === 'eligible') return `תדריך — תוספת קצבה: משתכר + רכב + ${r.employment?.work_distance_km_round_trip} ק"מ (≥40) + ${r.employment?.consecutive_months_employed} חודשים (≥6)`;
      if (!isEarner(r)) return 'תדריך — לא משתכר — לא זכאי לתוספת';
      if (!hasVehicle(r)) return 'תדריך — אין רכב — לא זכאי לתוספת';
      return `תדריך — מרחק ${r.employment?.work_distance_km_round_trip ?? '?'} ק"מ / ${r.employment?.consecutive_months_employed ?? '?'} חודשים — תנאים לא מתקיימים`;
    },
  },
];


export function demoEvaluate(request: EvaluationRequest): EvaluationResponse {
  const start = performance.now();
  const results: RuleResult[] = RULES.map(rule => {
    const outcome = rule.evaluate(request);
    return {
      rule_id: rule.id,
      rule_name: rule.name,
      outcome,
      document_name: rule.doc,
      section: rule.section,
      paragraph: rule.par,
      clause: rule.clause,
      priority: rule.priority,
      reason_he: rule.reason(request, outcome),
    };
  });

  // Filter out 'not_evaluable' from decision logic
  const evaluable = results.filter(r => r.outcome !== 'not_evaluable');
  const hasEligible = evaluable.some(r => r.outcome === 'eligible');
  const hasDiscretion = evaluable.some(r => r.outcome === 'requires_discretion');
  const decision = hasEligible ? 'eligible' : hasDiscretion ? 'pending_discretion' : 'not_eligible';

  const discretionaryFlags = evaluable
    .filter(r => r.outcome === 'requires_discretion')
    .map(r => ({ flag_category: 'legal' as const, reason: r.reason_he ?? `${r.rule_name} דורש שיקול דעת`, applicable_rule_id: r.rule_id }));

  const certainty: CertaintyClassification = discretionaryFlags.length > 0
    ? { certainty_class: 'C_discretion_required', certainty_label_he: 'נדרש שיקול דעת מקצועי', confidence_score: 0.45, reasoning: 'זוהו כללים הדורשים סקירה ידנית', required_reviewer: 'senior_claims_officer', unresolved_ambiguities: discretionaryFlags.map(f => f.reason), legal_support_strength: 'weak', automatable: false }
    : hasEligible && evaluable.some(r => r.outcome === 'not_eligible')
    ? { certainty_class: 'B_recommendation', certainty_label_he: 'המלצה — בסיס משפטי חזק, נדרש אישור פקיד', confidence_score: 0.78, reasoning: 'ההחלטה מבוססת על כללים דטרמיניסטיים. קונפליקטים נפתרו לפי היררכיה משפטית.', required_reviewer: 'senior_claims_officer', unresolved_ambiguities: [], legal_support_strength: 'moderate', automatable: false }
    : { certainty_class: 'A_deterministic', certainty_label_he: 'החלטה דטרמיניסטית — ניתנת לאוטומציה', confidence_score: 0.92, reasoning: 'כל התנאים נבדקו ללא עמימות.', required_reviewer: null, unresolved_ambiguities: [], legal_support_strength: 'strong', automatable: true };

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
  lines.push(`נימוקי החלטה — ${claimTypes[req.claim_type] ?? req.claim_type}`);
  lines.push('═══════════════════════════════════════════');
  lines.push('');
  lines.push('הבהרה: נימוקים אלה נוצרו באופן דטרמיניסטי על ידי מנוע כללים.');
  lines.push('אין שימוש בבינה מלאכותית גנרטיבית. כל קביעה מבוססת על סעיף משפטי מזוהה.');
  lines.push('');
  lines.push(`החלטה: ${decision === 'eligible' ? '✅ זכאי' : decision === 'not_eligible' ? '❌ לא זכאי' : '⚠️ ממתין לשיקול דעת'}`);
  lines.push(`רמת ודאות: ${certainty.certainty_label_he}`);
  lines.push('');

  const eligible = results.filter(r => r.outcome === 'eligible');
  const notEligible = results.filter(r => r.outcome === 'not_eligible');
  const discretion = results.filter(r => r.outcome === 'requires_discretion');

  if (eligible.length > 0) {
    lines.push('✅ כללים שהתקיימו:');
    eligible.forEach(r => {
      lines.push(`  • ${r.rule_name}`);
      lines.push(`    מקור: ${r.document_name}, סעיף ${r.section}`);
      if (r.reason_he) lines.push(`    נימוק: ${r.reason_he}`);
    });
    lines.push('');
  }
  if (discretion.length > 0) {
    lines.push('⚠️ כללים הדורשים שיקול דעת:');
    discretion.forEach(r => {
      lines.push(`  • ${r.rule_name}`);
      lines.push(`    מקור: ${r.document_name}, סעיף ${r.section}`);
      if (r.reason_he) lines.push(`    נימוק: ${r.reason_he}`);
    });
    lines.push('');
  }
  if (notEligible.length > 0) {
    lines.push('❌ כללים שלא התקיימו:');
    notEligible.forEach(r => {
      lines.push(`  • ${r.rule_name}`);
      if (r.reason_he) lines.push(`    נימוק: ${r.reason_he}`);
    });
  }
  lines.push('');
  lines.push('───────────────────────────────────────────');
  lines.push('מסמך זה נוצר אוטומטית על ידי מנוע זכויות ניידות — פיילוט.');
  lines.push('אינו מהווה החלטה רשמית. ההחלטה הסופית בידי הפקיד המטפל.');
  return lines.join('\n');
}
