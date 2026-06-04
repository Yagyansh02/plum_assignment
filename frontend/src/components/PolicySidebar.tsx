import { formatINR } from "@/utils/formatters";
import { POLICY_LIMITS, NETWORK_HOSPITALS } from "@/utils/constants";

const categories = [
  { label: "Consultation", limit: POLICY_LIMITS.consultation_sub_limit, copay: "10%" },
  { label: "Pharmacy", limit: POLICY_LIMITS.pharmacy_sub_limit, copay: null },
  { label: "Diagnostics", limit: POLICY_LIMITS.diagnostics_sub_limit, copay: null },
  { label: "Dental", limit: POLICY_LIMITS.dental_sub_limit, copay: null },
  { label: "Vision", limit: POLICY_LIMITS.vision_sub_limit, copay: null },
  { label: "Alt. Medicine", limit: POLICY_LIMITS.alternative_medicine_sub_limit, copay: null },
];

export default function PolicySidebar() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Main limits card */}
      <div className="rounded-xl border border-white/8 bg-white/3 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">
          Policy Limits
        </h3>
        <div className="space-y-2">
          <LimitRow
            label="Annual Limit"
            value={formatINR(POLICY_LIMITS.annual_limit)}
            highlight
          />
          <LimitRow
            label="Per Claim Limit"
            value={formatINR(POLICY_LIMITS.per_claim_limit)}
          />
          <LimitRow
            label="Min. Claim Amount"
            value={formatINR(POLICY_LIMITS.minimum_claim_amount)}
          />
          <LimitRow
            label="Submission Window"
            value={`${POLICY_LIMITS.submission_deadline_days} days`}
          />
        </div>
      </div>

      {/* Sub-limits */}
      <div className="rounded-xl border border-white/8 bg-white/3 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">
          Category Sub-limits
        </h3>
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.label} className="flex items-center justify-between">
              <span className="text-xs text-white/60">{cat.label}</span>
              <div className="flex items-center gap-1.5">
                {cat.copay && (
                  <span className="text-xs text-amber-400/70">
                    {cat.copay} copay
                  </span>
                )}
                <span className="text-xs font-medium text-white/80">
                  {formatINR(cat.limit)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Network hospitals */}
      <div className="rounded-xl border border-white/8 bg-white/3 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">
          Network Hospitals
        </h3>
        <ul className="space-y-1.5">
          {NETWORK_HOSPITALS.map((h) => (
            <li key={h} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
              <span className="text-xs text-white/70">{h}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-white/30">
          Network providers offer cashless claims up to {formatINR(5000)}.
        </p>
      </div>

      {/* Tips */}
      <div className="rounded-xl border border-plum-purple/20 bg-plum-purple/5 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-plum-purple/70 mb-2">
          Quick Tips
        </h3>
        <ul className="space-y-1.5 text-xs text-white/50">
          <li>• Submit within 30 days of treatment</li>
          <li>• Include doctor's registration number</li>
          <li>• Ensure all document text is legible</li>
          <li>• Attach original bills with stamps</li>
        </ul>
      </div>
    </div>
  );
}

function LimitRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-white/60">{label}</span>
      <span
        className={`text-xs font-semibold ${
          highlight ? "text-white" : "text-white/80"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
