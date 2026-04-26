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
      document_name: rule.source_document_id,
      circular_number: null,
    },
    rule_definition: rule,
    lifecycle_stage: 'production',
    created_by: 'system',
    approved_by: 'system',
    deployment_timestamp: new Date().toISOString(),
  };
}

export function createMobilityDomainModule(): DomainModule {
  const vehicleLessAllowanceRule = loadRuleFile('vehicle-less-allowance.rules.json');
  const basicMobilityAllowanceRule = loadRuleFile('basic-mobility-allowance.rules.json');

  const rules: RuleDefinition[] = [vehicleLessAllowanceRule, basicMobilityAllowanceRule];
  const rule_versions: RuleVersion[] = rules.map(ruleToVersion);

  return {
    domain_id: 'mobility',
    domain_name: 'ניידות - Mobility',
    rules,
    rule_versions,
  };
}

export const mobilityDomainModule = createMobilityDomainModule();
