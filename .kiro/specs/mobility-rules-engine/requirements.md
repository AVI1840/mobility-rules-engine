# Requirements Document — Mobility Rules-as-Code Engine

## מבוא (Introduction)

מנוע כללים דטרמיניסטי ברמת ייצור עבור מחלקת הניידות של המוסד לביטוח לאומי (ביטוח לאומי).
המערכת תהפוך מסמכים משפטיים, רגולטוריים, נוהליים ושיפוטיים מורכבים למנוע מדיניות מבוסס כללים מכונתיים (Rules-as-Code).
המנוע ישמש כבסיס למחשבוני זכאות חכמים, כלי הערכת זכויות פנימיים לעובדים, מערכות ארנק זכויות יוזמניות לאזרחים, אוטומציה של מערכות ליבה, ומנועי זכאות עתידיים חוצי-תחומים.

כל כלל חייב להיות דטרמיניסטי, ניתן למעקב מלא עם ציטוט משפטי, ומנוהל בגרסאות.

## Glossary

- **Rules_Engine**: The core deterministic decision engine that evaluates eligibility, benefits, and procedural rules based on structured policy definitions. (מנוע הכללים)
- **Policy_Document**: A source legal, regulatory, procedural, or judicial document (PDF, Word, or scanned image) from which rules are extracted. (מסמך מדיניות)
- **Document_Classifier**: The subsystem that classifies ingested Policy_Documents into categories such as eligibility rules, procedural rules, legal overrides, judicial overrides, appeals rules, and administrative circulars. (מסווג מסמכים)
- **Entity_Extractor**: The subsystem that identifies and extracts structured variables and entities from classified Policy_Documents, including demographic, medical, vehicle, geographic, legal, procedural, financial, historical, and operational variables. (מחלץ ישויות)
- **Rule_Compiler**: The subsystem that translates extracted policy interpretations into machine-executable rule definitions in structured JSON format (RuleLogic.json). (מהדר כללים)
- **Decision_Tree**: A deterministic, traceable decision graph that the Rules_Engine traverses to produce eligibility or benefit outcomes, with each node linked to a legal citation. (עץ החלטות)
- **Audit_Trail**: A structured log (AuditTrail.json) recording every decision step, input values, rule evaluations, and legal citations for a given eligibility request. (שביל ביקורת)
- **Governance_Module**: The subsystem responsible for rule versioning, conflict detection, temporal validity management, amendment tracking, and approval workflows. (מודול ממשל)
- **Request_Schema**: The standardized JSON input schema (Request.json) representing a citizen's claim or eligibility query submitted to the Rules_Engine. (סכמת בקשה)
- **Response_Schema**: The standardized JSON output schema (Response.json) containing the eligibility determination, benefit calculations, legal citations, and explanation narrative. (סכמת תגובה)
- **Temporal_Logic_Manager**: The subsystem that manages time-dependent rule validity, ensuring the correct version of a rule is applied based on the effective date of a claim or event. (מנהל לוגיקה זמנית)
- **Conflict_Resolver**: The subsystem that detects and resolves conflicts between overlapping or contradictory rules using a defined priority hierarchy (judicial > statutory > circular > procedural). (מפתר קונפליקטים)
- **Explainability_Renderer**: The subsystem that generates human-readable explanations in Hebrew for every eligibility decision, including the reasoning chain and legal citations. (מרנדר הסברים)
- **QA_Backtester**: The subsystem that validates rule correctness by running historical cases against the current rule set and comparing outcomes. (בודק רגרסיה)
- **Mobility_Agreement**: The primary statutory agreement (הסכם הניידות) governing mobility benefits for persons with disabilities in Israel. (הסכם הניידות)
- **Circular**: An administrative directive (חוזר) issued by the National Insurance Institute that amends, clarifies, or extends the Mobility_Agreement. (חוזר)
- **Judicial_Override**: A court ruling that modifies or overrides statutory or procedural rules, taking precedence in the conflict resolution hierarchy. (עקיפה שיפוטית)
- **Claimant**: A person (citizen or resident) submitting a claim or eligibility query to the Rules_Engine. (תובע)
- **Discretionary_Flag**: A marker indicating that a rule requires human judgment and cannot be resolved deterministically by the Rules_Engine. (דגל שיקול דעת)
- **Rule_Version**: A specific temporal instance of a rule, identified by effective start date, end date (if superseded), and the source amendment or circular that introduced it. (גרסת כלל)
- **Pretty_Printer**: The subsystem that serializes internal rule representations back into human-readable structured text or JSON format. (מדפסת יפה)
- **Manual_Review_Queue**: The subsystem that manages cases requiring human judgment, routing them to appropriate reviewers with full context and legal citations. (תור סקירה ידנית)
- **Evidence_Validator**: The subsystem that validates the completeness, consistency, and reliability of evidence submitted with eligibility requests. (מאמת ראיות)
- **Policy_Lifecycle_Manager**: The subsystem that manages the full lifecycle of rule definitions from draft through legal review, HQ approval, sandbox testing, production deployment, and eventual supersession. (מנהל מחזור חיי מדיניות)
- **HQ_Dashboard**: The headquarters-facing operational control interface that provides policy simulation, rule testing, historical comparison, and approval controls. (לוח בקרה מטה)
- **Sandbox_Environment**: An isolated testing environment where policy changes can be simulated against historical cases before production deployment. (סביבת ארגז חול)
- **Rule_Confidence_Score**: A metric indicating the completeness and validation status of a rule, based on evidence coverage, backtesting results, and legal review status. (ציון ביטחון כלל)
- **Change_Impact_Analyzer**: The subsystem that analyzes the potential impact of a proposed rule change on existing decisions, active claims, and related rules. (מנתח השפעת שינוי)
- **Deployment_Gate**: A controlled checkpoint in the policy lifecycle that requires explicit HQ approval before a rule change is promoted to production. (שער פריסה)

