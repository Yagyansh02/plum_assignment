"""
vision_extractor.py — Multimodal document extraction via Google Gemini.
"""

from __future__ import annotations

import json
import logging
import os
import time
import io
import warnings
from typing import List, Optional, Tuple

# Silence the google.generativeai FutureWarnings to keep the terminal clean
warnings.filterwarnings("ignore", category=FutureWarning, module="google.generativeai")
import google.generativeai as genai

from dotenv import load_dotenv
from PIL import Image, ImageEnhance

from entities.schemas import (
    ClaimInputEntity,
    DocumentAttachments,
    MedicalBill,
    MedicalPrescription,
    RawGeminiExtraction,
)

load_dotenv()

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(levelname)s │ %(name)s │ %(message)s")

_api_key = os.getenv("GEMINI_API_KEY")
if not _api_key:
    raise ValueError(
        "GEMINI_API_KEY not found in environment. Add it to your .env file."
    )

genai.configure(api_key=_api_key)

_MODEL_NAME = "gemini-2.5-flash"

# ---------------------------------------------------------------------------
# Prompt engineering
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """\
You are a clinical data extraction specialist for Plum Insurance (India).
You will receive one or more images that together constitute a single OPD claim
submission — they may include a prescription, a medical bill, lab reports,
or a pharmacy receipt.

YOUR TASK
Analyse ALL images together and return a single JSON object that strictly
follows the provided schema.

STRICT RULES
1. Only extract information that is clearly visible in the images.
   Do NOT invent, infer, or guess any value.
2. If a field is not visible, output null (for strings/booleans) or 0.0
   (for numeric fields).
3. Dates must be returned in ISO format: YYYY-MM-DD.
   Convert "15 Oct 2024" → "2024-10-15", "15/10/2024" → "2024-10-15", etc.
4. Doctor registration numbers must be copied exactly as printed
   (e.g. "KA/45678/2015" or "AYUR/KL/2345/2019"). Do not reformat them.
5. Amount fields must be plain numbers without currency symbols or commas
   (e.g. 1500.00, not "₹1,500").
6. Lists (medicines, procedures, tests) should be arrays of plain strings.
   Each element should be one item — do not concatenate multiple items.
7. Return ONLY the JSON object. No markdown fences, no preamble, no explanation.
"""

# ---------------------------------------------------------------------------
# Image Pre-Processing (Enhancement)
# ---------------------------------------------------------------------------


def _enhance_image_for_llm(img_bytes: bytes) -> bytes:
    try:
        image = Image.open(io.BytesIO(img_bytes))
        if image.mode != "RGB":
            image = image.convert("RGB")

        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(1.5)
        enhancer = ImageEnhance.Sharpness(image)
        image = enhancer.enhance(2.0)

        output = io.BytesIO()
        image.save(output, format="JPEG")
        return output.getvalue()
    except Exception as e:
        logger.warning(
            f"Image enhancement failed, falling back to original. Error: {e}"
        )
        return img_bytes


# ---------------------------------------------------------------------------
# Retry wrapper for free-tier rate limits
# ---------------------------------------------------------------------------

_MAX_RETRIES = 3
_RETRY_DELAYS = [2, 5, 15]


def _call_gemini_with_retry(
    model: genai.GenerativeModel, contents: list
) -> Optional[str]:
    for attempt, delay in enumerate(([0] + _RETRY_DELAYS)[: _MAX_RETRIES + 1]):
        if delay:
            logger.info(
                "Rate-limit back-off: waiting %ds before retry %d…", delay, attempt
            )
            time.sleep(delay)
        try:
            # FIX: Using JSON Mode (response_mime_type) without response_schema
            # to prevent Protobuf "Unknown field for Schema: default" crashes.
            response = model.generate_content(
                contents,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json"
                ),
            )
            return response.text
        except Exception as exc:
            logger.warning(
                "Gemini call failed (attempt %d/%d): %s", attempt + 1, _MAX_RETRIES, exc
            )
            if attempt == _MAX_RETRIES:
                logger.error("All Gemini retries exhausted.")
                return None
    return None


