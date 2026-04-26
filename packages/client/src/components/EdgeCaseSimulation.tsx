import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiPost } from '@/lib/api';
import type { EvaluationResponse, EvaluationRequest } from '@/types';

interface Props {
  onResult: (result: EvaluationResponse) => void;
}

interface Scenario {
  label: string;
  description: string;
  request: Partial<EvaluationRequest>;
}

const SCENARIOS: Scenario[] = [
  {
    label: 'שוהה במוסד עם 40% נכות',
    description: 'בדיקת גבול זכאות לשוהה במוסד',
    request: {
      claim_type: 'vehicle_less_allowance',
      medical: { disability_percentage: 40 },
      operational: { institutional_residence_status: true },
    },
  },
  {
    label: 'שוהה במוסד עם 39% נכות',
    description: 'מתחת לסף הזכאות',
    request: {
      claim_type: 'vehicle_less_allowance',
      medical: { disability_percentage: 39 },
      operational: { institutional_residence_status: true },
    },
  },
  {
    label: 'בעל רישיון נהיגה עם 50% נכות',
    description: 'בעל רישיון עם נכות גבוהה',
    request: {
      claim_type: 'mobility_allowance',
      medical: { disability_percentage: 50 },
      operational: { driver_license_holder: true },
    },
  },
  {
    label: 'ללא רישיון ללא מורשה',
    description: 'ללא רישיון נהיגה וללא מורשה נהיגה',
    request: {
      claim_type: 'mobility_allowance',
      medical: { disability_percentage: 50 },
      operational: { driver_license_holder: false, authorized_driver_status: false },
    },
  },
  {
    label: 'מורשה נהיגה עם 40% נכות',
    description: 'מורשה נהיגה בגבול הסף',
    request: {
      claim_type: 'mobility_allowance',
      medical: { disability_percentage: 40 },
      operational: { authorized_driver_status: true },
    },
  },
  {
    label: 'ערך גבולי - 39% נכות',
    description: 'בעל רישיון מתחת לסף',
    request: {
      claim_type: 'mobility_allowance',
      medical: { disability_percentage: 39 },
      operational: { driver_license_holder: true },
    },
  },
];

const decisionLabels: Record<string, { label: string; className: string }> = {
  eligible:                        { label: 'זכאי',                  className: 'bg-green-100 text-green-800 border-green-300' },
  not_eligible:                    { label: 'לא זכאי',               className: 'bg-red-100 text-red-800 border-red-300' },
  partial:                         { label: 'זכאות חלקית',           className: 'bg-orange-100 text-orange-800 border-orange-300' },
  pending_discretion:              { label: 'ממתין לשיקול דעת',      className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  requires_additional_information: { label: 'נדרש מידע נוסף',        className: 'bg-blue-100 text-blue-800 border-blue-300' },
};

export function EdgeCaseSimulation({ onResult }: Props) {
  const [results, setResults] = useState<Record<number, EvaluationResponse | 'loading' | 'error'>>({});

  const runScenario = async (index: number, scenario: Scenario) => {
    setResults(prev => ({ ...prev, [index]: 'loading' }));
    const body: EvaluationRequest = {
      claimant_id: `sim-${index + 1}`,
      claim_date: new Date().toISOString().slice(0, 10),
      claim_type: scenario.request.claim_type ?? 'vehicle_less_allowance',
      ...scenario.request,
    };
    try {
      const data = await apiPost<EvaluationResponse>('/api/v1/evaluate', body);
      setResults(prev => ({ ...prev, [index]: data }));
      onResult(data);
    } catch {
      setResults(prev => ({ ...prev, [index]: 'error' }));
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <h2 className="text-lg font-semibold">סימולציית מקרי קצה</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {SCENARIOS.map((scenario, i) => {
          const res = results[i];
          const data = res && res !== 'loading' && res !== 'error' ? (res as EvaluationResponse) : null;
          const decision = data?.data?.decision;
          const badge = decision ? decisionLabels[decision] : null;

          return (
            <Card key={i}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{scenario.label}</CardTitle>
                <p className="text-xs text-gray-500">{scenario.description}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-gray-600 space-y-0.5">
                  {scenario.request.medical?.disability_percentage !== undefined && (
                    <p>נכות: {scenario.request.medical.disability_percentage}%</p>
                  )}
                  {scenario.request.operational?.institutional_residence_status && <p>שוהה במוסד: כן</p>}
                  {scenario.request.operational?.driver_license_holder !== undefined && (
                    <p>רישיון נהיגה: {scenario.request.operational.driver_license_holder ? 'כן' : 'לא'}</p>
                  )}
                  {scenario.request.operational?.authorized_driver_status !== undefined && (
                    <p>מורשה נהיגה: {scenario.request.operational.authorized_driver_status ? 'כן' : 'לא'}</p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    onClick={() => runScenario(i, scenario)}
                    disabled={res === 'loading'}
                    className="text-white text-xs"
                    style={{ backgroundColor: '#1B3A5C' }}
                  >
                    {res === 'loading' ? 'בודק...' : 'הפעל'}
                  </Button>
                  {res === 'error' && <span className="text-xs text-red-500">שגיאה</span>}
                  {badge && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
