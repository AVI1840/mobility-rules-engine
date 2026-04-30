# Implementation Plan: Mobility Rules-as-Code Engine — Stage 1 Pilot MVP

## Overview

Stage 1 Pilot MVP for the NII Mobility Rules-as-Code Engine. Scope: `vehicle_less_allowance` (Circular 1810) and basic `mobility_allowance` eligibility. The implementation builds a deterministic rules engine with full audit trail, Hebrew explainability, a professional HQ-facing React UI for testing and validation, and a REST API — all in TypeScript/Node.js with React + Vite frontend.

## Tasks

- [x] 1. Project scaffolding and monorepo setup
  - [x] 1.1 Initialize monorepo with server (Express.js + TypeScript) and client (Vite + React + TypeScript) packages
    - Create root `package.json` with workspaces for `packages/server` and `packages/client`
    - Initialize `packages/server` with TypeScript, Express.js, Vitest, fast-check, Ajv
    - Initialize `packages/client` with Vite + React + TypeScript
    - Configure shared `tsconfig.base.json` with strict mode
    - _Requirements: 14.1, 14.3_

  - [x] 1.2 Set up client UI framework with shadcn/ui, Tailwind CSS, and RTL Hebrew support
    - Install and configure Tailwind CSS with RTL direction
    - Install shadcn/ui and add core components: Dialog, Button, Textarea, Input, Card, Table, Tabs, Badge, ScrollArea
    - Set primary color `#1B3A5C` in Tailwind config
    - Configure `dir="rtl"` on root HTML element
    - Install lucide-react for icons
    - _Requirements: 20.1_

  - [x] 1.3 Create project directory structure matching design specification
    - Create `packages/server/src/core/`, `compiler/`, `ingestion/`, `explainability/`, `qa/`, `api/`, `governance/`, `domains/mobility/`
    - Create `packages/server/schemas/`, `data/rules/`, `data/audit/`, `data/test-cases/`
    - Create `packages/server/test/unit/`, `test/property/`, `test/integration/`, `test/fixtures/`
    - _Requirements: 13.1_

- [x] 2. Core type definitions
  - [x] 2.1 Define all TypeScript interfaces and types in `packages/server/src/core/types.ts`
    - Define `RequestSchema`, `ResponseSchema`, `AuditTrail`, `RuleDefinition`, `DecisionTreeNode`, `RuleVersion`, `ConflictResolution`, `RulePriority`, `DocumentCategory`, `VariableCategory`, `LifecycleStage`, `HealthStatus`, `RuleMetadata`, `DomainModule`, `EvaluationContext`, `RuleEvaluation`, `Conflict`, `EngineError`, `ErrorDetail`
    - Define all enum types: `DocumentCategory`, `ClaimType`, `Decision`, `Outcome`, `ActionType`, `ConditionType`, `Operator`, `Severity`
    - _Requirements: 3.1, 4.1, 4.2, 5.1, 6.1, 7.1_

  - [x] 2.2 Define compiler-specific types in `packages/server/src/compiler/types.ts`
    - Define `PolicyInterpretation`, `ClassificationResult`, `ExtractedVariable`, `VariableCatalog`, `AmbiguousTerm`, `SourceLocation`, `CrossReference`, `DocumentMetadata`, `RawDocument`, `ClassifiedDocument`
    - _Requirements: 1.1, 2.1, 2.2, 15.1_

- [-] 3. JSON Schema definition files
  - [x] 3.1 Create `packages/server/schemas/request.schema.json`
    - Full Request.json schema as defined in design with all field types, ranges, and enums
    - Include `claimant_id`, `claim_date`, `claim_type`, `demographic`, `medical`, `vehicle`, `geographic`, `procedural`, `operational`, `evidence` sections
    - _Requirements: 4.1, 4.3, 4.4_

  - [x] 3.2 Create `packages/server/schemas/response.schema.json`
    - Full Response.json schema with `decision`, `benefit_details`, `applied_rules`, `explanation_narrative`, `processing_timestamp`, `conflicts_resolved`, `discretionary_flags`
    - _Requirements: 4.2, 4.5_

  - [x] 3.3 Create `packages/server/schemas/rule-logic.schema.json`
    - Full RuleLogic.json schema with conditions tree (AND/OR/NOT/COMPARISON/EXISTS), actions, legal_citation, decision_tree with DecisionTreeNode definitions, max depth 50
    - _Requirements: 3.1, 3.4, 15.1_

  - [x] 3.4 Create `packages/server/schemas/audit-trail.schema.json`
    - Full AuditTrail.json schema with `evaluated_rules` (each with evaluation_order, evaluation_time_ms), `conflicts`, `reasoning_chain`, `immutable: true`
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 3.5 Create `packages/server/schemas/rule-version.schema.json` and `packages/server/schemas/variable-catalog.schema.json`
    - RuleVersion schema with `effective_start_date`, `effective_end_date`, `source_amendment`, `lifecycle_stage`
    - VariableCatalog schema with variables array and ambiguous_terms
    - _Requirements: 5.1, 2.4_


