# Plum Adjudication System API Documentation

**Base URL**

```text
https://plum-assignment-g9il.vercel.app/api/v1 (backend)
https://plum-assignment-lime.vercel.app/ (frontend)

```

---

# Claim Processing APIs

## 1. Process Medical Documents

Upload medical documents (prescriptions, bills, lab reports, etc.) for automated data extraction, policy validation, and claim adjudication.

### Endpoint

```http
POST /adjudicate/documents
```

### Content Type

```text
multipart/form-data
```

### Request Parameters

| Field     | Type       | Required | Description                              |
| --------- | ---------- | -------- | ---------------------------------------- |
| member_id | string     | Yes      | Employee/member identifier               |
| files     | List[File] | Yes      | Medical documents (PNG, JPEG, PDF, etc.) |

### Success Response (200 OK)

```json
{
  "status": "success",
  "extracted_fields": {
    "member_id": "user_123...",
    "member_name": "Sangeetha R.",
    "treatment_date": "2023-10-15",
    "claim_amount": 2136.0,
    "documents": {
      "prescription": {},
      "bill": {}
    }
  },
  "adjudication_results": {
    "decision": "PARTIAL",
    "approved_amount": 1657.0,
    "rejection_reasons": [],
    "confidence_score": 1.0,
    "notes": "Consultation co-pay deducted and non-reimbursable charges excluded.",
    "next_steps": "Partial disbursement will be initiated."
  }
}
```

---

## 2. Process Unstructured Text

Process raw medical claim text through the same adjudication pipeline without requiring document uploads.

### Endpoint

```http
POST /adjudicate/text
```

### Content Type

```text
application/json
```

### Request Body

```json
{
  "raw_text": "Patient Sangeetha visited City Hospital on 15 Oct 2023..."
}
```

---

# Admin APIs

## 3. Fetch All Claims

Retrieve a paginated list of submitted claims.

### Endpoint

```http
GET /admin/claims
```

### Query Parameters

| Parameter | Type    | Required | Description                                                                 |
| --------- | ------- | -------- | --------------------------------------------------------------------------- |
| status    | string  | No       | Filter by claim status (`APPROVED`, `REJECTED`, `PARTIAL`, `MANUAL_REVIEW`) |
| limit     | integer | No       | Number of records to return (default: 100, max: 500)                        |
| offset    | integer | No       | Pagination offset                                                           |

### Success Response (200 OK)

```json
{
  "claims": [
    {
      "id": "uuid-string",
      "member_id": "user_123...",
      "member_name": "Sangeetha R.",
      "treatment_date": "2023-10-15",
      "status": "PARTIAL",
      "raw_claim_amount": 2136.0,
      "approved_amount": 1657.0,
      "confidence_score": 1.0,
      "has_documents": true,
      "document_count": 3
    }
  ],
  "total": 1,
  "limit": 100,
  "offset": 0
}
```

---

## 4. Fetch Claim Document

Retrieve an uploaded document associated with a claim.

### Endpoint

```http
GET /admin/claims/{claim_id}/documents/{doc_index}
```

### Path Parameters

| Parameter | Type    | Description                                       |
| --------- | ------- | ------------------------------------------------- |
| claim_id  | UUID    | Unique claim identifier                           |
| doc_index | integer | Index of the document in the uploaded files array |

### Success Response (200 OK)

Returns the original document file with its associated media type.

---

## 5. Fetch Policy Configuration

Retrieve the active policy configuration used during claim adjudication.

### Endpoint

```http
GET /admin/policy
```

### Success Response (200 OK)

```json
{
  "policy_id": "PLUM_OPD_2024",
  "coverage_details": {
    "annual_limit": 50000,
    "per_claim_limit": 5000,
    "consultation_fees": {
      "sub_limit": 2000,
      "copay_percentage": 10
    }
  }
}
```

---

## 6. Update Policy Configuration

Update the policy rules and coverage configuration.

### Endpoint

```http
PUT /admin/policy
```

### Content Type

```text
application/json
```

### Request Body

```json
{
  "policy": {
    // Updated policy configuration
  }
}
```

### Success Response (200 OK)

```json
{
  "status": "success",
  "message": "Policy updated successfully."
}
```

---

# Claim Decision Types

| Decision      | Description              |
| ------------- | ------------------------ |
| APPROVED      | Claim fully approved     |
| PARTIAL       | Claim partially approved |
| REJECTED      | Claim denied             |
| MANUAL_REVIEW | Requires human review    |
|               |                          |
