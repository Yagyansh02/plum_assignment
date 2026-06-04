"""
schemas.py — Pydantic domain models for the OPD Claim Adjudication engine.

"""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, model_validator

# ---------------------------------------------------------------------------
# Decision outcome
# ---------------------------------------------------------------------------


class DecisionEnum(str, Enum):
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    PARTIAL = "PARTIAL"
    MANUAL_REVIEW = "MANUAL_REVIEW"


# ---------------------------------------------------------------------------
# Document sub-models
# ---------------------------------------------------------------------------


class MedicalPrescription(BaseModel):
    doctor_name: Optional[str] = Field(default=None)
    doctor_reg: Optional[str] = Field(default=None)
    diagnosis: Optional[str] = Field(default=None)
    medicines_prescribed: List[str] = Field(default_factory=list)
    procedures: List[str] = Field(default_factory=list)
    tests_prescribed: List[str] = Field(default_factory=list)
    treatment: Optional[str] = Field(default=None)


class MedicalBill(BaseModel):

    hospital_name: Optional[str] = Field(default=None)
    total_amount: float = Field(default=0.0)

    consultation_fee: float = Field(default=0.0)
    diagnostic_tests: float = Field(default=0.0)
    medicines: float = Field(default=0.0)

    # Catches any extra numeric line-items from unusual hospital bill formats
    itemized_ledger: Dict[str, float] = Field(default_factory=dict)

    @model_validator(mode="before")
    @classmethod
    def normalize_hospital_line_items(cls, data: Any) -> Any:
        """
        Sweeps unrecognised numeric fields into itemized_ledger.
        hospital_name and total_amount are now in standard_keys so they are
        never accidentally redirected there.
        """
        if not isinstance(data, dict):
            return data

        standard_keys = {
            "hospital_name",
            "total_amount",
            "consultation_fee",
            "diagnostic_tests",
            "medicines",
            "itemized_ledger",
        }

        normalized: Dict[str, Any] = {}
        itemized_charges: Dict[str, float] = {}

        for key, value in data.items():
            if key in standard_keys:
                normalized[key] = value
            elif isinstance(value, (int, float)):
                # Unknown numeric field → line item
                itemized_charges[key] = float(value)
            else:
                # Unknown non-numeric field → pass through (may be ignored by Pydantic)
                normalized[key] = value

        # Merge with any explicitly provided itemized_ledger
        existing_ledger = normalized.get("itemized_ledger", {}) or {}
        normalized["itemized_ledger"] = {**itemized_charges, **existing_ledger}

        # Auto-derive total_amount if not explicitly provided
        if not normalized.get("total_amount"):
            normalized["total_amount"] = (
                float(normalized.get("consultation_fee", 0) or 0)
                + float(normalized.get("diagnostic_tests", 0) or 0)
                + float(normalized.get("medicines", 0) or 0)
                + sum(normalized["itemized_ledger"].values())
            )

        return normalized


class DocumentAttachments(BaseModel):
    prescription: Optional[MedicalPrescription] = None
    bill: Optional[MedicalBill] = None


# ---------------------------------------------------------------------------
# Top-level claim entity (input to the engine)
# ---------------------------------------------------------------------------


class ClaimInputEntity(BaseModel):
    member_id: str
    member_name: str
    treatment_date: str

    claim_amount: float

    # NEW: required for the annual-limit check (Step 4 of adjudication rules).
    # Should be populated from the DB / claims history before calling the engine.
    ytd_claimed_amount: float = Field(
        default=0.0,
        description="Total amount already claimed by this member in the current policy year.",
    )

    # NEW: required for the 30-day late-submission check.
    # Pass today's date (or the actual submission timestamp) as YYYY-MM-DD.
    submission_date: Optional[str] = Field(
        default=None,
        description="Date on which the claim was submitted. Defaults to treatment date if omitted.",
    )

    member_join_date: Optional[str] = Field(
        default=None,
        description="Policy start date for the member — needed for waiting-period checks.",
    )
    hospital: Optional[str] = Field(
        default=None,
        description="Hospital name from the intake form; used as fallback for network lookup.",
    )
    cashless_request: bool = False
    previous_claims_same_day: int = Field(
        default=0,
        description="Number of other claims filed by this member on the same treatment date.",
    )
    documents: DocumentAttachments


# ---------------------------------------------------------------------------
# Raw LLM extraction DTO (Anti-Corruption Layer)
# ---------------------------------------------------------------------------


class RawGeminiExtraction(BaseModel):
    """
    Flexible DTO that maps 1-to-1 with what the vision model returns.
    Everything is Optional to prevent crashes when a field is absent.
    The engine never touches this directly — vision_extractor maps it to
    ClaimInputEntity first.
    """

    patient_id: Optional[str] = Field(
        default=None, description="Member / employee ID if visible on documents"
    )
    patient_name: Optional[str] = Field(default=None)
    date_of_treatment: Optional[str] = Field(default=None)
    submission_date: Optional[str] = Field(
        default=None, description="Date of claim submission if visible"
    )
    total_billed_amount: Optional[float] = Field(default=None)
    hospital_name: Optional[str] = Field(default=None)
    is_cashless: Optional[bool] = Field(default=None)

    # Prescription fields
    doctor_name: Optional[str] = Field(default=None)
    doctor_registration_number: Optional[str] = Field(default=None)
    primary_diagnosis: Optional[str] = Field(default=None)
    medicines_list: List[str] = Field(default_factory=list)
    procedures_list: List[str] = Field(default_factory=list)
    tests_list: List[str] = Field(default_factory=list)

    # Billing breakdown
    consultation_cost: Optional[float] = Field(default=None)
    diagnostics_cost: Optional[float] = Field(default=None)
    pharmacy_cost: Optional[float] = Field(default=None)