- [x] 4. Rule Compiler, Parser, and Pretty Printer
  - [x] 4.1 Implement Rule Parser in `packages/server/src/compiler/parser.ts`
    - Parse RuleLogic.json string into internal `RuleDefinition` objects
    - Validate against `rule-logic.schema.json` using Ajv
    - Return descriptive parse errors with line number, character position, and error nature for syntax errors
    - Return validation errors listing each schema violation with field path and expected constraint
    - _Requirements: 15.1, 15.4, 15.5_

  - [ ]4.2 Write property test for Rule Parser — round-trip (Property 1)
    - **Property 1: RuleLogic.json Round-Trip**
    - Generate random valid RuleLogic.json objects with fast-check
    - Verify: parse → prettyPrint → parse produces equivalent internal representation
    - **Validates: Requirements 3.6, 15.3**

  - [x] 4.3 Implement Pretty Printer in `packages/server/src/compiler/printer.ts`
    - Serialize internal `RuleDefinition` objects back to valid RuleLogic.json strings
    - Preserve all fields and legal citations
    - Format Response.json objects back to human-readable text
    - _Requirements: 3.5, 4.5, 15.2_

  - [x] 4.4 Implement Rule Compiler in `packages/server/src/compiler/compiler.ts`
    - Compile `PolicyInterpretation` into `RuleDefinition` with conditions as boolean expression trees
    - Mark discretionary conditions with `Discretionary_Flag`
    - _Requirements: 3.1, 3.3_

  - [x] 4.5 Implement Decision Tree Builder in `packages/server/src/compiler/tree-builder.ts`
    - Generate `DecisionTree` from `RuleDefinition[]` for each eligibility pathway
    - Ensure every leaf node produces a deterministic outcome (eligible, not_eligible, requires_discretion, requires_additional_information)
    - Validate max depth of 50 nodes
    - _Requirements: 3.2, 3.4_

  - [ ]4.6 Write property tests for Decision Tree structure (Properties 8, 9, 10)
    - **Property 8: Decision Tree Leaf Nodes Produce Deterministic Outcomes**
    - **Property 9: Decision Tree Maximum Depth Invariant**
    - **Property 10: Discretionary Conditions Are Flagged**
    - **Validates: Requirements 3.2, 3.3, 3.4**

  - [ ]4.7 Write property test for schema validation error reporting (Property 24)
    - **Property 24: Schema Validation Error Reporting**
    - Generate RuleLogic.json with syntax errors → verify line/character/description in error
    - Generate schema-valid-but-constraint-violating JSON → verify field path and expected constraint
    - **Validates: Requirements 15.4, 15.5**

- [x] 5. Checkpoint — Core compiler tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Rules Engine Core — Evaluator and Decision Tree Traversal
  - [x] 6.1 Implement condition evaluator in `packages/server/src/core/evaluator.ts`
    - Evaluate boolean expression trees (AND, OR, NOT, COMPARISON, EXISTS) against variable bindings
    - Support operators: eq, neq, gt, gte, lt, lte, in, not_in, between
    - Implement `traverseDecisionTree()` as specified in design with depth guard (max 50)
    - Record each evaluation step in audit steps array with legal citations
    - _Requirements: 3.2, 3.4, 7.1_

  - [x] 6.2 Implement Rules Engine main class in `packages/server/src/core/engine.ts`
    - Implement `evaluate(request: RequestSchema): ResponseSchema` pipeline
    - Orchestrate: validate → temporal select → evaluate rules → resolve conflicts → audit → explain → respond
    - Implement `loadDomainModule(module: DomainModule)` for loading rule files from disk
    - Implement `getActiveRules()` and `getHealth()` methods
    - _Requirements: 4.1, 4.2, 10.1, 13.1, 14.3_

  - [ ]6.3 Write unit tests for condition evaluator
    - Test each operator (eq, neq, gt, gte, lt, lte, in, not_in, between)
    - Test nested AND/OR/NOT combinations
    - Test EXISTS operator for optional fields
    - Test depth limit enforcement
    - _Requirements: 3.2, 3.4_

