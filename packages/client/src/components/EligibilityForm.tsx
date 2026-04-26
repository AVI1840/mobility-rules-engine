import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiPost } from '@/lib/api';
import type { EvaluationResponse, EvaluationRequest, ClaimType } from '@/types';

interface Props {
  onResult: (result: EvaluationResponse) => void;
}

const decisionLabels: Record<string, { label: string; className: string }> = {
  eligible:                        { label: 'זכאי',                  className: 'bg-green-100 text-green-800 border-green-300' },
  not_eligible:                    { label: 'לא זכאי',               className: 'bg-red-100 text-red-800 border-red-300' },
  partial:                         { label: 'זכאות חלקית',           className: 'bg-orange-100 text-orange-800 border-orange-300' },
  pending_discretion:              { label: 'ממתין לשיקול דעת',      className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  requires_additional_information: { label: 'נדרש מידע נוסף',        className: 'bg-blue-100 text-blue-800 border-blue-300' },
};

export function EligibilityForm({ onResult }: Props) {
  const [claimType, setClaimType] = useState<ClaimType>('vehicle_less_allowance');
  const [claimantId, setClaimantId] = useState('');
  const [claimDate, setClaimDate] = useState(new Date().toISOString().slice(0, 10));
  const [disabilityPct, setDisabilityPct] = useState('');
  const [institutionalResidence, setInstitutionalResidence] = useState(false);
  const [driverLicense, setDriverLicense] = useState(false);
  const [authorizedDriver, setAuthorizedDriver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EvaluationResponse | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!claimantId.trim()) { setError('נא להזין מספר תעודת זהות'); return; }

    const body: EvaluationRequest = {
      claimant_id: claimantId.trim(),
      claim_date: claimDate,
      claim_type: claimType,
      medical: { disability_percentage: disabilityPct !== '' ? Number(disabilityPct) : undefined },
      operational: {
        institutional_residence_status: institutionalResidence,
        driver_license_holder: driverLicense,
        authorized_driver_status: authorizedDriver,
      },
    };

    setLoading(true);
    try {
      const data = await apiPost<EvaluationResponse>('/api/v1/evaluate', body);
      setResult(data);
      onResult(data);
    } catch {
      setError('שגיאה בתקשורת עם השרת');
    } finally {
      setLoading(false);
    }
  };

  const decision = result?.data?.decision;
  const badge = decision ? decisionLabels[decision] : null;

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">בדיקת זכאות</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Claim type */}
            <div>
              <label className="block text-sm font-medium mb-1">סוג תביעה</label>
              <select
                value={claimType}
                onChange={e => setClaimType(e.target.value as ClaimType)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]"
              >
                <option value="vehicle_less_allowance">קצבת חסר רכב</option>
                <option value="mobility_allowance">קצבת ניידות</option>
              </select>
            </div>

            {/* Claimant ID */}
            <div>
              <label className="block text-sm font-medium mb-1">מספר תעודת זהות</label>
              <input
                type="text"
                value={claimantId}
                onChange={e => setClaimantId(e.target.value)}
                placeholder="000000000"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]"
              />
            </div>

            {/* Claim date */}
            <div>
              <label className="block text-sm font-medium mb-1">תאריך תביעה</label>
              <input
                type="date"
                value={claimDate}
                onChange={e => setClaimDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]"
              />
            </div>

            {/* Disability percentage */}
            <div>
              <label className="block text-sm font-medium mb-1">אחוז נכות (0–100)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={disabilityPct}
                onChange={e => setDisabilityPct(e.target.value)}
                placeholder="לדוגמה: 40"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]"
              />
            </div>

            {/* Checkboxes */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={institutionalResidence}
                  onChange={e => setInstitutionalResidence(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 accent-[#1B3A5C]"
                />
                <span className="text-sm">שוהה במוסד</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={driverLicense}
                  onChange={e => setDriverLicense(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 accent-[#1B3A5C]"
                />
                <span className="text-sm">בעל רישיון נהיגה</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={authorizedDriver}
                  onChange={e => setAuthorizedDriver(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 accent-[#1B3A5C]"
                />
                <span className="text-sm">מורשה נהיגה</span>
              </label>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button
              type="submit"
              disabled={loading}
              className="w-full text-white"
              style={{ backgroundColor: '#1B3A5C' }}
            >
              {loading ? 'בודק...' : 'בדוק זכאות'}
            </Button>
          </form>

          {/* Result */}
          {result && (
            <div className="mt-6 border-t pt-5 space-y-3">
              {result.status === 'error' ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-red-700">שגיאה: {result.error?.message}</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">תוצאה</span>
                    {badge && (
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${badge.className}`}>
                        {badge.label}
                      </span>
                    )}
                  </div>
                  {result.processing_time_ms !== undefined && (
                    <p className="text-xs text-gray-400">זמן עיבוד: {result.processing_time_ms} ms</p>
                  )}
                  {result.data?.benefit_details && (
                    <div className="bg-gray-50 rounded-lg p-3 text-sm">
                      <span className="font-medium">סכום: </span>
                      {result.data.benefit_details.amount} ₪
                      {result.data.benefit_details.duration && ` / ${result.data.benefit_details.duration}`}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
