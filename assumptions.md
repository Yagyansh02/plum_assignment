# List of Assumptions Made

## 1. AI & Multimodal Extraction Assumptions

### Document Quality

**Assumption:** Real-world medical documents uploaded by employees will often be poorly lit, blurry, or captured on low-end mobile devices.

**Mitigation:** Implemented a preprocessing pipeline using `PIL ImageEnhance` to boost:

* Contrast: **1.5×**
* Sharpness: **2.0×**

before sending the image bytes to Gemini, improving OCR accuracy.

### LLM Hallucination Risk

**Assumption:** The LLM may return malformed JSON or confidently hallucinate values not present in the document.

**Mitigation:** Implemented a strict Pydantic Anti-Corruption Layer (`RawGeminiExtraction`).

* All fields are marked as `Optional`.
* If AI extraction fails entirely, the system gracefully degrades to a `MANUAL_REVIEW` sentinel object instead of throwing a fatal `500` error.

### Categorization Delegation

**Assumption:** String-matching for excluded items (e.g., cosmetic procedures) inside the rule engine is brittle and difficult to maintain.

**Mitigation:** Semantic categorization is delegated to Gemini through the `ItemCategory` Enum, allowing the AI to logically classify line items.

Examples:

* `"Teeth Whitening"` → `COSMETIC_EXCLUDED`
* `"CGST 18%"` → `ADMIN_TAXES`

---

## 2. Adjudication & Business Logic Assumptions

### Fail-Safe over Fail-Deadly

**Assumption:** Automatically rejecting a claim because of poor AI extraction creates a poor user experience.

**Implementation:**

* If AI confidence falls below **0.70**, or
* Critical information (e.g., Member ID) cannot be extracted,

the claim is routed to **MANUAL_REVIEW** instead of being automatically **REJECTED**, ensuring human oversight.

### Taxes and Administrative Fees

**Assumption:** Government taxes (GST/CGST) and hospital administration or registration fees are generally non-reimbursable under standard OPD policies.

**Implementation:** The adjudication engine automatically excludes these charges from the approved reimbursement amount.

### Submission Date Fallback

**Assumption:** If the AI cannot identify an explicit submission date, the claimant should receive the benefit of the doubt.

**Implementation:** The system assumes the claim was submitted on the same day as the treatment date when evaluating the 30-day submission deadline.

### Medical Authenticity

**Assumption:** Valid Indian medical practitioners use standardized registration number formats.

**Implementation:** Doctor registration numbers are validated using regex patterns such as:

```regex
^[A-Z]{2,3}\/\d+\/\d{4}$
```

Example:

```text
UP/45678/2016
```

Invalid registration formats reduce the extraction confidence score.

---

## 3. Architecture & Security Assumptions

### Concurrency & Race Conditions

**Assumption:** In production, employees may submit multiple claims simultaneously, or claims may be processed concurrently by batch jobs.

**Mitigation:** Implemented **Pessimistic Concurrency Control**.

The FastAPI route:

1. Acquires a PostgreSQL row-level lock using `with_for_update=True`.
2. Locks the member ledger before limit calculations.
3. Releases the lock only after the `ClaimRecord` has been safely committed.

This prevents users from bypassing the **₹50,000 Annual YTD limit** through concurrent submissions.

### Authentication vs. Authorization

**Assumption:** User identity and policy eligibility are separate concerns.

**Implementation:**

* Authentication is handled by **Clerk**.
* Authorization is enforced through **PostgreSQL policy records**.

A successfully authenticated user cannot submit a claim unless:

* Their `member_id` exists in the database.
* They have an active `join_date`.
* Required policy conditions (e.g., waiting periods) can be evaluated.

### Stateless Processing

**Assumption:** The rule engine should remain a pure, deterministic component.

**Implementation:**

* `engine.py` performs no database operations.
* The FastAPI controller enriches the `ClaimInputEntity` with all required YTD and policy state before invoking the engine.

Benefits:

* 100% unit-testable rule engine.
* Deterministic outputs.
* Clear separation of concerns.
* Easier maintenance and debugging.
