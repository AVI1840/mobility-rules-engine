// =============================================================================
// Pretty Printer — Mobility Rules-as-Code Engine
// Serializes internal RuleDefinition objects back to valid RuleLogic.json strings.
// Also formats ResponseSchema objects to human-readable text.
// =============================================================================

import type { RuleDefinition, ResponseSchema, EngineError } from '../core/types.js';
import { parseRuleLogic } from './parser.js';

/**
 * Serialize a RuleDefinition to a formatted RuleLogic.json string.
 * Validates the output by round-tripping through the parser.
 *
 * Throws an EngineError if the serialized output fails schema validation.
 */
export function formatRuleDefinition(rule: RuleDefinition): string {
  const json = JSON.stringify(rule, null, 2);

  // Validate the output is a valid RuleLogic.json
  try {
    parseRuleLogic(json);
  } catch (err) {
    const engineError: EngineError = {
      code: 'PRINTER_VALIDATION_ERROR',
      message: 'Serialized RuleDefinition failed schema validation',
      details: (err as EngineError).details ?? [],
      timestamp: new Date().toISOString(),
    };
    throw engineError;
  }

  return json;
}

/**
 * Format a ResponseSchema object to a human-readable Hebrew/English text summary.
 * Suitable for display in logs or UI panels.
 */
export function formatResponse(response: ResponseSchema): string {
  const lines: string[] = [];

  lines.push(`=== תוצאת הערכה / Evaluation Result ===`);
  lines.push(`Request ID:       ${response.request_id}`);
  lines.push(`Decision:         ${translateDecision(response.decision)}`);
  lines.push(`Timestamp:        ${response.processing_timestamp}`);

  if (response.benefit_details) {
    lines.push('');
    lines.push('--- פרטי הטבה / Benefit Details ---');
    lines.push(`  Type:    ${response.benefit_details.type}`);
    lines.push(`  Amount:  ${response.benefit_details.amount}`);
    if (response.benefit_details.duration) {
      lines.push(`  Duration: ${response.benefit_details.duration}`);
    }
    if (response.benefit_details.conditions?.length) {
      lines.push(`  Conditions:`);
      for (const c of response.benefit_details.conditions) {
        lines.push(`    - ${c}`);
      }
    }
  }

  if (response.applied_rules.length > 0) {
    lines.push('');
    lines.push('--- כללים שהוחלו / Applied Rules ---');
    for (const rule of response.applied_rules) {
      const citation = rule.legal_citation;
      lines.push(
        `  [${rule.rule_id}] ${rule.evaluation_result} — ${citation.document_name} §${citation.section}/${citation.paragraph}${citation.clause ? `/${citation.clause}` : ''}`,
      );
    }
  }

  if (response.explanation_narrative) {
    lines.push('');
    lines.push('--- הסבר / Explanation ---');
    lines.push(response.explanation_narrative);
  }

  if (response.conflicts_resolved.length > 0) {
    lines.push('');
    lines.push('--- קונפליקטים שנפתרו / Conflicts Resolved ---');
    for (const conflict of response.conflicts_resolved) {
      lines.push(
        `  Winner: ${conflict.winning_rule_id} | Method: ${conflict.resolution_method} | Basis: ${conflict.legal_basis}`,
      );
    }
  }

  if (response.discretionary_flags.length > 0) {
    lines.push('');
    lines.push('--- דגלי שיקול דעת / Discretionary Flags ---');
    for (const flag of response.discretionary_flags) {
      lines.push(`  [${flag.flag_category}] ${flag.reason} (Rule: ${flag.applicable_rule_id})`);
    }
  }

  if (response.data_quality_score != null) {
    lines.push('');
    lines.push(`Data Quality Score: ${(response.data_quality_score * 100).toFixed(1)}%`);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function translateDecision(decision: string): string {
  const map: Record<string, string> = {
    eligible: 'זכאי / Eligible',
    not_eligible: 'לא זכאי / Not Eligible',
    partial: 'זכאות חלקית / Partial',
    pending_discretion: 'ממתין לשיקול דעת / Pending Discretion',
    requires_additional_information: 'נדרש מידע נוסף / Requires Additional Information',
  };
  return map[decision] ?? decision;
}
