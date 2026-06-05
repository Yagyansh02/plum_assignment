import base64
import json

from fastapi import APIRouter, HTTPException, UploadFile, File, Depends, Form, Query
from fastapi.responses import Response
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

# Database imports
from sqlmodel import Session, select, func, col
from database.db import get_session, Member, ClaimRecord

# Processor imports
from entities.schemas import ClaimInputEntity, DecisionEnum
from documentprocessors.vision_extractor import extract_claim_from_images
from adjudicationprocessors.engine import evaluate_policy_rules

router = APIRouter()


class UnstructuredClaimRequest(BaseModel):
    raw_text: str


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

        # 3. Read files + store for admin review
        image_data = []
        uploaded_docs_meta = []
        for file in files:
            file_bytes = await file.read()
            image_data.append((file_bytes, file.content_type))
            # Store base64-encoded document for admin dashboard
            uploaded_docs_meta.append({
                "filename": file.filename or "unknown",
                "content_type": file.content_type or "application/octet-stream",
                "data_b64": base64.b64encode(file_bytes).decode("ascii"),
            })

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
            # ── Admin Dashboard fields ──
            notes=adjudication_output.get("notes", ""),
            flags=adjudication_output.get("flags", []),
            confidence_score=adjudication_output.get("confidence_score"),
            uploaded_documents=uploaded_docs_meta,
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


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN DASHBOARD API ROUTES
# ═══════════════════════════════════════════════════════════════════════════════


@router.get("/admin/claims", summary="Get all claim records for admin dashboard")
async def get_all_claims(
    status: Optional[str] = Query(None, description="Filter by status: APPROVED, REJECTED, PARTIAL, MANUAL_REVIEW"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_session),
):
    """Returns claim records with member info, sorted by submission date (newest first)."""
    stmt = select(ClaimRecord, Member.full_name).join(
        Member, ClaimRecord.member_id == Member.id, isouter=True
    )

    if status:
        stmt = stmt.where(ClaimRecord.status == status)

    stmt = stmt.order_by(col(ClaimRecord.submission_date).desc()).offset(offset).limit(limit)

    results = db.exec(stmt).all()

    # Count totals for pagination
    count_stmt = select(func.count(ClaimRecord.id))
    if status:
        count_stmt = count_stmt.where(ClaimRecord.status == status)
    total = db.exec(count_stmt).one()

    claims = []
    for record, member_name in results:
        claims.append({
            "id": str(record.id),
            "member_id": record.member_id,
            "member_name": member_name or "Unknown",
            "treatment_date": str(record.treatment_date),
            "submission_date": str(record.submission_date),
            "status": record.status,
            "raw_claim_amount": record.raw_claim_amount,
            "approved_amount": record.approved_amount,
            "rejection_reasons": record.rejection_reasons or [],
            "notes": record.notes or "",
            "flags": record.flags or [],
            "confidence_score": record.confidence_score,
            "has_documents": len(record.uploaded_documents or []) > 0,
            "document_count": len(record.uploaded_documents or []),
            "llm_raw_extraction": record.llm_raw_extraction or {},
        })

    return {
        "claims": claims,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get(
    "/admin/claims/{claim_id}/documents/{doc_index}",
    summary="Serve an uploaded document by claim ID and index",
)
async def get_claim_document(
    claim_id: str,
    doc_index: int,
    db: Session = Depends(get_session),
):
    """Returns the raw binary document for viewing/download in the admin dashboard."""
    import uuid as _uuid

    try:
        record = db.get(ClaimRecord, _uuid.UUID(claim_id))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid claim ID format.")

    if not record:
        raise HTTPException(status_code=404, detail="Claim not found.")

    docs = record.uploaded_documents or []
    if doc_index < 0 or doc_index >= len(docs):
        raise HTTPException(status_code=404, detail="Document index out of range.")

    doc = docs[doc_index]
    file_bytes = base64.b64decode(doc["data_b64"])
    content_type = doc.get("content_type", "application/octet-stream")
    filename = doc.get("filename", f"document_{doc_index}")

    return Response(
        content=file_bytes,
        media_type=content_type,
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.get("/admin/policy", summary="Get current policy terms")
async def get_policy():
    """Returns the current policy configuration JSON."""
    with open("data/policy_terms.json", "r") as f:
        return json.load(f)


class PolicyUpdateRequest(BaseModel):
    policy: dict


@router.put("/admin/policy", summary="Update policy terms")
async def update_policy(payload: PolicyUpdateRequest):
    """Overwrites the policy terms JSON. Changes take effect on next server restart."""
    try:
        with open("data/policy_terms.json", "w") as f:
            json.dump(payload.policy, f, indent=2)
        return {"status": "success", "message": "Policy updated. Restart server for changes to take effect."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update policy: {str(e)}")
