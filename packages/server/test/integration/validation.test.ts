import { describe, it, expect, beforeAll } from 'vitest';
import { app } from '../../src/api/server.js';
import '../../src/api/routes.js';

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

const makeCases = (overrides: Array<{ case_id: string; claim_type: string; disability: number; institutional?: boolean; license?: boolean; clerk: string }>) =>
  overrides.map(o => ({
    case_id: o.case_id,
    description: `test case ${o.case_id}`,
    request: {
      claimant_id: `test-${o.case_id}`,
      claim_date: '2024-06-01',
      claim_type: o.claim_type,
      medical: { disability_percentage: o.disability },
      operational: {
        institutional_residence_status: o.institutional ?? false,
        driver_license_holder: o.license ?? false,
      },
    },
    clerk_decision: o.clerk,
  }));

describe('POST /api/v1/validation/run', () => {
  it('returns full match for correct cases', async () => {
    const cases = makeCases([
      { case_id: 'V1', claim_type: 'vehicle_less_allowance', disability: 50, institutional: true, clerk: 'eligible' },
      { case_id: 'V2', claim_type: 'vehicle_less_allowance', disability: 35, institutional: true, clerk: 'not_eligible' },
    ]);
    const res = await fetch(`${baseUrl}/api/v1/validation/run`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cases }),
    });
    const body = await res.json();
    expect(body.status).toBe('success');
    expect(body.data.total_cases).toBe(2);
    expect(body.data.matches).toBe(2);
    expect(body.data.accuracy_percentage).toBe(100);
  });

  it('detects false approval', async () => {
    const cases = makeCases([
      { case_id: 'FA1', claim_type: 'vehicle_less_allowance', disability: 50, institutional: true, clerk: 'not_eligible' },
    ]);
    const res = await fetch(`${baseUrl}/api/v1/validation/run`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cases }),
    });
    const body = await res.json();
    expect(body.data.false_approvals).toBeGreaterThan(0);
    expect(body.data.cases[0].match).toBe(false);
  });

  it('detects false denial', async () => {
    const cases = makeCases([
      { case_id: 'FD1', claim_type: 'vehicle_less_allowance', disability: 35, institutional: true, clerk: 'eligible' },
    ]);
    const res = await fetch(`${baseUrl}/api/v1/validation/run`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cases }),
    });
    const body = await res.json();
    expect(body.data.false_denials).toBeGreaterThan(0);
  });

  it('report consistency: matches + mismatches = total', async () => {
    const cases = makeCases([
      { case_id: 'C1', claim_type: 'vehicle_less_allowance', disability: 50, institutional: true, clerk: 'eligible' },
      { case_id: 'C2', claim_type: 'vehicle_less_allowance', disability: 50, institutional: true, clerk: 'not_eligible' },
      { case_id: 'C3', claim_type: 'mobility_allowance', disability: 45, license: true, clerk: 'eligible' },
    ]);
    const res = await fetch(`${baseUrl}/api/v1/validation/run`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cases }),
    });
    const body = await res.json();
    expect(body.data.matches + body.data.mismatches).toBe(body.data.total_cases);
  });

  it('returns metadata with engine version and mode', async () => {
    const cases = makeCases([
      { case_id: 'M1', claim_type: 'vehicle_less_allowance', disability: 50, institutional: true, clerk: 'eligible' },
    ]);
    const res = await fetch(`${baseUrl}/api/v1/validation/run`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cases }),
    });
    const body = await res.json();
    expect(body.data.metadata.engine_version).toBe('1.0.0');
    expect(body.data.metadata.mode).toBe('pilot');
  });

  it('returns 400 for missing cases array', async () => {
    const res = await fetch(`${baseUrl}/api/v1/validation/run`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});
