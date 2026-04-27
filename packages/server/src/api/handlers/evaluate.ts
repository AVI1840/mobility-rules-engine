import type { Request, Response } from 'express';
import { validateRequest } from '../../core/validator.js';
import { engine } from '../server.js';
import { renderExplanation } from '../../explainability/renderer.js';
import { createAuditTrail, writeAuditTrail, buildEvaluationContext } from '../../core/audit.js';
import { validateLegalDefensibility } from '../../core/accountability.js';
import type { EngineError } from '../../core/types.js';

export async function evaluateHandler(req: Request, res: Response): Promise<void> {
  // Check Content-Type
  const contentType = req.headers['content-type'] ?? '';
  if (!contentType.includes('application/json')) {
    res.status(400).json({
      status: 'error',
      error: { code: 'MALFORMED_REQUEST', message: 'Content-Type must be application/json', details: [] },
    });
    return;
  }

  // Validate request body
  let validatedRequest;
  try {
    validatedRequest = validateRequest(req.body);
  } catch (err) {
    const engineError = err as EngineError;
    res.status(400).json({
      status: 'error',
      error: engineError,
    });
    return;
  }

  try {
    const processing_start = Date.now();
    const response = engine.evaluate(validatedRequest);
    const processing_time_ms = Date.now() - processing_start;

    // Build audit trail
    const context = buildEvaluationContext(
      validatedRequest,
      response.request_id,
      response.applied_rules.map((r, i) => ({
        rule_id: r.rule_id,
        rule_version: r.rule_version ?? 'unknown',
        input_values: {},
        evaluation_result: r.evaluation_result,
        legal_citation: r.legal_citation,
        evaluation_order: i + 1,
        evaluation_time_ms: 0,
      })),
      response.conflicts_resolved,
      [],
      response.decision,
      response.benefit_details,
      response.discretionary_flags,
    );

    const auditTrail = createAuditTrail(context);

    // Enrich explanation
    response.explanation_narrative = renderExplanation(context, auditTrail);

    try {
      writeAuditTrail(auditTrail);
    } catch {
      // Non-fatal: audit write failure should not block the response
    }

    res.status(200).json({
      status: 'success',
      data: response,
      audit_trail_id: auditTrail.audit_id,
      processing_time_ms,
      accountability: validateLegalDefensibility(response),
    });
  } catch (err) {
    console.error('Evaluation error:', err);
    res.status(500).json({
      status: 'error',
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred', details: [] },
    });
  }
}
