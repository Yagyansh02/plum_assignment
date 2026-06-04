import type { AdjudicationResponse, AdminClaimsResponse } from "@/types";
import { API_BASE_URL } from "@/utils/constants";

/**
 * Submit medical documents for OPD claim adjudication.
 *
 * @param files     - Array of image/PDF files to upload
 * @param memberId  - Clerk userId to pass as member_id (backend uses it for DB lookup)
 * @param token     - Clerk JWT token for Authorization header
 */
export async function adjudicateDocuments(
  files: File[],
  memberId: string,
  token: string
): Promise<AdjudicationResponse> {
  const formData = new FormData();
  formData.append("member_id", memberId);
  for (const file of files) {
    formData.append("files", file);
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/adjudicate/documents`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        // Note: Do NOT set Content-Type — the browser sets it automatically
        // with the correct multipart/form-data boundary for FormData.
      },
      body: formData,
    }
  );

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;
    try {
      const err = await response.json();
      detail = err?.detail ?? detail;
    } catch {
      // ignore parse errors
    }
    throw new Error(detail);
  }

  const data: AdjudicationResponse = await response.json();
  return data;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Admin Dashboard API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch all claim records for the admin dashboard.
 */
export async function fetchAdminClaims(
  status?: string,
  limit: number = 100,
  offset: number = 0
): Promise<AdminClaimsResponse> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("limit", String(limit));
  params.set("offset", String(offset));

  const response = await fetch(
    `${API_BASE_URL}/api/v1/admin/claims?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch claims: ${response.status}`);
  }

  return response.json();
}

/**
 * Build the URL for serving a specific uploaded document.
 */
export function getDocumentUrl(claimId: string, docIndex: number): string {
  return `${API_BASE_URL}/api/v1/admin/claims/${claimId}/documents/${docIndex}`;
}

/**
 * Fetch current policy terms.
 */
export async function fetchPolicy(): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/policy`);
  if (!response.ok) throw new Error(`Failed to fetch policy: ${response.status}`);
  return response.json();
}

/**
 * Update policy terms (admin only).
 */
export async function updatePolicy(policy: Record<string, unknown>): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/policy`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ policy }),
  });
  if (!response.ok) throw new Error(`Failed to update policy: ${response.status}`);
}
