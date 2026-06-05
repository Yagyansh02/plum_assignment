# Plum — AI-Powered OPD Claim Adjudication System

> Automated OPD insurance claim processing using Gemini Vision AI extraction + a deterministic 5-step policy rule engine. Upload medical documents → get an instant APPROVED / PARTIAL / REJECTED / MANUAL_REVIEW verdict with clear reasoning.

![Architecture](Architecture_Diagram.png)

---

## 🌐 Live Deployment

| Service  | URL |
|----------|-----|
| **Frontend** | [plum-assignment-lime.vercel.app](https://plum-assignment-lime.vercel.app/) |
| **Backend**  | [plum-assignment-g9il.vercel.app](https://plum-assignment-g9il.vercel.app/) |

---

## ⚠️ Known Limitations & Disclaimers (Please Read)

> **Gemini API — Free Tier Rate Limits**
>
> This project uses the **Google Gemini API on the free tier** for AI-powered document extraction. The free tier enforces the following rate limits:
>
> | Limit | Value |
> |-------|-------|
> | Requests per minute | **15 RPM** |
> | Requests per day | **20 RPD** |
> | Tokens per minute | **60,000 TPM** |
>
> If you encounter a `429 Too Many Requests` or `ResourceExhausted` error during document upload, the daily quota has likely been exhausted. The quota resets at **midnight Pacific Time (PT)**. The eval harness (`eval_harness.py`) does **not** call the Gemini API — it tests the rule engine directly — so it will always work regardless of API limits.

> **Supabase — Free Tier Database Limits**
>
> The PostgreSQL database is hosted on **Supabase's free tier**, which has limited connection pooling (approx. **20 concurrent connections**). This application uses **row-level locking** (`SELECT ... FOR UPDATE`) to prevent concurrent claims from bypassing the ₹50,000 annual limit. Under heavy concurrent load, you may experience:
>
> - Slow responses if multiple users submit claims simultaneously (the lock serialises access per member)
> - Connection timeouts if the pool is saturated
> - The Supabase free project **pauses after 1 week of inactivity** — if the deployed app returns connection errors, the database may need to be unpaused from the [Supabase dashboard](https://supabase.com/dashboard)
>
> These are infrastructure constraints of the free tier and do not reflect the application logic. In a production environment, these would be resolved with a dedicated database instance and higher API tier.

---

## Demo Video
Link - https://youtu.be/eO-tIGkFP2U

## 📁 Project Structure

```
plum_assignment/
│
├── backend/                     # FastAPI + Python rule engine
│   ├── adjudicationprocessors/  # Deterministic 5-step rule engine
│   │   └── engine.py            # Core adjudication logic (659 lines)
│   ├── documentprocessors/      # AI document extraction
│   │   └── vision_extractor.py  # Gemini Vision multimodal extractor
│   ├── api/
│   │   └── routes.py            # REST API endpoints (claims + admin)
│   ├── database/
│   │   └── db.py                # SQLModel ORM (PostgreSQL/Supabase)
│   ├── entities/
│   │   └── schemas.py           # Pydantic domain models
│   ├── data/
│   │   ├── policy_terms.json    # Active policy configuration
│   │   └── test_cases.json      # 10 eval harness test cases
│   ├── test_data/               # Sample medical documents (PNG)
│   ├── constants.py             # Engine constants & Gemini config
│   ├── main.py                  # FastAPI app entrypoint
│   ├── eval_harness.py          # Automated test harness (10 cases)
│   ├── seed_db.py               # Database seeder
│   ├── reset_claims.py          # Claim reset utility
│   └── requirements.txt         # Python dependencies
│
├── frontend/                    # Next.js 16 + React 19 + Tailwind v4
│   └── src/
│       ├── app/
│       │   ├── page.tsx         # Landing page
│       │   ├── dashboard/       # User claim submission portal
│       │   ├── admin/           # Admin dashboard (all claims + manual reviews)
│       │   ├── sign-in/         # Clerk auth pages
│       │   └── sign-up/
│       ├── components/          # Reusable UI components
│       ├── hooks/               # Custom React hooks
│       ├── services/            # API client functions
│       ├── types/               # TypeScript type definitions
│       └── utils/               # Formatters & constants
│
├── API_DOCUMENTATION.md         # Full API reference
├── Architecture_Diagram.png     # System architecture diagram
├── Decision_Logic_Flowchart.png # Adjudication decision tree
├── assumptions.md               # Design assumptions & mitigations
├── adjudication_rules.md        # Business logic specification
├── policy_terms.json            # Master policy configuration
└── test_cases.json              # Master test scenarios
```

---

## ⚡ Quick Start (Local Development)

### Prerequisites

- **Python 3.12+** with [uv](https://docs.astral.sh/uv/) package manager
- **Node.js 18+** with npm
- **PostgreSQL** database (or a [Supabase](https://supabase.com) project)
- **Google Gemini API key** (free tier works)
- **Clerk account** for authentication ([clerk.com](https://clerk.com))

### 1. Clone the Repository

```bash
git clone https://github.com/Yagyansh02/plum_assignment.git
cd plum_assignment
```

### 2. Backend Setup

```bash
cd backend

# Create a .env file with your credentials
# (see "Environment Variables" section below)

# Install dependencies
pip install -r requirements.txt

# Seed the database with test members
uv run python seed_db.py

# Start the backend server
uv run uvicorn main:app --reload --port 8000
```

The backend will be available at `http://127.0.0.1:8000`. Check the health endpoint:
```bash
curl http://127.0.0.1:8000/health
# → {"status": "healthy", "engine_mode": "hybrid_deterministic"}
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local with your Clerk keys
# (see "Environment Variables" section below)

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:3000`.

### 4. Run the Evaluation Harness

```bash
cd backend
uv run python eval_harness.py
```

Expected output:
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

> **Note:** On Windows, if you see a `UnicodeEncodeError` with emojis, prefix the command:
> ```powershell
> $env:PYTHONIOENCODING="utf-8"; uv run python eval_harness.py
> ```

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

```env
GEMINI_API_KEY=your_google_gemini_api_key
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google AI Studio API key for Gemini Vision. Get one at [aistudio.google.com](https://aistudio.google.com/apikey) |
| `DATABASE_URL` | PostgreSQL connection string. Supabase provides this under Project Settings → Database |

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard

NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

---

## 🧑‍💼 Authentication & Member ID

This application uses **Clerk** for authentication. The authenticated user's Clerk `userId` is used as the `member_id` for database lookups.

### Important: Seeding Your Clerk ID

The `seed_db.py` script seeds test members including a demo Clerk ID:

```python
("user_3EgA50Avucu7ZqSV8NVW44eCe7o", "Plum Admin (Demo User)", date(2022, 1, 1))
```

**If you are running the project locally with your own Clerk account**, you must:

1. Sign up at the frontend (`/sign-up`)
2. Copy your Clerk user ID (visible on the dashboard page)
3. Update `seed_db.py` line 16 to use YOUR Clerk ID
4. Re-run `uv run python seed_db.py`

Without this, the system will return `MEMBER_NOT_FOUND` when you try to submit a claim.

The test member IDs `EMP001`–`EMP010` are used exclusively by the `eval_harness.py` and do not require Clerk authentication.

---

## 🛠️ Utility Commands

All commands are run from the `backend/` directory:

| Command | Description |
|---------|-------------|
| `uv run python eval_harness.py` | Run the 10-case automated test harness |
| `uv run python seed_db.py` | Seed the database with test members |
| `uv run python reset_claims.py` | Interactive utility to reset claim records |
| `uv run python migrate_admin_columns.py` | Add admin dashboard columns to existing DB |
| `uv run uvicorn main:app --reload` | Start the FastAPI dev server |

### Reset Claims Utility

The `reset_claims.py` script provides an interactive menu to clean up claim records:

```
--- Plum Claim Reset Utility ---
1. Reset claims for my Demo Account (user_3EgA50Avucu7ZqSV8NVW44eCe7o)
2. Reset claims for a specific Employee ID (e.g., EMP002)
3. Reset ALL claims in the database (Nuke everything)
4. Cancel
```

This is useful when:
- You want to re-test the duplicate claim detection
- You need to reset YTD utilisation limits
- You want a clean slate for demo purposes

---

## 📊 Eval Harness — Test Cases Explained

The eval harness (`eval_harness.py`) validates the adjudication engine against 10 deterministic test cases:

| ID | Scenario | Expected | What It Tests |
|----|----------|----------|---------------|
| TC001 | Simple consultation for fever | `APPROVED` | Standard co-pay is applied but claim is still fully approved |
| TC002 | Root canal + teeth whitening | `PARTIAL` | Root canal approved, cosmetic whitening rejected |
| TC003 | Gastroenteritis claim ₹7,500 | `REJECTED` | Exceeds per-claim limit of ₹5,000 |
| TC004 | Missing prescription | `REJECTED` | Prescription is mandatory for all OPD claims |
| TC005 | Diabetes within 45 days of joining | `REJECTED` | 90-day waiting period for diabetes |
| TC006 | Ayurvedic Panchakarma therapy | `APPROVED` | Alternative medicine is covered under policy |
| TC007 | MRI scan ₹15,000, no pre-auth | `REJECTED` | MRI requires pre-authorization above ₹10,000 |
| TC008 | 3 claims on same day | `MANUAL_REVIEW` | Fraud detection: unusual claim frequency |
| TC009 | Obesity/bariatric treatment | `REJECTED` | Weight loss treatments are excluded |
| TC010 | Apollo Hospitals cashless claim | `APPROVED` | Network hospital discount applied, cashless approved |

### Test Case Schema Change: `itemized_bill`

Two test cases (TC002, TC006) were updated to use the `itemized_bill` format with `BilledItem` objects. Here is why:

**The problem:** The original test data used non-standard bill fields like `root_canal: 8000` and `therapy_charges: 3000`. These are arbitrary JSON keys that the `MedicalBill` Pydantic model does not parse — the engine only processes structured fields: `consultation_fee`, `diagnostic_tests`, `medicines`, and `itemized_bill[]`.

**The fix:** These items must be provided via the `itemized_bill` array with proper `category` enum values, which is exactly how the Gemini AI extractor produces them in production:

```json
{
  "case_id": "TC006",
  "case_name": "Alternative Medicine - Approved",
  "input_data": {
    "member_id": "EMP006",
    "member_name": "Kavita Nair",
    "treatment_date": "2024-10-28",
    "claim_amount": 4000,
    "documents": {
      "prescription": {
        "doctor_name": "Vaidya Krishnan",
        "doctor_reg": "AYUR/KL/2345/2019",
        "diagnosis": "Chronic joint pain",
        "treatment": "Panchakarma therapy"
      },
      "bill": {
        "consultation_fee": 1000,
        "total_amount": 4000,
        "itemized_bill": [
          { "item_name": "Panchakarma Therapy Session", "amount": 3000, "category": "OTHER" }
        ]
      }
    }
  },
  "expected_output": {
    "decision": "APPROVED",
    "approved_amount": 4000,
    "notes": "Alternative medicine covered under policy",
    "confidence_score": 0.89
  }
}
```

Similarly, TC002 uses `DENTAL_COVERED` and `COSMETIC_EXCLUDED` categories to test partial approval:

```json
"itemized_bill": [
  { "item_name": "Root Canal Treatment", "amount": 8000, "category": "DENTAL_COVERED" },
  { "item_name": "Teeth Whitening", "amount": 4000, "category": "COSMETIC_EXCLUDED" }
]
```

The valid `ItemCategory` values are: `CONSULTATION`, `DIAGNOSTICS`, `PHARMACY`, `DENTAL_COVERED`, `COSMETIC_EXCLUDED`, `ADMIN_TAXES`, `OTHER`.

---

## 🏗️ System Architecture

The system follows a **hybrid AI + deterministic** architecture:

![Decision Logic Flowchart](Decision_Logic_Flowchart.png)

### Data Flow (13 Steps)

1. **User authenticates** via Clerk on the Next.js frontend
2. **Clerk returns** session identity
3. **User uploads** medical documents (prescription, bill, lab report)
4. **Frontend sends** `POST /api/v1/adjudicate/documents` with `FormData` (files + member_id)
5. **FastAPI acquires** a PostgreSQL row-level lock on the member (`with_for_update=True`)
6. **FastAPI passes** uploaded images to `vision_extractor.py`
7. **Vision extractor** enhances images (PIL contrast/sharpness) and sends to Gemini API
8. **Gemini returns** structured JSON → validated via Pydantic anti-corruption layer
9. **FastAPI checks** for duplicate claims and calculates YTD aggregations
10. **FastAPI passes** DB-enriched `ClaimInputEntity` to `engine.py`
11. **Rule engine** evaluates the 5-step adjudication pipeline and returns decision
12. **FastAPI persists** the `ClaimRecord` with full audit trail and releases the row lock
13. **Frontend renders** the decision with confidence score, notes, and next steps

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Stateless rule engine** | `engine.py` performs zero DB calls — all state is injected by the controller. This makes it 100% unit-testable and deterministic. |
| **Pessimistic concurrency** | Row-level locks prevent users from bypassing the ₹50,000 annual limit through concurrent submissions. |
| **Pydantic anti-corruption layer** | `RawGeminiExtraction` → `ClaimInputEntity` mapping shields the engine from LLM hallucinations. If extraction fails, the claim gracefully degrades to `MANUAL_REVIEW`. |
| **AI categorization delegation** | Semantic line-item classification (e.g., "CGST 18%" → `ADMIN_TAXES`) is delegated to Gemini via the `ItemCategory` enum, avoiding brittle string matching. |

---

## 🖥️ Application Pages

| Page | Route | Description |
|------|-------|-------------|
| **Landing** | `/` | Marketing page with coverage details and CTA |
| **Sign In/Up** | `/sign-in`, `/sign-up` | Clerk authentication |
| **Dashboard** | `/dashboard` | Upload documents and get instant adjudication |
| **Admin** | `/admin` | Admin dashboard with all claims, manual reviews, and policy config |

### Admin Dashboard Features

- **All Claims** — Searchable, filterable table of all submitted claims with expandable detail rows
- **Manual Reviews** — Dedicated view for `MANUAL_REVIEW` flagged claims with:
  - Review flags (fraud indicators, high-value thresholds)
  - Full engine notes and confidence scores
  - **Uploaded documents** — view the original images/PDFs the user submitted
  - Extracted claim data (collapsible JSON view)
- **Policy Config** — View and edit the live `policy_terms.json` configuration

---

## 📚 API Reference

Full API documentation is available in [API_DOCUMENTATION.md](API_DOCUMENTATION.md).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/adjudicate/documents` | Submit medical documents for adjudication |
| `POST` | `/api/v1/adjudicate/text` | Process raw text through the pipeline |
| `GET` | `/api/v1/admin/claims` | Fetch all claims (with status filter) |
| `GET` | `/api/v1/admin/claims/{id}/documents/{index}` | Serve uploaded document |
| `GET` | `/api/v1/admin/policy` | Get current policy terms |
| `PUT` | `/api/v1/admin/policy` | Update policy configuration |
| `GET` | `/health` | Health check |

---

## 🧪 Sample Test Documents

The `backend/test_data/` folder contains 3 sample medical documents for end-to-end testing:

| File | Description |
|------|-------------|
| `Prescription.png` | Doctor's prescription with diagnosis and medicines |
| `Bill.png` | Itemized hospital/pharmacy bill |
| `Lab_report.png` | Diagnostic lab report |

Upload all three to the dashboard to test a complete claim submission flow.

---

## 📝 Design Assumptions

See [assumptions.md](assumptions.md) for the full list. Key highlights:

- Documents are pre-processed with PIL (contrast 1.5×, sharpness 2.0×) before sending to Gemini
- If AI confidence falls below 70%, claims route to `MANUAL_REVIEW` instead of auto-rejection
- Taxes (GST/CGST) and admin fees are automatically excluded from reimbursement
- If submission date cannot be extracted, the system assumes same-day submission (benefit of doubt)
- Doctor registration numbers are validated against Indian medical register patterns

---

## 🛡️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React 19, Tailwind CSS v4, TypeScript |
| **Auth** | Clerk |
| **Backend** | FastAPI, Python 3.12, Pydantic v2 |
| **AI/LLM** | Google Gemini 3.5 Flash (Vision + JSON mode) |
| **ORM** | SQLModel (SQLAlchemy + Pydantic) |
| **Database** | PostgreSQL (Supabase) |
| **Image Processing** | Pillow (PIL) |
