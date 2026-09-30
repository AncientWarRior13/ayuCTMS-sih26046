import { useState } from "react";

interface ComplianceRow {
  id: string;
  standard: string;
  requirement: string;
  solution: string;
  detail: string;
}

const COMPLIANCE_MAPPINGS: ComplianceRow[] = [
  {
    id: "gcp-asu",
    standard: "ICH E6(R2) / GCP-ASU",
    requirement: "Protocol deviations, CAPA oversight & investigator governance",
    solution: "Formal RBAC matrix, monitored deviations with CAPA signoff workflows, and trial site lifecycle gating.",
    detail: "System enforces transition guards preventing study enrolment without prospective CTRI registration and IEC approval.",
  },
  {
    id: "schedule-y",
    standard: "GCP Schedule Y / NDCT 2019",
    requirement: "Statutory 24h & 14d serious adverse event (SAE) reporting timelines",
    solution: "Automated 1Hz hardware-precise regulatory clocks with deterministic escalation alerts to CDSCO & Ethics Committee.",
    detail: "Clocks trigger directly from awareness timestamp, shifting visual tone at 50% (amber), 80% (red), and 100% (overdue).",
  },
  {
    id: "alcoa-plus",
    standard: "ALCOA+ Integrity",
    requirement: "Attributable, Legible, Contemporaneous, Original, Accurate + Complete records",
    solution: "Cryptographic SHA-256 forward-secure audit chain recording actor, explicit UTC timestamp, entity ID, and before/after diffs.",
    detail: "Database triggers enforce strict append-only constraints, prohibiting updates or deletions on audit trail tables.",
  },
  {
    id: "cfr-part-11",
    standard: "21 CFR Part 11",
    requirement: "Electronic signatures, auditability, and reason-for-change controls",
    solution: "Mandatory change justification capture, re-authentication password challenges on critical sign-offs, and verifiable session IDs.",
    detail: "Every mutation requires an explicit purpose string stored immutably in the row-level audit event record.",
  },
  {
    id: "dpdp-2023",
    standard: "DPDP Act 2023",
    requirement: "Purpose limitation, participant consent management & PII encryption",
    solution: "AES-128 Fernet encryption on participant direct identifiers with instant collection freeze upon consent withdrawal.",
    detail: "Separated PII store requires logged reason for coordinator unmasking; exports are de-identified by default.",
  },
  {
    id: "cdisc-sdtm",
    standard: "CDISC SDTM",
    requirement: "Standardized tabulation datasets for regulatory submission",
    solution: "Built-in automated export pipelines for Demographics (DM) and Adverse Events (AE) domains.",
    detail: "Maps directly to STUDYID, USUBJID, AETERM, AESEV, and CDISC controlled terminology stored in lookup tables.",
  },
  {
    id: "fhir-r4",
    standard: "HL7 FHIR R4",
    requirement: "Interoperable health data exchange across hospital and EHR systems",
    solution: "Generates validated ResearchStudy, ResearchSubject, Patient, and AdverseEvent resources.",
    detail: "Includes custom Ayush extensions for Prakriti phenotypes (ayush-prakriti) and Ayush morbidity codes.",
  },
  {
    id: "ich-e2b",
    standard: "ICH E2B(R3)",
    requirement: "Individual Case Safety Report (ICSR) transmission for ASU medicines",
    solution: "Structured pharmacovigilance intake, causality assessment via Naranjo algorithm, and automated Form 11 generation.",
    detail: "Integrates dual-coding fields for MedDRA Preferred Terms and Ayush Suraksha morbidity vocabularies.",
  },
];

export default function ComplianceTable() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleRow = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <section id="compliance" className="mx-auto max-w-7xl px-6 py-16 md:py-24">
      {/* Header */}
      <div className="max-w-3xl mb-12 space-y-4">
        <div className="font-data text-[13px] uppercase tracking-wider text-[#C8A45C]">
          Compliance
        </div>
        <h2 className="font-display text-4xl sm:text-5xl leading-[1.05] text-[#E8EFE9]">
          Every requirement, <em className="italic text-[#C8A45C]">mapped to a feature.</em>
        </h2>
      </div>

      <div className="max-w-5xl mx-auto">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-hidden rounded-xl border border-[#22302A] bg-[#101815]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#22302A] bg-[#0A0F0D]">
                <th className="font-data text-[13px] uppercase tracking-wider text-[#56685F] py-3.5 px-6 w-1/4">
                  Standard
                </th>
                <th className="font-data text-[13px] uppercase tracking-wider text-[#56685F] py-3.5 px-6 w-1/3">
                  Requirement
                </th>
                <th className="font-data text-[13px] uppercase tracking-wider text-[#56685F] py-3.5 px-6">
                  How AyuCTMS Meets It
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#22302A]">
              {COMPLIANCE_MAPPINGS.map((row) => {
                const isExpanded = expandedId === row.id;
                return (
                  <tr
                    key={row.id}
                    onClick={() => toggleRow(row.id)}
                    className="cursor-pointer hover:bg-[#16201C] transition-colors group"
                  >
                    <td className="py-4 px-6 align-top">
                      <div className="font-data text-[15px] font-semibold text-[#C8A45C]">
                        {row.standard}
                      </div>
                      <div className="text-[13px] text-[#56685F] mt-1 group-hover:text-[#8FA398]">
                        {isExpanded ? "Click to collapse ▲" : "Click for detail ▼"}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-[15px] text-[#E8EFE9] align-top leading-relaxed">
                      {row.requirement}
                    </td>
                    <td className="py-4 px-6 align-top">
                      <div className="text-[15px] text-[#8FA398] leading-relaxed">
                        {row.solution}
                      </div>
                      {isExpanded && (
                        <div className="mt-2.5 p-3 rounded-lg bg-[#0A0F0D] border border-[#22302A] text-[13px] text-[#2FB39A] font-data leading-normal animate-fadeIn">
                          ↳ Spec Implementation: {row.detail}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Stacked Cards */}
        <div className="md:hidden space-y-3">
          {COMPLIANCE_MAPPINGS.map((row) => {
            const isExpanded = expandedId === row.id;
            return (
              <div
                key={row.id}
                onClick={() => toggleRow(row.id)}
                className="bg-[#101815] border border-[#22302A] rounded-xl p-5 space-y-2 cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="font-data text-[15px] font-semibold text-[#C8A45C]">
                    {row.standard}
                  </span>
                  <span className="text-[13px] text-[#56685F]">
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </div>
                <div className="text-[15px] font-medium text-[#E8EFE9]">
                  {row.requirement}
                </div>
                <div className="text-[14px] text-[#8FA398] leading-relaxed">
                  {row.solution}
                </div>
                {isExpanded && (
                  <div className="mt-2 p-3 rounded bg-[#0A0F0D] border border-[#22302A] text-[13px] text-[#2FB39A] font-data">
                    ↳ Spec: {row.detail}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
