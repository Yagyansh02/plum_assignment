import type { Decision } from "@/types";

/**
 * Base URL for the FastAPI backend.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

/**
 * Visual configuration per adjudication decision.
 */
export const DECISION_CONFIG: Record<
  Decision,
  {
    label: string;
    description: string;
    colorClass: string;
    bgClass: string;
    borderClass: string;
    icon: string;
  }
> = {
  APPROVED: {
    label: "Approved",
    description: "Your claim has been approved for reimbursement.",
    colorClass: "text-emerald-400",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/30",
    icon: "✓",
  },
  REJECTED: {
    label: "Rejected",
    description: "Your claim could not be approved at this time.",
    colorClass: "text-rose-400",
    bgClass: "bg-rose-500/10",
    borderClass: "border-rose-500/30",
    icon: "✕",
  },
  PARTIAL: {
    label: "Partially Approved",
    description: "Part of your claim has been approved.",
    colorClass: "text-amber-400",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/30",
    icon: "◑",
  },
  MANUAL_REVIEW: {
    label: "Manual Review",
    description: "Your claim has been flagged for human review.",
    colorClass: "text-blue-400",
    bgClass: "bg-blue-500/10",
    borderClass: "border-blue-500/30",
    icon: "⚑",
  },
};

/**
 * Policy limits from policy_terms.json (static display).
 */
export const POLICY_LIMITS = {
  annual_limit: 50000,
  per_claim_limit: 5000,
  consultation_sub_limit: 2000,
  pharmacy_sub_limit: 15000,
  dental_sub_limit: 10000,
  vision_sub_limit: 5000,
  diagnostics_sub_limit: 10000,
  alternative_medicine_sub_limit: 8000,
  copay_percentage: 10,
  submission_deadline_days: 30,
  minimum_claim_amount: 500,
};

export const NETWORK_HOSPITALS = [
  "Apollo Hospitals",
  "Fortis Healthcare",
  "Max Healthcare",
  "Manipal Hospitals",
  "Narayana Health",
];
