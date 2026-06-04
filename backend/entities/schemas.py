"""
schemas.py — Pydantic domain models for the OPD Claim Adjudication engine.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Decision outcome & Enums
# ---------------------------------------------------------------------------


class DecisionEnum(str, Enum):
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    PARTIAL = "PARTIAL"
    MANUAL_REVIEW = "MANUAL_REVIEW"


class ItemCategory(str, Enum):
    CONSULTATION = "CONSULTATION"
    DIAGNOSTICS = "DIAGNOSTICS"
    PHARMACY = "PHARMACY"
    DENTAL_COVERED = "DENTAL_COVERED"
    COSMETIC_EXCLUDED = "COSMETIC_EXCLUDED"  # AI tags whitening/botox here!
    ADMIN_TAXES = "ADMIN_TAXES"  # AI tags GST/Registration here!
    OTHER = "OTHER"


# ---------------------------------------------------------------------------
# Document sub-models
# ---------------------------------------------------------------------------


class BilledItem(BaseModel):
    item_name: str
    amount: float
    category: ItemCategory = Field(
        description="Classify the line item into one of the strict enum categories based on medical context. IMPORTANT: 'ADMIN_TAXES' must include all taxes, subtotals, grand totals, and admin fees."
    )

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
    itemized_bill: List[BilledItem] = Field(default_factory=list)


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
    ytd_claimed_amount: float = Field(default=0.0)
    submission_date: Optional[str] = Field(default=None)
    member_join_date: Optional[str] = Field(default=None)
    hospital: Optional[str] = Field(default=None)
    cashless_request: bool = False
    previous_claims_same_day: int = Field(default=0)
    documents: DocumentAttachments


# ---------------------------------------------------------------------------
# Raw LLM extraction DTO (Anti-Corruption Layer)
# ---------------------------------------------------------------------------


class RawGeminiExtraction(BaseModel):
    """
    Flexible DTO that maps 1-to-1 with what the vision model returns.
    """

    patient_name: Optional[str] = Field(default=None)
    date_of_treatment: Optional[str] = Field(default=None)
    submission_date: Optional[str] = Field(default=None)
    total_billed_amount: Optional[float] = Field(default=None)
    hospital_name: Optional[str] = Field(default=None)
    is_cashless: Optional[bool] = Field(default=None)

    # Prescription fields
    doctor_name: Optional[str] = Field(default=None)
    doctor_registration_number: Optional[str] = Field(default=None)
    primary_diagnosis: Optional[str] = Field(default=None)
    treatment_plan: Optional[str] = Field(
        default=None, description="The overall treatment plan or therapy recommended"
    )
    medicines_list: List[str] = Field(default_factory=list)
    procedures_list: List[str] = Field(default_factory=list)
    tests_list: List[str] = Field(default_factory=list)

    # Billing breakdown
    consultation_cost: Optional[float] = Field(default=None)
    diagnostics_cost: Optional[float] = Field(default=None)
    pharmacy_cost: Optional[float] = Field(default=None)
    itemized_bill: List[BilledItem] = Field(
        default_factory=list,
        description="Extract EVERY line item on the bill (including taxes and totals) and classify it.",
    )
