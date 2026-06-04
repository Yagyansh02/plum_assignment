from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List
from pydantic import BaseModel
from entities.schemas import ClaimInputEntity
from documentprocessors.extractor import extract_claim_from_text
from documentprocessors.vision_extractor import extract_claim_from_images
from adjudicationprocessors.engine import evaluate_policy_rules

# Initialize the router
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
            "adjudication_results": adjudication_output
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text Pipeline processing failed: {str(e)}")

@router.post("/adjudicate/documents", summary="Process Multiple Medical Images via Gemini Pro")
async def adjudicate_image_claim(files: List[UploadFile] = File(...)):
    """
    Accepts MULTIPLE image uploads for a single claim, passes them to Gemini Vision 
    for cross-referencing, normalizes the data, and runs the rule engine.
    """
    try:
        image_data = []
        for file in files:
            bytes_data = await file.read()
            image_data.append((bytes_data, file.content_type))
            
        if not image_data:
            raise ValueError("No files were uploaded.")
        
        # 1. Multi-Document Vision Extraction (with Anti-Corruption Layer)
        extracted_data = extract_claim_from_images(image_data)
        
        # 2. Deterministic Rule Engine Adjudication
        adjudication_output = evaluate_policy_rules(extracted_data)
        
        return {
            "status": "success",
            "extracted_fields": extracted_data.model_dump(),
            "adjudication_results": adjudication_output
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini Vision Pipeline failed: {str(e)}")