## Requirements

### Requirement 1: Document Ingestion and Classification

**User Story:** As an NII policy analyst, I want to ingest and classify policy documents, so that each document is categorized by type and ready for entity extraction.

#### Acceptance Criteria

1. WHEN a Policy_Document is uploaded, THE Document_Classifier SHALL classify the document into exactly one of the following categories: eligibility_rule, procedural_rule, legal_override, judicial_override, appeals_rule, administrative_circular, loan_agreement, or opinion_document.
2. WHEN a Policy_Document is classified, THE Document_Classifier SHALL extract and store the document metadata including: document title, document date, issuing authority, circular number (if applicable), and referenced legal sections.
3. IF a Policy_Document cannot be classified with a confidence score above 0.7, THEN THE Document_Classifier SHALL flag the document for manual review and record the reason for low confidence.
4. WHEN a Policy_Document references other documents (e.g., a Circular referencing the Mobility_Agreement), THE Document_Classifier SHALL record all cross-references as structured links.
5. THE Document_Classifier SHALL support ingestion of PDF documents encoded in Hebrew (RTL text), including scanned documents via OCR preprocessing.

### Requirement 2: Entity and Variable Extraction

**User Story:** As an NII policy analyst, I want to extract structured entities and variables from classified documents, so that they can be used as inputs and conditions in rule definitions.

#### Acceptance Criteria

1. WHEN a classified Policy_Document is processed, THE Entity_Extractor SHALL identify and extract variables in the following categories: demographic (age, residency, family_status), medical (disability_percentage, mobility_limitation_type, medical_institute_determination), vehicle (engine_volume, vehicle_type, vehicle_age, qualifying_vehicle), geographic (residence_zone, distance_to_services), legal (applicable_sections, amendment_numbers, court_case_references), procedural (claim_submission_date, appeal_deadline, required_forms), financial (benefit_amount, loan_eligibility, co_payment_percentage), and operational (institutional_residence_status, driver_license_holder, authorized_driver_status).
2. WHEN the Entity_Extractor identifies a variable, THE Entity_Extractor SHALL assign a data type (string, integer, float, boolean, date, enum) and a valid value range or enumeration set to each variable.
3. IF the Entity_Extractor encounters an ambiguous term not defined in the Glossary, THEN THE Entity_Extractor SHALL flag the term for manual resolution and record the source location in the Policy_Document.
4. THE Entity_Extractor SHALL produce a structured variable catalog in JSON format, with each variable linked to the source Policy_Document, page number, and section reference.

### Requirement 3: Rule Compilation and Decision Tree Generation

**User Story:** As an NII systems engineer, I want extracted policy interpretations compiled into machine-executable rule definitions, so that the Rules_Engine can evaluate eligibility deterministically.

#### Acceptance Criteria

