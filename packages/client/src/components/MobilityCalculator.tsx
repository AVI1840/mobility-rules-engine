// =============================================================================
// מחשבון זכאות לניידות — שחזור מלא של המחשבון הרשמי
// מבוסס על אפיון מחשבון לבדיקת זכאות לניידות (52 עמודים)
// לוגיקה דטרמיניסטית בלבד — אין שימוש בבינה מלאכותית
// =============================================================================

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calculator, ChevronRight, ChevronLeft, RotateCcw, AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type Screen = 'screen1' | 'screen2' | 'screen3' | 'screen3a' | 'result';

interface FormData {
  birthDate: string;
  examinedByCommittee: boolean | null;
  appliedBeforeRetirement: boolean | null;
  receivingBenefits: string[]; // nk, sharm, yeled_nake, none
  hasLicense: boolean | null;
  hasIncome: boolean | null;
  mobilityPercentage: string; // '40-49','50-59','60-69','70-79','80-90','100'
  usesWheelchair: boolean | null;
  hasAuthorizedDriver: string | null; // 'family','caretaker','none'
  examinedByVehicleCommittee: boolean | null;
  vehicleCommitteeResult: string | null; // 'private','special_equipment','special_chose_private'
  specialEquipmentType: string | null;
  committeeEngineVolume: string | null;
  hasOwnVehicle: boolean | null;
  ownVehicleType: string | null;
  // Screen 3a (retirement)
  receivedBenefitsBefore: boolean | null;
  receivedAllowanceBeforeRetirement: boolean | null;
  receivedLoanLast4Years: boolean | null;
  receivedLoanForCurrentVehicle: boolean | null;
}

interface CalculatorResult {
  eligible: boolean;
  allowanceCode: string | null;
  allowanceDescription: string;
  loanEligible: boolean;
  loanDescription: string;
  notes: string[];
  legalBasis: string;
  requiresBranchVisit: boolean;
}

const INITIAL_FORM: FormData = {
  birthDate: '',
  examinedByCommittee: null,
  appliedBeforeRetirement: null,
  receivingBenefits: [],
  hasLicense: null,
  hasIncome: null,
  mobilityPercentage: '',
  usesWheelchair: null,
  hasAuthorizedDriver: null,
  examinedByVehicleCommittee: null,
  vehicleCommitteeResult: null,
  specialEquipmentType: null,
  committeeEngineVolume: null,
  hasOwnVehicle: null,
  ownVehicleType: null,
  receivedBenefitsBefore: null,
  receivedAllowanceBeforeRetirement: null,
  receivedLoanLast4Years: null,
  receivedLoanForCurrentVehicle: null,
};

// ─── Retirement age calculation (Israel) ─────────────────────────────────────
function getRetirementAge(): number {
  return 67; // Simplified: same for men and women per calculator spec
}

function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ─── Mobility percentage to numeric range ────────────────────────────────────
function getMobilityMin(pct: string): number {
  const map: Record<string, number> = { '40-49': 40, '50-59': 50, '60-69': 60, '70-79': 70, '80-90': 80, '100': 100 };
  return map[pct] ?? 0;
}


