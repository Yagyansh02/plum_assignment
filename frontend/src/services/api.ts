import type { AdjudicationResponse } from "@/types";
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
