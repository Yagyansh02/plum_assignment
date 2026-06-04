"use client";

import type { AdjudicationResponse } from "@/types";
import { DECISION_CONFIG } from "@/utils/constants";
import { formatINR, formatPercent, formatLabel } from "@/utils/formatters";
import DecisionBadge from "./DecisionBadge";
import ExtractedFieldsPanel from "./ExtractedFields";
import { 
  AlertCircle, 
  ShieldAlert, 
  Info, 
  ArrowRight, 
  Activity, 
  RotateCcw
} from "lucide-react";

interface ResultsDisplayProps {
  response: AdjudicationResponse;
  onReset: () => void;
}

export default function ResultsDisplay({
  response,
  onReset,
}: ResultsDisplayProps) {
  const { extracted_fields: fields, adjudication_results: results } = response;
  const config = DECISION_CONFIG[results.decision];
  const confidence = results.confidence_score ?? null;

  const hasRejectionReasons =
    results.rejection_reasons && results.rejection_reasons.length > 0;
  const hasFlags = results.flags && results.flags.length > 0;

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* ── 1. Hero Decision Card ────────────────────────────────────────── */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-7 ${config.bgClass} ${config.borderClass} shadow-lg`}
      >
        {/* Subtle background glow based on decision */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-20 blur-3xl" style={{ backgroundColor: config.colorClass?.split('-')[1] || 'white' }} />
        
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-3">
              Adjudication Result
            </p>
            <DecisionBadge decision={results.decision} size="lg" />
            <p className="mt-3 text-sm text-white/70 leading-relaxed max-w-md">
              {config.description}
            </p>
          </div>
        </div>

        {/* Amount Breakdown */}
        {results.approved_amount > 0 && (
          <div className="relative z-10 mt-6 pt-6 border-t border-white/10">
            <p className="text-xs font-medium text-white/50 mb-1">Approved Amount</p>
            <div className="flex items-baseline gap-3">
              <p className="text-4xl font-black text-white tabular-nums tracking-tight">
                {formatINR(results.approved_amount)}
              </p>
              
              {fields.claim_amount > results.approved_amount && (
                <div className="flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full bg-white/5 border border-white/10">
                  <span className="text-white/40">Claimed: {formatINR(fields.claim_amount)}</span>
                  <span className="text-white/20">|</span>
                  <span className="text-rose-400">Deducted: {formatINR(fields.claim_amount - results.approved_amount)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 2. AI Confidence Progress ────────────────────────────────────── */}
      {confidence !== null && (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-6 py-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-white/40" />
              <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                AI Confidence Score
              </span>
            </div>
            <span className={`text-sm font-bold ${config.colorClass}`}>
              {formatPercent(confidence)}
            </span>
          </div>
          {/* Sleeker, thinner progress bar */}
          <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                results.decision === "APPROVED" ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : 
                results.decision === "REJECTED" ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" : 
                results.decision === "PARTIAL" ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" : 
                "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
              }`}
              style={{ width: `${(confidence * 100).toFixed(0)}%` }}
            />
          </div>
        </div>
      )}

      {/* ── 3. Critical Flags (Rejections & Fraud) ─────────────────────── */}
      {(hasRejectionReasons || hasFlags) && (
        <div className="grid gap-4 sm:grid-cols-1">
          {hasRejectionReasons && (
            <div className="rounded-2xl border border-rose-500/15 bg-rose-500/5 p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="w-full">
                  <h4 className="text-sm font-semibold text-rose-400 mb-3">
                    Rejection Reasons
                  </h4>
                  {/* Clean Pill/Tag layout instead of repeating crosses */}
                  <div className="flex flex-wrap gap-2">
                    {results.rejection_reasons!.map((reason) => (
                      <div 
                        key={reason} 
                        className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs"
                      >
                        <span className="font-mono font-medium text-rose-300">{reason}</span>
                        <span className="text-rose-500/30">|</span>
                        <span className="text-rose-200/70">{formatLabel(reason)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {hasFlags && (
            <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-5">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-amber-400 mb-3">
                    Security & Fraud Flags
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {results.flags!.map((flag) => (
                      <div key={flag} className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200/80">
                        {flag}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 4. Notes & Next Steps (Side-by-side on desktop) ────────────── */}
      <div className="grid gap-4 sm:grid-cols-2">
        {results.notes && (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-white/40" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Engine Notes
              </h4>
            </div>
            <p className="text-sm text-white/70 leading-relaxed mt-3">
              {results.notes}
            </p>
          </div>
        )}

        {results.next_steps && (
          <div className="rounded-2xl border border-plum-purple/15 bg-plum-purple/5 p-5">
            <div className="flex items-center gap-2 mb-2">
              <ArrowRight className="h-4 w-4 text-plum-purple/60" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-plum-purple/60">
                Next Steps
              </h4>
            </div>
            <p className="text-sm text-white/80 leading-relaxed mt-3">
              {results.next_steps}
            </p>
          </div>
        )}
      </div>

      {/* ── 5. Extracted Data ──────────────────────────────────────────── */}
      <ExtractedFieldsPanel fields={fields} />

      {/* ── 6. Reset Button ────────────────────────────────────────────── */}
      <button
        id="submit-another-btn"
        onClick={onReset}
        className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-4 text-sm font-semibold text-white/70 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
      >
        <RotateCcw className="h-4 w-4 text-white/40 transition-transform group-hover:-rotate-90" />
        Submit Another Claim
      </button>
    </div>
  );
}