- [x] 7. Temporal Logic Manager
  - [x] 7.1 Implement Temporal Logic Manager in `packages/server/src/core/temporal.ts`
    - Implement `selectVersion(ruleId, claimDate)` — select Rule_Version whose effective date range contains claim_date
    - Implement `getVersionHistory(ruleId)` — return complete version history
    - Implement `supersede(ruleId, newVersion)` — set effective_end_date on previous version, create new version
    - Return error when no valid Rule_Version exists for given claim_date and rule_id
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]7.2 Write property tests for temporal logic (Properties 12, 13, 14)
    - **Property 12: Temporal Rule Selection Correctness**
    - **Property 13: Rule Version Temporal Invariant** (effective_start_date ≤ effective_end_date)
    - **Property 14: Supersession Creates Valid Version Chain**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

- [x] 8. Conflict Resolver
  - [x] 8.1 Implement Conflict Resolver in `packages/server/src/core/conflict.ts`
    - Implement `detect(evaluations: RuleEvaluation[]): Conflict[]` — detect contradictory outcomes
    - Implement `resolve(conflict: Conflict): ConflictResolution` with priority hierarchy: judicial_override > statutory > circular > procedural
    - Apply lex posterior (later effective_start_date) for equal-priority conflicts
    - Flag unresolvable conflicts (e.g., contradictory judicial overrides) for manual review
    - Record all conflict details in audit trail
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]8.2 Write property tests for conflict resolution (Properties 15, 16)
    - **Property 15: Conflict Resolution Respects Priority Hierarchy**
    - **Property 16: Conflict Resolution Audit Completeness**
    - **Validates: Requirements 6.1, 6.2, 6.3**

- [x] 9. Audit Trail Writer
  - [x] 9.1 Implement Audit Trail Writer in `packages/server/src/core/audit.ts`
    - Implement `create(evaluation: EvaluationContext): AuditTrail` — generate immutable AuditTrail.json
    - Include: request_id, claimant_id, processing_timestamp, evaluated_rules (each with rule_id, rule_version, input_values, evaluation_result, legal_citation with section/paragraph/clause, evaluation_order, evaluation_time_ms), final_decision, reasoning_chain
    - Write audit trail to file system as append-only JSON log in `data/audit/`
    - Prevent modification of existing audit trail records (immutability enforcement)
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]9.2 Write property tests for audit trail (Properties 4, 17, 18)
    - **Property 4: Audit Trail Round-Trip** (serialize → deserialize equivalence)
    - **Property 17: Audit Trail Completeness** (all required fields present)
    - **Property 18: Audit Trail Immutability** (reject modifications)
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

- [x] 10. Checkpoint — Core engine tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Explainability Renderer — Hebrew Narrative Generation
  - [x] 11.1 Implement Explainability Renderer in `packages/server/src/explainability/renderer.ts`
    - Implement `render(evaluation, auditTrail): string` — generate Hebrew narrative
    - Include: eligibility question evaluated, each condition checked and its result, applicable legal sections with full citations (document_name, section, paragraph, clause), final determination with reasoning
    - Use plain Hebrew accessible to non-legal audience
    - When Discretionary_Flag present, clearly state which aspects require human review and reason for referral
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 11.2 Create Hebrew narrative templates in `packages/server/src/explainability/templates/`
    - Create template files for each decision outcome (eligible, not_eligible, partial, pending_discretion, requires_additional_information)
    - Include template variables for legal citations, condition results, and reasoning chain
    - _Requirements: 8.1, 8.2_

  - [ ]11.3 Write property tests for explainability (Properties 19, 20)
    - **Property 19: Explainability Contains Legal Citations**
    - **Property 20: Discretionary Flags Appear in Explanation**
    - **Validates: Requirements 8.1, 8.3, 8.4**

