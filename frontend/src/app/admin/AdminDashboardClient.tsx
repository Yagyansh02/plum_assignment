"use client";

import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import type { AdminClaimRecord } from "@/types";
import { fetchAdminClaims, getDocumentUrl, fetchPolicy, updatePolicy } from "@/services/api";
import { formatINR, formatDate } from "@/utils/formatters";
import {
  Shield,
  FileText,
  AlertTriangle,
  Eye,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Settings,
  X,
  Download,
  Search,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
} from "lucide-react";

// ── Decision badge config ────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  APPROVED: { label: "Approved", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  REJECTED: { label: "Rejected", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/25", icon: <XCircle className="h-3.5 w-3.5" /> },
  PARTIAL: { label: "Partial", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25", icon: <Activity className="h-3.5 w-3.5" /> },
  MANUAL_REVIEW: { label: "Manual Review", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/25", icon: <Eye className="h-3.5 w-3.5" /> },
};

type TabKey = "all" | "manual_reviews" | "policy";

export default function AdminDashboardClient() {
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [claims, setClaims] = useState<AdminClaimRecord[]>([]);
  const [manualReviews, setManualReviews] = useState<AdminClaimRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedClaimId, setExpandedClaimId] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Policy state
  const [policy, setPolicy] = useState<Record<string, unknown> | null>(null);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policyEditing, setPolicyEditing] = useState(false);
  const [policyDraft, setPolicyDraft] = useState("");
  const [policySaveStatus, setPolicySaveStatus] = useState<string | null>(null);

  // Document viewer
  const [viewingDoc, setViewingDoc] = useState<{ claimId: string; docIndex: number; url: string } | null>(null);

  const loadClaims = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [allData, reviewData] = await Promise.all([
        fetchAdminClaims(statusFilter || undefined),
        fetchAdminClaims("MANUAL_REVIEW"),
      ]);
      setClaims(allData.claims);
      setTotal(allData.total);
      setManualReviews(reviewData.claims);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load claims");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const loadPolicy = useCallback(async () => {
    setPolicyLoading(true);
    try {
      const data = await fetchPolicy();
      setPolicy(data);
      setPolicyDraft(JSON.stringify(data, null, 2));
    } catch {
      setError("Failed to load policy");
    } finally {
      setPolicyLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  useEffect(() => {
    if (activeTab === "policy" && !policy) {
      loadPolicy();
    }
  }, [activeTab, policy, loadPolicy]);

  const handleSavePolicy = async () => {
    try {
      const parsed = JSON.parse(policyDraft);
      await updatePolicy(parsed);
      setPolicy(parsed);
      setPolicyEditing(false);
      setPolicySaveStatus("Policy saved successfully! Restart backend for changes to take effect.");
      setTimeout(() => setPolicySaveStatus(null), 5000);
    } catch (err) {
      setPolicySaveStatus(
        err instanceof SyntaxError
          ? "Invalid JSON. Please fix syntax errors."
          : "Failed to save policy."
      );
    }
  };

  const filteredClaims = claims.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.member_name.toLowerCase().includes(q) ||
      c.member_id.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q)
    );
  });

  const toggleExpand = (id: string) => {
    setExpandedClaimId((prev) => (prev === id ? null : id));
  };

  // Stats
  const approvedCount = claims.filter((c) => c.status === "APPROVED").length;
  const rejectedCount = claims.filter((c) => c.status === "REJECTED").length;
  const partialCount = claims.filter((c) => c.status === "PARTIAL").length;
  const manualCount = manualReviews.length;

  return (
    <div className="flex min-h-screen flex-col bg-plum-950">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          {/* Page Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Shield className="h-6 w-6 text-plum-purple" />
                <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
              </div>
              <p className="mt-1 text-sm text-white/50">
                Monitor all claims, review flagged cases, and configure policy terms.
              </p>
            </div>
            <button
              onClick={loadClaims}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {/* Stats Row */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total Claims", value: total, icon: <FileText className="h-4 w-4" />, color: "text-white/70", bgColor: "bg-white/5", borderColor: "border-white/8" },
              { label: "Approved", value: approvedCount, icon: <CheckCircle2 className="h-4 w-4" />, color: "text-emerald-400", bgColor: "bg-emerald-500/5", borderColor: "border-emerald-500/15" },
              { label: "Rejected", value: rejectedCount, icon: <XCircle className="h-4 w-4" />, color: "text-rose-400", bgColor: "bg-rose-500/5", borderColor: "border-rose-500/15" },
              { label: "Manual Review", value: manualCount, icon: <AlertTriangle className="h-4 w-4" />, color: "text-blue-400", bgColor: "bg-blue-500/5", borderColor: "border-blue-500/15" },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`rounded-xl border ${stat.borderColor} ${stat.bgColor} p-4 transition-all hover:scale-[1.02]`}
              >
                <div className={`flex items-center gap-2 mb-2 ${stat.color}`}>
                  {stat.icon}
                  <span className="text-xs font-medium uppercase tracking-wider opacity-70">{stat.label}</span>
                </div>
                <p className={`text-2xl font-black tabular-nums ${stat.color}`}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="mb-6 flex gap-1 rounded-xl border border-white/8 bg-white/3 p-1">
            {([
              { key: "all" as TabKey, label: "All Claims", icon: <FileText className="h-4 w-4" /> },
              { key: "manual_reviews" as TabKey, label: `Manual Reviews (${manualCount})`, icon: <AlertTriangle className="h-4 w-4" /> },
              { key: "policy" as TabKey, label: "Policy Config", icon: <Settings className="h-4 w-4" /> },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? "bg-plum-purple/20 text-plum-purple-light border border-plum-purple/30"
                    : "text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-rose-500/25 bg-rose-500/8 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              <span className="text-sm text-rose-300">{error}</span>
            </div>
          )}

          {/* ── Tab Content ──────────────────────────────────────────── */}

          {/* ALL CLAIMS TAB */}
          {activeTab === "all" && (
            <div className="space-y-4">
              {/* Search + Filter bar */}
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, member ID, or claim ID..."
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-plum-purple/50 focus:bg-white/8"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="appearance-none rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-8 text-sm text-white outline-none transition-colors focus:border-plum-purple/50"
                  >
                    <option value="">All Statuses</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="PARTIAL">Partial</option>
                    <option value="MANUAL_REVIEW">Manual Review</option>
                  </select>
                </div>
              </div>

              {/* Claims Table */}
              {loading ? (
                <LoadingState />
              ) : filteredClaims.length === 0 ? (
                <EmptyState message="No claims found." />
              ) : (
                <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
                  {/* Table Header */}
                  <div className="grid grid-cols-[1fr_1fr_0.8fr_0.8fr_0.8fr_0.5fr_40px] gap-3 border-b border-white/8 bg-white/3 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                    <span>Member</span>
                    <span>Dates</span>
                    <span>Claimed</span>
                    <span>Approved</span>
                    <span>Decision</span>
                    <span>Docs</span>
                    <span></span>
                  </div>
                  {/* Table Rows */}
                  {filteredClaims.map((claim) => (
                    <ClaimRow
                      key={claim.id}
                      claim={claim}
                      isExpanded={expandedClaimId === claim.id}
                      onToggle={() => toggleExpand(claim.id)}
                      onViewDoc={(docIndex) =>
                        setViewingDoc({
                          claimId: claim.id,
                          docIndex,
                          url: getDocumentUrl(claim.id, docIndex),
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MANUAL REVIEWS TAB */}
          {activeTab === "manual_reviews" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 px-5 py-3">
                <AlertTriangle className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-blue-300">
                    {manualCount} claim{manualCount !== 1 ? "s" : ""} pending manual review
                  </p>
                  <p className="text-xs text-blue-400/70">
                    These claims were flagged by the AI engine for human review due to fraud indicators, data quality issues, or high-value thresholds.
                  </p>
                </div>
              </div>

              {loading ? (
                <LoadingState />
              ) : manualReviews.length === 0 ? (
                <EmptyState message="No claims pending manual review." />
              ) : (
                <div className="space-y-4">
                  {manualReviews.map((claim) => (
                    <ManualReviewCard
                      key={claim.id}
                      claim={claim}
                      onViewDoc={(docIndex) =>
                        setViewingDoc({
                          claimId: claim.id,
                          docIndex,
                          url: getDocumentUrl(claim.id, docIndex),
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* POLICY CONFIG TAB */}
          {activeTab === "policy" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-plum-purple" />
                    <h3 className="text-lg font-semibold text-white">Policy Configuration</h3>
                  </div>
                  <div className="flex gap-2">
                    {policyEditing ? (
                      <>
                        <button
                          onClick={() => {
                            setPolicyEditing(false);
                            setPolicyDraft(JSON.stringify(policy, null, 2));
                          }}
                          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white hover:border-white/25 transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSavePolicy}
                          className="rounded-lg bg-plum-purple px-4 py-1.5 text-xs font-semibold text-white hover:bg-plum-purple/80 transition-all shadow-lg shadow-plum-purple/20"
                        >
                          Save Changes
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setPolicyEditing(true)}
                        className="rounded-lg border border-plum-purple/30 bg-plum-purple/10 px-4 py-1.5 text-xs font-medium text-plum-purple-light hover:bg-plum-purple/20 transition-all"
                      >
                        Edit Policy
                      </button>
                    )}
                  </div>
                </div>

                {policySaveStatus && (
                  <div className={`mb-4 rounded-lg border px-4 py-2.5 text-xs ${
                    policySaveStatus.includes("success")
                      ? "border-emerald-500/25 bg-emerald-500/8 text-emerald-300"
                      : "border-rose-500/25 bg-rose-500/8 text-rose-300"
                  }`}>
                    {policySaveStatus}
                  </div>
                )}

                {policyLoading ? (
                  <LoadingState />
                ) : policyEditing ? (
                  <textarea
                    value={policyDraft}
                    onChange={(e) => setPolicyDraft(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-plum-950 p-4 font-mono text-xs text-white/80 outline-none focus:border-plum-purple/50 transition-colors"
                    style={{ minHeight: "500px" }}
                    spellCheck={false}
                  />
                ) : (
                  <pre className="rounded-xl border border-white/8 bg-plum-950 p-4 font-mono text-xs text-white/70 overflow-auto max-h-[600px]">
                    {JSON.stringify(policy, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Document Viewer Modal ────────────────────────────────────── */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl border border-white/10 bg-plum-900 shadow-2xl overflow-hidden flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-plum-purple" />
                <span className="text-sm font-semibold text-white">Document Viewer</span>
                <span className="text-xs text-white/40 font-mono">
                  Document #{viewingDoc.docIndex + 1}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={viewingDoc.url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/10 transition-all"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>
                <button
                  onClick={() => setViewingDoc(null)}
                  className="flex items-center justify-center rounded-lg border border-white/10 bg-white/5 h-8 w-8 text-white/50 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            {/* Modal body */}
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/30">
              <img
                src={viewingDoc.url}
                alt={`Document ${viewingDoc.docIndex + 1}`}
                className="max-w-full max-h-full object-contain rounded-lg"
                onError={(e) => {
                  // If it's a PDF or non-image, show a link instead
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `
                      <div class="text-center space-y-4 p-8">
                        <div class="flex justify-center"><svg class="h-16 w-16 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg></div>
                        <p class="text-sm text-white/50">This document type cannot be previewed inline.</p>
                        <a href="${viewingDoc.url}" target="_blank" rel="noopener noreferrer" class="inline-block rounded-lg bg-plum-purple px-4 py-2 text-sm font-medium text-white hover:bg-plum-purple/80 transition-all">Open in New Tab</a>
                      </div>
                    `;
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.MANUAL_REVIEW;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${config.color} ${config.bg} border ${config.border}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

function ClaimRow({
  claim,
  isExpanded,
  onToggle,
  onViewDoc,
}: {
  claim: AdminClaimRecord;
  isExpanded: boolean;
  onToggle: () => void;
  onViewDoc: (docIndex: number) => void;
}) {
  return (
    <div className={`border-b border-white/5 transition-colors ${isExpanded ? "bg-white/[0.03]" : "hover:bg-white/[0.02]"}`}>
      {/* Main Row */}
      <div
        className="grid grid-cols-[1fr_1fr_0.8fr_0.8fr_0.8fr_0.5fr_40px] gap-3 px-5 py-3.5 cursor-pointer items-center"
        onClick={onToggle}
      >
        <div>
          <p className="text-sm font-medium text-white/90 truncate">{claim.member_name}</p>
          <p className="text-xs text-white/30 font-mono mt-0.5">{claim.member_id}</p>
        </div>
        <div>
          <p className="text-xs text-white/60">Treated: {formatDate(claim.treatment_date)}</p>
          <p className="text-xs text-white/30 mt-0.5">Filed: {formatDate(claim.submission_date)}</p>
        </div>
        <p className="text-sm font-medium text-white/80 tabular-nums">{formatINR(claim.raw_claim_amount)}</p>
        <p className="text-sm font-semibold text-white tabular-nums">{formatINR(claim.approved_amount)}</p>
        <StatusBadge status={claim.status} />
        <div className="flex items-center gap-1">
          {claim.has_documents && (
            <span className="flex items-center gap-1 text-xs text-white/40">
              <FileText className="h-3 w-3" />
              {claim.document_count}
            </span>
          )}
        </div>
        <div className="flex justify-center">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-white/30" />
          ) : (
            <ChevronDown className="h-4 w-4 text-white/30" />
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-5 pb-5 space-y-4 animate-in fade-in duration-500">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Notes */}
            {claim.notes && (
              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Engine Notes</h4>
                <p className="text-xs text-white/70 leading-relaxed">{claim.notes}</p>
              </div>
            )}

            {/* Rejection Reasons */}
            {claim.rejection_reasons.length > 0 && (
              <div className="rounded-xl border border-rose-500/15 bg-rose-500/5 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-400/70 mb-2">Rejection Reasons</h4>
                <div className="flex flex-wrap gap-1.5">
                  {claim.rejection_reasons.map((r) => (
                    <span key={r} className="rounded-md border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-xs font-mono text-rose-300">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Flags */}
            {claim.flags.length > 0 && (
              <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400/70 mb-2">Flags</h4>
                <div className="flex flex-wrap gap-1.5">
                  {claim.flags.map((f) => (
                    <span key={f} className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-200/80">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Confidence Score */}
            {claim.confidence_score !== null && (
              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Confidence</h4>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 flex-1 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        claim.confidence_score >= 0.9 ? "bg-emerald-500" :
                        claim.confidence_score >= 0.7 ? "bg-amber-500" :
                        "bg-rose-500"
                      }`}
                      style={{ width: `${(claim.confidence_score * 100).toFixed(0)}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-white tabular-nums">
                    {(claim.confidence_score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Uploaded Documents */}
          {claim.has_documents && (
            <div className="rounded-xl border border-plum-purple/15 bg-plum-purple/5 p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-plum-purple/70 mb-3">
                Uploaded Documents ({claim.document_count})
              </h4>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: claim.document_count }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => onViewDoc(i)}
                    className="flex items-center gap-2 rounded-lg border border-plum-purple/20 bg-plum-purple/10 px-3 py-2 text-xs font-medium text-plum-purple-light hover:bg-plum-purple/20 transition-all"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Document {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Claim ID */}
          <div className="flex items-center gap-2 text-xs text-white/20 font-mono">
            <span>Claim ID: {claim.id}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ManualReviewCard({
  claim,
  onViewDoc,
}: {
  claim: AdminClaimRecord;
  onViewDoc: (docIndex: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-blue-500/15 bg-blue-500/[0.03] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-blue-500/10 bg-blue-500/5 px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/15 border border-blue-500/25">
            <Eye className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{claim.member_name}</p>
            <p className="text-xs text-white/40 font-mono">{claim.member_id}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-black text-white tabular-nums">{formatINR(claim.raw_claim_amount)}</p>
          <p className="text-xs text-white/40">
            {formatDate(claim.treatment_date)}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4">
        {/* Flags */}
        {claim.flags.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400/70 mb-2">
              Review Flags
            </h4>
            <div className="flex flex-wrap gap-2">
              {claim.flags.map((f) => (
                <span key={f} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-200/80">
                  <AlertTriangle className="h-3 w-3" />
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {claim.notes && (
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Engine Notes</h4>
            <p className="text-sm text-white/70 leading-relaxed">{claim.notes}</p>
          </div>
        )}

        {/* Confidence */}
        {claim.confidence_score !== null && (
          <div className="flex items-center gap-3">
            <Activity className="h-4 w-4 text-white/30" />
            <span className="text-xs text-white/40">Confidence:</span>
            <div className="h-1.5 w-32 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${(claim.confidence_score * 100).toFixed(0)}%` }}
              />
            </div>
            <span className="text-xs font-bold text-blue-300 tabular-nums">
              {(claim.confidence_score * 100).toFixed(0)}%
            </span>
          </div>
        )}

        {/* Extracted Data Summary */}
        {claim.llm_raw_extraction && Object.keys(claim.llm_raw_extraction).length > 0 && (
          <details className="group">
            <summary className="flex items-center gap-2 cursor-pointer text-xs font-semibold uppercase tracking-wider text-white/40 hover:text-white/60 transition-colors">
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
              Extracted Claim Data
            </summary>
            <pre className="mt-3 rounded-xl border border-white/8 bg-plum-950 p-4 font-mono text-xs text-white/60 overflow-auto max-h-64">
              {JSON.stringify(claim.llm_raw_extraction, null, 2)}
            </pre>
          </details>
        )}

        {/* Uploaded Documents */}
        {claim.has_documents && (
          <div className="rounded-xl border border-plum-purple/20 bg-plum-purple/5 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-plum-purple/70 mb-3 flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" />
              Submitted Documents ({claim.document_count})
            </h4>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: claim.document_count }, (_, i) => (
                <button
                  key={i}
                  onClick={() => onViewDoc(i)}
                  className="group flex items-center gap-3 rounded-xl border border-plum-purple/15 bg-plum-purple/5 px-4 py-3 text-left transition-all hover:bg-plum-purple/15 hover:border-plum-purple/30 hover:scale-[1.02]"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-plum-purple/15 border border-plum-purple/20 group-hover:bg-plum-purple/25 transition-colors">
                    <FileText className="h-4 w-4 text-plum-purple-light" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white/80">Document {i + 1}</p>
                    <p className="text-xs text-white/30">Click to preview</p>
                  </div>
                  <Eye className="ml-auto h-4 w-4 text-white/20 group-hover:text-plum-purple-light transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Claim ID footer */}
        <p className="text-xs text-white/20 font-mono pt-2 border-t border-white/5">
          Claim ID: {claim.id} · Filed: {formatDate(claim.submission_date)}
        </p>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-plum-purple/30 border-t-plum-purple" />
      <p className="text-sm text-white/40">Loading data...</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 border border-white/8">
        <Clock className="h-6 w-6 text-white/20" />
      </div>
      <p className="text-sm text-white/40">{message}</p>
      <p className="text-xs text-white/20">Claims will appear here once submitted through the portal.</p>
    </div>
  );
}
