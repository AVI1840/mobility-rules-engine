import type { Request, Response } from 'express';
import { engine } from '../server.js';
import { runBatchValidation, batchResultToBacktestReport } from '../../qa/batch-validator.js';
import type { HistoricalCase } from '../../qa/batch-validator.js';
import type { Decision } from '../../core/types.js';

// Built-in demo test cases for pilot validation
const DEMO_CASES: HistoricalCase[] = [
  {
    case_id: 'HIST-001',
    description: 'שוהה במוסד, 50% נכות - זכאי לחסר רכב',
    request: { claimant_id: 'demo-001', claim_date: '2024-01-15', claim_type: 'vehicle_less_allowance', medical: { disability_percentage: 50 }, operational: { institutional_residence_status: true } },
    clerk_decision: 'eligible',
  },
  {
    case_id: 'HIST-002',
    description: 'שוהה במוסד, 35% נכות - לא זכאי (מתחת לסף)',
    request: { claimant_id: 'demo-002', claim_date: '2024-02-01', claim_type: 'vehicle_less_allowance', medical: { disability_percentage: 35 }, operational: { institutional_residence_status: true } },
    clerk_decision: 'not_eligible',
  },
  {
    case_id: 'HIST-003',
    description: 'בעל רישיון, 60% נכות - זכאי לקצבת ניידות',
    request: { claimant_id: 'demo-003', claim_date: '2024-03-10', claim_type: 'mobility_allowance', medical: { disability_percentage: 60 }, operational: { driver_license_holder: true } },
    clerk_decision: 'eligible',
  },
  {
    case_id: 'HIST-004',
    description: 'ללא רישיון, ללא מורשה, 50% נכות - לא זכאי',
    request: { claimant_id: 'demo-004', claim_date: '2024-04-01', claim_type: 'mobility_allowance', medical: { disability_percentage: 50 }, operational: { driver_license_holder: false, authorized_driver_status: false } },
    clerk_decision: 'not_eligible',
  },
  {
    case_id: 'HIST-005',
    description: 'מורשה נהיגה, 45% נכות - זכאי לקצבת ניידות',
    request: { claimant_id: 'demo-005', claim_date: '2024-05-15', claim_type: 'mobility_allowance', medical: { disability_percentage: 45 }, operational: { authorized_driver_status: true } },
    clerk_decision: 'eligible',
  },
  {
    case_id: 'HIST-006',
    description: 'שוהה במוסד, 40% נכות - ערך גבולי, זכאי',
    request: { claimant_id: 'demo-006', claim_date: '2024-06-01', claim_type: 'vehicle_less_allowance', medical: { disability_percentage: 40 }, operational: { institutional_residence_status: true } },
    clerk_decision: 'eligible',
  },
  {
    case_id: 'HIST-007',
    description: 'שוהה במוסד, 39% נכות - ערך גבולי, לא זכאי',
    request: { claimant_id: 'demo-007', claim_date: '2024-06-15', claim_type: 'vehicle_less_allowance', medical: { disability_percentage: 39 }, operational: { institutional_residence_status: true } },
    clerk_decision: 'not_eligible',
  },
  {
    case_id: 'HIST-008',
    description: 'לא שוהה במוסד, 70% נכות - לא זכאי לחסר רכב',
    request: { claimant_id: 'demo-008', claim_date: '2024-07-01', claim_type: 'vehicle_less_allowance', medical: { disability_percentage: 70 }, operational: { institutional_residence_status: false } },
    clerk_decision: 'not_eligible',
  },
  {
    case_id: 'HIST-009',
    description: 'בעל רישיון, 40% נכות - ערך גבולי, זכאי',
    request: { claimant_id: 'demo-009', claim_date: '2024-08-01', claim_type: 'mobility_allowance', medical: { disability_percentage: 40 }, operational: { driver_license_holder: true } },
    clerk_decision: 'eligible',
  },
  {
    case_id: 'HIST-010',
    description: 'בעל רישיון, 39% נכות - מתחת לסף, לא זכאי',
    request: { claimant_id: 'demo-010', claim_date: '2024-09-01', claim_type: 'mobility_allowance', medical: { disability_percentage: 39 }, operational: { driver_license_holder: true } },
    clerk_decision: 'not_eligible',
  },
  {
    case_id: 'HIST-011',
    description: 'מוגבלות גפיים תחתונות, ללא רישיון, 50% - בג"צ שושנה לוי',
    request: { claimant_id: 'demo-011', claim_date: '2024-10-01', claim_type: 'mobility_allowance', medical: { disability_percentage: 50, mobility_limitation_type: 'lower_limb' }, operational: { driver_license_holder: false } },
    clerk_decision: 'eligible',
  },
  {
    case_id: 'HIST-012',
    description: 'מורשה נהיגה, 55% נכות, שוהה במוסד - כפל זכאויות',
    request: { claimant_id: 'demo-012', claim_date: '2024-11-01', claim_type: 'vehicle_less_allowance', medical: { disability_percentage: 55 }, operational: { institutional_residence_status: true, authorized_driver_status: true } },
    clerk_decision: 'eligible',
  },
];

export function backtestHandler(req: Request, res: Response): void {
  // Accept custom cases from request body, or use demo cases
  const customCases = req.body?.cases as HistoricalCase[] | undefined;
  const cases = customCases && customCases.length > 0 ? customCases : DEMO_CASES;

  const batchResult = runBatchValidation(engine, cases);
  const backtestReport = batchResultToBacktestReport(batchResult);

  res.status(200).json({
    status: 'success',
    data: {
      ...backtestReport,
      // Extended batch analytics
      batch_analytics: {
        accuracy_percentage: batchResult.accuracy_percentage,
        false_approvals: batchResult.false_approvals,
        false_denials: batchResult.false_denials,
        ambiguity_count: batchResult.ambiguity_count,
        policy_superiority_count: batchResult.policy_superiority_count,
        trust_score: batchResult.trust_score,
        readiness_score: batchResult.readiness_score,
      },
      case_details: batchResult.cases,
    },
  });
}
