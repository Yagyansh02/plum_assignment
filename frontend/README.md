# Plum Frontend — Next.js Claim Portal & Admin Dashboard

> Modern Next.js 16 application with Clerk authentication, real-time claim adjudication UI, and a full admin dashboard for monitoring claims and configuring policy terms.

> [!WARNING]
> **Free Tier Rate Limits.** The backend uses the **Gemini API free tier** (15 RPM / 20 requests per day). If document uploads fail with a timeout or error, the Gemini daily quota may be exhausted — it resets at midnight PT. The **Supabase free tier** database may also experience connection timeouts under concurrent load and **pauses after 1 week of inactivity**. If the deployed app returns connection errors, the database may need to be [unpaused from the Supabase dashboard](https://supabase.com/dashboard).

---

## 📁 Directory Structure

```
frontend/
└── src/
    ├── app/
    │   ├── page.tsx                        # Landing page (marketing + CTA)
    │   ├── layout.tsx                      # Root layout with Clerk provider
    │   ├── globals.css                     # Global styles + Tailwind config
    │   ├── dashboard/
    │   │   ├── page.tsx                    # Dashboard server component (auth-gated)
    │   │   └── DashboardClient.tsx         # Claim submission UI with drag-and-drop upload
    │   ├── admin/
    │   │   ├── page.tsx                    # Admin server component (auth-gated)
    │   │   └── AdminDashboardClient.tsx    # Admin dashboard (claims table + manual reviews + policy config)
    │   ├── sign-in/[[...sign-in]]/page.tsx # Clerk sign-in
    │   └── sign-up/[[...sign-up]]/page.tsx # Clerk sign-up
    ├── components/
    │   ├── Navbar.tsx                      # Navigation bar with auth state + admin link
    │   ├── ResultsDisplay.tsx              # Adjudication results rendering
    │   └── PolicySidebar.tsx               # Policy limits sidebar
    ├── hooks/
    │   └── useClaimSubmit.ts               # Claim submission lifecycle hook
    ├── services/
    │   └── api.ts                          # Backend API client (claims + admin endpoints)
    ├── types/
    │   └── index.ts                        # TypeScript interfaces (mirroring backend schemas)
    └── utils/
        ├── constants.ts                    # Decision config, policy limits, network hospitals
        └── formatters.ts                   # INR formatting, date formatting, percentage display
```

---

## ⚡ Quick Start

### Prerequisites

- Node.js 18+ with npm
- A running backend at `http://127.0.0.1:8000` (see [backend README](../backend/README.md))
- Clerk account with publishable + secret keys ([clerk.com](https://clerk.com))

### 1. Environment Setup

Create a `.env.local` file in the `frontend/` directory:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here

# Clerk Redirect URLs
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard

# Backend API URL (change for production)
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production

```bash
npm run build
npm start
```

---

## 🖥️ Application Pages

### Landing Page (`/`)

Marketing page with policy coverage highlights, feature overview, and a call-to-action to sign up or go to the dashboard.

### Dashboard (`/dashboard`)

The main user-facing portal. Auth-gated via Clerk.

- **Document Upload** — Drag-and-drop or click to upload medical documents (prescriptions, bills, lab reports)
- **Real-time Processing** — Shows upload → processing → result states with smooth transitions
- **Results Display** — Decision badge (APPROVED / PARTIAL / REJECTED / MANUAL_REVIEW), approved amount, confidence score, rejection reasons, engine notes, and next steps
- **Policy Sidebar** — Shows active policy limits for reference

### Admin Dashboard (`/admin`)

Full admin panel for monitoring and management. Auth-gated via Clerk.

**Three tabs:**

#### 1. All Claims

- Sortable table of all submitted claims (newest first)
- Columns: member name/ID, treatment date, submission date, claimed amount, approved amount, decision, document count
- **Search** by member name, member ID, or claim ID
- **Filter** by status (Approved, Rejected, Partial, Manual Review)
- **Expandable rows** showing:
  - Engine notes
  - Rejection reasons (styled badges)
  - Flags (amber warning badges)
  - Confidence score (animated progress bar)
  - Uploaded documents (viewable in modal)
  - Claim ID

#### 2. Manual Reviews

- Dedicated view for claims flagged as `MANUAL_REVIEW`
- Rich cards for each flagged claim showing:
  - Review flags with amber warning styling (e.g., `UNUSUAL_CLAIM_FREQUENCY`, `HIGH_VALUE_CLAIM`)
  - Full engine notes explaining why it was flagged
  - Confidence score progress bar
  - Collapsible extracted data (raw JSON from Gemini)
  - **Submitted documents** — click to preview uploaded images in a modal or download them
- Claim count banner

#### 3. Policy Config

- View the current `policy_terms.json` as formatted JSON
- **Edit mode** — toggle into a full JSON editor textarea
- **Save changes** — validates JSON syntax and PUTs to the backend
- Save confirmation with success/error feedback

### Document Viewer Modal

- Triggered from any claim's document list (All Claims or Manual Reviews)
- Inline image preview for PNG/JPEG documents
- Graceful fallback for PDFs and other non-previewable formats
- Download button
- Close button

---

## 🔌 API Integration

The frontend communicates with the backend via the functions in `src/services/api.ts`:

| Function | Backend Endpoint | Description |
|----------|-----------------|-------------|
| `adjudicateDocuments()` | `POST /api/v1/adjudicate/documents` | Submit files for adjudication |
| `fetchAdminClaims()` | `GET /api/v1/admin/claims` | Fetch claims (with optional status filter) |
| `getDocumentUrl()` | `GET /api/v1/admin/claims/{id}/documents/{i}` | Build URL for document viewing |
| `fetchPolicy()` | `GET /api/v1/admin/policy` | Get current policy terms |
| `updatePolicy()` | `PUT /api/v1/admin/policy` | Save updated policy configuration |

---

## 🔐 Authentication

Authentication is handled by [Clerk](https://clerk.com):

- The Clerk `userId` is sent as `member_id` in claim submissions
- The backend looks up this ID in the `member` table
- If the member is not found, the engine returns `MANUAL_REVIEW` with a `MEMBER_NOT_FOUND` flag

> **⚠️ Important:** After signing up via Clerk, your Clerk user ID must be seeded into the backend database. See the [backend README](../backend/README.md#3-seed-the-database) for instructions.

---

## 🎨 Design System

The application uses a custom dark theme built on Tailwind CSS v4:

| Token | Value | Usage |
|-------|-------|-------|
| `plum-950` | Dark background | Page backgrounds |
| `plum-900` | Slightly lighter | Card backgrounds, modals |
| `plum-purple` | Brand purple | Primary actions, highlights |
| `plum-purple-light` | Light purple | Active states, text accents |
| `plum-red` | Brand red | CTA buttons |

Decision-specific colors:
- ✅ **Approved** — Emerald (`emerald-400`, `emerald-500/10`)
- ❌ **Rejected** — Rose (`rose-400`, `rose-500/10`)
- ◑ **Partial** — Amber (`amber-400`, `amber-500/10`)
- ⚑ **Manual Review** — Blue (`blue-400`, `blue-500/10`)

---

## 🧱 TypeScript Types

All types mirror the backend Pydantic schemas:

```typescript
// Claim decision outcomes
type Decision = "APPROVED" | "REJECTED" | "PARTIAL" | "MANUAL_REVIEW";

// Adjudication response from POST /adjudicate/documents
interface AdjudicationResponse {
  status: "success" | "error";
  extracted_fields: ExtractedFields;
  adjudication_results: AdjudicationResult;
}

// Admin dashboard claim record from GET /admin/claims
interface AdminClaimRecord {
  id: string;
  member_id: string;
  member_name: string;
  treatment_date: string;
  submission_date: string;
  status: Decision;
  raw_claim_amount: number;
  approved_amount: number;
  rejection_reasons: string[];
  notes: string;
  flags: string[];
  confidence_score: number | null;
  has_documents: boolean;
  document_count: number;
  llm_raw_extraction: Record<string, unknown>;
}
```

---

## 📦 Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 16.2.7 | React framework with App Router |
| `react` | 19.2.4 | UI library |
| `@clerk/nextjs` | ^7.4.3 | Authentication provider |
| `lucide-react` | ^1.17.0 | Icon library |
| `@lottiefiles/react-lottie-player` | ^3.6.0 | Loading animations |
| `tailwindcss` | ^4 | Utility-first CSS |
| `typescript` | ^5 | Type safety |
