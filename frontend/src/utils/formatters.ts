/**
 * Utility formatters for the Plum Claim Adjudication System.
 */

/**
 * Format a number as Indian Rupees.
 * e.g. 50000 → "₹50,000"
 */
export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a date string (YYYY-MM-DD) to a human-readable format.
 * e.g. "2024-11-01" → "Nov 1, 2024"
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr + "T00:00:00"); // Force local parse
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format a confidence score (0-1) as a percentage string.
 * e.g. 0.95 → "95%"
 */
export function formatPercent(score: number | null | undefined): string {
  if (score === null || score === undefined) return "—";
  return `${Math.round(score * 100)}%`;
}

/**
 * Converts a snake_case or SCREAMING_SNAKE_CASE string to Title Case.
 * e.g. "ANNUAL_LIMIT_EXCEEDED" → "Annual Limit Exceeded"
 */
export function formatLabel(str: string): string {
  return str
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
