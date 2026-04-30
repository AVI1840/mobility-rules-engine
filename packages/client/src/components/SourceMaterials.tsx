import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SourceDoc {
  id: string;
  name: string;
  type: string;
  typeLabel: string;
  priority: string;
  priorityLabel: string;
  priorityColor: string;
  description: string;
  ruleCount: number;
  status: 'active' | 'encoded';
}

const SOURCES: SourceDoc[] = [
  {
    id: 'mobility-agreement', name: 'הסכם הניידות', type: 'statutory', typeLabel: 'הסכם',
    priority: 'statutory', priorityLabel: 'חקיקה', priorityColor: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'ההסכם הראשי המסדיר את זכויות הניידות לאנשים עם מוגבלות בישראל', ruleCount: 1, status: 'encoded',
  },
  {
    id: 'circular-1810', name: 'חוזר ניידות 1810', type: 'circular', typeLabel: 'חוזר',
    priority: 'circular', priorityLabel: 'חוזר', priorityColor: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'קצבת חסר רכב לשוהים במוסד - תנאי זכאות ואופן חישוב', ruleCount: 1, status: 'encoded',
  },
  {
    id: 'circular-1905', name: 'חוזר 1905 - בג"צ שושנה לוי', type: 'judicial', typeLabel: 'פסיקה',
    priority: 'judicial_override', priorityLabel: 'עקיפה שיפוטית', priorityColor: 'bg-red-100 text-red-800 border-red-300',
    description: 'הרחבת זכאות למי שאינו מחזיק רישיון נהיגה בשל מוגבלות', ruleCount: 1, status: 'encoded',
  },
  {
    id: 'circular-1931', name: 'חוזר 1931', type: 'procedural', typeLabel: 'נוהל',
    priority: 'procedural', priorityLabel: 'נוהלי', priorityColor: 'bg-gray-100 text-gray-800 border-gray-300',
    description: 'הנחיות כלליות לטיפול בתביעות ניידות', ruleCount: 1, status: 'encoded',
  },
  {
    id: 'circular-1936', name: 'חוזר 1936', type: 'circular', typeLabel: 'חוזר',
    priority: 'circular', priorityLabel: 'חוזר', priorityColor: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'מניעת כפל גמלאות באגף גמלאות', ruleCount: 1, status: 'encoded',
  },
  {
    id: 'circular-1984', name: 'חוזר 1984', type: 'procedural', typeLabel: 'נוהל',
    priority: 'procedural', priorityLabel: 'נוהלי', priorityColor: 'bg-gray-100 text-gray-800 border-gray-300',
    description: 'כללי משיכת ערר וביטול', ruleCount: 1, status: 'encoded',
  },
  {
    id: 'circular-1996', name: 'חוזר 1996 - תיקון 24', type: 'statutory', typeLabel: 'תיקון',
    priority: 'statutory', priorityLabel: 'חקיקה', priorityColor: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'תיקון 24 להסכם ניידות - קריטריוני זכאות מעודכנים', ruleCount: 1, status: 'encoded',
  },
  {
    id: 'circular-2056', name: 'חוזר ניידות 2056', type: 'circular', typeLabel: 'חוזר',
    priority: 'circular', priorityLabel: 'חוזר', priorityColor: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'סמכות המכון הרפואי לקבוע רכב בנפח מנוע קטן יותר', ruleCount: 1, status: 'encoded',
  },
  {
    id: 'circular-2132', name: 'חוזר ניידות 2132', type: 'circular', typeLabel: 'חוזר',
    priority: 'circular', priorityLabel: 'חוזר', priorityColor: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'שינוי בהליך הגשת תביעה להטבות בניידות', ruleCount: 1, status: 'encoded',
  },
  {
    id: 'opinion-continued', name: 'חוות דעת - המשך תשלום', type: 'statutory', typeLabel: 'חוות דעת',
    priority: 'statutory', priorityLabel: 'חקיקה', priorityColor: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'המשך תשלום קצבה למשך 3 חודשים לאחר פטירה/אשפוז מורשה נהיגה', ruleCount: 1, status: 'encoded',
  },
  {
    id: 'loan-fund', name: 'הסכם קרן הלוואות', type: 'statutory', typeLabel: 'הסכם',
    priority: 'statutory', priorityLabel: 'חקיקה', priorityColor: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'זכאות הלוואה מקרן הלוואות ניידות לרכישת רכב', ruleCount: 1, status: 'encoded',
  },
  {
    id: 'ruling-hadaya', name: 'פסק דין רות הדאיה', type: 'judicial', typeLabel: 'פסיקה',
    priority: 'judicial_override', priorityLabel: 'עקיפה שיפוטית', priorityColor: 'bg-red-100 text-red-800 border-red-300',
    description: 'עדכון טפסים ומקרים לטיפול - דורש שיקול דעת', ruleCount: 1, status: 'encoded',
  },
  {
    id: 'ruling-lavi', name: 'פסק דין גלית לביא', type: 'judicial', typeLabel: 'פסיקה',
    priority: 'judicial_override', priorityLabel: 'עקיפה שיפוטית', priorityColor: 'bg-red-100 text-red-800 border-red-300',
    description: 'הרחבת זכאות ניידות - תקדים שיפוטי', ruleCount: 1, status: 'encoded',
  },
  {
    id: 'ruling-arueti', name: 'פסד שקד ארועטי', type: 'judicial', typeLabel: 'פסיקה',
    priority: 'judicial_override', priorityLabel: 'עקיפה שיפוטית', priorityColor: 'bg-red-100 text-red-800 border-red-300',
    description: 'תקדים שיפוטי בנושא זכאות ניידות', ruleCount: 1, status: 'encoded',
  },
  // === כללים מהסכם הניידות ===
  {
    id: 'agreement-s5b', name: 'הסכם הניידות - סעיף 5(ב)', type: 'statutory', typeLabel: 'הסכם',
    priority: 'statutory', priorityLabel: 'חקיקה', priorityColor: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'הלוואה עומדת לבעל רישיון נהיגה - 40% מוגבלות לפחות', ruleCount: 1, status: 'encoded',
  },
  {
    id: 'agreement-s5c', name: 'הסכם הניידות - סעיף 5(ג)', type: 'statutory', typeLabel: 'הסכם',
    priority: 'statutory', priorityLabel: 'חקיקה', priorityColor: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'הלוואה עומדת ללא רישיון - 60% מוגבלות, צרכים יומיים, מורשה נהיגה', ruleCount: 1, status: 'encoded',
  },
  {
    id: 'agreement-s4', name: 'הסכם הניידות - סעיף 4', type: 'statutory', typeLabel: 'הסכם',
    priority: 'statutory', priorityLabel: 'חקיקה', priorityColor: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'אי תחולה - נכה לפי חוק אחר עם הסדר קיים', ruleCount: 1, status: 'encoded',
  },
  {
    id: 'agreement-s14', name: 'הסכם הניידות - סעיף 14', type: 'statutory', typeLabel: 'הסכם',
    priority: 'statutory', priorityLabel: 'חקיקה', priorityColor: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'תוספת קצבה - מרחק עבודה 40 ק"מ הלוך וחזור', ruleCount: 1, status: 'encoded',
  },
  {
    id: 'agreement-appendix-c', name: 'הסכם הניידות - תוספת ג\'', type: 'statutory', typeLabel: 'הסכם',
    priority: 'statutory', priorityLabel: 'חקיקה', priorityColor: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'רכב קובע - נפח מנוע לפי אחוז מוגבלות ורישיון', ruleCount: 1, status: 'encoded',
  },
  {
    id: 'agreement-appendix-d', name: 'הסכם הניידות - תוספת ד\'', type: 'statutory', typeLabel: 'הסכם',
    priority: 'statutory', priorityLabel: 'חקיקה', priorityColor: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'שיעורי הלוואה עומדת - אחוז מההלוואה המלאה', ruleCount: 1, status: 'encoded',
  },
  {
    id: 'agreement-s13', name: 'הסכם הניידות - סעיף 13', type: 'statutory', typeLabel: 'הסכם',
    priority: 'statutory', priorityLabel: 'חקיקה', priorityColor: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'קצבת ניידות לבעלי רכב - לפי תוספת ח\'', ruleCount: 1, status: 'encoded',
  },
  {
    id: 'agreement-s11', name: 'הסכם הניידות - סעיף 11', type: 'statutory', typeLabel: 'הסכם',
    priority: 'statutory', priorityLabel: 'חקיקה', priorityColor: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'החלפת רכב - 42/48 חודשים לפי רישיון', ruleCount: 1, status: 'encoded',
  },
  {
    id: 'agreement-s20', name: 'הסכם הניידות - סעיף 20', type: 'statutory', typeLabel: 'הסכם',
    priority: 'statutory', priorityLabel: 'חקיקה', priorityColor: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'הפסקת תשלום - אשפוז/יציאה מהארץ/הפסקת שימוש', ruleCount: 1, status: 'encoded',
  },
  {
    id: 'agreement-s9a', name: 'הסכם הניידות - סעיף 9א', type: 'statutory', typeLabel: 'הסכם',
    priority: 'statutory', priorityLabel: 'חקיקה', priorityColor: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'רכב קובע 2000 סמ"ק - 100% מוגבלות, כיסא גלגלים, משתכר', ruleCount: 1, status: 'encoded',
  },
];