# ---------------------------------------------------------------------------
# Public extraction function
# ---------------------------------------------------------------------------


def extract_claim_from_images(
    image_uploads: List[Tuple[bytes, str]],
    member_id: str,
    ytd_claimed_amount: float = 0.0,
    previous_claims_same_day: int = 0,
) -> ClaimInputEntity:

    model = genai.GenerativeModel(_MODEL_NAME)

    schema_json = json.dumps(RawGeminiExtraction.model_json_schema(), indent=2)
    prompt = _SYSTEM_PROMPT + schema_json

    contents: list = [prompt]

    for img_bytes, mime_type in image_uploads:
        if mime_type.startswith("image/"):
            enhanced_bytes = _enhance_image_for_llm(img_bytes)
            final_mime_type = "image/jpeg"
        else:
            enhanced_bytes = img_bytes
            final_mime_type = mime_type

        contents.append({"mime_type": final_mime_type, "data": enhanced_bytes})

    raw_text = _call_gemini_with_retry(model, contents)

    if raw_text is None:
        return _build_manual_review_sentinel(member_id)

    try:
        raw_json = json.loads(raw_text)
        logger.info(
            "Gemini raw extraction:\n%s",
            json.dumps(raw_json, indent=2, ensure_ascii=False),
        )
        raw_data = RawGeminiExtraction.model_validate(raw_json)
    except Exception as exc:
        logger.error("JSON/RawGeminiExtraction validation failed: %s", exc)
        return _build_manual_review_sentinel(member_id)

    return _map_to_domain_entity(
        raw_data, member_id, ytd_claimed_amount, previous_claims_same_day
    )


def _map_to_domain_entity(
    raw: RawGeminiExtraction,
    member_id: str,
    ytd_claimed_amount: float,
    previous_claims_same_day: int,
) -> ClaimInputEntity:

    # ── Prescription ──────────────────────────────────────────────────────
    has_prescription = any(
        [
            raw.doctor_name,
            raw.primary_diagnosis,
            raw.medicines_list,
            raw.doctor_registration_number,
            raw.treatment_plan,
        ]
    )

    prescription_obj: Optional[MedicalPrescription] = None
    if has_prescription:
        prescription_obj = MedicalPrescription(
            doctor_name=raw.doctor_name or "Unknown Doctor",
            doctor_reg=raw.doctor_registration_number or "",
            diagnosis=raw.primary_diagnosis or "Unknown Diagnosis",
            treatment=raw.treatment_plan,
            medicines_prescribed=raw.medicines_list or [],
            procedures=raw.procedures_list or [],
            tests_prescribed=raw.tests_list or [],
        )

    # ── Bill ─────────────────────────────────────────────────────────────
    bill_obj = MedicalBill(
        hospital_name=raw.hospital_name,
        consultation_fee=raw.consultation_cost or 0.0,
        diagnostic_tests=raw.diagnostics_cost or 0.0,
        medicines=raw.pharmacy_cost or 0.0,
        total_amount=raw.total_billed_amount or 0.0,
        itemized_bill=raw.itemized_bill or [],  # Safely mapped AI-categorized Enum list
    )

    docs_obj = DocumentAttachments(prescription=prescription_obj, bill=bill_obj)

    return ClaimInputEntity(
        member_id=member_id,
        member_name=raw.patient_name or "Unknown Patient",
        treatment_date=raw.date_of_treatment or "1970-01-01",
        submission_date=raw.submission_date,
        claim_amount=raw.total_billed_amount or 0.0,
        hospital=raw.hospital_name,
        cashless_request=raw.is_cashless or False,
        ytd_claimed_amount=ytd_claimed_amount,
        previous_claims_same_day=previous_claims_same_day,
        documents=docs_obj,
    )


def _build_manual_review_sentinel(member_id: str) -> ClaimInputEntity:
    return ClaimInputEntity(
        member_id=member_id,
        member_name="Unknown",
        treatment_date="1970-01-01",
        claim_amount=0.0,
        documents=DocumentAttachments(prescription=None, bill=None),
    )
