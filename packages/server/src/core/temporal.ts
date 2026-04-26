// =============================================================================
// Temporal Logic Manager — Mobility Rules-as-Code Engine
// Manages rule version selection based on claim date.
// =============================================================================

import { v4 as uuidv4 } from 'uuid';
import type { RuleVersion, EngineError } from './types.js';

// ---------------------------------------------------------------------------
// Standalone functional API (required by spec task 7.1)
// ---------------------------------------------------------------------------

/**
 * Select the applicable production Rule_Version for a given rule and claim date.
 * Filters to lifecycle_stage === 'production', finds the version whose effective
 * date range contains claimDate, picks latest start date if multiple match.
 * Throws EngineError if none found.
 */
export function selectVersion(
  ruleId: string,
  claimDate: Date,
  versions: RuleVersion[],
): RuleVersion {
  const claimTime = claimDate.getTime();

  const matching = versions.filter((v) => {
    if (v.rule_id !== ruleId) return false;
    if (v.lifecycle_stage !== 'production') return false;
    const start = new Date(v.effective_start_date).getTime();
    const end = v.effective_end_date ? new Date(v.effective_end_date).getTime() : Infinity;
    return claimTime >= start && claimTime <= end;
  });

  if (matching.length === 0) {
    const err: EngineError = {
      code: 'NO_APPLICABLE_RULE_VERSION',
      message: `No applicable rule version found for rule ${ruleId} on ${claimDate.toISOString()}`,
      details: [],
      timestamp: new Date().toISOString(),
    };
    throw err;
  }

  // Pick the version with the latest effective_start_date
  matching.sort(
    (a, b) =>
      new Date(b.effective_start_date).getTime() - new Date(a.effective_start_date).getTime(),
  );
  return matching[0];
}

/**
 * Return all versions for a rule, sorted by effective_start_date descending.
 */
export function getVersionHistory(ruleId: string, versions: RuleVersion[]): RuleVersion[] {
  return versions
    .filter((v) => v.rule_id === ruleId)
    .sort(
      (a, b) =>
        new Date(b.effective_start_date).getTime() - new Date(a.effective_start_date).getTime(),
    );
}

/**
 * Supersede the current production version of a rule with a new version.
 * Sets effective_end_date on the previous active version to one day before
 * newVersion.effective_start_date. Returns a new array (immutable — does not
 * mutate the input array).
 */
export function supersede(
  ruleId: string,
  newVersion: RuleVersion,
  versions: RuleVersion[],
): RuleVersion[] {
  const newStart = new Date(newVersion.effective_start_date);

  // Find the current production version (no end date, or latest start date among production)
  const productionVersions = versions.filter(
    (v) => v.rule_id === ruleId && v.lifecycle_stage === 'production',
  );

  // Pick the one with no end date, or the latest start date
  const current =
    productionVersions.find((v) => !v.effective_end_date) ??
    productionVersions.sort(
      (a, b) =>
        new Date(b.effective_start_date).getTime() - new Date(a.effective_start_date).getTime(),
    )[0];

  const endDate = new Date(newStart);
  endDate.setDate(endDate.getDate() - 1);
  const endDateStr = endDate.toISOString().slice(0, 10);

  const updated = versions.map((v) => {
    if (v === current) {
      return { ...v, effective_end_date: endDateStr, lifecycle_stage: 'superseded' as const };
    }
    return v;
  });

  return [...updated, newVersion];
}

/**
 * Returns true if claimDate is within the version's effective date range.
 */
export function isVersionEffective(version: RuleVersion, claimDate: Date): boolean {
  const claimTime = claimDate.getTime();
  const start = new Date(version.effective_start_date).getTime();
  const end = version.effective_end_date
    ? new Date(version.effective_end_date).getTime()
    : Infinity;
  return claimTime >= start && claimTime <= end;
}

// ---------------------------------------------------------------------------
// Class-based API (kept for backward compatibility with engine.ts)
// ---------------------------------------------------------------------------

export class TemporalLogicManager {
  private versions: Map<string, RuleVersion[]> = new Map();

  register(version: RuleVersion): void {
    const existing = this.versions.get(version.rule_id) ?? [];
    existing.push(version);
    this.versions.set(version.rule_id, existing);
  }

  registerAll(versions: RuleVersion[]): void {
    for (const v of versions) this.register(v);
  }

  selectVersion(ruleId: string, claimDate: Date): RuleVersion {
    const versions = this.versions.get(ruleId) ?? [];
    return selectVersion(ruleId, claimDate, versions);
  }

  getVersionHistory(ruleId: string): RuleVersion[] {
    const versions = this.versions.get(ruleId) ?? [];
    return getVersionHistory(ruleId, versions);
  }

  supersede(ruleId: string, newVersion: RuleVersion): void {
    const versions = this.versions.get(ruleId) ?? [];
    const updated = supersede(ruleId, newVersion, versions);
    this.versions.set(ruleId, updated);
  }

  hasRule(ruleId: string): boolean {
    return (this.versions.get(ruleId)?.length ?? 0) > 0;
  }

  getRuleIds(): string[] {
    return Array.from(this.versions.keys());
  }

  getActiveVersionCount(): number {
    let count = 0;
    for (const versions of this.versions.values()) {
      count += versions.filter((v) => v.lifecycle_stage !== 'superseded').length;
    }
    return count;
  }

  static createVersion(
    ruleId: string,
    effectiveStartDate: string,
    sourceAmendment: { document_id: string; document_name: string; circular_number?: string | null },
    ruleDefinition: RuleVersion['rule_definition'],
    createdBy = 'system',
  ): RuleVersion {
    return {
      version_id: uuidv4(),
      rule_id: ruleId,
      effective_start_date: effectiveStartDate,
      effective_end_date: null,
      source_amendment: sourceAmendment,
      rule_definition: ruleDefinition,
      lifecycle_stage: 'production',
      created_by: createdBy,
      approved_by: null,
      deployment_timestamp: new Date().toISOString(),
    };
  }
}
