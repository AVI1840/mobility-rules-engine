// Central API layer
// When server is available: uses real engine.
// When server is unavailable: uses client-side demo engine WITH CLEAR MARKING.
import { demoEvaluate } from './demo-engine';
import type { EvaluationRequest, EvaluationResponse } from '../types';

export const API_BASE = import.meta.env.VITE_API_URL ?? '';

/** Tracks whether the last call used the demo engine */
let _lastCallWasDemo = false;
export function wasLastCallDemo(): boolean { return _lastCallWasDemo; }

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  _lastCallWasDemo = false;

  if (path === '/api/v1/evaluate') {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) return res.json() as Promise<T>;
    } catch {
      // Server unavailable
    }
    _lastCallWasDemo = true;
    const demoResult = demoEvaluate(body as EvaluationRequest);
    // Mark the response as demo mode
    if (demoResult.data) {
      demoResult.data.explanation_narrative = '⚠️ מצב הדגמה — השרת אינו מחובר. התוצאות מבוססות על מנוע דמו מקומי.\n\n' + demoResult.data.explanation_narrative;
    }
    return demoResult as T;
  }

  if (path === '/api/v1/backtest') {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) return res.json() as Promise<T>;
    } catch {
      // fallthrough
    }
    _lastCallWasDemo = true;
    return { status: 'success', data: { total_cases_run: 0, passed_count: 0, failed_count: 0, failure_rate_percentage: 0, failures: [], message: '⚠️ מצב הדגמה — השרת אינו מחובר. חבר שרת להרצת בדיקות אמיתיות.' } } as T;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  return res.json() as Promise<T>;
}