- [x] 12. Request/Response Validation with Ajv
  - [x] 12.1 Implement schema validator in `packages/server/src/core/validator.ts`
    - Load all JSON schemas using Ajv with format validation
    - Implement `validateRequest(request)` — validate against request.schema.json
    - Return structured validation errors: each missing field with expected type, each invalid field with provided value and acceptable range
    - Implement `validateResponse(response)` — validate against response.schema.json
    - Implement `validateRuleLogic(rule)` — validate against rule-logic.schema.json
    - Implement `validateAuditTrail(audit)` — validate against audit-trail.schema.json
    - _Requirements: 4.3, 4.4, 15.5_

  - [ ]12.2 Write property tests for request validation (Properties 2, 3, 11)
    - **Property 2: Request Schema Round-Trip** (serialize → deserialize equivalence)
    - **Property 3: Response Schema Round-Trip** (serialize → deserialize equivalence)
    - **Property 11: Request Validation Detects All Missing and Invalid Fields**
    - **Validates: Requirements 4.3, 4.4, 4.6, 4.7**

- [x] 13. Mobility domain rules — vehicle_less_allowance (Circular 1810)
  - [x] 13.1 Author RuleLogic.json files for vehicle_less_allowance in `packages/server/src/domains/mobility/rules/`
    - Create `vehicle-less-allowance.rules.json` encoding Circular 1810 eligibility rules for institutionalized claimants (שוהים במוסד)
    - Create `basic-mobility-allowance.rules.json` encoding basic mobility_allowance eligibility
    - Each rule includes: rule_id, rule_name, source_document_id, source_section, effective_date, conditions, actions, legal_citation, priority, decision_tree
    - _Requirements: 10.1, 10.4_

  - [x] 13.2 Create variable catalog for pilot scope in `packages/server/src/domains/mobility/variables/`
    - Define variables for vehicle_less_allowance: institutional_residence_status, disability_percentage, mobility_limitation_type, age, claim_date
    - Define variables for basic mobility_allowance: driver_license_holder, authorized_driver_status, qualifying_vehicle, engine_volume
    - Each variable with data_type, valid_range/enum_values, and source document reference
    - _Requirements: 2.1, 2.2, 2.4_

  - [x] 13.3 Create domain module definition in `packages/server/src/domains/mobility/module.ts`
    - Implement `MobilityDomainModule` that loads rule files and variable catalog from disk
    - Register with the Rules Engine via `loadDomainModule()`
    - _Requirements: 13.1, 13.2_

  - [ ]13.4 Write unit tests for mobility domain rules
    - Test vehicle_less_allowance eligibility for institutionalized claimant (eligible case)
    - Test vehicle_less_allowance for non-institutionalized claimant (not eligible case)
    - Test basic mobility_allowance with qualifying vehicle
    - Test edge cases: missing fields, boundary values for disability_percentage
    - _Requirements: 10.1, 10.4_

- [x] 14. REST API — Express server with evaluate + health endpoints
  - [x] 14.1 Implement Express server in `packages/server/src/api/server.ts`
    - Set up Express app with JSON body parsing, CORS, error handling middleware
    - Configure API key authentication middleware (Stage 1: simple key → role mapping)
    - _Requirements: 14.1, 14.5_

  - [x] 14.2 Implement route handlers in `packages/server/src/api/routes.ts` and `packages/server/src/api/handlers/`
    - `POST /api/v1/evaluate` — accept Request.json, validate, evaluate, return Response.json with audit_trail_id and processing_time_ms
    - `GET /api/v1/health` — return engine status, loaded domains, active rule version count, uptime
    - `POST /api/v1/backtest` — run backtesting suite and return report
    - Return HTTP 400 for malformed requests (invalid JSON, missing Content-Type) with descriptive error
    - Return structured validation errors for schema violations
    - _Requirements: 14.1, 14.2, 14.3, 14.5_

  - [ ]14.3 Write property test for malformed API request rejection (Property 30)
    - **Property 30: Malformed API Request Rejection**
    - Generate requests with invalid JSON, missing Content-Type → verify HTTP 400 with error code and description
    - **Validates: Requirements 14.5**

  - [ ]14.4 Write integration tests for REST API
    - Test full evaluate flow: valid request → 200 with Response.json
    - Test validation error flow: invalid request → 400 with structured errors
    - Test health endpoint returns correct status and module info
    - Test processing time < 2000ms for single evaluation
    - _Requirements: 14.1, 14.2, 14.3, 14.5_

