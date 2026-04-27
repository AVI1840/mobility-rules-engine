// Central API layer — tries server first, falls back to client-side demo engine
import { demoEvaluate } from './demo-engine';
import type { EvaluationRequest, EvaluationResponse } from '../types';

export const API_BASE = import.meta.env.VITE_API_URL ?? '';

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  // For evaluate endpoint — try server, fall back to demo engine
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
      // Server unavailable — use demo engine
    }
    return demoEvaluate(body as EvaluationRequest) as T;
  }

  // For backtest endpoint — return demo data
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
    return { status: 'success', data: { total_cases_run: 0, passed_count: 0, failed_count: 0, failure_rate_percentage: 0, failures: [], message: 'מצב דמו - חבר שרת להרצת בדיקות' } } as T;
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
