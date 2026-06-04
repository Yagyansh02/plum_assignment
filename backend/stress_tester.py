import random
import requests
from datetime import datetime, timedelta

# --- 1. MOCK DATA DICTIONARIES ---
DOCTORS = [
    {"name": "Dr. Priya Sharma", "reg": "KA/45678/2015", "type": "Allopathic"},
    {"name": "Dr. Amit Patel", "reg": "MH/67890/2018", "type": "Allopathic"},
    {"name": "Vaidya Krishnan", "reg": "AYUR/KL/2345/2019", "type": "Ayurvedic"},
    {"name": "Dr. Fake Person", "reg": "INVALID-123", "type": "Fraud"}
]

HOSPITALS = ["Apollo Hospitals", "Fortis Healthcare", "City Clinic", "Sanjeevani Nursing Home"]
DIAGNOSES = ["Viral fever", "Gastroenteritis", "Migraine", "Lower back pain", "Obesity - BMI 35", "Type 2 Diabetes"]
MEDICINES = ["Paracetamol 650mg", "Amoxicillin 500mg", "Omeprazole 20mg", "Cetirizine 10mg"]
TESTS = ["Complete Blood Count (CBC)", "Liver Function Test (LFT)", "X-Ray Chest", "MRI Lumbar Spine"]

def generate_mock_ocr_text(scenario_type="standard"):
    doc = DOCTORS[0] # Default to a valid doctor to isolate test scenarios
    hospital = random.choice(HOSPITALS)
    diagnosis = random.choice(DIAGNOSES)
    meds = random.sample(MEDICINES, 2)
    tests = random.sample(TESTS, 1)
    
    consultation = random.randint(500, 1500)
    med_cost = random.randint(200, 800)
    test_cost = random.randint(400, 2000)
    
    # SCENARIO MODIFIERS
    if scenario_type == "standard":
        doc = random.choice([DOCTORS[0], DOCTORS[1]])
    elif scenario_type == "cosmetic":
        diagnosis = "Tooth decay"
        tests = ["Root canal treatment", "Teeth whitening"]
        test_cost = 12000
    elif scenario_type == "exclusion":
        diagnosis = "Obesity - BMI 35"
    elif scenario_type == "mri_preauth":
        tests = ["MRI Lumbar Spine"]
        test_cost = 15000 
    elif scenario_type == "missing_reg":
        doc = DOCTORS[3] # Force the invalid/fraud doctor
        doc["reg"] = "" 
    elif scenario_type == "ayurvedic":
        doc = DOCTORS[2] # Force Ayurvedic doctor
        
    total = consultation + med_cost + test_cost
    date = (datetime.now() - timedelta(days=random.randint(1, 10))).strftime("%Y-%m-%d")

    # Format lists properly so they all show up in OCR
    meds_str = "\n    ".join([f"{i+1}. {m}" for i, m in enumerate(meds)])
    tests_str = "\n    - ".join(tests)

    ocr_text = f"""
    [[PAGE 1: SCANNED PRESCRIPTION]]
    {hospital}
    {doc['name']}, MD
    Reg. No: {doc['reg']}
    Date: {date}
    Patient: Test User
    Member ID: EMP999
    
    Diagnosis: {diagnosis}
    
    Rx:
    {meds_str}
    
    Advised:
    - {tests_str}
    
    [[PAGE 2: SCANNED INVOICE]]
    {hospital} Billing Dept
    Date: {date}
    
    Consultation Fee: INR {consultation}
    Lab/Procedures: INR {test_cost}
    Pharmacy: INR {med_cost}
    
    TOTAL BILLED AMOUNT: {total}
    Payment: PAID
    """
    return ocr_text, scenario_type

def run_stress_test():
    URL = "http://127.0.0.1:8000/api/v1/adjudicate/text"
    
    scenarios = [
        "standard", 
        "standard", 
        "cosmetic", 
        "exclusion", 
        "mri_preauth", 
        "missing_reg", 
        "ayurvedic"
    ]
    
    print("🚀 STARTING AI PIPELINE STRESS TEST\n" + "="*60)
    
    for i, scenario in enumerate(scenarios):
        print(f"\n[{i+1}/{len(scenarios)}] Generating OCR for Scenario: {scenario.upper()}")
        ocr_text, _ = generate_mock_ocr_text(scenario)
        
        try:
            response = requests.post(URL, json={"raw_text": ocr_text})
            data = response.json()
            
            if response.status_code == 200:
                adj = data["adjudication_results"]
                decision = adj.get("decision")
                payout = adj.get("approved_amount")
                reasons = adj.get("rejection_reasons", [])
                
                print(f"   Status: {decision}")
                print(f"   Approved Payout: ₹{payout}")
                if reasons: print(f"   Rejection Reasons: {reasons}")
            else:
                print(f"   ❌ Server Error: {data}")
                
        except Exception as e:
            print(f"   ❌ Connection Failed. Error: {str(e)}")

    print("\n" + "="*60)
    print("🏁 STRESS TEST COMPLETE")

if __name__ == "__main__":
    run_stress_test()