// ─── Allowance code lookup tables (from appendix) ────────────────────────────
// Format: {vehicleSize}_{mobilityRange}_{category}
// Categories: regular, withSupplement, wheelchair, noWheelchair, special139
const ALLOWANCE_CODES: Record<string, string> = {
  // בעלי רישיון — עד 1300 סמ"ק
  'license_1300_80-100': '40701', 'license_1300_70-79': '40702', 'license_1300_60-69': '40703',
  'license_1300_50-59': '40704', 'license_1300_40-49': '40705',
  // בעלי רישיון — עד 1800 סמ"ק
  'license_1800_80-100': '40901', 'license_1800_70-79': '40902', 'license_1800_60-69': '40903',
  'license_1800_50-59': '40904', 'license_1800_40-49': '40905',
  // בעלי רישיון — עד 2000 סמ"ק
  'license_2000_80-100': '41101', 'license_2000_70-79': '41102', 'license_2000_60-69': '41103',
  'license_2000_50-59': '41104', 'license_2000_40-49': '41105',
  // בעלי רישיון — מעל 2000 סמ"ק
  'license_2000+_80-100': '41301', 'license_2000+_70-79': '41302', 'license_2000+_60-69': '41303',
  'license_2000+_50-59': '41304', 'license_2000+_40-49': '41305',
  // רכב אבזרים מיוחדים עד 100,000
  'license_special100k_80-100': '41501', 'license_special100k_70-79': '41502', 'license_special100k_60-69': '41503',
  'license_special100k_50-59': '41504', 'license_special100k_40-49': '41505',
  // רכב אבזרים מיוחדים מעל 100,000
  'license_special100k+_80-100': '41601', 'license_special100k+_70-79': '41602', 'license_special100k+_60-69': '41603',
  'license_special100k+_50-59': '41604', 'license_special100k+_40-49': '41605',
  // רכב אבזרים מיוחדים ג'ויסטיק
  'license_joystick_80-100': '41701', 'license_joystick_70-79': '41702', 'license_joystick_60-69': '41703',
  'license_joystick_50-59': '41704', 'license_joystick_40-49': '41705',
  // חסרי רישיון — עד 1300 סמ"ק
  'nolicense_1300_80-100': '41801', 'nolicense_1300_70-79': '41802', 'nolicense_1300_60-69': '41803',
  // חסרי רישיון — עד 1800 סמ"ק
  'nolicense_1800_80-100': '41901', 'nolicense_1800_70-79': '41902', 'nolicense_1800_60-69': '41903',
  // חסרי רישיון — עד 2000 סמ"ק
  'nolicense_2000_80-100': '42001', 'nolicense_2000_70-79': '42002', 'nolicense_2000_60-69': '42003',
  // חסרי רישיון — מעל 2000 סמ"ק
  'nolicense_2000+_80-100': '42101', 'nolicense_2000+_70-79': '42102', 'nolicense_2000+_60-69': '42103',
  // חסרי רישיון — רכב אבזרים מיוחדים
  'nolicense_special_80-100': '42201', 'nolicense_special_70-79': '42202', 'nolicense_special_60-69': '42203',
  // חסר רכב (שר"מ / ילד נכה)
  'no_vehicle_sharm': '40901', 'no_vehicle_yeled': '40901',
};

