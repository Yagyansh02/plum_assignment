from typing import List

# ---------------------------------------------------------------------------
# Engine Exclusions & Rules
# ---------------------------------------------------------------------------
EXCLUSION_KEYWORDS: List[str] = [
    "cosmetic",
    "weight loss",
    "bariatric",
    "obesity",  # Weight-loss bucket
    "infertility",
    "ivf",
    "experimental",
    "self-inflicted",
    "adventure sports",
    "hiv",
    "aids",
    "alcohol",
    "drug abuse",
    "lasik",  # Vision exclusion
    "whitening",  # Dental cosmetic
    "botox",
    "filler",
    "rhinoplasty",
    "liposuction",
]

CONDITION_WAITING_PERIODS: dict = {
    "diabetes": ("specific_ailments", "diabetes"),
    "hypertension": ("specific_ailments", "hypertension"),
    "joint replacement": ("specific_ailments", "joint_replacement"),
}

PREAUTH_TESTS: List[str] = ["mri", "ct scan", "ct-scan", "computed tomography"]
PREAUTH_MIN_AMOUNT: float = 10_000.0  # Pre-auth only enforced above this threshold
HIGH_VALUE_THRESHOLD: float = 25_000.0

ADMIN_FALLBACK_KEYWORDS: List[str] = [
    "gst",
    "tax",
    "sub total",
    "subtotal",
    "grand total",
    "total",
    "cgst",
    "sgst",
]

# ---------------------------------------------------------------------------
# Vision Extractor Constants
# ---------------------------------------------------------------------------
GEMINI_MODEL_NAME = "gemini-3.5-flash"
MAX_RETRIES = 3
RETRY_DELAYS = [2, 5, 15]

SYSTEM_PROMPT = """\
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
