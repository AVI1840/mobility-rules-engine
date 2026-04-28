import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiPost } from '@/lib/api';

interface CaseResult {
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

interface ValidationResult {
  total_cases: number;
  matches: number;
  mismatches: number;
  accuracy_percentage: number;
  false_approvals: number;
  false_denials: number;
  ambiguity_count: number;
  policy_superiority_count: number;
  cases: CaseResult[];
  trust_score: number;
  readiness_score: number;
  metadata?: {
    engine_version: string;
    run_timestamp: string;
    mode: string;
    parse_errors: string[];
  };
}

type Filter = 'all' | 'match' | 'mismatch' | 'discretion';

const decisionHe: Record<string, string> = {
  eligible: 'זכאי', not_eligible: 'לא זכאי', partial: 'חלקי',
  pending_discretion: 'שיקול דעת', requires_additional_information: 'חסר מידע',
};

const discrepancyHe: Record<string, string> = {
  false_approval: 'אישור שגוי', false_denial: 'דחייה שגויה',
  ambiguity: 'עמימות', policy_superiority: 'זיהוי זכאות שפוספסה',
};

export function ValidationWorkbench() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError('');
    setResult(null);

    try {
      const text = await file.text();
      let parsed;
      if (file.name.endsWith('.csv')) {
        parsed = parseCSV(text);
      } else {
        parsed = JSON.parse(text);
      }
      await runValidation(parsed, file.name);
    } catch (err) {
      setError(`שגיאה בקריאת הקובץ: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  };

  const loadSample = async () => {
    setFileName('sample-validation-cases.json (דמו)');
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/v1/health');
      if (!res.ok) throw new Error('server unavailable');
    } catch {
      setError('השרת אינו מחובר. הפעל את השרת כדי להריץ ולידציה.');
      return;
    }
    // Fetch sample from server
    const sampleRes = await fetch('/sample-validation-cases.json');
    if (sampleRes.ok) {
      const data = await sampleRes.json();
      await runValidation(data, 'sample');
    } else {
      // Use inline sample
      const sample = {
        cases: [
          { case_id: 'DEMO-001', description: 'שוהה במוסד 50% נכות', request: { claimant_id: '000000001', claim_date: '2024-06-01', claim_type: 'vehicle_less_allowance', medical: { disability_percentage: 50 }, operational: { institutional_residence_status: true } }, clerk_decision: 'eligible' },
          { case_id: 'DEMO-002', description: 'שוהה במוסד 35% נכות', request: { claimant_id: '000000002', claim_date: '2024-06-01', claim_type: 'vehicle_less_allowance', medical: { disability_percentage: 35 }, operational: { institutional_residence_status: true } }, clerk_decision: 'not_eligible' },
          { case_id: 'DEMO-003', description: 'בעל רישיון 45% נכות', request: { claimant_id: '000000003', claim_date: '2024-06-01', claim_type: 'mobility_allowance', medical: { disability_percentage: 45 }, operational: { driver_license_holder: true } }, clerk_decision: 'eligible' },
        ],
      };
      await runValidation(sample, 'inline-demo');
    }
  };

  const runValidation = async (data: unknown, source: string) => {
    setLoading(true);
    try {
      const payload = { ...(data as Record<string, unknown>), source_file: source };
      const res = await apiPost<{ status: string; data: ValidationResult; error?: { message: string } }>('/api/v1/validation/run', payload);
      if (res.status === 'error') {
        setError((res as unknown as { error: { message: string } }).error?.message ?? 'שגיאה');
      } else {
        setResult(res.data);
      }
    } catch (err) {
      setError(`שגיאה בהרצת הולידציה: ${err instanceof Error ? err.message : 'unknown'}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredCases = result?.cases.filter(c => {
    if (filter === 'match') return c.match;
    if (filter === 'mismatch') return !c.match;
    if (filter === 'discretion') return c.certainty_class === 'C_discretion_required';
    return true;
  }) ?? [];

  const exportJSON = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `validation-report-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
        ⚠️ פיילוט ראשוני — כלי תומך החלטה. הולידציה נועדה לבנצ'מרק מקצועי בלבד, לא לשימוש מבצעי.
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ולידציה — השוואת מנוע מול החלטות פקידים</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            העלה קובץ JSON או CSV עם מקרים היסטוריים אנונימיים. המנוע יריץ כל מקרה וישווה את ההחלטה שלו להחלטת הפקיד.
          </p>

          <div className="flex gap-3 items-center flex-wrap">
            <input ref={fileRef} type="file" accept=".json,.csv" onChange={handleFileUpload} className="hidden" />
            <Button onClick={() => fileRef.current?.click()} disabled={loading} className="text-white" style={{ backgroundColor: '#1B3A5C' }}>
              {loading ? 'מריץ...' : 'העלה קובץ מקרים'}
            </Button>
            <Button onClick={loadSample} disabled={loading} variant="outline" className="text-sm">
              הרץ מדגם דמו (5 מקרים)
            </Button>
            {fileName && <span className="text-xs text-gray-500">{fileName}</span>}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      {result && (
        <>
          {/* Summary */}
          <Card>
            <CardHeader><CardTitle className="text-base">סיכום הרצה</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <Stat label="סה״כ מקרים" value={result.total_cases} />
                <Stat label="התאמות" value={result.matches} color="green" />
                <Stat label="פערים" value={result.mismatches} color={result.mismatches > 0 ? 'red' : 'green'} />
                <Stat label="דיוק" value={`${result.accuracy_percentage}%`} color={result.accuracy_percentage >= 80 ? 'green' : 'red'} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Stat label="אישורים שגויים" value={result.false_approvals} color={result.false_approvals > 0 ? 'red' : 'green'} />
                <Stat label="דחיות שגויות" value={result.false_denials} color={result.false_denials > 0 ? 'red' : 'green'} />
                <Stat label="שיקול דעת" value={result.ambiguity_count} color="amber" />
                <Stat label="זכאות שפוספסה" value={result.policy_superiority_count} color="blue" />
              </div>
              {result.metadata && (
                <p className="text-xs text-gray-400 mt-3">
                  מנוע: {result.metadata.engine_version} | מצב: {result.metadata.mode} | {result.metadata.run_timestamp}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Filters + Export */}
          <div className="flex gap-2 items-center flex-wrap">
            {(['all', 'match', 'mismatch', 'discretion'] as Filter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${filter === f ? 'border-[#1B3A5C] bg-[#1B3A5C] text-white' : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'}`}>
                {f === 'all' ? 'הכל' : f === 'match' ? 'התאמות' : f === 'mismatch' ? 'פערים' : 'שיקול דעת'}
                {f !== 'all' && ` (${result.cases.filter(c => f === 'match' ? c.match : f === 'mismatch' ? !c.match : c.certainty_class === 'C_discretion_required').length})`}
              </button>
            ))}
            <div className="flex-1" />
            <Button onClick={exportJSON} variant="outline" size="sm" className="text-xs">ייצוא JSON</Button>
          </div>

          {/* Cases table */}
          <Card>
            <CardContent className="pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-right">
                      <th className="py-2 px-2 font-medium">מזהה</th>
                      <th className="py-2 px-2 font-medium">תיאור</th>
                      <th className="py-2 px-2 font-medium">פקיד</th>
                      <th className="py-2 px-2 font-medium">מנוע</th>
                      <th className="py-2 px-2 font-medium">התאמה</th>
                      <th className="py-2 px-2 font-medium">סוג פער</th>
                      <th className="py-2 px-2 font-medium">ודאות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCases.map(c => (
                      <tr key={c.case_id} className={`border-b ${c.match ? '' : 'bg-red-50/50'}`}>
                        <td className="py-2 px-2 font-mono text-xs">{c.case_id}</td>
                        <td className="py-2 px-2 text-xs max-w-[200px] truncate">{c.description}</td>
                        <td className="py-2 px-2"><DecisionBadge decision={c.clerk_decision} /></td>
                        <td className="py-2 px-2"><DecisionBadge decision={c.engine_decision} /></td>
                        <td className="py-2 px-2">{c.match ? <span className="text-green-600">✓</span> : <span className="text-red-600">✗</span>}</td>
                        <td className="py-2 px-2 text-xs">{c.discrepancy_type ? discrepancyHe[c.discrepancy_type] ?? c.discrepancy_type : '-'}</td>
                        <td className="py-2 px-2"><CertaintyBadge cls={c.certainty_class} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredCases.length === 0 && <p className="text-center text-gray-400 py-4 text-sm">אין מקרים להצגה</p>}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  const colorClass = color === 'green' ? 'text-green-700' : color === 'red' ? 'text-red-700' : color === 'amber' ? 'text-amber-700' : color === 'blue' ? 'text-blue-700' : 'text-gray-900';
  return (
    <div className="text-center">
      <p className={`text-xl font-bold ${colorClass}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

function DecisionBadge({ decision }: { decision: string }) {
  const label = decisionHe[decision] ?? decision;
  const cls = decision === 'eligible' ? 'bg-green-100 text-green-800' : decision === 'not_eligible' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700';
  return <span className={`text-xs px-1.5 py-0.5 rounded ${cls}`}>{label}</span>;
}

function CertaintyBadge({ cls }: { cls: string }) {
  const map: Record<string, { label: string; color: string }> = {
    A_deterministic: { label: 'א', color: 'bg-green-100 text-green-800' },
    B_recommendation: { label: 'ב', color: 'bg-amber-100 text-amber-800' },
    C_discretion_required: { label: 'ג', color: 'bg-red-100 text-red-800' },
  };
  const m = map[cls] ?? { label: '?', color: 'bg-gray-100 text-gray-600' };
  return <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${m.color}`}>{m.label}</span>;
}

function parseCSV(text: string): { cases: unknown[] } {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return { cases: [] };
  const headers = lines[0].split(',').map(h => h.trim());
  const cases = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => { obj[h] = values[i]; });
    return {
      case_id: obj.case_id ?? obj.id,
      description: obj.description ?? '',
      request: {
        claimant_id: obj.claimant_id ?? obj.case_id,
        claim_date: obj.claim_date ?? '2024-01-01',
        claim_type: obj.claim_type ?? 'vehicle_less_allowance',
        medical: { disability_percentage: obj.disability_percentage ? Number(obj.disability_percentage) : undefined },
        operational: {
          institutional_residence_status: obj.institutional_residence === 'true' || obj.institutional_residence === '1',
          driver_license_holder: obj.driver_license === 'true' || obj.driver_license === '1',
          authorized_driver_status: obj.authorized_driver === 'true' || obj.authorized_driver === '1',
        },
      },
      clerk_decision: obj.clerk_decision ?? obj.decision,
      clerk_notes: obj.clerk_notes ?? obj.notes,
    };
  });
  return { cases };
}