// ─── Main Calculator Logic ───────────────────────────────────────────────────
function calculateEligibility(form: FormData): CalculatorResult {
  const age = form.birthDate ? calculateAge(form.birthDate) : 0;
  const retirementAge = getRetirementAge();
  const mobilityMin = getMobilityMin(form.mobilityPercentage);
  const hasLicense = form.hasLicense === true;
  const isEarner = form.hasIncome === true;
  const wheelchair = form.usesWheelchair === true;
  const notes: string[] = [];

  // Under age 17: treat as no license + not earning (unless wheelchair)
  const effectiveLicense = age < 17 ? false : hasLicense;
  const effectiveEarner = age < 17 ? (wheelchair ? true : false) : isEarner;

  // If earner, wheelchair is not relevant for amounts (earner = wheelchair in law)
  const effectiveWheelchair = effectiveEarner ? false : wheelchair;

  // ─── Mobility < 40% ───
  if (mobilityMin < 40) {
    return {
      eligible: false,
      allowanceCode: null,
      allowanceDescription: 'על פי הנתונים שהוזנו, אין זכאות להטבות בניידות.',
      loanEligible: false,
      loanDescription: '',
      notes: ['במידה ותחול החמרה במצבך וייקבעו לך 40% מוגבלות לפחות, מומלץ לבדוק זכאותך להטבות פעם נוספת.'],
      legalBasis: 'הסכם הניידות — סף מינימלי 40% מוגבלות בניידות',
      requiresBranchVisit: false,
    };
  }

  // ─── Special equipment chose private ───
  if (form.vehicleCommitteeResult === 'special_chose_private') {
    return {
      eligible: false,
      allowanceCode: null,
      allowanceDescription: 'על פי הנתונים שהוזנו, יש לפנות לסניף לבדיקת הזכאות.',
      loanEligible: false,
      loanDescription: '',
      notes: [],
      legalBasis: 'הסכם הניידות — רכב לאביזרים מיוחדים אך בחר רכב פרטי',
      requiresBranchVisit: true,
    };
  }

  // ─── Determine vehicle size key ───
  let vehicleSizeKey = '1300';
  if (form.hasOwnVehicle && form.ownVehicleType) {
    if (form.ownVehicleType.includes('2000+') || form.ownVehicleType.includes('מעל 2000')) vehicleSizeKey = '2000+';
    else if (form.ownVehicleType.includes('2000')) vehicleSizeKey = '2000';
    else if (form.ownVehicleType.includes('1800')) vehicleSizeKey = '1800';
    else if (form.ownVehicleType.includes('special_joystick')) vehicleSizeKey = 'joystick';
    else if (form.ownVehicleType.includes('special100k+')) vehicleSizeKey = 'special100k+';
    else if (form.ownVehicleType.includes('special100k')) vehicleSizeKey = 'special100k';
  }

  // ─── Mobility range key ───
  let mobilityKey = '40-49';
  if (mobilityMin >= 80) mobilityKey = '80-100';
  else if (mobilityMin >= 70) mobilityKey = '70-79';
  else if (mobilityMin >= 60) mobilityKey = '60-69';
  else if (mobilityMin >= 50) mobilityKey = '50-59';

  // ─── No license + no authorized driver → Track A only (no vehicle) ───
  if (!effectiveLicense && form.hasAuthorizedDriver === 'none') {
    const isSharm = form.receivingBenefits.includes('sharm');
    const isYeled = form.receivingBenefits.includes('yeled_nake');
    const qualifiesForA1 = (mobilityMin === 100 || wheelchair || (mobilityMin >= 80 && (isSharm || isYeled)));

    if (qualifiesForA1) {
      return {
        eligible: true,
        allowanceCode: '40901',
        allowanceDescription: 'אתה עשוי להיות זכאי לקצבה בסכום של {40901}.',
        loanEligible: false,
        loanDescription: 'אינך זכאי להטבות בניידות כ"בעל רכב"',
        notes,
        legalBasis: 'הסכם הניידות — מסלול א (חסר רכב, שר"מ/ילד נכה)',
        requiresBranchVisit: false,
      };
    }
    return {
      eligible: false,
      allowanceCode: null,
      allowanceDescription: 'על פי הנתונים שהוזנו, אין זכאות להטבות בניידות כ"חסר רכב".',
      loanEligible: false,
      loanDescription: '',
      notes,
      legalBasis: 'הסכם הניידות — מסלול א',
      requiresBranchVisit: false,
    };
  }

  // ─── No vehicle registered ───
  if (form.hasOwnVehicle === false) {
    notes.push('אין זכאות לקצבת ניידות "כבעל רכב" מאחר ואין ברשותך רכב שרשום על שמך אשר משמש אותך ביום יום.');
    if (form.hasAuthorizedDriver && form.hasAuthorizedDriver !== 'none') {
      notes.push('לתשומת לבך, אתה עשוי להיות זכאי להלוואה לכיסוי המיסים החלים על הרכב. שיעור וסכום ההלוואה יקבעו על ידי הפקיד בסניף המטפל.');
    }
  }

  // ─── Build allowance code ───
  const licensePrefix = effectiveLicense ? 'license' : 'nolicense';
  let lookupKey = `${licensePrefix}_${vehicleSizeKey}_${mobilityKey}`;
  let code = ALLOWANCE_CODES[lookupKey] ?? null;

  // Fallback for no-license with 40-59% (not in table)
  if (!code && !effectiveLicense && mobilityMin < 60) {
    return {
      eligible: false,
      allowanceCode: null,
      allowanceDescription: 'על פי הנתונים שהוזנו, חסרי רישיון עם מוגבלות מתחת ל-60% אינם זכאים להטבות כבעלי רכב.',
      loanEligible: false,
      loanDescription: '',
      notes,
      legalBasis: 'הסכם הניידות — חסרי רישיון, סעיף 5(ג)',
      requiresBranchVisit: false,
    };
  }

  // ─── Loan eligibility ───
  const loanEligible = form.hasOwnVehicle === true || (form.hasAuthorizedDriver !== null && form.hasAuthorizedDriver !== 'none');
  let loanDesc = '';
  if (loanEligible) {
    loanDesc = 'הלוואה לכיסוי המיסים החלים על הרכב ובתנאי שחלף פרק הזמן לקבלת הלוואה חדשה.';
  }

  // ─── Additional notes ───
  if (effectiveEarner) {
    notes.push('אם המרחק מביתך למקום עבודתך וחזרה הוא 40 ק"מ לפחות, הינך עשוי להיות זכאי לתוספת לקצבת הניידות.');
  }
  if (wheelchair && form.vehicleCommitteeResult === 'private') {
    notes.push('הלוואה לרכישה והתקנה של מתקן הרמה לכיסא גלגלים לרכב.');
  }
  if (form.ownVehicleType?.includes('special')) {
    notes.push('אם הוועדה לגודל רכב במכון הרפואי לבטיחות בדרכים קבעה לך רכב לאבזרים מיוחדים, תוכל לבדוק זכאותך להלוואה מקרן הלוואות לקונה רכב חדש.');
    notes.push('אם הועדה קבעה לך אביזרים לרכב, תוכל לבדוק זכאותך להלוואה לרכישה ולהתקנה של אבזרים ברכב לאבזרים מיוחדים.');
  } else if (form.hasOwnVehicle) {
    notes.push('אם נקבעו לך אבזרים לרכב פרטי, תוכל לבדוק זכאותך להחזר הוצאות לרכישה ולהתקנה של אבזרים ברכב פרטי.');
  }

  return {
    eligible: code !== null,
    allowanceCode: code,
    allowanceDescription: code ? `אתה עשוי להיות זכאי לקצבת ניידות בסכום של {${code}}.` : 'לא נמצאה זכאות.',
    loanEligible,
    loanDescription: loanDesc,
    notes,
    legalBasis: `הסכם הניידות — ${effectiveLicense ? 'בעלי רישיון' : 'חסרי רישיון'}, ${vehicleSizeKey} סמ"ק, ${mobilityKey}% מוגבלות`,
    requiresBranchVisit: false,
  };
}


