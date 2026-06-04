import os
import json
from openai import OpenAI
from dotenv import load_dotenv
from entities.schemas import ClaimInputEntity

# Load variables from local environment configuration
load_dotenv()

openai_key = os.getenv("OPENAI_API_KEY")
groq_key = os.getenv("GROQ_API_KEY")

# Universal Strategy Setup (DRY Engine Initialization)
if openai_key:
    client = OpenAI(api_key=openai_key)
    MODEL_NAME = "gpt-4o-mini"
    USE_NATIVE_PARSE = True
elif groq_key:
    # Point the OpenAI SDK interface cleanly to Groq's high-speed cloud architecture
    client = OpenAI(api_key=groq_key, base_url="https://api.groq.com/openai/v1")
    MODEL_NAME = "llama-3.3-70b-versatile"
    USE_NATIVE_PARSE = False
else:
    raise ValueError(
        "Infrastructure Error: Missing Authentication Secrets. "
        "Please append either OPENAI_API_KEY or GROQ_API_KEY inside your .env configuration."
    )

def extract_claim_from_text(raw_text: str) -> ClaimInputEntity:
    """
    Extracts raw OCR medical strings into verified Pydantic domain models.
    Polymorphically targets either OpenAI or Groq based on engine configs.
    """
    # Programmatically inject the schema structure to ensure open-source models match it perfectly
    schema_json_string = json.dumps(ClaimInputEntity.model_json_schema())
    
    system_instruction = (
        "You are an expert clinical data extraction assistant for Plum Insurance. "
        "Your objective is to analyze unstructured text strings from medical bills, invoices, "
        "and doctor prescriptions, mapping them to the target schema with 100% precision.\n\n"
        f"You MUST strictly return a valid JSON object matching this schema configuration:\n"
        f"{schema_json_string}"
    )

    if USE_NATIVE_PARSE:
        # Strategy A: Use OpenAI's custom beta parsing handler
        response = client.beta.chat.completions.parse(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": raw_text}
            ],
            response_format=ClaimInputEntity,
        )
        return response.choices[0].message.parsed
    else:
        # Strategy B: Use Universal JSON Mode compatible with Groq API pipelines
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": f"Extract fields into strict JSON formats matching data models:\n\n{raw_text}"}
            ],
            response_format={"type": "json_object"}
        )
        json_payload_string = response.choices[0].message.content
        
        # Hydrate the raw string directly into your Pydantic schema model safely
        return ClaimInputEntity.model_validate_json(json_payload_string)