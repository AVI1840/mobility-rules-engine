import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiPost } from '@/lib/api';

interface BacktestResult {
  total_cases_run: number;
  passed_count: number;
  failed_count: number;
  failure_rate_percentage: number;
  failures?: Array<{ case_id: string; description: string; expected: string; actual: string }>;
}

export function QADashboard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [error, setError] = useState('');

  const runBacktest = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await apiPost<{ data: BacktestResult }>('/api/v1/backtest', {});
      setResult(data.data ?? data as unknown as BacktestResult);
    } catch {
      setError('שגיאה בהרצת הבדיקות');
    } finally {
      setLoading(false);
    }
  };

  const allPassed = result && result.failed_count === 0;

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">בדיקות QA — Backtest</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={runBacktest}
            disabled={loading}
            className="text-white"
            style={{ backgroundColor: '#1B3A5C' }}
          >
            {loading ? 'מריץ בדיקות...' : 'הרץ בדיקות'}
          </Button>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {result && (
            <div className="space-y-4">
              {/* Summary */}
              <div className={`rounded-lg p-4 border ${allPassed ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{result.total_cases_run}</p>
                    <p className="text-xs text-gray-500 mt-0.5">סה"כ מקרים</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-700">{result.passed_count}</p>
                    <p className="text-xs text-gray-500 mt-0.5">עברו</p>
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${result.failed_count > 0 ? 'text-red-700' : 'text-gray-400'}`}>
                      {result.failed_count}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">נכשלו</p>
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${result.failure_rate_percentage > 0 ? 'text-red-700' : 'text-green-700'}`}>
                      {result.failure_rate_percentage.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">שיעור כשלון</p>
                  </div>
                </div>
                <p className={`text-sm font-medium text-center mt-3 ${allPassed ? 'text-green-700' : 'text-red-700'}`}>
                  {allPassed ? '✅ כל הבדיקות עברו בהצלחה' : `❌ ${result.failed_count} בדיקות נכשלו`}
                </p>
              </div>

              {/* Failures list */}
              {result.failures && result.failures.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-red-700">פירוט כשלונות</h3>
                  {result.failures.map(f => (
                    <div key={f.case_id} className="border border-red-200 bg-red-50 rounded-lg p-3 text-sm space-y-1">
                      <p className="font-mono font-medium text-red-800">{f.case_id}</p>
                      <p className="text-gray-700">{f.description}</p>
                      <div className="flex gap-4 text-xs">
                        <span><span className="font-medium">צפוי: </span>{f.expected}</span>
                        <span><span className="font-medium">בפועל: </span>{f.actual}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