// ─── UI Helper Components ────────────────────────────────────────────────────

function YesNoButtons({ value, onChange, label }: { value: boolean | null; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-right">{label}</p>
      <div className="flex gap-2 justify-end">
        <button onClick={() => onChange(true)}
          className={`px-5 py-2 rounded-lg border text-sm font-medium transition-colors ${value === true ? 'border-[#1B3A5C] bg-[#1B3A5C] text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-[#1B3A5C]'}`}>
          כן
        </button>
        <button onClick={() => onChange(false)}
          className={`px-5 py-2 rounded-lg border text-sm font-medium transition-colors ${value === false ? 'border-[#1B3A5C] bg-[#1B3A5C] text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-[#1B3A5C]'}`}>
          לא
        </button>
      </div>
    </div>
  );
}

function OptionButtons({ value, onChange, label, options }: { value: string | null; onChange: (v: string) => void; label: string; options: { id: string; label: string; disabled?: boolean }[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-right">{label}</p>
      <div className="flex gap-2 flex-wrap justify-end">
        {options.map(opt => (
          <button key={opt.id} onClick={() => !opt.disabled && onChange(opt.id)} disabled={opt.disabled}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${opt.disabled ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed' : value === opt.id ? 'border-[#1B3A5C] bg-[#1B3A5C] text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-[#1B3A5C]'}`}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function MobilityCalculator() {
  const [form, setForm] = useState<FormData>({ ...INITIAL_FORM });
  const [screen, setScreen] = useState<Screen>('screen1');
  const [result, setResult] = useState<CalculatorResult | null>(null);

  const age = useMemo(() => form.birthDate ? calculateAge(form.birthDate) : null, [form.birthDate]);
  const retirementAge = getRetirementAge();
  const isAboveRetirement = age !== null && age >= retirementAge;
  const isUnder3 = age !== null && age < 3;
  const isUnder17 = age !== null && age < 17;
  const mobilityMin = getMobilityMin(form.mobilityPercentage);

  const update = (patch: Partial<FormData>) => setForm(prev => ({ ...prev, ...patch }));

  const handleReset = () => {
    setForm({ ...INITIAL_FORM });
    setScreen('screen1');
    setResult(null);
  };

  const handleCalculate = () => {
    const r = calculateEligibility(form);
    setResult(r);
    setScreen('result');
  };

  // ─── Determine next screen from screen1 ───
  const goFromScreen1 = () => {
    if (!form.birthDate || form.examinedByCommittee === null) return;

    if (isUnder3 && form.examinedByCommittee === false) {
      setScreen('screen2');
      return;
    }
    if (isAboveRetirement && form.examinedByCommittee === false && form.appliedBeforeRetirement === false) {
      setResult({
        eligible: false, allowanceCode: null,
        allowanceDescription: 'על פי הנתונים שהוזנו, אינך זכאי להטבות בניידות מאחר ולא ניתן להגיש בקשה לבדיקה רפואית לאחר גיל פרישה.',
        loanEligible: false, loanDescription: '', notes: [], legalBasis: 'הסכם הניידות — גיל פרישה', requiresBranchVisit: false,
      });
      setScreen('result');
      return;
    }
    if (isAboveRetirement && form.examinedByCommittee === false && form.appliedBeforeRetirement === true) {
      setResult({
        eligible: false, allowanceCode: null,
        allowanceDescription: 'על פי הנתונים שהוזנו, עליך להמתין עד שוועדה רפואית תבדוק אותך ותקבע לך אחוזי מוגבלות בניידות.',
        loanEligible: false, loanDescription: '',
        notes: ['על מנת להיות זכאי להטבות בניידות יהיה עליך להגיש טופס תביעה להטבות על פי הסכם הניידות (8200) תוך 60 ימים מיום שהתקבלו תוצאות הוועדה הרפואית.'],
        legalBasis: 'הסכם הניידות — ממתין לוועדה רפואית', requiresBranchVisit: false,
      });
      setScreen('result');
      return;
    }
    if (isAboveRetirement && form.examinedByCommittee === true) {
      setScreen('screen3a');
      return;
    }
    if (!isAboveRetirement && !isUnder3 && form.examinedByCommittee === false) {
      setResult({
        eligible: false, allowanceCode: null,
        allowanceDescription: 'עליך להיבדק בוועדה רפואית של משרד הבריאות לפני שאתה פונה לביטוח הלאומי בבקשה להטבות בניידות.',
        loanEligible: false, loanDescription: '',
        notes: ['יש למלא טופס בקשה לבדיקה (בל/8220).'],
        legalBasis: 'הסכם הניידות — נדרשת בדיקה רפואית', requiresBranchVisit: false,
      });
      setScreen('result');
      return;
    }
    // Examined by committee = true, or under 3 + examined
    setScreen('screen3');
  };

  // ─── Screen 3a → Screen 3 ───
  const goFromScreen3a = () => {
    if (form.receivedBenefitsBefore === false ||
        (form.receivedAllowanceBeforeRetirement === false && form.receivedLoanLast4Years === false && form.receivedLoanForCurrentVehicle === false)) {
      setResult({
        eligible: false, allowanceCode: null,
        allowanceDescription: 'על פי הנתונים שהוזנו, אין זכאות להטבות בניידות, מאחר ולא ניתן להגיש תביעה להטבות בניידות, למי שהגיע לגיל פרישה.',
        loanEligible: false, loanDescription: '', notes: [], legalBasis: 'הסכם הניידות — גיל פרישה, לא קיבל הטבות', requiresBranchVisit: false,
      });
      setScreen('result');
      return;
    }
    setScreen('screen3');
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-right">
            <Calculator className="h-5 w-5" style={{ color: '#1B3A5C' }} />
            <span>מחשבון זכאות לניידות</span>
          </CardTitle>
          <p className="text-xs text-muted-foreground text-right">
            שחזור המחשבון הרשמי של הביטוח הלאומי — לוגיקה דטרמיניסטית בלבד
          </p>
        </CardHeader>
      </Card>

      {/* Pilot banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 text-right">
        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-amber-800">
          <strong>פיילוט ראשוני</strong> — כלי תומך החלטה בלבד. הסכומים המוצגים הם קודי סכום ({'{'}XXXXX{'}'}) ולא סכומים בש"ח.
          התוצאה אינה מהווה החלטה רשמית.
        </div>
      </div>

      {/* ═══ Screen 1: Basic Info ═══ */}
      {screen === 'screen1' && (
        <Card>
          <CardHeader><CardTitle className="text-right text-base">מסך 1 — פרטים בסיסיים</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium text-right">תאריך לידה</p>
              <Input type="date" value={form.birthDate} onChange={e => update({ birthDate: e.target.value })} className="text-right max-w-xs" dir="ltr" />
              {age !== null && <p className="text-xs text-muted-foreground text-right">גיל: {age} | גיל פרישה: {retirementAge}</p>}
            </div>

            <YesNoButtons label="האם נבדקת בוועדה רפואית/ועדת ערר של משרד הבריאות, והוועדה קבעה לך אחוזי מוגבלות בניידות (40% ומעלה)?"
              value={form.examinedByCommittee} onChange={v => update({ examinedByCommittee: v })} />

            {isAboveRetirement && form.examinedByCommittee === false && (
              <YesNoButtons label="האם הגשת בקשה להיבדק בוועדה רפואית טרם הגעת לגיל פרישה?"
                value={form.appliedBeforeRetirement} onChange={v => update({ appliedBeforeRetirement: v })} />
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium text-right">אני מקבל אחת או יותר מהקצבאות הבאות:</p>
              <div className="flex gap-2 flex-wrap justify-end">
                {[
                  { id: 'nk', label: 'נכות כללית' },
                  { id: 'sharm', label: 'שירותים מיוחדים לנכים' },
                  { id: 'yeled_nake', label: 'ילד נכה' },
                  { id: 'none', label: 'לא מקבל קצבה' },
                ].map(opt => (
                  <button key={opt.id}
                    onClick={() => {
                      if (opt.id === 'none') { update({ receivingBenefits: ['none'] }); return; }
                      const current = form.receivingBenefits.filter(b => b !== 'none');
                      const next = current.includes(opt.id) ? current.filter(b => b !== opt.id) : [...current, opt.id];
                      update({ receivingBenefits: next });
                    }}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${form.receivingBenefits.includes(opt.id) ? 'border-[#1B3A5C] bg-[#1B3A5C] text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-[#1B3A5C]'}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-start pt-2">
              <Button onClick={goFromScreen1} disabled={!form.birthDate || form.examinedByCommittee === null}
                style={{ backgroundColor: '#1B3A5C' }} className="text-white">
                המשך <ChevronLeft className="h-4 w-4 mr-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ Screen 2: Child under 3, not examined ═══ */}
      {screen === 'screen2' && (
        <Card>
          <CardHeader><CardTitle className="text-right text-base">מסך 2 — ילד עד גיל 3</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <YesNoButtons label="האם מתגורר איתך בבית אח/ות נוסף עם מוגבלות בניידות בשיעור של 80 אחוז לפחות?"
              value={form.usesWheelchair} onChange={v => {
                if (v) {
                  setResult({
                    eligible: false, allowanceCode: null,
                    allowanceDescription: 'על פי הנתונים שהוזנו, מומלץ להיבדק בלשכת הבריאות לצורך קביעת מוגבלות בניידות.',
                    loanEligible: false, loanDescription: '',
                    notes: ['קישור לטופס בקשה לבדיקה רפואית (בל/8220).'],
                    legalBasis: 'הסכם הניידות — ילד עד גיל 3 עם אח/ות מוגבל', requiresBranchVisit: false,
                  });
                  setScreen('result');
                } else {
                  setResult({
                    eligible: false, allowanceCode: null,
                    allowanceDescription: 'על פי הנתונים שהוזנו, אין זכאות להטבות בניידות.',
                    loanEligible: false, loanDescription: '',
                    notes: ['כשימלאו לילד 3 שנים - מומלץ להיבדק בלשכת הבריאות לצורך קביעת מוגבלות בניידות ולבדוק זכאות להטבות פעם נוספת.'],
                    legalBasis: 'הסכם הניידות — ילד עד גיל 3', requiresBranchVisit: false,
                  });
                  setScreen('result');
                }
              }} />
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setScreen('screen1')}>
                <ChevronRight className="h-4 w-4 ml-1" /> חזרה
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ Screen 3a: Retirement + examined ═══ */}
      {screen === 'screen3a' && (
        <Card>
          <CardHeader><CardTitle className="text-right text-base">מסך 3א — מעל גיל פרישה</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <YesNoButtons label="קיבלתי בעבר הטבות בניידות"
              value={form.receivedBenefitsBefore} onChange={v => update({ receivedBenefitsBefore: v })} />

            {form.receivedBenefitsBefore === true && (
              <>
                <YesNoButtons label="קיבלתי קצבת ניידות בחודש שקדם לגיל הפרישה"
                  value={form.receivedAllowanceBeforeRetirement} onChange={v => update({ receivedAllowanceBeforeRetirement: v })} />
                <YesNoButtons label="קיבלתי הלוואה לכיסוי המיסים (הלוואה עומדת) במהלך ארבע השנים שקדמו לגיל הפרישה"
                  value={form.receivedLoanLast4Years} onChange={v => update({ receivedLoanLast4Years: v })} />
                <YesNoButtons label="קיבלתי הלוואה לכיסוי המיסים (הלוואה עומדת) עבור רכב שנמצא עדיין בבעלותי וברשותי"
                  value={form.receivedLoanForCurrentVehicle} onChange={v => update({ receivedLoanForCurrentVehicle: v })} />
              </>
            )}

            <div className="flex justify-between pt-2">
              <Button onClick={goFromScreen3a} disabled={form.receivedBenefitsBefore === null}
                style={{ backgroundColor: '#1B3A5C' }} className="text-white">
                המשך <ChevronLeft className="h-4 w-4 mr-1" />
              </Button>
              <Button variant="outline" onClick={() => setScreen('screen1')}>
                <ChevronRight className="h-4 w-4 ml-1" /> חזרה
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ Screen 3: Main eligibility questions ═══ */}
      {screen === 'screen3' && (
        <Card>
          <CardHeader><CardTitle className="text-right text-base">מסך 3 — בדיקת זכאות</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {/* License & Income — only for age 17+ */}
            {!isUnder17 && (
              <>
                <YesNoButtons label="יש לי רישיון נהיגה בתוקף" value={form.hasLicense} onChange={v => update({ hasLicense: v })} />
                <YesNoButtons label="יש לי הכנסה מעבודה שעולה על {49971} / אני חייל בשירות סדיר" value={form.hasIncome} onChange={v => update({ hasIncome: v })} />
              </>
            )}

            {/* Mobility percentage */}
            <OptionButtons label="אחוז המוגבלות בניידות שקבעה הוועדה הרפואית:" value={form.mobilityPercentage}
              onChange={v => update({ mobilityPercentage: v })}
              options={[
                { id: '40-49', label: '40-49%' }, { id: '50-59', label: '50-59%' },
                { id: '60-69', label: '60-69%' }, { id: '70-79', label: '70-79%' },
                { id: '80-90', label: '80-90%' }, { id: '100', label: '100%' },
              ]} />

            {/* Wheelchair */}
            <YesNoButtons label="הוועדה הרפואית קבעה שאני זקוק ומשתמש בכיסא גלגלים או מרותק לכיסא גלגלים"
              value={form.usesWheelchair} onChange={v => update({ usesWheelchair: v })} />

            {/* Authorized driver — only if 60%+ and no license */}
            {mobilityMin >= 60 && form.hasLicense === false && (
              <OptionButtons label="יש מישהו שיכול לנהוג עבורי והוא אחד מאלה:" value={form.hasAuthorizedDriver}
                onChange={v => update({ hasAuthorizedDriver: v })}
                options={[
                  { id: 'family', label: 'קרוב משפחה' },
                  { id: 'caretaker', label: 'מטפל (מורשה נהיגה)' },
                  { id: 'none', label: 'אין מי שיכול לנהוג עבורי' },
                ]} />
            )}

            {/* Vehicle size committee — only if has authorized driver or has license */}
            {(form.hasAuthorizedDriver !== 'none' || form.hasLicense === true) && form.mobilityPercentage && (
              <>
                <YesNoButtons label="נבדקתי בוועדה לגודל רכב במכון הרפואי לבטיחות בדרכים"
                  value={form.examinedByVehicleCommittee} onChange={v => update({ examinedByVehicleCommittee: v })} />

                {form.examinedByVehicleCommittee === true && (
                  <OptionButtons label="הוועדה קבעה לי רכב:" value={form.vehicleCommitteeResult}
                    onChange={v => update({ vehicleCommitteeResult: v })}
                    options={[
                      { id: 'private', label: 'פרטי' },
                      { id: 'special_equipment', label: 'לאביזרים מיוחדים', disabled: form.usesWheelchair === false },
                      { id: 'special_chose_private', label: 'לאביזרים מיוחדים אך בחרתי רכב פרטי' },
                    ]} />
                )}

                {form.vehicleCommitteeResult === 'special_equipment' && (
                  <OptionButtons label="הרכב שהוועדה קבעה הוא:" value={form.specialEquipmentType}
                    onChange={v => update({ specialEquipmentType: v })}
                    options={[
                      { id: 'special100k', label: 'אבזור עד 100,000 ₪' },
                      { id: 'special100k+', label: 'אבזור מעל 100,000 ₪' },
                      { id: 'special_joystick', label: 'הגה חשמלי או ג\'ויסטיק' },
                    ]} />
                )}

                {form.vehicleCommitteeResult === 'private' && (
                  <OptionButtons label="נפח המנוע של הרכב שנקבע בוועדה:" value={form.committeeEngineVolume}
                    onChange={v => update({ committeeEngineVolume: v })}
                    options={[
                      { id: '1300', label: 'עד 1,300 סמ"ק', disabled: mobilityMin >= 80 && form.hasLicense === true },
                      { id: '1800', label: 'עד 1,800 סמ"ק' },
                      { id: '2000', label: 'עד 2,000 סמ"ק' },
                      { id: '2000+', label: 'מעל 2,000 סמ"ק' },
                    ]} />
                )}

                {/* Own vehicle */}
                <YesNoButtons label="יש לי רכב שרשום על שמי אשר משמש אותי ביום יום"
                  value={form.hasOwnVehicle} onChange={v => update({ hasOwnVehicle: v })} />

                {form.hasOwnVehicle === true && (
                  <OptionButtons label="הרכב שלי הוא:" value={form.ownVehicleType}
                    onChange={v => update({ ownVehicleType: v })}
                    options={[
                      { id: '1300', label: 'עד 1,300 סמ"ק' },
                      { id: '1800', label: 'עד 1,800 סמ"ק' },
                      { id: '2000', label: 'עד 2,000 סמ"ק' },
                      { id: '2000+', label: 'מעל 2,000 סמ"ק' },
                      { id: 'special100k', label: 'אבזרים מיוחדים עד 100,000 ₪', disabled: form.vehicleCommitteeResult === 'private' },
                      { id: 'special100k+', label: 'אבזרים מיוחדים מעל 100,000 ₪', disabled: form.vehicleCommitteeResult === 'private' },
                      { id: 'special_joystick', label: 'אבזרים מיוחדים + הגה/ג\'ויסטיק', disabled: form.vehicleCommitteeResult === 'private' },
                    ]} />
                )}
              </>
            )}

            <div className="flex justify-between pt-4">
              <Button onClick={handleCalculate} disabled={!form.mobilityPercentage}
                style={{ backgroundColor: '#1B3A5C' }} className="text-white px-6">
                <Calculator className="h-4 w-4 mr-2" /> חשב זכאות
              </Button>
              <Button variant="outline" onClick={() => setScreen(isAboveRetirement ? 'screen3a' : 'screen1')}>
                <ChevronRight className="h-4 w-4 ml-1" /> חזרה
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ Result Screen ═══ */}
      {screen === 'result' && result && (
        <Card className={`border-2 ${result.eligible ? 'border-green-300' : result.requiresBranchVisit ? 'border-amber-300' : 'border-red-200'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-right">
              {result.eligible ? <CheckCircle2 className="h-5 w-5 text-green-600" /> :
               result.requiresBranchVisit ? <AlertTriangle className="h-5 w-5 text-amber-600" /> :
               <XCircle className="h-5 w-5 text-red-500" />}
              <span>תוצאת בדיקה</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-right">
            <div className={`p-4 rounded-lg ${result.eligible ? 'bg-green-50' : result.requiresBranchVisit ? 'bg-amber-50' : 'bg-red-50'}`}>
              <p className="font-medium text-base">{result.allowanceDescription}</p>
              {result.allowanceCode && (
                <p className="text-sm text-muted-foreground mt-1">קוד סכום: {result.allowanceCode}</p>
              )}
            </div>

            {result.loanEligible && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-blue-800">💰 {result.loanDescription}</p>
              </div>
            )}

            {result.notes.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-1"><Info className="h-4 w-4" /> לתשומת לבך:</p>
                {result.notes.map((note, i) => (
                  <div key={i} className="bg-gray-50 p-2 rounded text-sm text-gray-700">- {note}</div>
                ))}
              </div>
            )}

            <div className="bg-gray-100 p-3 rounded-lg text-xs text-gray-600">
              <p><strong>בסיס משפטי:</strong> {result.legalBasis}</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-800">
              <strong>הבהרה:</strong> תוצאה זו מבוססת על הנתונים שהוזנו בלבד ואינה מהווה החלטה רשמית.
              הזכאות הסופית נקבעת על ידי פקיד הביטוח הלאומי בסניף.
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleReset} variant="outline" className="flex items-center gap-1">
                <RotateCcw className="h-4 w-4" /> בדיקה חדשה
              </Button>
              <Button onClick={() => { setScreen('screen3'); setResult(null); }} variant="outline" className="flex items-center gap-1">
                <ChevronRight className="h-4 w-4" /> חזרה לעריכה
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
