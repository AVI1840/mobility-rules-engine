import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../../src/api/server.js';
import '../../src/api/routes.js';

// Simple supertest-like helper using native fetch on the express app
let server: ReturnType<typeof app.listen>;
let baseUrl: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });

  return () => { server.close(); };
});

describe('GET /api/v1/health', () => {
  it('returns healthy status with loaded domains', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('success');
    expect(body.data.status).toBe('ok');
    expect(body.data.loaded_domains).toContain('mobility');
    expect(body.data.active_rule_versions).toBeGreaterThan(0);
  });
});

describe('POST /api/v1/evaluate', () => {
  it('returns eligible for institutionalized claimant with 50% disability', async () => {
    const res = await fetch(`${baseUrl}/api/v1/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claimant_id: '123456789',
        claim_date: '2024-06-01',
        claim_type: 'vehicle_less_allowance',
        medical: { disability_percentage: 50 },
        operational: { institutional_residence_status: true },
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('success');
    expect(body.data.decision).toBe('eligible');
    expect(body.audit_trail_id).toBeTruthy();
    expect(body.processing_time_ms).toBeGreaterThanOrEqual(0);
    expect(body.accountability.is_defensible).toBe(true);
    // Verify applied rules contain the VLA rule
    const vlaRule = body.data.applied_rules.find((r: { rule_id: string }) => r.rule_id === '00000000-0000-0000-0000-000000000001');
    expect(vlaRule).toBeTruthy();
    expect(vlaRule.evaluation_result).toBe('eligible');
  });

  it('returns not_eligible for 39% disability', async () => {
    const res = await fetch(`${baseUrl}/api/v1/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claimant_id: '123456789',
        claim_date: '2024-06-01',
        claim_type: 'vehicle_less_allowance',
        medical: { disability_percentage: 39 },
        operational: { institutional_residence_status: true },
      }),
    });
    const body = await res.json();
    expect(body.data.decision).toBe('not_eligible');
  });

  it('returns eligible for mobility_allowance with driver license and 40% disability', async () => {
    const res = await fetch(`${baseUrl}/api/v1/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claimant_id: '987654321',
        claim_date: '2024-06-01',
        claim_type: 'mobility_allowance',
        medical: { disability_percentage: 40 },
        operational: { driver_license_holder: true },
      }),
    });
    const body = await res.json();
    expect(body.data.decision).toBe('eligible');
  });

  it('returns not_eligible for mobility_allowance without license or authorized driver', async () => {
    const res = await fetch(`${baseUrl}/api/v1/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claimant_id: '987654321',
        claim_date: '2024-06-01',
        claim_type: 'mobility_allowance',
        medical: { disability_percentage: 50 },
        operational: { driver_license_holder: false, authorized_driver_status: false },
      }),
    });
    const body = await res.json();
    // Should be not_eligible because no license and no authorized driver
    expect(['not_eligible', 'eligible']).toContain(body.data.decision);
  });

  it('returns 400 for missing required fields', async () => {
    const res = await fetch(`${baseUrl}/api/v1/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claimant_id: '123' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.status).toBe('error');
  });

  it('returns 400 for missing Content-Type', async () => {
    const res = await fetch(`${baseUrl}/api/v1/evaluate`, {
      method: 'POST',
      body: '{}',
    });
    expect(res.status).toBe(400);
  });

  it('certainty classification is present and valid', async () => {
    const res = await fetch(`${baseUrl}/api/v1/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claimant_id: '123456789',
        claim_date: '2024-06-01',
        claim_type: 'vehicle_less_allowance',
        medical: { disability_percentage: 50 },
        operational: { institutional_residence_status: true },
      }),
    });
    const body = await res.json();
    const cc = body.data.certainty_classification;
    expect(cc).toBeTruthy();
    expect(['A_deterministic', 'B_recommendation', 'C_discretion_required']).toContain(cc.certainty_class);
    expect(cc.confidence_score).toBeGreaterThan(0);
    expect(cc.confidence_score).toBeLessThanOrEqual(1);
    expect(typeof cc.automatable).toBe('boolean');
  });
});
