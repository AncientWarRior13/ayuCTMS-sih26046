import { useQuery } from "@tanstack/react-query";
import { get } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Badge, Card, fmtDate, Table } from "../components/ui";
import { ShieldCheck } from "lucide-react";

const MATRIX: [string, string, "met" | "partial" | "verify"][] = [
  [
    "Prospective CTRI Registration",
    "Enrolment is strictly blocked at the database and API levels until a valid CTRI number is recorded; registration timestamp must prospectively precede the first subject enrolment.",
    "met",
  ],
  [
    "Ethics Committee Approval Lifecycle",
    "Versioned approval records with validity windows and continuing-review dates; automated lifecycle guards and advance notification alerts prior to expiry.",
    "met",
  ],
  [
    "Informed Consent & Comprehension (ICMR / GCP)",
    "Cryptographically hashed (SHA-256) consent versions; mandatory consent prior to enrolment; guardian consent required for minors; withdrawal honoured; automated re-consent flags on protocol amendments.",
    "met",
  ],
  [
    "SAE Reporting Timelines (NDCT Rules 2019)",
    "Clock durations are stored in regulatory_rules with statutory citations. Real-time 1Hz countdown with 50/80/100% threshold escalation.",
    "verify",
  ],
  [
    "ALCOA+ Clinical Data Integrity",
    "Attributable operator recorded on all mutations; monotonic server UTC timestamps; versioned CRF observations with mandatory change rationales; hash-chained append-only logs.",
    "met",
  ],
  [
    "Immutable SHA-256 Audit Trail",
    "PostgreSQL append-only table; UPDATE/DELETE revoked at database level; verify endpoint recomputes chain; Merkle checkpoints for external trust anchoring.",
    "met",
  ],
  [
    "Electronic Signatures & Traceability",
    "Audited reason-for-change and attributable monitor/PI sign-offs; Aadhaar eSign / digital signature certificate integration positioned on architecture roadmap.",
    "partial",
  ],
  [
    "DPDP Act 2023 & Clinical Privacy",
    "Purpose-logged PII reveal with mandatory justification; separate encrypted identity store; pseudonymised exports by default; role-based field minimisation.",
    "met",
  ],
  [
    "Access Governance & Sovereign Regulator Oversight",
    "Deny-by-default permission map; PostgreSQL Row-Level Security (RLS) for clinical site isolation; automated tests ensuring Regulator role possesses strictly zero write capabilities.",
    "met",
  ],
  [
    "Health Data Interoperability",
    "Standardized HL7 FHIR R4 ResearchStudy / ResearchSubject / AdverseEvent Bundle export; CDISC SDTM DM and AE domains validated against controlled terminologies.",
    "met",
  ],
  [
    "National Cloud Data Residency",
    "Architecture designed for sovereign deployment on NIC MeghRaj / India cloud regions via standard containerized deployment.",
    "partial",
  ],
];

const TONE = { met: "green", partial: "amber", verify: "blue" } as const;
const LABEL = {
  met: "Implemented & Tested",
  partial: "Roadmap Architecture",
  verify: "Verify Statutory Citation",
};

export default function CompliancePage() {
  const { can } = useAuth();
  const { data: rules = [] } = useQuery<any[]>({
    queryKey: ["rules"],
    queryFn: () => get("/admin/rules"),
    enabled: can("rules.read"),
  });
  const { data: prov = [] } = useQuery<any[]>({
    queryKey: ["lookup", "provenance"],
    queryFn: () => get("/lookups/provenance"),
  });

  return (
    <div className="space-y-6">
      {/* ── Cinematic Editorial Header ── */}
      <div className="p-6 rounded-[var(--radius-lg)] border border-[var(--brand)]/30 bg-gradient-to-r from-[var(--surface-1)] via-[var(--surface-2)] to-[var(--surface-1)] relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 mb-2 font-mono text-[10px] uppercase font-bold tracking-wider text-[var(--brand-text)]">
            <ShieldCheck size={14} />
            <span>Sovereign Regulatory Alignment & Verification</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)]">
            Regulatory Compliance & Standards Matrix
          </h1>
          <p className="mt-1 text-xs text-[var(--text-muted)] leading-relaxed">
            Direct mapping of AyuCTMS architecture against the New Drugs and Clinical Trials Rules (2019), ICMR Ethical Guidelines, CDISC SDTM, HL7 FHIR R4, and the Digital Personal Data Protection (DPDP) Act 2023.
          </p>
        </div>

        {/* Standards Marquee Strip */}
        <div className="mt-5 pt-4 border-t border-[var(--border)] flex flex-wrap gap-2 text-[10px] font-mono">
          {[
            "CTRI / WHO-ICTRP",
            "ICH-GCP E6(R2)",
            "CDISC SDTM v3.3",
            "HL7 FHIR R4",
            "DPDP ACT 2023",
            "ALCOA+ DATA INTEGRITY",
            "AYUSH MORBIDITY NAMASTE",
          ].map((std) => (
            <span
              key={std}
              className="px-2 py-0.5 rounded bg-[var(--surface-3)] border border-[var(--border)] text-[var(--text)] font-semibold"
            >
              {std}
            </span>
          ))}
        </div>
      </div>

      {/* Compliance Matrix */}
      <Card title="Statutory Mandate & Implementation Matrix">
        <Table head={["Regulatory Requirement", "Implementation Architecture & Safeguards", "Status"]}>
          {MATRIX.map(([r, how, st]) => (
            <tr key={r} className="hover:bg-[var(--surface-2)]/60">
              <td className="td font-semibold text-xs text-[var(--text)] whitespace-nowrap">
                {r}
              </td>
              <td className="td text-xs text-[var(--text-muted)] leading-relaxed">
                {how}
              </td>
              <td className="td whitespace-nowrap font-mono text-xs">
                <Badge tone={TONE[st]}>{LABEL[st]}</Badge>
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      {/* Statutory Rules Table */}
      {rules.length > 0 && (
        <Card title="Configurable Pharmacovigilance Statutory Clocks">
          <Table head={["Statutory Rule Key", "Clinical Description", "Allowed Window", "Legal Citation Source"]}>
            {rules.map((r) => (
              <tr key={r.id} className="hover:bg-[var(--surface-2)]/60">
                <td className="td font-mono font-bold text-xs text-[var(--brand-text)]">
                  {r.rule_key}
                </td>
                <td className="td text-xs font-medium text-[var(--text)]">{r.description}</td>
                <td className="td font-mono text-xs font-semibold">{r.hours_allowed} hours</td>
                <td className="td font-mono text-[11px] text-[var(--text-muted)]">
                  {r.source_note}
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {/* Synthetic Data Provenance */}
      <Card title="Synthetic Data Provenance (100% Synthetic Datasets)">
        <p className="mb-3 text-xs text-[var(--text-muted)] leading-relaxed">
          In strict accordance with privacy guidelines, no real patient records exist in this system. All subjects, visits, laboratory measurements, and adverse events are synthetically generated from public statistical distributions and clinical trial registers.
        </p>
        <Table head={["Database Entity Table", "Synthetic Data Pipeline", "License Note", "Loaded Date"]}>
          {prov.map((p) => (
            <tr key={p.id} className="hover:bg-[var(--surface-2)]/60">
              <td className="td font-mono font-bold text-xs text-[var(--text)]">
                {p.table_name}
              </td>
              <td className="td text-xs text-[var(--text-muted)]">{p.source_name}</td>
              <td className="td font-mono text-[10px] text-[var(--text-muted)]">{p.licence_note}</td>
              <td className="td font-mono text-xs">{fmtDate(p.accessed_on)}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
