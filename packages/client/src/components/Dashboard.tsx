import { Card, CardContent } from '@/components/ui/card';
import { Scale, FileText, Shield, Brain, Users, TrendingUp } from 'lucide-react';

interface Props {
  onNavigate: (tab: string) => void;
}

export function Dashboard({ onNavigate }: Props) {
  return (
    <div className="space-y-8 max-w-4xl">
      {/* Hero */}
      <div className="rounded-xl p-6 text-white" style={{ backgroundColor: '#1B3A5C' }}>
        <h2 className="text-xl font-bold mb-2">שיטת עבודה חדשה למיצוי זכויות</h2>
        <p className="text-sm opacity-90 leading-relaxed max-w-2xl">
          המנוע מתרגם חוזרים, הסכמים ופסקי דין ללוגיקה דטרמיניסטית.
          הפקיד מקבל המלצה מבוססת עם ציטוט משפטי מדויק — ומחליט.
          המערכת לומדת מהפידבק ומשתדרגת בהדרגה.
        </p>
        <div className="flex gap-4 mt-4">
          <div className="bg-white/15 rounded-lg px-4 py-2 text-center">
            <p className="text-2xl font-bold">14</p>
            <p className="text-xs opacity-80">כללים פעילים</p>
          </div>
          <div className="bg-white/15 rounded-lg px-4 py-2 text-center">
            <p className="text-2xl font-bold">4</p>
            <p className="text-xs opacity-80">פסקי דין</p>
          </div>
          <div className="bg-white/15 rounded-lg px-4 py-2 text-center">
            <p className="text-2xl font-bold">5</p>
            <p className="text-xs opacity-80">חוזרים</p>
          </div>
          <div className="bg-white/15 rounded-lg px-4 py-2 text-center">
            <p className="text-2xl font-bold">~2ms</p>
            <p className="text-xs opacity-80">זמן תגובה</p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div>
        <h3 className="text-base font-semibold mb-3 text-gray-800">איך זה עובד</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-2 border-[#1B3A5C]/10">
            <CardContent className="pt-5 text-center space-y-2">
              <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center text-white" style={{ backgroundColor: '#1B3A5C' }}>
                <span className="text-lg font-bold">1</span>
              </div>
              <p className="text-sm font-medium">הפקיד מזין נתונים</p>
              <p className="text-xs text-gray-500">ת.ז., אחוז נכות, סוג תביעה, מצב תפעולי</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-[#1B3A5C]/10">
            <CardContent className="pt-5 text-center space-y-2">
              <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center text-white" style={{ backgroundColor: '#1B3A5C' }}>
                <span className="text-lg font-bold">2</span>
              </div>
              <p className="text-sm font-medium">המנוע בודק 14 כללים</p>
              <p className="text-xs text-gray-500">חוזרים, הסכמים, פסקי דין — לפי היררכיה משפטית</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-[#1B3A5C]/10">
            <CardContent className="pt-5 text-center space-y-2">
              <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center text-white" style={{ backgroundColor: '#1B3A5C' }}>
                <span className="text-lg font-bold">3</span>
              </div>
              <p className="text-sm font-medium">הפקיד מקבל המלצה</p>
              <p className="text-xs text-gray-500">זכאי/לא זכאי + הסבר עברי + ציטוט + רמת ודאות</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Certainty model */}
      <div>
        <h3 className="text-base font-semibold mb-3 text-gray-800">מודל ודאות — שלוש רמות החלטה</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-2 border-green-200 bg-green-50/50">
            <CardContent className="pt-5 space-y-2">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-green-700" />
                <span className="text-sm font-bold text-green-800">סוג א — דטרמיניסטי</span>
              </div>
              <p className="text-xs text-green-700">החלטה אוטומטית מלאה. כל התנאים ברורים, אין עמימות. ניתן לאוטומציה.</p>
              <p className="text-xs text-green-600 font-medium">🤖 אוטונומי בעתיד</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-amber-200 bg-amber-50/50">
            <CardContent className="pt-5 space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-700" />
                <span className="text-sm font-bold text-amber-800">סוג ב — המלצה</span>
              </div>
              <p className="text-xs text-amber-700">בסיס משפטי חזק אך דורש אישור פקיד בכיר. קונפליקטים נפתרו לפי היררכיה.</p>
              <p className="text-xs text-amber-600 font-medium">👤 פקיד מאשר</p>
            </CardContent>
          </Card>
          <Card className="border-2 border-red-200 bg-red-50/50">
            <CardContent className="pt-5 space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-red-700" />
                <span className="text-sm font-bold text-red-800">סוג ג — שיקול דעת</span>
              </div>
              <p className="text-xs text-red-700">נדרשת סקירה מקצועית — רפואית, משפטית או תפעולית. המערכת מסמנת, לא מחליטה.</p>
              <p className="text-xs text-red-600 font-medium">🔍 סקירה ידנית</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h3 className="text-base font-semibold mb-3 text-gray-800">התחל כאן</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button onClick={() => onNavigate('eligibility')} className="p-4 rounded-lg border-2 border-gray-200 hover:border-[#1B3A5C] transition-colors text-center group">
            <Scale className="h-6 w-6 mx-auto text-gray-400 group-hover:text-[#1B3A5C] transition-colors" />
            <p className="text-xs font-medium mt-2">בדיקת זכאות</p>
          </button>
          <button onClick={() => onNavigate('edge-cases')} className="p-4 rounded-lg border-2 border-gray-200 hover:border-[#1B3A5C] transition-colors text-center group">
            <TrendingUp className="h-6 w-6 mx-auto text-gray-400 group-hover:text-[#1B3A5C] transition-colors" />
            <p className="text-xs font-medium mt-2">סימולציית קצה</p>
          </button>
          <button onClick={() => onNavigate('sources')} className="p-4 rounded-lg border-2 border-gray-200 hover:border-[#1B3A5C] transition-colors text-center group">
            <FileText className="h-6 w-6 mx-auto text-gray-400 group-hover:text-[#1B3A5C] transition-colors" />
            <p className="text-xs font-medium mt-2">חומרי מקור</p>
          </button>
          <button onClick={() => onNavigate('explanation')} className="p-4 rounded-lg border-2 border-gray-200 hover:border-[#1B3A5C] transition-colors text-center group">
            <Shield className="h-6 w-6 mx-auto text-gray-400 group-hover:text-[#1B3A5C] transition-colors" />
            <p className="text-xs font-medium mt-2">הסבר כללים</p>
          </button>
        </div>
      </div>

      {/* Evolution roadmap */}
      <Card>
        <CardContent className="pt-5">
          <h3 className="text-base font-semibold mb-3">מסלול התפתחות</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">✓</div>
              <div>
                <p className="text-sm font-medium">שלב 1 — כלי סיוע לפקיד</p>
                <p className="text-xs text-gray-500">המנוע ממליץ, הפקיד מחליט ונותן פידבק. המערכת לומדת ומשתפרת.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-amber-400 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
              <div>
                <p className="text-sm font-medium">שלב 2 — ממשל ובקרה</p>
                <p className="text-xs text-gray-500">ניהול מחזור חיי מדיניות, בקרת גישה, דשבורד KPI, sandbox לבדיקות.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-gray-300 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
              <div>
                <p className="text-sm font-medium">שלב 3 — אוטונומיה מבוקרת</p>
                <p className="text-xs text-gray-500">החלטות סוג א — אוטומטיות. סוג ב — אישור פקיד. סוג ג — סקירה ידנית. אינטגרציה למערכות ליבה.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
