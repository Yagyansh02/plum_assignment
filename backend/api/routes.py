from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Form
from typing import List
from pydantic import BaseModel
from datetime import datetime

# Database imports
from sqlmodel import Session, select, func
from database.db import get_session, Member, ClaimRecord

# Processor imports
from entities.schemas import ClaimInputEntity, DecisionEnum
from documentprocessors.extractor import extract_claim_from_text
from documentprocessors.vision_extractor import extract_claim_from_images
from adjudicationprocessors.engine import evaluate_policy_rules

router = APIRouter()


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
    member_id: str = Form(...),  # 1. Accept the Clerk ID from Next.js
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_session),
):
    try:
        # 2. Row-Level Lock on the Member FIRST (Prevents race conditions)
        member = db.get(Member, member_id, with_for_update=True)
        if not member:
            return {
                "status": "success",
                "adjudication_results": {
                    "decision": DecisionEnum.MANUAL_REVIEW,
                    "approved_amount": 0.0,
                    "flags": ["MEMBER_NOT_FOUND"],
                    "notes": f"Member ID {member_id} not found in database. Did you seed the DB with your Clerk ID?",
                    "next_steps": "Please verify your account status.",
                },
            }

        # 3. Read files
        image_data = [(await file.read(), file.content_type) for file in files]
        if not image_data:
            db.rollback()
            raise ValueError("No files were uploaded.")

        # 4. Extract Data via Gemini
        # We pass the verified DB member.id safely into the extractor!
        extracted_data = extract_claim_from_images(image_data, member_id=member.id)

        # 5. DUPLICATE CLAIM PREVENTION (Fraud Check)
        try:
            treatment_date_obj = datetime.strptime(
                extracted_data.treatment_date, "%Y-%m-%d"
            ).date()
        except ValueError:
            treatment_date_obj = datetime.now().date()

        duplicate_check_stmt = select(ClaimRecord).where(
            ClaimRecord.member_id == member.id,
            ClaimRecord.treatment_date == treatment_date_obj,
            ClaimRecord.raw_claim_amount == extracted_data.claim_amount,
        )
        duplicate_claim = db.exec(duplicate_check_stmt).first()

        if duplicate_claim:
            db.rollback()  # Release the row lock early
            return {
                "status": "success",
                "extracted_fields": extracted_data.model_dump(),
                "adjudication_results": {
                    "decision": DecisionEnum.REJECTED,
                    "approved_amount": 0.0,
                    "rejection_reasons": ["DUPLICATE_CLAIM"],
                    "confidence_score": 1.0,
                    "notes": f"A claim for ₹{extracted_data.claim_amount} on {treatment_date_obj} has already been submitted.",
                    "next_steps": "Do not submit the same documents twice.",
                },
            }

        # 6. Dynamic SQL Aggregations (YTD Limit)
        ytd_stmt = select(
            func.coalesce(func.sum(ClaimRecord.approved_amount), 0.0)
        ).where(
            ClaimRecord.member_id == member.id,
            ClaimRecord.status.in_([DecisionEnum.APPROVED, DecisionEnum.PARTIAL]),
            func.extract("year", ClaimRecord.treatment_date) == treatment_date_obj.year,
        )
        calculated_ytd = db.exec(ytd_stmt).one()

        freq_stmt = select(func.count(ClaimRecord.id)).where(
            ClaimRecord.member_id == member.id,
            ClaimRecord.treatment_date == extracted_data.treatment_date,
        )
        same_day_claims = db.exec(freq_stmt).one()

        # 7. Inject Verified DB State into the Claim Entity
        extracted_data.member_join_date = str(member.join_date)
        extracted_data.ytd_claimed_amount = float(calculated_ytd)
        extracted_data.previous_claims_same_day = int(same_day_claims)

        # 8. Execute Deterministic Rule Engine
        adjudication_output = evaluate_policy_rules(extracted_data)

        # 9. Save the Audit Trail to the Database
        new_claim_record = ClaimRecord(
            member_id=member.id,
            treatment_date=treatment_date_obj,
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
        raise HTTPException(status_code=500, detail=f"Pipeline failed: {str(e)}")
