import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { EvaluationResponse } from '@/types';

interface Props {
  result: EvaluationResponse | null;
}

const LABEL_MAP: Record<string, string> = {
  claimant_id: 'מספר תעודת זהות',
  claim_date: 'תאריך תביעה',
  claim_type: 'סוג תביעה',
  disability_percentage: 'אחוז נכות',
  mobility_limitation_type: 'סוג מגבלת ניידות',
  institutional_residence_status: 'שוהה במוסד',
  driver_license_holder: 'בעל רישיון נהיגה',
  authorized_driver_status: 'מורשה נהיגה',
  engine_volume: 'נפח מנוע',
  qualifying_vehicle: 'רכב מזכה',
  age: 'גיל',
};

function flattenObject(obj: unknown, prefix = ''): Array<{ key: string; value: unknown }> {
  if (obj === null || obj === undefined || typeof obj !== 'object') return [];
  const entries: Array<{ key: string; value: unknown }> = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v !== null && v !== undefined && typeof v === 'object' && !Array.isArray(v)) {
      entries.push(...flattenObject(v, fullKey));
    } else if (v !== null && v !== undefined) {
      entries.push({ key: fullKey, value: v });
    }
  }
  return entries;
}

function leafKey(key: string) {
  return key.split('.').pop() ?? key;
}

export function VariableInspection({ result }: Props) {
  if (!result?.data) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-gray-400">
          בצע הערכת זכאות כדי לראות את המשתנים
        </CardContent>
      </Card>
    );
  }

  const usedRuleIds = new Set(result.data.applied_rules.map(r => r.rule_id));
  const variables = flattenObject(result.data);

  // Separate request-like fields from result fields
  const requestFields = variables.filter(v =>
    !['request_id', 'decision', 'explanation_narrative', 'processing_timestamp'].includes(leafKey(v.key))
    && !v.key.startsWith('applied_rules')
    && !v.key.startsWith('conflicts_resolved')
    && !v.key.startsWith('discretionary_flags')
    && !v.key.startsWith('benefit_details')
  );

  const formatValue = (v: unknown): string => {
    if (typeof v === 'boolean') return v ? 'כן' : 'לא';
    if (v === null || v === undefined) return '—';
    return String(v);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">משתני הבקשה</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-right py-2 pr-2 font-medium text-gray-600 w-1/2">משתנה</th>
                <th className="text-right py-2 font-medium text-gray-600">ערך</th>
              </tr>
            </thead>
            <tbody>
              {requestFields.map(({ key, value }) => {
                const leaf = leafKey(key);
                const label = LABEL_MAP[leaf] ?? leaf;
                return (
                  <tr key={key} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 pr-2 text-gray-700">{label}</td>
                    <td className="py-2 font-mono text-gray-900">{formatValue(value)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {usedRuleIds.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">כללים שהשתמשו במשתנים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {[...usedRuleIds].map(id => (
                <span key={id} className="text-xs font-mono px-2 py-1 rounded bg-[#1B3A5C]/10 text-[#1B3A5C]">
                  {id}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
