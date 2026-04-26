# Explainability Templates

This directory is reserved for future template-based rendering approaches.

## Current Approach

The renderer (`../renderer.ts`) generates Hebrew narrative strings programmatically
using translation maps and structured formatting logic. All output is deterministic
given the same `EvaluationContext` and `AuditTrail` inputs.

## Planned Template Approach

Future iterations may introduce file-based templates (e.g., Handlebars or a
lightweight string-interpolation format) stored here, one per claim type or
decision variant. This would allow non-developer stakeholders to adjust the
narrative wording without touching TypeScript source code.

### Proposed template naming convention

```
<claim_type>.<decision>.he.hbs   — Hebrew narrative template
```

Example:
```
mobility_allowance.eligible.he.hbs
vehicle_grant.not_eligible.he.hbs
```

### Template variables (planned)

| Variable              | Description                              |
|-----------------------|------------------------------------------|
| `{{claimType}}`       | Translated claim type (Hebrew)           |
| `{{claimDate}}`       | ISO date of the claim                    |
| `{{decision}}`        | Translated decision (Hebrew)             |
| `{{evaluatedRules}}`  | Array of rule evaluation summaries       |
| `{{discretionFlags}}` | Array of discretionary flag records      |
| `{{citations}}`       | Deduplicated legal citation list         |
