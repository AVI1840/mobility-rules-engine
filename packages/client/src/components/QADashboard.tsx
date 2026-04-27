import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiPost } from '@/lib/api';

interface CaseDetail {
  case_id: string;
  description: string;
  clerk_decision: string;
  engine_decision: string;
  match: boolean;
  certainty_class: string;
  confidence_score: number;
  discrepancy_type: string | null;
  applied_rules_count: number;
  processing_time_ms: number;
}

interface BatchAnalytics {
  accuracy_percentage: number;
  false_approvals: number;
  false_denials: number;
  ambiguity_count: number;
  policy_superiority_count: number;
  trust_score: number;
  readiness_score: number;
}

interface BacktestResponse {
  status: string;
  data: {
    total_cases_run: number;
    passed_count: number;
    failed_count: number;
    failure_rate_percentage: number;
    batch_analytics: BatchAnalytics;
    case_details: CaseDetail[];
  };
}

const decisionHe: Record<string, string> = {
  eligible: 'זכאי',
  not_eligible: 'לא זכאי',
  partial: 'חלקי',
  pending_discretion: 'שיקול דעת',
  requires_additional_information: 'חסר מידע',
};

const discrepancyHe: Record<string, string> = {
  false_approval: 'אישור שגוי',
  false_denial: 'דחייה שגויה',
  ambiguity: 'עמימות',
  policy_superiority: 'עדיפות מדיניות',
};

const certaintyStyles: Record<string, string> = {
  A_deterministic: 'bg-green-100 text-green-800',
  B_recommendation: 'bg-amber-100 text-amber-800',
  C_discretion_required: 'bg-red-100 text-red-800',
};

const certaintyHe: Record<string, string> = {
  A_deterministic: 'דטרמיניסטי',
  B_recommendation: 'המלצה',
  C_discretion_required: 'שיקול דעת',
};

export function QADashboard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResponse['data'] | null>(null);
  const [error, setError] = useState('');

  const runBacktest = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await apiPost<BacktestResponse>('/api/v1/backtest', {});
      setResult(data.data);
    } catch {
      setError('שגיאה בהרצת הבדיקות');
    } finally {
      setLoading(false);
    }
  };

  const analytics = result?.batch_analytics;

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">בנצ'מרק — בדיקת דיוק מול מקרים היסטוריים</CardTitle>
          <p className="text-xs text-gray-500 mt-1">הרצת 12 מקרים אנונימיים מול המנוע ומדידת התאמה להחלטות פקידים</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={runBacktest} disabled={loading} className="text-white" style={{ backgroundColor: '#1B3A5C' }}>
            {loading ? 'מריץ בנצ\'מרק...' : 'הרץ בנצ\'מרק'}
          </Button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {result && analytics && (
        <>
          {/* Trust & Readiness Scores */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-2 border-[#1B3A5C]/20">
              <CardContent className="pt-5 text-center">
                <p className="text-4xl font-bold" style={{ color: '#1B3A5C' }}>{analytics.trust_score.toFixed(0)}%</p>
                <p className="text-sm text-gray-600 mt-1">ציון אמון</p>
                <p className="text-xs text-gray-400 mt-0.5">שילוב דיוק, ביטחון, ושיעור שגיאות</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-green-200">
              <CardContent className="pt-5 text-center">
                <p className="text-4xl font-bold text-green-700">{analytics.readiness_score.toFixed(0)}%</p>
                <p className="text-sm text-gray-600 mt-1">ציון מוכנות</p>
                <p className="text-xs text-gray-400 mt-0.5">מוכנות לפריסה תפעולית</p>
              </CardContent>
            </Card>
          </div>

          {/* Summary Stats */}
          <Card>
            <CardHeader><CardTitle className="text-base">סיכום תוצאות</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center p-3 rounded-lg bg-gray-50 border">
                  <p className="text-2xl font-bold">{result.total_cases_run}</p>
                  <p className="text-xs text-gray-500">סה"כ מקרים</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-2xl font-bold text-green-700">{analytics.accuracy_percentage.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">דיוק</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-2xl font-bold text-red-700">{analytics.false_approvals + analytics.false_denials}</p>
                  <p className="text-xs text-gray-500">אי-התאמות</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-2xl font-bold text-blue-700">{analytics.policy_superiority_count}</p>
                  <p className="text-xs text-gray-500">עדיפות מדיניות</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="text-center p-2 rounded bg-red-50 border border-red-100">
                  <p className="text-lg font-bold text-red-600">{analytics.false_approvals}</p>
                  <p className="text-xs text-gray-500">אישורים שגויים</p>
                </div>
                <div className="text-center p-2 rounded bg-orange-50 border border-orange-100">
                  <p className="text-lg font-bold text-orange-600">{analytics.false_denials}</p>
                  <p className="text-xs text-gray-500">דחיות שגויות</p>
                </div>
                <div className="text-center p-2 rounded bg-yellow-50 border border-yellow-100">
                  <p className="text-lg font-bold text-yellow-600">{analytics.ambiguity_count}</p>
                  <p className="text-xs text-gray-500">עמימויות</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Case Details */}
          <Card>
            <CardHeader><CardTitle className="text-base">פירוט מקרים</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.case_details.map(c => (
                  <div key={c.case_id} className={`flex items-start gap-3 p-3 rounded-lg border ${c.match ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
                    <div className="flex-shrink-0 mt-0.5">
                      <span className={`text-lg ${c.match ? 'text-green-600' : 'text-red-600'}`}>
                        {c.match ? '✓' : '✗'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-gray-400">{c.case_id}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${certaintyStyles[c.certainty_class] ?? 'bg-gray-100'}`}>
                          {certaintyHe[c.certainty_class] ?? c.certainty_class}
                        </span>
                        {c.discrepancy_type && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                            {discrepancyHe[c.discrepancy_type] ?? c.discrepancy_type}
                          </span>
                        )}
                      </div>
                      <p className="text-sm mt-1">{c.description}</p>
                      <div className="flex gap-4 mt-1 text-xs text-gray-500">
                        <span>פקיד: {decisionHe[c.clerk_decision] ?? c.clerk_decision}</span>
                        <span>מנוע: {decisionHe[c.engine_decision] ?? c.engine_decision}</span>
                        <span>{c.applied_rules_count} כללים</span>
                        <span>{c.processing_time_ms}ms</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
