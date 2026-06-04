/**
 * TypeScript types for the Plum Claim Adjudication System.
 * Derived from backend entities/schemas.py and routes.py response shapes.
 */

// ---------------------------------------------------------------------------
// Decision outcome (mirrors DecisionEnum in schemas.py)
// ---------------------------------------------------------------------------

export type Decision = "APPROVED" | "REJECTED" | "PARTIAL" | "MANUAL_REVIEW";

// ---------------------------------------------------------------------------
// Extracted document sub-models (mirrors MedicalPrescription, MedicalBill)
// ---------------------------------------------------------------------------

export interface MedicalPrescription {
  doctor_name?: string | null;
  doctor_reg?: string | null;
  diagnosis?: string | null;
  medicines_prescribed: string[];
  procedures: string[];
  tests_prescribed: string[];
  treatment?: string | null;
}

export interface MedicalBill {
  hospital_name?: string | null;
  total_amount: number;
  consultation_fee: number;
  diagnostic_tests: number;
  medicines: number;
  itemized_bill: Array<{
    item_name: string;
    amount: number;
    category: string;
  }>;
}

export interface DocumentAttachments {
  prescription?: MedicalPrescription | null;
  bill?: MedicalBill | null;
}

// ---------------------------------------------------------------------------
// Top-level extracted claim entity (mirrors ClaimInputEntity in schemas.py)
// ---------------------------------------------------------------------------

export interface ExtractedFields {
  member_id: string;
  member_name: string;
  treatment_date: string;
  claim_amount: number;
  ytd_claimed_amount: number;
  submission_date?: string | null;
  member_join_date?: string | null;
  hospital?: string | null;
  cashless_request: boolean;
  previous_claims_same_day: number;
  documents: DocumentAttachments;
}

// ---------------------------------------------------------------------------
// Adjudication result (mirrors the engine output dict in routes.py)
// ---------------------------------------------------------------------------

export interface AdjudicationResult {
  decision: Decision;
  approved_amount: number;
  rejection_reasons?: string[];
  flags?: string[];
  notes?: string;
  confidence_score?: number;
  next_steps?: string;
}

// ---------------------------------------------------------------------------
// Full API response shape from POST /api/v1/adjudicate/documents
// ---------------------------------------------------------------------------

export interface AdjudicationResponse {
  status: "success" | "error";
  extracted_fields: ExtractedFields;
  adjudication_results: AdjudicationResult;
}

// ---------------------------------------------------------------------------
// Upload state machine
// ---------------------------------------------------------------------------

export type SubmitState =
  | "idle"
  | "uploading"
  | "processing"
  | "success"
  | "error";

export interface ClaimSubmitState {
  state: SubmitState;
  result: AdjudicationResponse | null;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Admin Dashboard types
// ---------------------------------------------------------------------------

export interface AdminClaimRecord {
  id: string;
  member_id: string;
  member_name: string;
  treatment_date: string;
  submission_date: string;
  status: Decision;
  raw_claim_amount: number;
  approved_amount: number;
  rejection_reasons: string[];
  notes: string;
  flags: string[];
  confidence_score: number | null;
  has_documents: boolean;
  document_count: number;
  llm_raw_extraction: Record<string, unknown>;
}

export interface AdminClaimsResponse {
  claims: AdminClaimRecord[];
  total: number;
  limit: number;
  offset: number;
}