1. WHEN policy interpretations are compiled, THE Rule_Compiler SHALL produce a RuleLogic.json file where each rule contains: rule_id, rule_name, source_document_id, source_section, effective_date, expiry_date (if applicable), conditions (as boolean expressions over extracted variables), actions (benefit determination, amount calculation, referral), and legal_citation.
2. THE Rule_Compiler SHALL generate a Decision_Tree for each eligibility pathway where every leaf node produces a deterministic outcome (eligible, not_eligible, requires_discretion, or requires_additional_information).
3. WHEN a rule contains a condition that requires human judgment (e.g., "reasonable accommodation", "special circumstances"), THE Rule_Compiler SHALL mark the corresponding Decision_Tree node with a Discretionary_Flag and exclude the node from automated resolution.
4. THE Rule_Compiler SHALL validate that every path in a Decision_Tree terminates at a leaf node within a maximum depth of 50 nodes.
5. THE Pretty_Printer SHALL format RuleLogic.json objects back into human-readable structured text preserving all fields and legal citations.
6. FOR ALL valid RuleLogic.json objects, parsing then pretty-printing then parsing SHALL produce an equivalent object (round-trip property).

### Requirement 4: Request and Response Schema Management

**User Story:** As an NII integration engineer, I want standardized input and output schemas, so that external systems can submit eligibility queries and receive structured responses.

#### Acceptance Criteria

1. THE Rules_Engine SHALL accept eligibility queries conforming to the Request_Schema (Request.json), which includes: claimant_id, claim_date, claim_type (mobility_allowance, vehicle_grant, loan, vehicle_less_allowance, continued_payment), and all relevant demographic, medical, vehicle, and procedural variables.
2. WHEN a valid Request_Schema is received, THE Rules_Engine SHALL produce a Response_Schema (Response.json) containing: decision (eligible, not_eligible, partial, pending_discretion), benefit_details (type, amount, duration, conditions), applied_rules (list of rule_ids with legal citations), explanation_narrative (Hebrew text), and processing_timestamp.
3. IF a Request_Schema is missing required fields, THEN THE Rules_Engine SHALL return a validation error specifying each missing field name and its expected data type.
4. IF a Request_Schema contains field values outside the defined valid ranges, THEN THE Rules_Engine SHALL return a validation error specifying each invalid field, the provided value, and the acceptable range.
5. THE Pretty_Printer SHALL format Response_Schema objects back into human-readable structured text preserving all fields.
6. FOR ALL valid Request_Schema objects, serializing then deserializing SHALL produce an equivalent object (round-trip property).
7. FOR ALL valid Response_Schema objects, serializing then deserializing SHALL produce an equivalent object (round-trip property).

### Requirement 5: Temporal Logic and Rule Versioning

**User Story:** As an NII policy manager, I want rules to be versioned with temporal validity, so that the correct rule version is applied based on the claim date.

#### Acceptance Criteria

1. THE Governance_Module SHALL assign each Rule_Version an effective_start_date and an optional effective_end_date.
2. WHEN the Rules_Engine evaluates a request, THE Temporal_Logic_Manager SHALL select the Rule_Version whose effective date range contains the claim_date from the Request_Schema.
3. WHEN a new Circular or amendment supersedes an existing rule, THE Governance_Module SHALL set the effective_end_date on the previous Rule_Version and create a new Rule_Version with the updated logic and a new effective_start_date.
4. IF no Rule_Version is valid for a given claim_date, THEN THE Rules_Engine SHALL return an error indicating that no applicable rule exists for the specified date and rule_id.
5. THE Governance_Module SHALL maintain a complete version history for each rule, including the source amendment or Circular that introduced each version.

### Requirement 6: Conflict Detection and Resolution

**User Story:** As an NII legal advisor, I want the system to detect and resolve conflicts between overlapping rules, so that the correct rule takes precedence according to the legal hierarchy.

#### Acceptance Criteria

1. WHEN two or more rules produce contradictory outcomes for the same request, THE Conflict_Resolver SHALL detect the conflict and apply the following priority hierarchy: Judicial_Override (highest) > Statutory (Mobility_Agreement) > Circular > Procedural (lowest).
2. WHEN a conflict is resolved, THE Conflict_Resolver SHALL record in the Audit_Trail: the conflicting rule_ids, the resolution method, the winning rule_id, and the legal basis for the priority determination.
3. IF two conflicting rules have equal priority, THEN THE Conflict_Resolver SHALL apply the rule with the later effective_start_date (lex posterior).
4. IF a conflict cannot be resolved deterministically (e.g., two Judicial_Overrides with contradictory holdings), THEN THE Conflict_Resolver SHALL flag the request for manual legal review and record the unresolved conflict in the Audit_Trail.

### Requirement 7: Audit Trail and Traceability

**User Story:** As an NII compliance officer, I want every decision to be fully traceable, so that any eligibility determination can be audited with complete legal citations.

#### Acceptance Criteria

