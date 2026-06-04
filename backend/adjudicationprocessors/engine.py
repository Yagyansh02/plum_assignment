"""
engine.py — OPD Claim Adjudication Rule Engine

Implements all five steps from adjudication_rules.md:
  Step 1 — Basic Eligibility (policy active, waiting period, member verification)
  Step 2 — Document Validation (reg number, completeness, date consistency)
  Step 3 — Coverage Verification (exclusions, pre-auth)
  Step 4 — Limit Validation (annual, sub-limits, per-claim, co-pay)
  Step 5 — Medical Necessity (lightweight heuristic; upgrade with LLM call if needed)
"""

from __future__ import annotations

import json
import logging
import re
from datetime import date, datetime, timedelta
from typing import List, Optional, Tuple

from constants import (
    ADMIN_FALLBACK_KEYWORDS,
    CONDITION_WAITING_PERIODS,
    EXCLUSION_KEYWORDS,
    HIGH_VALUE_THRESHOLD,
    PREAUTH_MIN_AMOUNT,
    PREAUTH_TESTS,
)
from entities.schemas import (
    ClaimInputEntity,
    DecisionEnum,
    MedicalBill,
    MedicalPrescription,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Load policy matrix once at import time
# ---------------------------------------------------------------------------

with open("data/policy_terms.json") as _f:
    POLICY: dict = json.load(_f)

# ---------------------------------------------------------------------------
# Static lookup tables derived from policy (avoids repeated dict dives)
# ---------------------------------------------------------------------------

NETWORK_HOSPITALS: set[str] = set(POLICY.get("network_hospitals", []))
ANNUAL_LIMIT: float = POLICY["coverage_details"]["annual_limit"]
PER_CLAIM_LIMIT: float = POLICY["coverage_details"]["per_claim_limit"]
MIN_CLAIM_AMOUNT: float = POLICY["claim_requirements"]["minimum_claim_amount"]
SUBMISSION_DEADLINE_DAYS: int = POLICY["claim_requirements"]["submission_timeline_days"]


# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------


def _parse_date(date_str: Optional[str]) -> Optional[date]:
    """Try common Indian date formats and return a date object or None."""
    if not date_str:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d-%b-%Y"):
        try:
            return datetime.strptime(date_str.strip(), fmt).date()
        except ValueError:
            continue
    logger.warning("Could not parse date string: %s", date_str)
    return None


def _validate_doctor_reg(reg: Optional[str]) -> bool:
    """
    Validate Indian medical registration number formats:
      Standard   : XX/12345/YYYY  (2-letter state code)
      Dental/Alt : XXX/12345/YYYY (3-letter prefix, e.g. DEN)
      Ayurveda   : AYUR/XX/12345/YYYY
    """
    if not reg or not reg.strip():
        return False
    reg = reg.strip().upper()
    patterns = [
        r"^[A-Z]{2,3}\/\d+\/\d{4}$",  # KA/45678/2015
        r"^AYUR\/[A-Z]{2}\/\d+\/\d{4}$",  # AYUR/KL/2345/2019
        r"^HOMEO\/[A-Z]{2}\/\d+\/\d{4}$",  # HOMEO/KL/2345/2019
        r"^UNANI\/[A-Z]{2}\/\d+\/\d{4}$",  # UNANI/KL/2345/2019
        r"^[A-Z]{2,3}\/[A-Z]{2,3}\/\d+\/\d{4}$",  # DEN/MH/12345/2020
    ]
    return any(re.match(p, reg) for p in patterns)


def _is_network_hospital(claim: ClaimInputEntity) -> bool:
    """Check bill hospital_name first, then fall back to claim.hospital."""
    bill = claim.documents.bill
    hospital_name = (bill.hospital_name if bill else None) or claim.hospital or ""
    return hospital_name in NETWORK_HOSPITALS


def _check_late_submission(claim: ClaimInputEntity) -> bool:
    """Returns True when the submission is past the 30-day policy deadline."""
    treatment = _parse_date(claim.treatment_date)
    # Default submission date to treatment date if not provided (best-faith assumption)
    submission = _parse_date(claim.submission_date or claim.treatment_date)
    if not treatment or not submission:
        return False
    return (submission - treatment).days > SUBMISSION_DEADLINE_DAYS


def _check_waiting_period(claim: ClaimInputEntity) -> Optional[Tuple[str, str]]:
    """
    Returns (rejection_code, eligible_date_str) if waiting period is violated,
    or None if the claim passes.
    """
    if not claim.member_join_date:
        return None  # Cannot check without join date — pass through

    join_date = _parse_date(claim.member_join_date)
    treatment_date = _parse_date(claim.treatment_date)
    if not join_date or not treatment_date:
        return None

    waiting_periods = POLICY.get("waiting_periods", {})
    days_since_join = (treatment_date - join_date).days

    # 1. Initial 30-day blanket waiting period
    initial_days = waiting_periods.get("initial_waiting", 30)
    if days_since_join < initial_days:
        eligible = join_date + timedelta(days=initial_days)
        return "WAITING_PERIOD", eligible.strftime("%Y-%m-%d")

    # 2. Condition-specific waiting periods
    diagnosis = ""
    if claim.documents.prescription and claim.documents.prescription.diagnosis:
        diagnosis = claim.documents.prescription.diagnosis.lower()

    specific = waiting_periods.get("specific_ailments", {})
    for condition, days in specific.items():
        condition_key = condition.replace("_", " ").lower()
        if condition_key in diagnosis:
            if days_since_join < days:
                eligible = join_date + timedelta(days=days)
                return "WAITING_PERIOD", eligible.strftime("%Y-%m-%d")

    return None


def _check_exclusions(
    diagnosis: str,
) -> Optional[str]:
    """
    Returns 'SERVICE_NOT_COVERED' if an exclusion keyword is found in the
    PRIMARY DIAGNOSIS or MAIN TREATMENT.
    Ancillary procedures and medicines are handled line-by-line during payout calculation.
    """
    primary_reason = diagnosis.lower()

    for keyword in EXCLUSION_KEYWORDS:
        if keyword in primary_reason:
            logger.info(
                "Exclusion hit: keyword='%s' in primary diagnosis/treatment", keyword
            )
            return "SERVICE_NOT_COVERED"

    return None


def _check_medical_necessity(prescription: Optional[MedicalPrescription]) -> float:
    """
    Lightweight heuristic returning a 0–1 necessity score.

    A full implementation would make a short LLM call here (Gemini free tier is
    sufficient) to reason over diagnosis ↔ medicines ↔ procedures alignment.
    This rule-based version is a reliable baseline that avoids API costs.
    """
    if not prescription:
        return 0.0

    score = 0.4  # Baseline

    if prescription.diagnosis:
        score += 0.20
    if prescription.doctor_reg and _validate_doctor_reg(prescription.doctor_reg):
        score += 0.15
    if prescription.medicines_prescribed:
        score += 0.10
    if prescription.treatment or prescription.procedures:
        score += 0.10
    if prescription.tests_prescribed:
        score += 0.05

    # Penalty: procedures that look cosmetic alongside a medical diagnosis
    cosmetic_terms = {
        "whitening",
        "botox",
        "filler",
        "liposuction",
        "rhinoplasty",
        "lasik",
    }
    all_procedures = set(p.lower() for p in prescription.procedures)
    if all_procedures & cosmetic_terms and prescription.diagnosis:
        score -= 0.20  # Mixed bag — flag, don't outright reject

    return round(min(max(score, 0.0), 1.0), 2)


def _compute_approved_amount(
    claim: ClaimInputEntity,
    is_network: bool,
) -> Tuple[float, List[str], List[str]]:
    """
    Applies sub-limits, network discounts, and co-pays to each cost category.

    Returns:
        approved_amount  — final payable figure
        notes            — human-readable explanation of each adjustment
        flags            — machine-readable codes for any mid-calculation issues
    """
    bill = claim.documents.bill
    prescription = claim.documents.prescription
    approved = 0.0
    notes: List[str] = []
    flags: List[str] = []

    if not bill:
        return 0.0, ["No bill submitted — cannot compute payout."], []

    coverage = POLICY["coverage_details"]

    # ── 1. Consultation fee ───────────────────────────────────────────────
    if bill.consultation_fee > 0:
        cfg = coverage["consultation_fees"]
        eligible = min(bill.consultation_fee, cfg["sub_limit"])
        if bill.consultation_fee > cfg["sub_limit"]:
            notes.append(
                f"Consultation capped at sub-limit ₹{cfg['sub_limit']:,} "
                f"(billed ₹{bill.consultation_fee:,.0f})."
            )
        if is_network:
            discount_pct = cfg["network_discount"] / 100
            discount = eligible * discount_pct
            eligible -= discount
            notes.append(f"Network discount ₹{discount:,.0f} applied to consultation.")
        copay = eligible * (cfg["copay_percentage"] / 100)
        approved += eligible - copay
        if copay:
            notes.append(f"Consultation co-pay ₹{copay:,.0f} deducted.")

    # ── 2. Diagnostic tests ───────────────────────────────────────────────
    if bill.diagnostic_tests > 0:
        diag_cfg = coverage["diagnostic_tests"]

        # Pre-auth enforcement for MRI / CT above the threshold
        tests = (
            [t.lower() for t in (prescription.tests_prescribed or [])]
            if prescription
            else []
        )
        needs_preauth = any(pat in t for pat in PREAUTH_TESTS for t in tests)

        if needs_preauth and bill.diagnostic_tests > PREAUTH_MIN_AMOUNT:
            flags.append("PRE_AUTH_MISSING")
            notes.append(
                f"MRI/CT scan requires pre-authorization when diagnostic cost "
                f"exceeds ₹{PREAUTH_MIN_AMOUNT:,.0f}."
            )
            # Do NOT add diagnostic cost to approved; keep processing other items
        else:
            eligible_diag = min(bill.diagnostic_tests, diag_cfg["sub_limit"])
            if bill.diagnostic_tests > diag_cfg["sub_limit"]:
                notes.append(
                    f"Diagnostics capped at sub-limit ₹{diag_cfg['sub_limit']:,} "
                    f"(billed ₹{bill.diagnostic_tests:,.0f})."
                )
            approved += eligible_diag

    # ── 3. Pharmacy / medicines ───────────────────────────────────────────
    if bill.medicines > 0:
        pharma_cfg = coverage["pharmacy"]
        eligible_pharma = min(bill.medicines, pharma_cfg["sub_limit"])
        if bill.medicines > pharma_cfg["sub_limit"]:
            notes.append(
                f"Pharmacy capped at sub-limit ₹{pharma_cfg['sub_limit']:,} "
                f"(billed ₹{bill.medicines:,.0f})."
            )
        # Policy mandates generic drugs; branded drugs carry a 30 % co-pay.
        # Without generic/branded flag we apply a conservative partial co-pay.
        branded_copay_pct = pharma_cfg.get("branded_drugs_copay", 0) / 100
        if branded_copay_pct:
            copay = eligible_pharma * branded_copay_pct
            eligible_pharma -= copay
            notes.append(
                f"Pharmacy co-pay (branded drugs) ₹{copay:,.0f} deducted. "
                "Submit generic alternatives next time to avoid this deduction."
            )
        approved += eligible_pharma

    # ── 4. Itemized ledger — handle mixed covered/excluded line items ──────
    for item in bill.itemized_bill:
        item_lower = item.item_name.lower()

        # DEFENSE IN DEPTH: Block both the AI category AND string-matched totals
        if item.category == "ADMIN_TAXES" or any(
            kw in item_lower for kw in ADMIN_FALLBACK_KEYWORDS
        ):
            if "total" not in item_lower: 
                    notes.append(
                        f"'{item.item_name}' (₹{item.amount:,.0f}) is non-reimbursable (Taxes/Admin fees)."
                    )
            continue

        elif item.category == "COSMETIC_EXCLUDED":
            notes.append(
                f"'{item.item_name}' rejected as it is classified as a cosmetic/excluded procedure (₹{item.amount:,.0f} not approved)."
            )

        elif item.category == "DENTAL_COVERED":
            approved += item.amount
            notes.append(f"'{item.item_name}' approved under dental coverage.")

        elif item.category in ["CONSULTATION", "DIAGNOSTICS", "PHARMACY"]:
            # Skip if the AI also logged these here to prevent double-counting
            continue

        else:  # OTHER categories
            approved += item.amount
    return round(approved, 2), notes, flags


# ---------------------------------------------------------------------------
# Main adjudication entry point
# ---------------------------------------------------------------------------


def evaluate_policy_rules(claim: ClaimInputEntity) -> dict:
    """
    Runs the full adjudication pipeline against the loaded policy and returns
    a decision dict matching the schema in adjudication_rules.md.
    """
    bill = claim.documents.bill
    prescription = claim.documents.prescription
    notes: List[str] = []
    # Dynamic confidence: start at 1.0 and deduct for each uncertainty
    confidence = 1.0

    # ═══════════════════════════════════════════════════════════════════════
    # STEP 0 — Data integrity guard
    # ═══════════════════════════════════════════════════════════════════════
    if claim.member_id == "MISSING_ID" or claim.claim_amount <= 0.0:
        return {
            "decision": DecisionEnum.MANUAL_REVIEW,
            "approved_amount": 0.0,
            "flags": ["CRITICAL_DATA_MISSING"],
            "confidence_score": 0.20,
            "notes": "Could not extract Member ID or Claim Amount from submitted documents.",
            "next_steps": "A claims officer will contact you to verify the missing information.",
        }

    # ═══════════════════════════════════════════════════════════════════════
    # STEP 0b — Process-level checks (late submission, minimum amount)
    # ═══════════════════════════════════════════════════════════════════════
    if _check_late_submission(claim):
        return {
            "decision": DecisionEnum.REJECTED,
            "approved_amount": 0.0,
            "rejection_reasons": ["LATE_SUBMISSION"],
            "confidence_score": 1.0,
            "notes": (
                f"Claim was submitted more than {SUBMISSION_DEADLINE_DAYS} days after treatment. "
                "Policy requires submission within 30 days of treatment."
            ),
            "next_steps": (
                "Late submissions are not eligible. If the delay was due to a medical emergency, "
                "you may appeal via the HR benefits portal."
            ),
        }

    if claim.claim_amount < MIN_CLAIM_AMOUNT:
        return {
            "decision": DecisionEnum.REJECTED,
            "approved_amount": 0.0,
            "rejection_reasons": ["BELOW_MIN_AMOUNT"],
            "confidence_score": 1.0,
            "notes": f"Claim ₹{claim.claim_amount:,.0f} is below the minimum of ₹{MIN_CLAIM_AMOUNT:,.0f}.",
            "next_steps": f"Accumulate expenses and re-submit a combined claim above ₹{MIN_CLAIM_AMOUNT:,.0f}.",
        }

    # ═══════════════════════════════════════════════════════════════════════
    # STEP 1 — Basic eligibility: waiting period & annual limit
    # ═══════════════════════════════════════════════════════════════════════
    waiting_result = _check_waiting_period(claim)
    if waiting_result:
        rejection_code, eligible_date = waiting_result
        return {
            "decision": DecisionEnum.REJECTED,
            "approved_amount": 0.0,
            "rejection_reasons": [rejection_code],
            "confidence_score": 0.96,
            "notes": (
                f"This treatment falls within the policy waiting period. "
                f"You will be eligible from {eligible_date}."
            ),
            "next_steps": f"Re-submit this claim after {eligible_date}.",
        }

    remaining_annual = ANNUAL_LIMIT - claim.ytd_claimed_amount
    annual_exhausted = remaining_annual <= 0

    if annual_exhausted:
        return {
            "decision": DecisionEnum.REJECTED,
            "approved_amount": 0.0,
            "rejection_reasons": ["ANNUAL_LIMIT_EXCEEDED"],
            "confidence_score": 1.0,
            "notes": f"Annual limit of ₹{ANNUAL_LIMIT:,} has been fully utilised this policy year.",
            "next_steps": "The annual limit resets at policy renewal. Contact HR for supplemental coverage options.",
        }

    annual_cap_applies = (claim.ytd_claimed_amount + claim.claim_amount) > ANNUAL_LIMIT
    if annual_cap_applies:
        notes.append(
            f"Claim partially approved up to remaining annual limit of ₹{remaining_annual:,.0f} "
            f"(YTD utilised: ₹{claim.ytd_claimed_amount:,.0f} of ₹{ANNUAL_LIMIT:,})."
        )
        confidence -= 0.02  # Minor deduction — edge case

    # ═══════════════════════════════════════════════════════════════════════
    # STEP 1b — Fraud indicators (before document validation to short-circuit early)
    # ═══════════════════════════════════════════════════════════════════════
    if claim.previous_claims_same_day >= 3:
        return {
            "decision": DecisionEnum.MANUAL_REVIEW,
            "approved_amount": 0.0,
            "flags": ["MULTIPLE_CLAIMS_SAME_DAY", "UNUSUAL_FREQUENCY"],
            "confidence_score": 0.65,
            "notes": (
                f"{claim.previous_claims_same_day} claims filed on the same treatment date — "
                "this pattern triggers a fraud-prevention review."
            ),
            "next_steps": "A claims investigator will contact you within 2 business days.",
        }

    # High-value claim routing (per adjudication_rules.md "Special Scenarios")
    if claim.claim_amount > HIGH_VALUE_THRESHOLD:
        return {
            "decision": DecisionEnum.MANUAL_REVIEW,
            "approved_amount": 0.0,
            "flags": ["HIGH_VALUE_CLAIM"],
            "confidence_score": 0.75,
            "notes": (
                f"Claim of ₹{claim.claim_amount:,.0f} exceeds the ₹{HIGH_VALUE_THRESHOLD:,.0f} "
                "threshold requiring mandatory human review."
            ),
            "next_steps": "A senior claims officer will review and respond within 2 business days.",
        }

    # ═══════════════════════════════════════════════════════════════════════
    # STEP 2 — Document validation
    # ═══════════════════════════════════════════════════════════════════════
    rejection_reasons: List[str] = []

    if not prescription:
        return {
            "decision": DecisionEnum.REJECTED,
            "approved_amount": 0.0,
            "rejection_reasons": ["MISSING_DOCUMENTS"],
            "confidence_score": 1.0,
            "notes": "A prescription from a registered doctor is mandatory for all OPD claims.",
            "next_steps": "Re-submit your claim with the original signed prescription.",
        }

    if not bill:
        return {
            "decision": DecisionEnum.REJECTED,
            "approved_amount": 0.0,
            "rejection_reasons": ["MISSING_DOCUMENTS"],
            "confidence_score": 1.0,
            "notes": "An itemised medical bill is required to process this claim.",
            "next_steps": "Re-submit your claim with the original stamped bill.",
        }

    # Doctor registration validation
    if not _validate_doctor_reg(prescription.doctor_reg):
        rejection_reasons.append("DOCTOR_REG_INVALID")
        notes.append(
            f"Doctor registration number '{prescription.doctor_reg or 'not found'}' "
            "does not match a valid Indian Medical Register format (e.g. KA/45678/2015)."
        )
        confidence -= 0.15

    # ═══════════════════════════════════════════════════════════════════════
    # STEP 3 — Coverage verification
    # ═══════════════════════════════════════════════════════════════════════
    exclusion_hit = _check_exclusions(diagnosis=prescription.diagnosis or "")

    if exclusion_hit:
        return {
            "decision": DecisionEnum.REJECTED,
            "approved_amount": 0.0,
            "rejection_reasons": [exclusion_hit],
            "confidence_score": 0.97,
            "notes": (
                f"The submitted treatment/diagnosis is excluded from policy coverage. "
                f"Excluded item detected in: '{prescription.diagnosis or prescription.treatment}'."
            ),
            "next_steps": "Review the policy exclusions list. Contact HR if you believe this is an error.",
        }

    # ═══════════════════════════════════════════════════════════════════════
    # STEP 4 — Amount calculation (sub-limits, co-pays, discounts)
    # ═══════════════════════════════════════════════════════════════════════
    is_network = _is_network_hospital(claim)
    approved_amount, calc_notes, calc_flags = _compute_approved_amount(
        claim, is_network
    )
    notes.extend(calc_notes)

    # Surface pre-auth failure as a hard rejection
    if "PRE_AUTH_MISSING" in calc_flags:
        return {
            "decision": DecisionEnum.REJECTED,
            "approved_amount": 0.0,
            "rejection_reasons": ["PRE_AUTH_MISSING"],
            "confidence_score": 0.94,
            "notes": " | ".join(n for n in notes if n),
            "next_steps": (
                "MRI/CT scans above ₹10,000 require prior authorisation. "
                "Obtain approval from the HR benefits portal before filing."
            ),
        }

    # Apply annual cap if this claim would exceed the remaining limit
    if annual_cap_applies:
        approved_amount = min(approved_amount, remaining_annual)

    # ═══════════════════════════════════════════════════════════════════════
    # STEP 4b — Dynamic Per-Claim Limit Verification (Data-Driven)
    # ═══════════════════════════════════════════════════════════════════════
    effective_per_claim_limit = PER_CLAIM_LIMIT

    # 1. Safely aggregate all text from the claim to match against policy coverage lists
    claim_text_elements = []
    if prescription:
        claim_text_elements.extend(prescription.procedures or [])
        claim_text_elements.extend(prescription.tests_prescribed or [])
        claim_text_elements.append(prescription.treatment or "")
    if bill:
        # Extract names from the new Pydantic List instead of dict keys
        claim_text_elements.extend([item.item_name for item in bill.itemized_bill])

    claim_text_joined = " ".join([str(t) for t in claim_text_elements if t]).lower()

    # 2. Dynamically scan the policy for any category that provides a higher sub-limit
    for category, config in POLICY["coverage_details"].items():
        if isinstance(config, dict) and "sub_limit" in config:
            covered_terms = []
            for key, value in config.items():
                if isinstance(value, list):
                    covered_terms.extend([str(v).lower() for v in value])

            if covered_terms and any(
                term in claim_text_joined for term in covered_terms
            ):
                if config["sub_limit"] > effective_per_claim_limit:
                    effective_per_claim_limit = config["sub_limit"]
                    notes.append(
                        f"Applied higher specific sub-limit (₹{effective_per_claim_limit:,.0f}) for {category.replace('_', ' ')}."
                    )

    if approved_amount > effective_per_claim_limit:
        return {
            "decision": DecisionEnum.REJECTED,
            "approved_amount": 0.0,
            "rejection_reasons": ["PER_CLAIM_EXCEEDED"],
            "confidence_score": 0.98,
            "notes": f"Eligible amount (₹{approved_amount:,.0f}) exceeds the applicable per-claim limit of ₹{effective_per_claim_limit:,.0f}.",
            "next_steps": "Contact support to check if your plan includes corporate buffer extensions.",
        }
    # ═══════════════════════════════════════════════════════════════════════
    # STEP 5 — Medical necessity heuristic
    # ═══════════════════════════════════════════════════════════════════════
    necessity_score = _check_medical_necessity(prescription)
    if necessity_score < 0.4:
        rejection_reasons.append("NOT_MEDICALLY_NECESSARY")
        notes.append(
            "The diagnosis, medicines, and procedures could not be correlated with sufficient "
            "confidence. A manual clinical review is recommended."
        )
        confidence -= 0.25

    # Low confidence overall → escalate rather than auto-reject
    confidence = round(max(0.0, confidence), 2)
    if confidence < 0.70 and not rejection_reasons:
        return {
            "decision": DecisionEnum.MANUAL_REVIEW,
            "approved_amount": 0.0,
            "flags": ["LOW_CONFIDENCE_SCORE"],
            "confidence_score": confidence,
            "notes": " | ".join(n for n in notes if n),
            "next_steps": "Routed for human review due to data quality concerns. You will be contacted shortly.",
        }

    # ═══════════════════════════════════════════════════════════════════════
    # Final decision assembly
    # ═══════════════════════════════════════════════════════════════════════
    # Only trigger PARTIAL for actual item rejections/exclusions — NOT for
    # standard co-pays or network discounts which are normal policy terms.
    has_rejected_items = any(
        keyword in n.lower() 
        for n in notes 
        for keyword in ["rejected as", "not approved", "non-reimbursable"]
    )

    if rejection_reasons:
        return {
            "decision": DecisionEnum.REJECTED,
            "approved_amount": 0.0,
            "rejection_reasons": rejection_reasons,
            "confidence_score": confidence,
            "notes": " | ".join(n for n in notes if n),
            "next_steps": "Address the issues listed above and re-submit your claim.",
        }

    if approved_amount <= 0.0:
        return {
            "decision": DecisionEnum.REJECTED,
            "approved_amount": 0.0,
            "rejection_reasons": ["SERVICE_NOT_COVERED"],
            "confidence_score": confidence,
            "notes": "All billed items were excluded from coverage.",
            "next_steps": "Review the policy exclusions list."
        }
        
    # PARTIAL APPROVAL TRIGGER
    if has_rejected_items or annual_cap_applies:
        return {
            "decision": DecisionEnum.PARTIAL,
            "approved_amount": approved_amount,
            "rejection_reasons": [],
            "confidence_score": confidence,
            "notes": " | ".join(n for n in notes if n),
            "next_steps": (
                "Partial disbursement will be initiated. "
                "Review the excluded items and deductions in the notes above."
            ),
        }

    # FULL APPROVAL DEFAULT
    return {
        "decision": DecisionEnum.APPROVED,
        "approved_amount": approved_amount,
        "rejection_reasons": [],
        "confidence_score": confidence,
        "notes": " | ".join(n for n in notes if n) or "All checks passed.",
        "next_steps": (
            "Disbursement will be initiated to your registered account within 3–5 business days."
            + (" (Cashless pre-approval granted.)" if claim.cashless_request and is_network else "")
        ),
    }
