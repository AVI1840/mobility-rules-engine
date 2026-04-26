import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { DomainModule, RuleDefinition, RuleVersion } from '../../core/types.js';
import { v4 as uuidv4 } from 'uuid';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadRuleFile(filename: string): RuleDefinition {
  const path = join(__dirname, 'rules', filename);
  return JSON.parse(readFileSync(path, 'utf-8').replace(/^\uFEFF/, '')) as RuleDefinition;
}

function ruleToVersion(rule: RuleDefinition): RuleVersion {
  return {
    version_id: uuidv4(),
    rule_id: rule.rule_id,
    effective_start_date: rule.effective_date,
    effective_end_date: rule.expiry_date ?? null,
    source_amendment: {
      document_id: rule.source_document_id,
      document_name: rule.rule_name,
      circular_number: null,
    },
    rule_definition: rule,
    lifecycle_stage: 'production',
    created_by: 'system',
    approved_by: 'system',
    deployment_timestamp: new Date().toISOString(),
  };
}

// All rule files from all circulars, court rulings, and agreements
const RULE_FILES = [
  // Core eligibility
  'vehicle-less-allowance.rules.json',
  'basic-mobility-allowance.rules.json',
  // Circulars
  'circular-2056-engine-volume.rules.json',
  'circular-1996-amendment24.rules.json',
  'circular-2132-claims-process.rules.json',
  'circular-1905-shoshana-levy.rules.json',
  'circular-1984-appeal-withdrawal.rules.json',
  'circular-1936-duplicate-benefits.rules.json',
  'circular-1931-general.rules.json',
  // Agreements & opinions
  'continued-payment-3months.rules.json',
  'loan-fund-agreement.rules.json',
  // Court rulings
  'ruling-ruth-hadaya.rules.json',
  'ruling-galit-lavi.rules.json',
  'ruling-shaked-arueti.rules.json',
];

export function createMobilityDomainModule(): DomainModule {
  const rules: RuleDefinition[] = RULE_FILES.map(loadRuleFile);
  const rule_versions: RuleVersion[] = rules.map(ruleToVersion);

  return {
    domain_id: 'mobility',
    domain_name: 'ניידות - Mobility',
    rules,
    rule_versions,
  };
}

export const mobilityDomainModule = createMobilityDomainModule();