1. WHEN the Rules_Engine processes a request, THE Rules_Engine SHALL generate an AuditTrail.json containing: request_id, claimant_id, processing_timestamp, each evaluated rule (rule_id, rule_version, input_values, evaluation_result, legal_citation), the final decision, and the complete reasoning chain.
2. THE Rules_Engine SHALL include in the Audit_Trail the specific section, paragraph, and clause of each source Policy_Document that contributed to the decision.
3. WHILE the Rules_Engine is processing a request, THE Rules_Engine SHALL record the evaluation order of all rules and the time taken for each rule evaluation.
4. THE Audit_Trail SHALL be immutable after creation; THE Governance_Module SHALL prevent modification of existing Audit_Trail records.
5. FOR ALL valid AuditTrail.json objects, serializing then deserializing SHALL produce an equivalent object (round-trip property).

### Requirement 8: Explainability and Hebrew Narrative Generation

**User Story:** As an NII citizen-facing service, I want every eligibility decision to include a human-readable Hebrew explanation, so that citizens understand the basis for their determination.

#### Acceptance Criteria

1. WHEN the Rules_Engine produces a Response_Schema, THE Explainability_Renderer SHALL generate an explanation_narrative in Hebrew that describes: the eligibility question evaluated, each condition checked and its result, the applicable legal sections with citations, and the final determination with reasoning.
2. THE Explainability_Renderer SHALL use plain Hebrew language accessible to a non-legal audience, avoiding legal jargon where a simpler equivalent exists.
3. WHEN a Discretionary_Flag is present in the decision path, THE Explainability_Renderer SHALL clearly state which aspects of the determination require human review and the reason for the referral.
4. THE Explainability_Renderer SHALL include the full legal citation (document name, section, paragraph, clause) for every rule referenced in the explanation.

### Requirement 9: QA Backtesting and Regression Validation

**User Story:** As an NII QA engineer, I want to validate rule correctness against historical cases, so that rule changes do not introduce regressions.

#### Acceptance Criteria

1. WHEN a backtesting suite is executed, THE QA_Backtester SHALL run each historical test case (defined as a Request_Schema with an expected Response_Schema) against the current rule set and compare the actual outcome to the expected outcome.
2. WHEN a test case produces an outcome different from the expected outcome, THE QA_Backtester SHALL report the discrepancy including: test_case_id, expected_decision, actual_decision, differing_rules, and the specific rule_version that caused the divergence.
3. THE QA_Backtester SHALL support temporal backtesting, where test cases are evaluated using the Rule_Versions that were effective on the original claim_date of each test case.
4. THE QA_Backtester SHALL produce a summary report containing: total_cases_run, passed_count, failed_count, failure_rate_percentage, and a list of all failing test_case_ids.

### Requirement 10: Mobility-Specific Eligibility Rules

**User Story:** As an NII mobility benefits officer, I want the system to encode the core eligibility rules from the Mobility Agreement and its amendments, so that mobility benefit determinations are automated.

#### Acceptance Criteria

1. THE Rules_Engine SHALL evaluate eligibility for the following benefit types defined in the Mobility_Agreement: mobility_allowance (קצבת ניידות), vehicle_grant (מענק רכב), loan_eligibility (זכאות הלוואה from the Loan Fund Agreement — הסכם קרן הלוואות), vehicle_less_allowance (קצבת חסר רכב as defined in Circular 1810), and continued_payment_after_death_or_hospitalization (המשך תשלום קצבה as defined in the opinion document on continued payment for 3 months).
2. WHEN evaluating vehicle_grant eligibility, THE Rules_Engine SHALL apply the engine volume determination rules including the authority of the medical institute to determine a smaller engine vehicle as defined in Circular 2056.
3. WHEN evaluating a claim submitted after the effective date of Amendment 24 (תיקון 24 — Circular 1996), THE Rules_Engine SHALL apply the updated eligibility criteria introduced by that amendment.
4. WHEN evaluating eligibility for a claimant who is institutionalized (שוהה במוסד), THE Rules_Engine SHALL apply the vehicle_less_allowance rules as defined in Circular 1810.
5. WHEN processing a claim, THE Rules_Engine SHALL apply the updated claims submission process as defined in Circular 2132.

### Requirement 11: Judicial Override Integration

**User Story:** As an NII legal advisor, I want court rulings to be encoded as rule overrides, so that judicial precedents are automatically applied in eligibility determinations.

#### Acceptance Criteria