- [x] 15. Checkpoint — API and domain rules working end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 16. QA Backtester
  - [ ] 16.1 Implement QA Backtester in `packages/server/src/qa/backtester.ts`
    - Implement `run(suite: TestSuite): BacktestReport` — run each historical test case against current rule set
    - Implement `runTemporal(suite: TestSuite): BacktestReport` — evaluate using Rule_Versions effective on original claim_date
    - Compare actual outcome to expected outcome for each test case
    - Report discrepancies: test_case_id, expected_decision, actual_decision, differing_rules, specific rule_version causing divergence
    - Produce summary: total_cases_run, passed_count, failed_count, failure_rate_percentage, failing test_case_ids
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ] 16.2 Create 10+ test scenarios in `packages/server/data/test-cases/`
    - Create test cases as Request.json + expected Response.json pairs
    - Include: eligible vehicle_less_allowance, not eligible vehicle_less_allowance, eligible mobility_allowance, not eligible mobility_allowance, missing required fields, boundary disability_percentage, institutionalized claimant, non-institutionalized claimant, temporal edge case (claim before rule effective date), discretionary flag case
    - _Requirements: 9.1_

  - [ ]16.3 Write property tests for backtester (Properties 21, 22, 23)
    - **Property 21: Backtesting Report Consistency** (passed + failed = total, failure_rate = failed/total * 100)
    - **Property 22: Backtesting Discrepancy Reports Are Complete**
    - **Property 23: Temporal Backtesting Uses Correct Rule Versions**
    - **Validates: Requirements 9.2, 9.3, 9.4**

- [x] 17. HQ-facing UI — React dashboard for eligibility testing and validation
  - [x] 17.1 Create app shell and layout in `packages/client/src/`
    - Set up RTL Hebrew layout with `dir="rtl"` and `lang="he"`
    - Create main layout with sidebar navigation, header with app title "מנוע זכויות ניידות"
    - Apply government-grade styling: primary color `#1B3A5C`, clean professional typography
    - Create responsive layout that works on desktop screens
    - _Requirements: 20.1_

  - [x] 17.2 Implement Eligibility Scenario Testing page
    - Create form for submitting test Request.json payloads with all field groups (demographic, medical, vehicle, geographic, procedural, operational)
    - Hebrew labels for all form fields
    - Dropdown for claim_type selection (vehicle_less_allowance, mobility_allowance)
    - Submit button calls `POST /api/v1/evaluate` and displays full Response.json
    - Display decision result with color-coded badge (eligible=green, not_eligible=red, partial=orange, pending_discretion=yellow)
    - _Requirements: 20.1_

  - [x] 17.3 Implement Decision Trace Visibility panel
    - Display the full audit trail reasoning_chain as a step-by-step visual trace
    - Show each evaluated rule with: rule_id, rule_name, evaluation_result, legal_citation
    - Highlight the decision path through the decision tree
    - Show conflict resolutions with winning/losing rules and legal basis
    - Collapsible sections for detailed input_values and evaluation_time_ms per rule
    - _Requirements: 7.1, 20.1_

  - [x] 17.4 Implement Rule Explanation panel
    - Display the Hebrew explanation_narrative from the response
    - Show each applied rule with its legal citation (document_name, section, paragraph, clause)
    - Highlight discretionary flags with clear Hebrew explanation of what requires human review
    - Formatted card layout with legal citation links
    - _Requirements: 8.1, 8.4, 20.1_

  - [x] 17.5 Implement Variable Inspection panel
    - Display all input variables used in the evaluation with their values
    - Show which variables were checked by each rule condition
    - Highlight missing or invalid variables
    - Show variable source references (document, page, section)
    - _Requirements: 2.1, 20.1_

  - [x] 17.6 Implement Edge Case Simulation view
    - Pre-built scenario templates for common edge cases (institutionalized claimant, boundary disability %, missing evidence, temporal edge)
    - One-click load of scenario into the evaluation form
    - Side-by-side comparison of two scenario results
    - _Requirements: 20.1, 20.2_

  - [x] 17.7 Implement Historical Comparison view
    - Allow selecting two rule versions and a set of test cases
    - Display outcome differences: cases_with_changed_outcome, outcome_change_direction
    - Table showing each test case with old vs new decision
    - _Requirements: 20.2_

  - [x] 17.8 Implement QA Backtester dashboard panel
    - Trigger backtesting run via `POST /api/v1/backtest`
    - Display summary: total_cases_run, passed_count, failed_count, failure_rate_percentage
    - List failing test cases with discrepancy details
    - Color-coded pass/fail indicators
    - _Requirements: 9.1, 9.4_

