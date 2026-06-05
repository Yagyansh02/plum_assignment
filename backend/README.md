# Plum Backend — FastAPI Adjudication Engine

> Python-based backend combining Gemini Vision AI extraction with a deterministic 5-step policy rule engine for OPD claim adjudication.

> [!WARNING]
> **Free Tier Rate Limits.** This project uses the **Gemini API free tier** (15 RPM / 20 requests per day) and a **Supabase free tier** PostgreSQL database (~20 concurrent connections). If you encounter `429 Too Many Requests` errors during document upload, the Gemini daily quota has been exhausted — it resets at midnight PT. The eval harness tests the rule engine directly and does **not** call the Gemini API, so it always works. The database uses row-level locking (`SELECT ... FOR UPDATE`) which may cause slow responses under concurrent load, and the Supabase free project **pauses after 1 week of inactivity** (unpause from the [Supabase dashboard](https://supabase.com/dashboard) if you see connection errors). These are free-tier infrastructure constraints, not application bugs.

---

## 📁 Directory Structure

```
backend/
├── adjudicationprocessors/
│   └── engine.py              # 5-step deterministic rule engine (core business logic)
├── documentprocessors/
│   └── vision_extractor.py    # Gemini Vision multimodal document extractor
├── api/
│   └── routes.py              # FastAPI REST endpoints (claims + admin dashboard)
├── database/
│   └── db.py                  # SQLModel ORM models (Member, ClaimRecord)
├── entities/
│   └── schemas.py             # Pydantic domain models & enums
├── data/
│   ├── policy_terms.json      # Active policy configuration (coverage, limits, exclusions)
│   └── test_cases.json        # 10 eval harness test cases
├── test_data/
│   ├── Prescription.png       # Sample prescription document
│   ├── Bill.png               # Sample medical bill
│   └── Lab_report.png         # Sample lab report
├── constants.py               # Engine constants, exclusion keywords, Gemini config
├── main.py                    # FastAPI app with CORS middleware
├── eval_harness.py            # Automated test harness (10 deterministic cases)
├── seed_db.py                 # Database seeder (members table)
├── reset_claims.py            # Interactive claim reset utility
├── migrate_admin_columns.py   # One-shot DB migration for admin dashboard columns
├── requirements.txt           # Python dependencies
└── .env                       # Environment variables (not committed)
```

---

## ⚡ Quick Start

### Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) package manager (recommended) or pip
- PostgreSQL database (Supabase free tier works)
- Google Gemini API key ([get one here](https://aistudio.google.com/apikey))

### 1. Environment Setup

Create a `.env` file in the `backend/` directory:

```env
GEMINI_API_KEY=your_google_gemini_api_key_here
DATABASE_URL=postgresql://user:password@host:5432/database_name
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Seed the Database

```bash
uv run python seed_db.py
```

This creates the `member` and `claimrecord` tables and inserts 11 test members:

| Member ID | Name | Join Date | Purpose |
|-----------|------|-----------|---------|
| `user_3EgA50Avucu7ZqSV8NVW44eCe7o` | Plum Admin (Demo User) | 2022-01-01 | Your Clerk user for the live frontend |
| `EMP001`–`EMP010` | Various test employees | Various | Used by `eval_harness.py` test cases |

> **⚠️ Critical:** If you're running with your own Clerk account, update line 16 in `seed_db.py` with your Clerk user ID, then re-run the seeder. Without this, the frontend will return `MEMBER_NOT_FOUND`.

### 4. Run Database Migration (Admin Dashboard)

If you have an existing database without the admin dashboard columns, run:

```bash
uv run python migrate_admin_columns.py
```

This adds 4 columns to `claimrecord`: `notes`, `flags`, `confidence_score`, `uploaded_documents`.

### 5. Start the Server

```bash
uv run uvicorn main:app --reload --port 8000
```

Verify it's running:

```bash
curl http://127.0.0.1:8000/health
# {"status": "healthy", "engine_mode": "hybrid_deterministic"}
```

Interactive API docs available at: `http://127.0.0.1:8000/docs`

---

## 🧪 Running the Eval Harness

The eval harness tests the adjudication engine against 10 deterministic scenarios without requiring Gemini API calls or a running server:

```bash
uv run python eval_harness.py
```

> **Windows PowerShell encoding fix:**
> ```powershell
> $env:PYTHONIOENCODING="utf-8"; uv run python eval_harness.py
> ```

Expected result: **10/10 Passed (100.0%)**

```
=================================================================
🚀 PRODUCTION TESTING: STRICT SCHEMA ADJUDICATION HARNESS
=================================================================

[TC001] Simple Consultation - Approved           -> ✅ PASSED
[TC002] Dental Treatment - Partial Approval      -> ✅ PASSED
[TC003] Limit Exceeded - Rejected                -> ✅ PASSED
[TC004] Missing Documents - Rejected             -> ✅ PASSED
[TC005] Pre-existing Condition - Waiting Period  -> ✅ PASSED
[TC006] Alternative Medicine - Approved          -> ✅ PASSED
[TC007] Diagnostic Tests - Pre-auth Required     -> ✅ PASSED
[TC008] Fraud Detection - Manual Review          -> ✅ PASSED
[TC009] Excluded Treatment - Rejected            -> ✅ PASSED
[TC010] Network Hospital - Cashless Approved     -> ✅ PASSED

=================================================================
📊 ARCHITECTURE INTEGRITY SCORE: 10/10 Passed (100.0%)
=================================================================
```

---

## 📊 Test Cases — Schema Details

### Why `itemized_bill` Was Required (TC002 & TC006)

The original test data for TC002 and TC006 used arbitrary JSON keys like `root_canal: 8000` and `therapy_charges: 3000` in the bill object. These are **not recognized fields** on the `MedicalBill` Pydantic model.

The `MedicalBill` schema only processes these structured fields:
- `consultation_fee` → processed with co-pay and network discount logic
- `diagnostic_tests` → processed with pre-auth checks and sub-limits
- `medicines` → processed with branded/generic drug co-pay logic
- `itemized_bill[]` → array of `BilledItem` objects with `category` enum classification

Any additional keys like `root_canal` or `therapy_charges` are silently ignored by Pydantic, resulting in `approved_amount = 0.0` and incorrect `REJECTED` decisions.

**The fix:** Move these amounts into `itemized_bill` entries with proper `ItemCategory` enum values:

```json
// TC002: Dental with cosmetic procedure (PARTIAL approval)
"bill": {
  "total_amount": 12000,
  "itemized_bill": [
    { "item_name": "Root Canal Treatment", "amount": 8000, "category": "DENTAL_COVERED" },
    { "item_name": "Teeth Whitening", "amount": 4000, "category": "COSMETIC_EXCLUDED" }
  ]
}

// TC006: Alternative medicine therapy (APPROVED)
"bill": {
  "consultation_fee": 1000,
  "total_amount": 4000,
  "itemized_bill": [
    { "item_name": "Panchakarma Therapy Session", "amount": 3000, "category": "OTHER" }
  ]
}
```

This matches exactly how the Gemini Vision extractor produces data in production — every line item on a bill is classified into one of these categories:

| Category | Engine Behavior |
|----------|----------------|
| `CONSULTATION` | Skipped (prevents double-counting with `consultation_fee`) |
| `DIAGNOSTICS` | Skipped (prevents double-counting with `diagnostic_tests`) |
| `PHARMACY` | Skipped (prevents double-counting with `medicines`) |
| `DENTAL_COVERED` | Approved under dental coverage sub-limit |
| `COSMETIC_EXCLUDED` | Rejected with note explaining exclusion |
| `ADMIN_TAXES` | Excluded (GST, registration fees, subtotals) |
| `OTHER` | Approved at face value |

### APPROVED vs PARTIAL Decision Logic Fix

The original engine treated **standard co-pay deductions** and **network discounts** as triggers for `PARTIAL` approval. This is incorrect — co-pay is a normal policy term applied to every consultation claim, not a partial denial.

**Before (broken):** Any note containing "co-pay" or "capped at" → `PARTIAL`
**After (fixed):** Only actual item rejections/exclusions trigger `PARTIAL`:

```python
# Only these keywords indicate items were DENIED from the claim
has_rejected_items = any(
    keyword in n.lower()
    for n in notes
    for keyword in ["rejected as", "not approved", "non-reimbursable"]
)
```

---

## 🔄 Reset Claims Utility

The `reset_claims.py` script lets you clean up claim records for re-testing:

```bash
uv run python reset_claims.py
```

Interactive menu:

```
--- Plum Claim Reset Utility ---
1. Reset claims for my Demo Account (user_3EgA50Avucu7ZqSV8NVW44eCe7o)
2. Reset claims for a specific Employee ID (e.g., EMP002)
3. Reset ALL claims in the database (Nuke everything)
4. Cancel
```

**When to use:**
- Duplicate claim detection is blocking re-submission of the same test documents
- YTD annual limit (₹50,000) has been exhausted during testing
- You want a clean database for demo purposes

---

## 🏗️ Architecture Deep Dive

### Adjudication Engine — 5-Step Pipeline

The rule engine (`engine.py`) evaluates claims in strict order:

| Step | Check | Possible Outcome |
|------|-------|-------------------|
| **0** | Data integrity (member ID, claim amount) | `MANUAL_REVIEW` |
| **0b** | Late submission (>30 days), minimum amount (<₹500) | `REJECTED` |
| **1** | Eligibility: waiting periods, annual limit, fraud indicators | `REJECTED` / `MANUAL_REVIEW` |
| **2** | Document validation: prescription, bill, doctor registration | `REJECTED` |
| **3** | Coverage verification: exclusions, pre-authorization | `REJECTED` |
| **4** | Amount calculation: sub-limits, co-pays, network discounts, per-claim limit | `REJECTED` / `PARTIAL` |
| **5** | Medical necessity heuristic (diagnosis ↔ treatment correlation) | `REJECTED` |
| **Final** | Assemble decision based on approved amount and deductions | `APPROVED` / `PARTIAL` |

### Database Schema

```sql
-- Members table (seeded via seed_db.py)
CREATE TABLE member (
    id         TEXT PRIMARY KEY,    -- Clerk user ID or test ID (EMP001)
    full_name  TEXT NOT NULL,
    join_date  DATE NOT NULL
);

-- Claims audit trail (created automatically)
CREATE TABLE claimrecord (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id           TEXT REFERENCES member(id),
    treatment_date      DATE,
    submission_date     DATE,
    status              TEXT,          -- APPROVED/REJECTED/PARTIAL/MANUAL_REVIEW
    raw_claim_amount    FLOAT,
    approved_amount     FLOAT,
    rejection_reasons   JSON DEFAULT '[]',
    llm_raw_extraction  JSON DEFAULT '{}',
    -- Admin dashboard fields
    notes               TEXT,
    flags               JSON DEFAULT '[]',
    confidence_score    FLOAT,
    uploaded_documents  JSON DEFAULT '[]'  -- Base64-encoded files for admin review
);
```

### Concurrency Control

The API route acquires a PostgreSQL row-level lock on the member before calculating YTD limits:

```python
member = db.get(Member, member_id, with_for_update=True)
# ... calculate YTD, run engine, save record ...
db.commit()  # Releases the lock
```

This prevents race conditions where concurrent submissions could bypass the ₹50,000 annual limit.

---

## 📡 API Endpoints

All endpoints are prefixed with `/api/v1/`.

### Claim Processing

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/adjudicate/documents` | Upload documents for AI extraction + adjudication |
| `POST` | `/adjudicate/text` | Process raw text through the pipeline |

### Admin Dashboard

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/admin/claims` | List all claims (filterable by status, paginated) |
| `GET` | `/admin/claims/{claim_id}/documents/{doc_index}` | Serve uploaded document binary |
| `GET` | `/admin/policy` | Get current policy terms JSON |
| `PUT` | `/admin/policy` | Update policy configuration |

### Infrastructure

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |

Full API documentation: [API_DOCUMENTATION.md](../API_DOCUMENTATION.md)

---

## 📦 Dependencies

```
fastapi==0.136.3          # Web framework
uvicorn==0.48.0           # ASGI server
sqlmodel==0.0.38          # ORM (SQLAlchemy + Pydantic)
google-generativeai==0.8.6 # Gemini Vision API client
pillow==12.2.0            # Image preprocessing
python-dotenv==1.2.2      # Environment variable loading
python-multipart==0.0.30  # File upload support
psycopg2-binary==2.9.12   # PostgreSQL driver
pydantic==2.13.4          # Data validation
```
