"use client";

import { useClaimSubmit } from "@/hooks/useClaimSubmit";
import Navbar from "@/components/Navbar";
import ClaimUploader from "@/components/ClaimUploader";
import ResultsDisplay from "@/components/ResultsDisplay";
import LoadingSpinner from "@/components/LoadingSpinner";
import PolicySidebar from "@/components/PolicySidebar";

interface DashboardClientProps {
  userId: string;
}

export default function DashboardClient({ userId }: DashboardClientProps) {
  const { state, result, error, submit, reset } = useClaimSubmit();

  const isLoading = state === "uploading" || state === "processing";

  return (
    <div className="flex min-h-screen flex-col bg-plum-950">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          {/* Page header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">
              Claim Adjudication
            </h1>
            <p className="mt-1 text-sm text-white/50">
              Upload your OPD documents to receive an instant AI-powered decision.
            </p>
            <p className="mt-1 text-xs text-white/30 font-mono">
              Member ID: {userId}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* ── Left column: upload + results ── */}
            <div className="space-y-6">
              {/* Upload card — hide when showing results */}
              {state !== "success" && (
                <div className="rounded-2xl border border-white/8 bg-white/3 p-6">
                  <h2 className="mb-1 text-sm font-semibold text-white/80">
                    Upload Documents
                  </h2>
                  <p className="mb-5 text-xs text-white/40">
                    Supported: prescriptions, bills, diagnostic reports (JPG, PNG, PDF)
                  </p>

                  {/* Loading state */}
                  {isLoading ? (
                    <LoadingSpinner state={state} />
                  ) : (
                    <ClaimUploader
                      onSubmit={submit}
                      isLoading={isLoading}
                      onReset={reset}
                    />
                  )}
                </div>
              )}

              {/* Error banner */}
              {state === "error" && error && (
                <div className="rounded-xl border border-rose-500/25 bg-rose-500/8 px-5 py-4">
                  <div className="flex items-start gap-3">
                    <span className="text-rose-400 text-lg mt-0.5">⚠</span>
                    <div>
                      <p className="text-sm font-medium text-rose-300">
                        Submission Failed
                      </p>
                      <p className="mt-1 text-xs text-rose-400/80">{error}</p>
                    </div>
                  </div>
                  <button
                    onClick={reset}
                    className="mt-3 text-xs text-rose-400 underline hover:text-rose-300 transition-colors"
                  >
                    Try again
                  </button>
                </div>
              )}

              {/* Results */}
              {state === "success" && result && (
                <ResultsDisplay response={result} onReset={reset} />
              )}
            </div>

            {/* ── Right column: policy sidebar ── */}
            <PolicySidebar />
          </div>

          {/* Sample test case hints */}
          <div className="mt-8 rounded-xl border border-white/6 bg-white/2 p-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-3">
              Test Case Hints
            </h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { id: "TC001", label: "Simple consultation (Approved)", color: "emerald" },
                { id: "TC002", label: "Dental with cosmetics (Partial)", color: "amber" },
                { id: "TC003", label: "Exceeds per-claim limit (Rejected)", color: "rose" },
                { id: "TC004", label: "Missing prescription (Rejected)", color: "rose" },
                { id: "TC008", label: "Multiple same-day claims (Manual Review)", color: "blue" },
                { id: "TC009", label: "Weight loss treatment (Rejected)", color: "rose" },
              ].map((tc) => (
                <div
                  key={tc.id}
                  className="flex items-center gap-2 rounded-lg border border-white/6 bg-white/2 px-3 py-2"
                >
                  <span
                    className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                      tc.color === "emerald"
                        ? "bg-emerald-500"
                        : tc.color === "amber"
                        ? "bg-amber-500"
                        : tc.color === "blue"
                        ? "bg-blue-500"
                        : "bg-rose-500"
                    }`}
                  />
                  <div>
                    <span className="text-xs font-mono text-white/40">{tc.id}</span>
                    <span className="mx-1.5 text-white/20">·</span>
                    <span className="text-xs text-white/60">{tc.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
