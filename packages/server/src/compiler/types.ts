// =============================================================================
// Compiler-Specific Type Definitions — Mobility Rules-as-Code Engine
// Types used during document ingestion, classification, and rule compilation.
// These are intermediate representations before compilation into RuleDefinition.
// =============================================================================

import type { DocumentCategory, VariableCategory } from '../core/types.js';

// ---------------------------------------------------------------------------
// Document Ingestion Types
// ---------------------------------------------------------------------------

/**
 * An unprocessed document as received during ingestion.
 * Holds raw content before any classification or extraction has occurred.
 */
export interface RawDocument {
  /** Unique identifier assigned at ingestion time */
  document_id: string;
  /** Original filename of the uploaded document */
  filename: string;
  /** MIME type of the document (e.g. 'application/pdf', 'text/plain') */
  content_type: string;
  /** Raw binary or text content of the document */
  raw_content: Buffer | string;
  /** ISO 8601 timestamp of when the document was ingested */
  ingestion_timestamp: string;
}

/**
 * A specific location within a source document.
 * Used to trace extracted data back to its origin.
 */
export interface SourceLocation {
  /** ID of the document containing this location */
  document_id: string;
  /** Page number within the document (1-indexed) */
  page_number: number;
  /** Human-readable section reference (e.g. 'סעיף 3.2', 'פרק ב') */
  section_reference: string;
}

// ---------------------------------------------------------------------------
// Classification Types
// ---------------------------------------------------------------------------

/**
 * Result of classifying a document into a known category.
 * Produced by the Document Classifier component.
 */
export interface ClassificationResult {
  /** The assigned document category */
  category: DocumentCategory;
  /** Confidence score between 0 and 1 */
  confidence: number;
  /** Whether this document requires manual review before proceeding */
  flagged_for_review: boolean;
  /** Human-readable reason for flagging, if applicable */
  review_reason?: string | null;
}

/**
 * A document after classification and text extraction.
 * Extends DocumentMetadata with the extracted plain text.
 */
export interface ClassifiedDocument extends DocumentMetadata {
  /** Plain text extracted from the raw document */
  extracted_text: string;
}

/**
 * Metadata extracted from a document during classification and ingestion.
 * Serves as the canonical record for a processed document.
 */
export interface DocumentMetadata {
  /** Unique identifier for this document */
  document_id: string;
  /** Document title as extracted or inferred */
  title: string;
  /** ISO 8601 date the document was issued or effective */
  document_date: string;
  /** Authority that issued the document (e.g. 'המוסד לביטוח לאומי') */
  issuing_authority: string;
  /** Classified document category */
  category: DocumentCategory;
  /** Circular number if applicable (e.g. '1931') */
  circular_number?: string | null;
  /** Legal sections referenced within the document */
  referenced_legal_sections: string[];
  /** Cross-references to other documents */
  cross_references: CrossReference[];
  /** Confidence score of the classification (0–1) */
  classification_confidence: number;
  /** Whether this document was flagged for manual review */
  flagged_for_review: boolean;
  /** Reason for flagging, if applicable */
  review_reason?: string | null;
  /** ISO 8601 timestamp of when the document was ingested */
  ingestion_timestamp: string;
}

/**
 * A directional link from one document to another.
 * Used to track how documents relate to and affect each other.
 */
export interface CrossReference {
  /** ID of the document being referenced */
  referenced_document_id: string;
  /** The nature of the relationship */
  reference_type: 'amends' | 'supersedes' | 'implements' | 'references' | 'overrides';
}

// ---------------------------------------------------------------------------
// Variable Extraction Types
// ---------------------------------------------------------------------------

/**
 * A variable extracted from a document by the Entity Extractor.
 * Represents a named, typed value that can be used in rule conditions.
 */
export interface ExtractedVariable {
  /** Canonical variable name (snake_case) */
  name: string;
  /** Domain category this variable belongs to */
  category: VariableCategory;
  /** Primitive data type of the variable */
  data_type: 'number' | 'string' | 'boolean' | 'date';
  /** Valid numeric range, if applicable */
  valid_range?: { min: number; max: number } | null;
  /** Allowed enum values for string variables, if applicable */
  enum_values?: string[] | null;
  /** Location in the source document where this variable was found */
  source: SourceLocation;
}

/**
 * A term that could not be unambiguously resolved during extraction.
 * Flagged for manual resolution before compilation can proceed.
 */
export interface AmbiguousTerm {
  /** The ambiguous term as it appears in the document */
  term: string;
  /** Where in the document the term was found */
  source_location: SourceLocation;
  /** Explanation of why the term is ambiguous */
  reason: string;
}

/**
 * The full collection of variables extracted from one or more documents.
 * Produced by the Entity Extractor and consumed by the Rule Compiler.
 */
export interface VariableCatalog {
  /** All successfully extracted variables */
  variables: ExtractedVariable[];
  /** Terms that require manual resolution before compilation */
  ambiguous_terms: AmbiguousTerm[];
}

// ---------------------------------------------------------------------------
// Compilation Types
// ---------------------------------------------------------------------------

/**
 * Raw policy text with metadata, representing a policy interpretation
 * before it has been compiled into a formal RuleDefinition.
 * Acts as the intermediate representation in the compilation pipeline.
 */
export interface PolicyInterpretation {
  /** ID of the source document this interpretation was derived from */
  source_document_id: string;
  /** Specific section within the source document */
  source_section: string;
  /** Raw policy text as extracted from the document */
  raw_policy_text: string;
  /** ISO 8601 effective date parsed from the policy text */
  effective_date: string;
  /** ISO 8601 expiry date if the policy has a known end date */
  expiry_date?: string | null;
  /** Whether this interpretation requires human review before compilation */
  requires_review: boolean;
  /** Notes from the reviewer or extractor, if any */
  review_notes?: string | null;
}
