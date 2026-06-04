import json
from entities.schemas import ClaimInputEntity
from adjudicationprocessors.engine import evaluate_policy_rules

def load_test_cases():
    with open("data/test_cases.json", "r") as f:
        return json.load(f)["test_cases"]

def run_local_evaluation():
    test_cases = load_test_cases()
    passed_cases = 0
    total_cases = len(test_cases)
    
    print("\n" + "="*65)
    print("🚀 PRODUCTION TESTING: STRICT SCHEMA ADJUDICATION HARNESS")
    print("="*65 + "\n")
    
    for case in test_cases:
        case_id = case["case_id"]
        case_name = case["case_name"]
        expected_decision = case["expected_output"]["decision"]

        try:
            # Native instantiation - No dictionary hacking needed anymore!
            input_entity = ClaimInputEntity(**case["input_data"])
            
            # Run engine business rule validation
            system_output = evaluate_policy_rules(input_entity)
            actual_decision = system_output["decision"]
            
            # Compare output logic
            if str(actual_decision.value) == str(expected_decision):
                status = "✅ PASSED"
                passed_cases += 1
            else:
                status = f"❌ FAILED (Expected {expected_decision}, got {actual_decision.value})"
                
            print(f"[{case_id}] {case_name:<40} -> {status}")
            
        except Exception as e:
            print(f"[{case_id}] {case_name:<40} -> 💥 SYSTEM CRASH: {str(e)}")

    print("\n" + "="*65)
    accuracy = (passed_cases / total_cases) * 100
    print(f"📊 ARCHITECTURE INTEGRITY SCORE: {passed_cases}/{total_cases} Passed ({accuracy:.1f}%)")
    print("="*65 + "\n")

if __name__ == "__main__":
    run_local_evaluation()