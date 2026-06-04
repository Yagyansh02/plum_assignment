import os
import requests
import json

def test_multi_document_pipeline():
    print("\n" + "="*60)
    print("📸 TESTING MULTI-DOCUMENT BATCH CLAIM")
    print("="*60)
    
    # Notice we are hitting the plural /documents endpoint
    url = "http://127.0.0.1:8000/api/v1/adjudicate/documents" 
    
    # The files you want to combine into one claim
    target_files = [
        "test_data/Prescription.png",
        "test_data/Bill.png",
        "test_data/Lab_report.png"
    ]
    
    files_payload = []
    file_handles = [] 
    
    for path in target_files:
        if not os.path.exists(path):
            print(f"❌ Error: Missing file {path}")
            return
            
        f = open(path, "rb")
        file_handles.append(f)
        filename = os.path.basename(path)
        mime_type = 'image/png' if filename.lower().endswith('.png') else 'image/jpeg'
        
        files_payload.append(('files', (filename, f, mime_type)))
        print(f"📦 Added {filename} to claim batch...")

    print("\n🚀 Sending complete batch to FastAPI -> Gemini Multi-Modal Engine...")
    
    try:
        response = requests.post(url, files=files_payload)

        if response.status_code == 200:
            data = response.json()
            print("✅ Batch Processed successfully!\n")
            
            print("--- 🧠 LLM EXTRACTED DOMAIN ENTITY ---")
            print(json.dumps(data.get("extracted_fields"), indent=2))
            
            print("\n--- ⚡ PYTHON RULE ENGINE DECISION ---")
            print(json.dumps(data.get("adjudication_results"), indent=2))
        else:
            print(f"❌ Server Error {response.status_code}: {response.text}")

    except Exception as e:
        print(f"❌ Connection Interrupted: {str(e)}")
    finally:
        for f in file_handles:
            f.close()

if __name__ == "__main__":
    test_multi_document_pipeline()