import json
from documentprocessors.extractor import extract_claim_from_text
from adjudicationprocessors.engine import evaluate_policy_rules

# Simulating messy OCR text from a scanned PDF containing both a prescription and a bill
MOCK_OCR_TEXT = """
--- PAGE 1: PRESCRIPTION SCANNED ---
Apollo Hospitals - Whitefield Branch
Dr. Priya Sharma, MBBS, MD
Reg. No: KA/45678/2015
Date: 2024-11-10

Patient Name: Rajesh Kumar
Member ID: EMP001
Diagnosis: Acute Viral Fever and body ache

Rx (Prescription):
1. Tab. Paracetamol 650mg - 1x0x1 x 5 days
2. Tab. Vitamin C - 1x0x0 x 10 days

Investigations Advised:
- Complete Blood Count (CBC)
- Dengue NS1 Antigen

Doctor's Signature: [Signed]
------------------------------------

--- PAGE 2: BILLING INVOICE SCANNED ---
Apollo Hospitals
GST No: 29AAAAA0000A1Z5
Date: 2024-11-10
Patient Details: Rajesh Kumar
Claimant ID: EMP001
Cashless Network Request: YES

PARTICULARS                       AMOUNT
----------------------------------------
Consultation Fee                  ₹ 1000
Diagnostic Tests:
 - CBC Profile                    ₹ 400
 - Dengue NS1                     ₹ 600
Pharmacy/Medicines                ₹ 250
----------------------------------------
TOTAL AMOUNT CHARGED:             ₹ 2250
Payment Mode: Pending Insurance
"""

def run_e2e_pipeline():
    print("\n" + "="*60)
    print("🧠 INITIATING AI EXTRACTION PIPELINE (LLAMA-3.3-70B)")
    print("="*60)
    
    try:
        # 1. Pass the unstructured text to the LLM
        print("[1/2] Sending raw OCR text to LLM for structured extraction...")
        extracted_entity = extract_claim_from_text(MOCK_OCR_TEXT)
        
        print("\n✅ Extraction Successful! Here is the strictly typed Pydantic object:")
        # We dump the model to JSON to verify the LLM mapped the fields correctly
        print(json.dumps(extracted_entity.model_dump(), indent=2))
        
        # 2. Pass the extracted entity to our deterministic rule engine
        print("\n" + "-"*60)
        print("[2/2] Pushing extracted entity through Adjudication Engine...")
        adjudication_result = evaluate_policy_rules(extracted_entity)
        
        print("\n⚡ FINAL ADJUDICATION DECISION:")
        print(json.dumps(adjudication_result, indent=2))
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\n💥 PIPELINE CRASHED: {str(e)}")

if __name__ == "__main__":
    run_e2e_pipeline()