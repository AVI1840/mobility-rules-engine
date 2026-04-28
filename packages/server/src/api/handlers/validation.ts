import type { Request, Response } from 'express';
import { engine } from '../server.js';
import { runBatchValidation, batchResultToBacktestReport } from '../../qa/batch-validator.js';
import type { HistoricalCase } from '../../qa/batch-validator.js';
import type { ClaimType, Decision } from '../../core/types.js';

const VALID_CLAIM_TYPES = ['mobility_allowance', 'vehicle_grant', 'loan', 'vehicle_less_allowance', 'continued_payment'];
const VALID_DECISIONS = ['eligible', 'not_eligible', 'partial', 'pending_discretion', 'requires_additional_information'];

export async function validationRunHandler(req: Request, res: Response): Promise<void> {
  const contentType = req.headers['content-type'] ?? '';
  if (!contentType.includes('application/json')) {
    res.status(400).json({ status: 'error', error: { code: 'MALFORMED_REQUEST', message: 'Content-Type must be application/json' } });
    return;
  }

  const body = req.body;
  if (!body || !Array.isArray(body.cases)) {
    res.status(400).json({ status: 'error', error: { code: 'INVALID_INPUT', message: 'Request body must contain a "cases" array' } });
    return;
  }

  // Validate and parse cases
  const cases: HistoricalCase[] = [];
  const parseErrors: string[] = [];

  for (let i = 0; i < body.cases.length; i++) {
    const c = body.cases[i];
    if (!c.case_id || !c.request || !c.clerk_decision) {
      parseErrors.push(`Case ${i}: missing case_id, request, or clerk_decision`);
      continue;
    }
    if (!c.request.claimant_id || !c.request.claim_date || !c.request.claim_type) {
      parseErrors.push(`Case ${i} (${c.case_id}): request missing claimant_id, claim_date, or claim_type`);
      continue;
    }
    if (!VALID_CLAIM_TYPES.includes(c.request.claim_type)) {
      parseErrors.push(`Case ${i} (${c.case_id}): invalid claim_type "${c.request.claim_type}"`);
      continue;
    }
    if (!VALID_DECISIONS.includes(c.clerk_decision)) {
      parseErrors.push(`Case ${i} (${c.case_id}): invalid clerk_decision "${c.clerk_decision}"`);
      continue;
    }

    cases.push({
      case_id: c.case_id,
      description: c.description ?? '',
      request: c.request,
      clerk_decision: c.clerk_decision as Decision,
      clerk_notes: c.clerk_notes,
    });
  }

  if (cases.length === 0) {
    res.status(400).json({
      status: 'error',
      error: { code: 'NO_VALID_CASES', message: 'No valid cases found', parse_errors: parseErrors },
    });
    return;
  }

  try {
    const result = runBatchValidation(engine, cases);
    const health = engine.getHealth();

    res.status(200).json({
      status: 'success',
      data: {
        ...result,
        metadata: {
          engine_version: health.engine_version,
          active_rule_versions: health.active_rule_versions,
          loaded_domains: health.loaded_domains,
          run_timestamp: new Date().toISOString(),
          source_file: body.source_file ?? null,
          total_submitted: body.cases.length,
          total_parsed: cases.length,
          parse_errors: parseErrors,
          mode: 'pilot',
        },
      },
    });
  } catch (err) {
    console.error('Validation run error:', err);
    res.status(500).json({ status: 'error', error: { code: 'INTERNAL_ERROR', message: 'Validation run failed' } });
  }
}
