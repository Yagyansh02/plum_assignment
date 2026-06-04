"use client";

import { useState } from "react";
import type { ExtractedFields } from "@/types";
import { formatINR, formatDate, formatLabel } from "@/utils/formatters";

interface ExtractedFieldsProps {
  fields: ExtractedFields;
}

export default function ExtractedFieldsPanel({ fields }: ExtractedFieldsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { prescription, bill } = fields.documents;

  return (
    <div className="rounded-xl border border-white/8 bg-white/3 overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={() => setIsOpen((p) => !p)}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left hover:bg-white/4 transition-colors"
        id="extracted-fields-toggle"
      >
        <span className="text-sm font-medium text-white/70">
          Extracted Claim Data
        </span>
        <span
          className={`text-white/40 text-lg transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          ↓
        </span>
      </button>

      {/* Collapsible content */}
      {isOpen && (
        <div className="border-t border-white/8 px-5 py-4 space-y-5 text-sm">
          {/* Member Info */}
          <Section title="Member Information">
            <Row label="Member ID" value={fields.member_id} />
            <Row label="Member Name" value={fields.member_name} />
            <Row
              label="Treatment Date"
              value={formatDate(fields.treatment_date)}
            />
            <Row
              label="Join Date"
              value={formatDate(fields.member_join_date)}
            />
            <Row
              label="YTD Claimed"
              value={formatINR(fields.ytd_claimed_amount)}
            />
            <Row
              label="Same-day Claims"
              value={String(fields.previous_claims_same_day)}
            />
            {fields.hospital && (
              <Row label="Hospital" value={fields.hospital} />
            )}
            <Row
              label="Cashless Request"
              value={fields.cashless_request ? "Yes" : "No"}
            />
          </Section>

          {/* Prescription */}
          {prescription && (
            <Section title="Prescription Details">
              {prescription.doctor_name && (
                <Row label="Doctor" value={prescription.doctor_name} />
              )}
              {prescription.doctor_reg && (
                <Row label="Reg. No." value={prescription.doctor_reg} />
              )}
              {prescription.diagnosis && (
                <Row label="Diagnosis" value={prescription.diagnosis} />
              )}
              {prescription.treatment && (
                <Row label="Treatment" value={prescription.treatment} />
              )}
              {prescription.medicines_prescribed.length > 0 && (
                <Row
                  label="Medicines"
                  value={prescription.medicines_prescribed.join(", ")}
                />
              )}
              {prescription.procedures.length > 0 && (
                <Row
                  label="Procedures"
                  value={prescription.procedures.join(", ")}
                />
              )}
              {prescription.tests_prescribed.length > 0 && (
                <Row
                  label="Tests"
                  value={prescription.tests_prescribed.join(", ")}
                />
              )}
            </Section>
          )}

          {/* Bill */}
          {bill && (
            <Section title="Bill Breakdown">
              {bill.hospital_name && (
                <Row label="Hospital" value={bill.hospital_name} />
              )}
              <Row
                label="Consultation"
                value={formatINR(bill.consultation_fee)}
              />
              <Row
                label="Diagnostics"
                value={formatINR(bill.diagnostic_tests)}
              />
              <Row label="Pharmacy" value={formatINR(bill.medicines)} />
              {(bill.itemized_bill || []).map((item, index) => (
                <Row
                  key={index}
                  label={formatLabel(item.item_name)}
                  value={formatINR(item.amount)}
                />
              ))}
              <Row
                label="Total Billed"
                value={formatINR(bill.total_amount)}
                highlight
              />
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-white/30">
        {title}
      </h4>
      <div className="rounded-lg border border-white/6 divide-y divide-white/6 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-xs text-white/50">{label}</span>
      <span
        className={`text-xs font-medium ${
          highlight ? "text-white" : "text-white/80"
        }`}
      >
        {value || "—"}
      </span>
    </div>
  );
}