const PRIMARY_SOURCES = [
  { name: 'מחשבון ניידות רשמי', desc: 'עוגן הלוגיקה העסקית — עץ החלטות מלא עם קודי סכום', status: 'מקודד במלואו' },
  { name: 'הסכם הניידות', desc: 'ההסכם הראשי — סעיפים 4, 5, 9א, 11, 13, 14, 20, תוספות ג\'-ד\'', status: 'מקודד' },
  { name: 'תדריך ניידות', desc: 'מדריך מקצועי לפקידים — ממתין לקידוד', status: 'ממתין' },
];

const PRIORITY_HIERARCHY = [
  { level: 1, label: 'עקיפה שיפוטית', color: 'bg-red-500', desc: 'פסקי דין גוברים על הכל' },
  { level: 2, label: 'חקיקה / הסכם', color: 'bg-blue-500', desc: 'הסכם הניידות ותיקוניו' },
  { level: 3, label: 'מחשבון רשמי', color: 'bg-emerald-500', desc: 'עוגן הלוגיקה — מאושר ופעיל באתר' },
  { level: 4, label: 'חוזר מנהלי', color: 'bg-purple-500', desc: 'חוזרי ביטוח לאומי' },
  { level: 5, label: 'נוהל', color: 'bg-gray-400', desc: 'הנחיות תפעוליות' },
];

