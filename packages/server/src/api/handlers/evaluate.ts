import type { Request, Response } from 'express';
import { validateRequest } from '../../core/validator.js';
import { engine } from '../server.js';
import { renderExplanation } from '../../explainability/renderer.js';
import { createAuditTrail, writeAuditTrail, buildEvaluationContext } from '../../core/audit.js';
import { validateLegalDefensibility } from '../../core/accountability.js';
import type { EngineError } from '../../core/types.js';

export async function evaluateHandler(req: Request, res: Response): Promise<void> {
  const contentType = req.headers['content-type'] ?? '';
  if (!contentType.includes('application/json')) {
    res.status(400).json({
      status: 'error',
      error: { code: 'MALFORMED_REQUEST', message: 'Content-Type must be application/json', details: [] },
    });
    return;
  }

  let validatedRequest;
  try {
    validatedRequest = validateRequest(req.body);
  } catch (err) {
    res.status(400).json({ status: 'error', error: err as EngineError });
    return;
  }

  try {
    const processingStart = Date.now();
    const response = engine.evaluate(validatedRequest);
    const processingTimeMs = Date.now() - processingStart;

    // Build evaluation context with real data from engine response
    const context = buildEvaluationContext(
      validatedRequest,
      response.request_id,
      response.applied_rules.map((r, i) => ({
        rule_id: r.rule_id,
        rule_version: r.rule_version ?? 'unknown',
        input_values: {}, // TODO: pass from engine when full pipeline wired
        evaluation_result: r.evaluation_result,
        legal_citation: r.legal_citation,
        evaluation_order: i + 1,
        evaluation_time_ms: 0,
      })),
      response.conflicts_resolved,
      [], // reasoning chain — populated by engine internally
      response.decision,
      response.benefit_details,
      response.discretionary_flags,
    );

    const auditTrail = createAuditTrail(context);

    // Generate explanation from real audit data
    response.explanation_narrative = renderExplanation(context, auditTrail);

    // Write audit trail — non-fatal if fails
    try {
      writeAuditTrail(auditTrail);
    } catch (writeErr) {
      console.error('Audit trail write failed:', writeErr);
    }

    const accountability = validateLegalDefensibility(response);

    res.status(200).json({
      status: 'success',
      data: response,
      audit_trail_id: auditTrail.audit_id,
      processing_time_ms: processingTimeMs,
      accountability,
    });
  } catch (err) {
    console.error('Evaluation error:', err);
    res.status(500).json({
      status: 'error',
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred', details: [] },
    });
  }
}