- [x] 18. Feedback Modal — Pilot feedback system
  - [x] 18.1 Create `packages/client/src/components/FeedbackModal.tsx`
    - Implement FeedbackModal component per global steering rule
    - APP_NAME: "מנוע זכויות ניידות"
    - STORAGE_KEY: "btl-mobility-rules-engine-feedback"
    - NAME_KEY: "btl-mobility-rules-engine-feedback-user-name"
    - Categories: 🐛 באג, 💡 שיפור, 📊 נתונים, 🎨 עיצוב
    - Severity levels: קריטי, שיפור, קטן
    - Connected to shared Google Sheet via SHEET_URL
    - RTL direction throughout
    - Requires shadcn/ui: Dialog, Button, Textarea, Input
    - _Requirements: Pilot feedback capture_

  - [x] 18.2 Integrate feedback button in App.tsx
    - Fixed button at bottom-6 left-6 z-50 with background color `#1B3A5C`
    - MessageCircle icon from lucide-react
    - Label "משוב פיילוט" visible on sm+ screens
    - Opens FeedbackModal on click
    - _Requirements: Pilot feedback capture_

- [x] 19. Checkpoint — Full UI and feedback system working
  - Ensure all tests pass, ask the user if questions arise. Verify UI renders correctly in RTL Hebrew, all panels display data from API, and feedback modal submits to Google Sheet.

- [ ] 20. Document Classifier — Basic PDF ingestion for pilot circulars (optional for MVP)
  - [ ]20.1 Implement basic Document Classifier in `packages/server/src/ingestion/classifier.ts`
    - Classify uploaded PDF documents into one of: eligibility_rule, procedural_rule, legal_override, judicial_override, appeals_rule, administrative_circular, loan_agreement, opinion_document
    - Extract metadata: title, document_date, issuing_authority, circular_number, referenced_legal_sections
    - Flag documents with confidence < 0.7 for manual review with reason
    - Extract cross-references between documents
    - Support Hebrew RTL PDF text extraction
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]20.2 Write property tests for document classification (Properties 5, 6)
    - **Property 5: Document Classification Produces Exactly One Valid Category**
    - **Property 6: Low-Confidence Classification Triggers Manual Review**
    - **Validates: Requirements 1.1, 1.3**

- [ ] 21. Entity Extractor — Variable extraction from classified documents (optional for MVP)
  - [ ]21.1 Implement basic Entity Extractor in `packages/server/src/ingestion/extractor.ts`
    - Extract variables from classified documents in categories: demographic, medical, vehicle, geographic, legal, procedural, financial, operational
    - Assign data_type and valid_range/enum_values to each variable
    - Flag ambiguous terms for manual resolution with source location
    - Produce structured variable catalog in JSON format
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]21.2 Write property test for extracted variables (Property 7)
    - **Property 7: Extracted Variables Have Valid Types and Source References**
    - **Validates: Requirements 2.1, 2.2, 2.4**

- [x] 22. Final checkpoint — Full Stage 1 Pilot MVP
  - Ensure all tests pass, ask the user if questions arise. Verify: rules engine evaluates vehicle_less_allowance and mobility_allowance correctly, audit trail is generated for every decision, Hebrew explanations are readable, REST API responds within 2000ms, QA backtester passes 10+ scenarios, HQ UI displays all panels correctly in RTL Hebrew, feedback modal is functional.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties from the design document (32 properties total, Stage 1 covers Properties 1–24, 30)
- Unit tests validate specific examples and edge cases for mobility domain rules
- The HQ UI (`packages/client`) is a separate React app that calls the REST API (`packages/server`)
- Document Classifier (task 20) and Entity Extractor (task 21) are optional for Stage 1 — pilot can use manually authored rules
- All UI components use RTL Hebrew with government-grade styling (#1B3A5C primary)
- FeedbackModal is mandatory per global steering rule and connects to the shared Google Sheet