export function SourceMaterials() {
  const judicialCount = SOURCES.filter(s => s.priority === 'judicial_override').length;
  const statutoryCount = SOURCES.filter(s => s.priority === 'statutory').length;
  const circularCount = SOURCES.filter(s => s.priority === 'circular').length;
  const proceduralCount = SOURCES.filter(s => s.priority === 'procedural').length;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">חומרי מקור מקודדים במנוע</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-2xl font-bold text-red-700">{judicialCount}</p>
              <p className="text-xs text-red-600 mt-1">פסקי דין</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-2xl font-bold text-blue-700">{statutoryCount}</p>
              <p className="text-xs text-blue-600 mt-1">הסכמים / חקיקה</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-purple-50 border border-purple-200">
              <p className="text-2xl font-bold text-purple-700">{circularCount}</p>
              <p className="text-xs text-purple-600 mt-1">חוזרים</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-2xl font-bold text-gray-700">{proceduralCount}</p>
              <p className="text-xs text-gray-600 mt-1">נהלים</p>
            </div>
          </div>

          <div className="text-center p-4 rounded-lg border-2 border-[#1B3A5C]/20 bg-[#1B3A5C]/5">
            <p className="text-3xl font-bold" style={{ color: '#1B3A5C' }}>{SOURCES.length}</p>
            <p className="text-sm text-gray-600 mt-1">סה"כ מסמכים מקודדים ← {SOURCES.length} כללים פעילים</p>
          </div>
        </CardContent>
      </Card>

      {/* Primary Sources */}
      <Card className="border-2 border-[#1B3A5C]/30">
        <CardHeader>
          <CardTitle className="text-base" style={{ color: '#1B3A5C' }}>🏛️ מקורות ראשיים — בסיס הלוגיקה</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {PRIMARY_SOURCES.map((src, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[#1B3A5C]/5 border border-[#1B3A5C]/20">
              <div className="w-8 h-8 rounded-full bg-[#1B3A5C] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">{i + 1}</div>
              <div className="flex-1">
                <p className="text-sm font-bold">{src.name}</p>
                <p className="text-xs text-gray-600">{src.desc}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${src.status === 'ממתין' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                {src.status}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Priority Hierarchy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">היררכיה משפטית — סדר עדיפויות</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {PRIORITY_HIERARCHY.map(p => (
              <div key={p.level} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${p.color} text-white flex items-center justify-center text-sm font-bold`}>
                  {p.level}
                </div>
                <div>
                  <span className="text-sm font-medium">{p.label}</span>
                  <span className="text-xs text-gray-500 mr-2"> — {p.desc}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">כאשר שני כללים מתנגשים, הכלל בעדיפות גבוהה יותר גובר. בעדיפות שווה — הכלל המאוחר יותר גובר (lex posterior).</p>
        </CardContent>
      </Card>

      {/* Source list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">רשימת מסמכים מפורטת</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {SOURCES.map(src => (
            <div key={src.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
              <div className="flex-shrink-0 mt-0.5">
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${src.priorityColor}`}>
                  {src.priorityLabel}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{src.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{src.description}</p>
              </div>
              <div className="flex-shrink-0">
                <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 font-medium">
                  ✓ מקודד
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
