from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Form
from typing import List
from pydantic import BaseModel
from datetime import datetime

# Database imports matching your new structure
from sqlmodel import Session, select, func
from database.db import get_session, Member, ClaimRecord

# Processor imports
from entities.schemas import ClaimInputEntity, DecisionEnum
from documentprocessors.extractor import extract_claim_from_text
from documentprocessors.vision_extractor import extract_claim_from_images
from adjudicationprocessors.engine import evaluate_policy_rules

router = APIRouter()


# Schema for incoming raw text requests from the frontend
class UnstructuredClaimRequest(BaseModel):
    raw_text: str


@router.post("/adjudicate/text", summary="Process Unstructured Document Text via LLM")
async def adjudicate_text_claim(payload: UnstructuredClaimRequest):
    try:
        extracted_data = extract_claim_from_text(payload.raw_text)
        adjudication_output = evaluate_policy_rules(extracted_data)
        return {
            "status": "success",
            "extracted_fields": extracted_data.model_dump(),
            "adjudication_results": adjudication_output,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Text Pipeline processing failed: {str(e)}"
        )


@router.post("/adjudicate/documents", summary="Process Medical Images with DB State")
async def adjudicate_image_claim(
    member_id: str = Form(...),
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_session),
):
    try:
        # 1. Read files
        image_data = [(await file.read(), file.content_type) for file in files]
        if not image_data:
            raise ValueError("No files were uploaded.")

        # 2. Extract Data via Gemini Vision (Stateless)
        extracted_data = extract_claim_from_images(image_data)

        # --- DATABASE HYDRATION & CONCURRENCY LOCK ---
        member_id = extracted_data.member_id

        # Lock the row to prevent "Double Spend" race conditions during simultaneous API calls
        member = db.get(Member, member_id, with_for_update=True)

        if not member:
            return {
                "status": "success",
                "extracted_fields": extracted_data.model_dump(),
                "adjudication_results": {
                    "decision": DecisionEnum.MANUAL_REVIEW,
                    "approved_amount": 0.0,
                    "flags": ["MEMBER_NOT_FOUND"],
                    "notes": f"Member ID {member_id} not found in active policy database.",
                },
            }

        # 3. Dynamic SQL Aggregations
        # A. Calculate YTD Claimed Amount safely from the DB ledger
        try:
            treatment_year = datetime.strptime(
                extracted_data.treatment_date, "%Y-%m-%d"
            ).year
        except ValueError:
            treatment_year = datetime.now().year

        ytd_stmt = select(
            func.coalesce(func.sum(ClaimRecord.approved_amount), 0.0)
        ).where(
            ClaimRecord.member_id == member_id,
            ClaimRecord.status.in_([DecisionEnum.APPROVED, DecisionEnum.PARTIAL]),
            func.extract("year", ClaimRecord.treatment_date) == treatment_year,
        )
        calculated_ytd = db.exec(ytd_stmt).one()

        # B. Calculate Frequency Anomaly (Same Day Claims)
        freq_stmt = select(func.count(ClaimRecord.id)).where(
            ClaimRecord.member_id == member_id,
            ClaimRecord.treatment_date == extracted_data.treatment_date,
        )
        same_day_claims = db.exec(freq_stmt).one()

        # 4. Inject Verified DB State into the Claim Entity
        extracted_data.member_join_date = str(member.join_date)
        extracted_data.ytd_claimed_amount = float(calculated_ytd)
        extracted_data.previous_claims_same_day = int(same_day_claims)

        # 5. Execute Deterministic Rule Engine
        adjudication_output = evaluate_policy_rules(extracted_data)

        # 6. Save the Audit Trail to the Database
        try:
            parsed_treatment_date = datetime.strptime(
                extracted_data.treatment_date, "%Y-%m-%d"
            ).date()
        except ValueError:
            parsed_treatment_date = datetime.now().date()

        new_claim_record = ClaimRecord(
            member_id=member.id,
            treatment_date=parsed_treatment_date,
            submission_date=datetime.now().date(),
            status=adjudication_output["decision"],
            raw_claim_amount=extracted_data.claim_amount,
            approved_amount=adjudication_output["approved_amount"],
            rejection_reasons=adjudication_output.get("rejection_reasons", []),
            llm_raw_extraction=extracted_data.model_dump(),
        )

        db.add(new_claim_record)
        db.commit()  # Commits the claim and releases the row lock

        return {
            "status": "success",
            "extracted_fields": extracted_data.model_dump(),
            "adjudication_results": adjudication_output,
        }

    except Exception as e:
        db.rollback()  # Safely release the DB lock on failure
        raise HTTPException(status_code=500, detail=f"Pipeline failed: {str(e)}")