1. WHEN a Judicial_Override is registered (e.g., Supreme Court ruling Shoshana Levy — בג"צ שושנה לוי as implemented by Circular 1905), THE Rules_Engine SHALL apply the judicial ruling as the highest-priority rule for all matching eligibility scenarios.
2. WHEN the ruling in case Shaked Arueti (פסד שקד ארועטי) applies to a request, THE Rules_Engine SHALL apply the precedent established in that ruling and cite it in the Audit_Trail.
3. WHEN the ruling in case Galit Lavi (פסק דין גלית לביא) applies to a request, THE Rules_Engine SHALL apply the precedent established in that ruling and cite it in the Audit_Trail.
4. WHEN the ruling in case Ruth Hadaya (פסק דין רות הדאיה) applies to a request, THE Rules_Engine SHALL apply the updated form requirements and case handling procedures established in that ruling.
5. THE Rules_Engine SHALL support registration of new Judicial_Overrides without requiring changes to the core engine code, through the Governance_Module's rule registration interface.

### Requirement 12: Appeals and Withdrawal Logic

**User Story:** As an NII appeals officer, I want appeals and withdrawal rules encoded in the system, so that appeal-related eligibility changes are handled correctly.

#### Acceptance Criteria

1. WHEN a claimant files an appeal (ערר), THE Rules_Engine SHALL evaluate the appeal eligibility based on the appeal deadline rules and the original claim determination.
2. WHEN an appeal is withdrawn (משיכת ערר — as defined in Circular 1984), THE Rules_Engine SHALL apply the withdrawal rules and update the claim status accordingly.
3. WHEN evaluating duplicate benefits (כפלים — as defined in Circular 1936), THE Rules_Engine SHALL detect and prevent duplicate benefit payments across the Benefits Department.
4. IF an appeal is filed after the defined deadline, THEN THE Rules_Engine SHALL reject the appeal and record the rejection reason including the applicable deadline rule and legal citation.

### Requirement 13: Cross-Domain Scalability Architecture

**User Story:** As an NII enterprise architect, I want the rules engine to be modular and domain-agnostic at its core, so that it can be extended to other NII domains (disability, long-term care, income support).

#### Acceptance Criteria

1. THE Rules_Engine SHALL separate domain-specific rule definitions (Mobility_Agreement rules) from the core engine logic (rule evaluation, conflict resolution, temporal management, audit trail generation).
2. THE Rules_Engine SHALL support loading rule definitions from multiple domain modules simultaneously, where each domain module is an independent set of RuleLogic.json files, variable catalogs, and Decision_Trees.
3. WHEN a new domain module is loaded, THE Rules_Engine SHALL validate the module's schema compatibility with the core engine and report any schema violations before activation.
4. THE Governance_Module SHALL maintain separate version histories and audit trails per domain module.

### Requirement 14: API Integration and Deployment

**User Story:** As an NII integration engineer, I want the rules engine exposed as a REST API, so that it can be integrated with legacy systems, citizen calculators, and internal tools.

#### Acceptance Criteria

1. THE Rules_Engine SHALL expose a REST API endpoint that accepts Request_Schema payloads and returns Response_Schema payloads.
2. WHEN the REST API receives a request, THE Rules_Engine SHALL process the request and return a response within 2000 milliseconds for a single eligibility evaluation.
3. THE Rules_Engine SHALL expose a health-check endpoint that returns the engine status, loaded domain modules, and the count of active Rule_Versions.
4. THE Rules_Engine SHALL expose a rule metadata endpoint that returns the list of all active rules, their versions, effective dates, and source document references.
5. IF the REST API receives a malformed request (invalid JSON, missing Content-Type header), THEN THE Rules_Engine SHALL return an HTTP 400 response with a descriptive error message.

### Requirement 15: Rule Definition Parsing and Serialization

**User Story:** As an NII systems engineer, I want rule definitions to be parsed from JSON and serialized back to JSON reliably, so that rule import/export workflows are lossless.

#### Acceptance Criteria

1. THE Rule_Compiler SHALL parse RuleLogic.json files conforming to the defined JSON schema into internal rule representation objects.
2. THE Pretty_Printer SHALL serialize internal rule representation objects back into valid RuleLogic.json files conforming to the defined JSON schema.
3. FOR ALL valid RuleLogic.json files, parsing then pretty-printing then parsing SHALL produce an equivalent internal representation (round-trip property).
4. WHEN a RuleLogic.json file contains a syntax error, THE Rule_Compiler SHALL return a descriptive parse error specifying the line number, character position, and nature of the error.
5. WHEN a RuleLogic.json file is syntactically valid but violates the schema (e.g., missing required field, invalid data type), THE Rule_Compiler SHALL return a validation error listing each violation with the field path and expected constraint.


### Requirement 16: Human Oversight and Manual Review Governance

**User Story:** As an NII department head, I want human oversight controls for all automated decisions, so that cases requiring judgment are properly routed and audited.

#### Acceptance Criteria

1. WHEN the Rules_Engine encounters a Discretionary_Flag during evaluation, THE Manual_Review_Queue SHALL route the case to the appropriate reviewer based on the flag category (legal, medical, procedural) and include the full evaluation context, partial results, and applicable legal citations.
2. WHEN a reviewer completes a manual review, THE Governance_Module SHALL record the reviewer_id, review_timestamp, decision, reasoning, and any override of the automated partial result in the Audit_Trail.
3. THE Governance_Module SHALL enforce an authority hierarchy for manual overrides: senior_legal_advisor > legal_advisor > senior_claims_officer > claims_officer, where each level can only override decisions within the scope defined for that authority level.
4. WHEN a manual override contradicts the automated determination, THE Governance_Module SHALL require the reviewer to provide a written justification and legal basis, which SHALL be recorded in the Audit_Trail with the override_reason, legal_citation, and original_automated_decision.
5. THE Manual_Review_Queue SHALL track the aging of pending reviews and escalate cases that exceed defined SLA thresholds, where SLA thresholds are configurable per case category (legal, medical, procedural).
6. THE Governance_Module SHALL produce a monthly summary of manual review outcomes including: total_cases_reviewed, override_rate (percentage of cases where the reviewer overrode the automated result), average_review_time_hours, and escalation_count.

### Requirement 17: Evidence Validation and Data Quality

**User Story:** As an NII quality assurance manager, I want the system to validate evidence completeness and data quality, so that eligibility decisions are based on reliable and sufficient information.

#### Acceptance Criteria

1. WHEN a Request_Schema is received, THE Evidence_Validator SHALL check that all required supporting documents for the claim_type are present and SHALL return a list of missing documents with their legal requirement references.
2. THE Evidence_Validator SHALL detect contradictions between submitted data fields (e.g., disability_percentage reported by different sources) and flag each contradiction for resolution before the Rules_Engine proceeds with evaluation.
3. THE Evidence_Validator SHALL check the staleness of submitted data by comparing document dates against configurable freshness thresholds per data category (e.g., medical assessments valid for 12 months, financial records valid for 6 months).
4. WHEN the Evidence_Validator detects insufficient or contradictory evidence, THE Rules_Engine SHALL return a Response_Schema with decision=requires_additional_information and a structured list of required evidence items, each specifying the document_type, legal_requirement_reference, and reason_for_request.
5. THE Evidence_Validator SHALL assign a data_quality_score (0.0 to 1.0) to each request based on evidence completeness, source reliability, and data freshness, and SHALL include the data_quality_score in the Response_Schema and Audit_Trail.
6. FOR ALL requests, THE Evidence_Validator SHALL record the validation results in the Audit_Trail including each checked evidence item, its status (present, missing, stale, contradictory), and the applicable legal requirement reference.

### Requirement 18: Policy Lifecycle Management

**User Story:** As an NII policy governance officer, I want a controlled lifecycle for all rule changes, so that no rule reaches production without proper review, testing, and approval.

#### Acceptance Criteria

1. THE Policy_Lifecycle_Manager SHALL enforce the following lifecycle stages for every rule change: draft, legal_review, hq_approval, sandbox_testing, production, and superseded.
2. WHEN a rule is in draft stage, THE Policy_Lifecycle_Manager SHALL restrict the rule's visibility to the authoring team and prevent the rule from being evaluated by the production Rules_Engine.
3. WHEN a rule transitions from draft to legal_review, THE Policy_Lifecycle_Manager SHALL notify the assigned legal reviewer and record the transition timestamp and initiator_id in the Governance audit log.
4. WHEN a rule transitions from hq_approval to sandbox_testing, THE Sandbox_Environment SHALL automatically execute the QA_Backtester against the proposed rule change using historical test cases and produce a regression report.
5. THE Deployment_Gate SHALL require explicit approval from at least one authorized HQ approver before a rule transitions from sandbox_testing to production.
6. WHEN a rule is deployed to production, THE Policy_Lifecycle_Manager SHALL record the deployment_timestamp, approver_id, regression_test_results (pass_count, fail_count, failure_details), and the set of superseded Rule_Versions in the Audit_Trail.
7. THE Policy_Lifecycle_Manager SHALL support rollback of a production rule to the previous Rule_Version within a configurable rollback window (measured in days), recording the rollback_reason and authorizer_id in the Audit_Trail.

### Requirement 19: Security, Access Control, and Compliance

**User Story:** As an NII information security officer, I want role-based access controls and data protection, so that the system meets regulatory compliance and protects citizen data.

#### Acceptance Criteria

1. THE Rules_Engine SHALL enforce role-based access control (RBAC) with the following minimum roles: system_admin, policy_author, legal_reviewer, hq_approver, claims_officer, auditor, and api_consumer.
2. THE Governance_Module SHALL restrict rule editing permissions to users with the policy_author or legal_reviewer role, and restrict production deployment approval to users with the hq_approver role.
3. THE Rules_Engine SHALL log all access events (authentication, authorization, data access, rule modifications) in a security audit log separate from the decision Audit_Trail.
4. THE Rules_Engine SHALL implement citizen data minimization by processing only the data fields required for the specific claim_type evaluation and SHALL NOT persist raw citizen data beyond the processing session unless explicitly required for the Audit_Trail.
5. THE Rules_Engine SHALL encrypt all citizen data at rest using AES-256 encryption and in transit using TLS 1.2 or higher.
6. THE Governance_Module SHALL enforce separation of duties: the user who authors a rule change SHALL NOT be the same user who approves the rule change for production deployment.

### Requirement 20: HQ Operational Control Dashboard

**User Story:** As an NII headquarters operations manager, I want a control dashboard for policy simulation and monitoring, so that HQ can govern the rules engine with full visibility and control.

#### Acceptance Criteria

1. THE HQ_Dashboard SHALL provide a policy simulation interface where authorized users can submit test Request_Schema payloads against the current production rule set or a proposed rule change and view the full Response_Schema and Audit_Trail for the simulation.
2. THE HQ_Dashboard SHALL provide a historical comparison view that shows the outcome difference between two Rule_Versions for a given set of test cases, including: cases_with_changed_outcome, outcome_change_direction (approval_to_rejection, rejection_to_approval), and affected_rule_ids.
3. THE HQ_Dashboard SHALL display the Rule_Confidence_Score for each active rule, calculated from: backtesting_pass_rate (weight 0.4), evidence_coverage_completeness (weight 0.2), legal_review_status (weight 0.2), and production_usage_volume (weight 0.2).
4. THE HQ_Dashboard SHALL provide a conflict alert panel that displays all detected rule conflicts from the Conflict_Resolver, their resolution status (resolved, pending, escalated), and the applicable legal hierarchy determination.
5. WHEN a rule change is proposed, THE Change_Impact_Analyzer SHALL calculate and display: the number of active claims potentially affected, the estimated outcome changes (approvals_to_rejections count and rejections_to_approvals count), and the list of related rules that may require review.
6. THE HQ_Dashboard SHALL provide real-time operational metrics including: requests_per_hour, average_processing_time_ms, manual_review_queue_depth, error_rate_percentage, and system_health_status (healthy, degraded, unavailable).

### Requirement 21: Operational KPIs and Business Metrics

**User Story:** As an NII executive, I want measurable KPIs for the rules engine, so that the system's operational value and performance can be tracked and reported.

#### Acceptance Criteria

1. THE Rules_Engine SHALL track and report the following processing KPIs: average_processing_time_ms, p95_processing_time_ms, requests_per_day, error_rate_percentage, and uptime_percentage.
2. THE Rules_Engine SHALL track and report the following decision quality KPIs: manual_override_rate (percentage of automated decisions overridden by reviewers), false_rejection_rate (percentage of automated rejections successfully overturned on appeal), and decision_consistency_score (percentage of identical inputs producing identical outputs across repeated evaluations).
3. THE Rules_Engine SHALL track and report the following governance KPIs: average_rule_deployment_time_days (from draft to production), regression_test_pass_rate (percentage of backtesting cases passing), policy_update_frequency (rule changes per month), and rollback_count (rollbacks per quarter).
4. THE Rules_Engine SHALL track and report the following business impact KPIs: rights_uptake_rate (percentage of eligible citizens receiving benefits), average_claim_processing_days (from submission to determination), and operational_cost_per_decision.
5. THE Rules_Engine SHALL expose all KPIs through a dedicated metrics API endpoint and support export in JSON and CSV formats.

### Requirement 22: Continuous Policy Ingestion and Operational Deployment

**User Story:** As an NII policy operations team, I want a continuous process for ingesting new legal documents and deploying updated rules, so that the system stays current with evolving policy.

#### Acceptance Criteria

1. WHEN a new Policy_Document is uploaded, THE Document_Classifier SHALL classify the document and THE Change_Impact_Analyzer SHALL automatically identify all existing rules potentially affected by the new document.
2. WHEN affected rules are identified, THE Policy_Lifecycle_Manager SHALL create draft Rule_Versions incorporating the new policy and link each draft Rule_Version to the source Policy_Document.
3. THE Sandbox_Environment SHALL support parallel testing of multiple proposed rule changes, each isolated from the others and from the production rule set.
4. WHEN a proposed rule change passes sandbox testing and receives HQ approval through the Deployment_Gate, THE Governance_Module SHALL execute a staged deployment: first to a canary environment processing a configurable percentage of requests (default 5%), then to full production after a configurable observation period.
5. THE Governance_Module SHALL archive all superseded Rule_Versions with their complete history, test results, and deployment records, accessible for historical recalculation and audit purposes.
6. THE Rules_Engine SHALL support historical recalculation: re-evaluating past requests using the Rule_Versions that were effective at the original claim_date, for audit or appeals purposes.


## Implementation Phasing

Each requirement is assigned to a deployment stage. Requirements in earlier stages are prerequisites for later stages.

### Stage 1 - Pilot MVP (חסר רכב, מורשה נהיגה, בסיס זכאות)

| Requirement | Scope in Pilot | Notes |
|---|---|---|
| Req 1: Document Ingestion | PDF ingestion for pilot-scope circulars only (1810, 2056, 2132) | OCR + basic classification |
| Req 2: Entity Extraction | Variables for vehicle_less_allowance and basic eligibility only | Subset of full variable catalog |
| Req 3: Rule Compilation | Decision trees for pilot benefit types only | Max 3-4 eligibility pathways |
| Req 4: Request/Response Schemas | Full schema but limited claim_types (vehicle_less_allowance, mobility_allowance) | Schema designed for extensibility |
| Req 5: Temporal Logic | Basic versioning for pilot rules | Single version per rule initially |
| Req 6: Conflict Detection | Basic priority hierarchy | Limited conflict scenarios in pilot scope |
| Req 7: Audit Trail | Full audit trail from day one | Non-negotiable for legal compliance |
| Req 8: Explainability | Basic Hebrew narrative for pilot decisions | Template-based initially |
| Req 9: QA Backtesting | Manual test cases for pilot scope | Minimum 10 test scenarios |
| Req 10: Mobility Rules | vehicle_less_allowance (Circular 1810) + basic eligibility | Focused micro-domain |
| Req 14: API Integration | Single evaluation endpoint + health check | Minimal API surface |
| Req 15: Rule Parsing | Full round-trip for pilot rule definitions | Foundation for all stages |

### Stage 2 - Governance Maturity (post-pilot validation)

| Requirement | Scope | Depends On |
|---|---|---|
| Req 10: Mobility Rules (expanded) | All 5 benefit types, all circulars, Amendment 24 | Stage 1 proven |
| Req 11: Judicial Overrides | All court rulings encoded | Stage 1 + legal team validation |
| Req 12: Appeals Logic | Full appeals and withdrawal rules | Stage 1 + Req 11 |
| Req 16: Human Oversight | Manual review queue, authority hierarchy, override workflows | Stage 1 audit trail |
| Req 17: Evidence Validation | Full evidence completeness, contradiction detection, quality scoring | Stage 1 schemas |
| Req 18: Policy Lifecycle | Full lifecycle: draft through production with sandbox | Stage 1 + Req 16 |
| Req 19: Security & RBAC | Full role-based access, encryption, separation of duties | Stage 1 API |
| Req 20: HQ Dashboard | Simulation, comparison, confidence scoring, conflict alerts | Stage 2 governance |
| Req 21: KPIs | Processing, quality, governance, and business metrics | Stage 2 operations |

### Stage 3 - Enterprise Expansion (national scaling)

| Requirement | Scope | Depends On |
|---|---|---|
| Req 13: Cross-Domain Scalability | Multi-domain module loading, schema validation | Stage 2 proven |
| Req 20: HQ Dashboard (advanced) | Change impact analysis, scenario modeling | Stage 2 dashboard |
| Req 22: Continuous Ingestion | Automated impact analysis, staged deployment, canary | Stage 2 lifecycle |
| Req 14: API (expanded) | Rule metadata endpoint, multi-domain support | Stage 2 + Req 13 |

### Overengineering Risks

| Risk | Mitigation |
|---|---|
| Building full HQ Dashboard before pilot proves value | Defer Req 20 to Stage 2; use manual HQ validation in Stage 1 |
| Implementing cross-domain architecture before single domain works | Defer Req 13 to Stage 3; design for modularity but implement for mobility only |
| Full policy lifecycle before rules are stable | Defer Req 18 to Stage 2; use simple version control in Stage 1 |
| Advanced KPI tracking before operational baseline exists | Defer Req 21 to Stage 2; track basic processing metrics only in Stage 1 |
| Canary deployment before production traffic exists | Defer staged deployment (Req 22) to Stage 3 |
