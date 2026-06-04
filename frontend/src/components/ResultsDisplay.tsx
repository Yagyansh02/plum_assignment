"use client";

import type { AdjudicationResponse } from "@/types";
import { DECISION_CONFIG } from "@/utils/constants";
import { formatINR, formatPercent, formatLabel } from "@/utils/formatters";
import DecisionBadge from "./DecisionBadge";
import ExtractedFieldsPanel from "./ExtractedFields";

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
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Decision card */}
      <div
        className={`rounded-2xl border p-6 ${config.bgClass} ${config.borderClass}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-white/40 mb-2">
              Adjudication Result
            </p>
            <DecisionBadge decision={results.decision} size="lg" />
            <p className="mt-2 text-sm text-white/60">{config.description}</p>
          </div>
          {/* Decision icon */}
          <div
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-2xl border ${config.borderClass} ${config.bgClass}`}
          >
            {config.icon}
          </div>
        </div>

        {/* Approved amount */}
        {results.approved_amount > 0 && (
          <div className="mt-5 pt-5 border-t border-white/8">
            <p className="text-xs text-white/40 mb-1">Approved Amount</p>
            <p className="text-3xl font-bold text-white tabular-nums">
              {formatINR(results.approved_amount)}
            </p>
            {fields.claim_amount > results.approved_amount && (
              <p className="mt-1 text-xs text-white/40">
                out of {formatINR(fields.claim_amount)} claimed
                {" — "}
                <span className="text-white/60">
                  {formatINR(fields.claim_amount - results.approved_amount)}{" "}
                  deducted
                </span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Confidence score */}
      {confidence !== null && (
        <div className="rounded-xl border border-white/8 bg-white/3 px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-white/50">
              AI Confidence Score
            </span>
            <span className={`text-sm font-semibold ${config.colorClass}`}>
              {formatPercent(confidence)}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/8 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                results.decision === "APPROVED"
                  ? "bg-emerald-500"
                  : results.decision === "REJECTED"
                    ? "bg-rose-500"
                    : results.decision === "PARTIAL"
                      ? "bg-amber-500"
                      : "bg-blue-500"
              }`}
              style={{ width: `${(confidence * 100).toFixed(0)}%` }}
            />
          </div>
        </div>
      )}

      {/* Rejection reasons */}
      {hasRejectionReasons && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-5 py-4">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-rose-400/70 mb-3">
            Rejection Reasons
          </h4>
          <ul className="space-y-1.5">
            {results.rejection_reasons!.map((reason) => (
              <li
                key={reason}
                className="flex items-center gap-2 text-sm text-rose-300/80"
              >
                <span className="text-rose-500">✕</span>
                <code className="text-xs font-mono bg-rose-500/10 px-2 py-0.5 rounded">
                  {reason}
                </code>
                <span className="text-xs text-white/50">
                  — {formatLabel(reason)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Fraud flags */}
      {hasFlags && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-amber-400/70 mb-3">
            Review Flags
          </h4>
          <ul className="space-y-1.5">
            {results.flags!.map((flag) => (
              <li
                key={flag}
                className="flex items-center gap-2 text-sm text-amber-300/80"
              >
                <span>⚑</span>
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Notes */}
      {results.notes && (
        <div className="rounded-xl border border-white/8 bg-white/3 px-5 py-4">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-2">
            Notes
          </h4>
          <p className="text-sm text-white/70">{results.notes}</p>
        </div>
      )}

      {/* Next steps */}
      {results.next_steps && (
        <div className="rounded-xl border border-plum-purple/20 bg-plum-purple/5 px-5 py-4">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-plum-purple/70 mb-2">
            Next Steps
          </h4>
          <p className="text-sm text-white/70">{results.next_steps}</p>
        </div>
      )}

      {/* Extracted fields accordion */}
      <ExtractedFieldsPanel fields={fields} />

      {/* Submit another */}
      <button
        id="submit-another-btn"
        onClick={onReset}
        className="w-full rounded-xl border border-white/10 py-3 text-sm font-medium text-white/60 transition-all hover:border-white/25 hover:text-white/90 hover:bg-white/3"
      >
        Submit Another Claim
      </button>
    </div>
  );
}
