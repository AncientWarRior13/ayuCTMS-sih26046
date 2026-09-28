import { useQuery } from "@tanstack/react-query";
import { get } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Badge, Card, fmtDate, Table } from "../components/ui";

const MATRIX: [string, string, "met" | "partial" | "verify"][] = [
  ["Prospective CTRI registration", "Enrolment is blocked until a CTRI number is recorded; registration date must precede the first enrolment.", "met"],
  ["Ethics Committee approval", "Versioned approvals with validity and continuing-review dates; lifecycle guard and expiry alerts.", "met"],
  ["Informed consent (ICMR / GCP)", "Versioned consent documents stored by SHA-256; consent before enrolment; guardian consent for minors; withdrawal honoured; re-consent after amendments.", "met"],
  ["SAE reporting timelines (NDCT Rules 2019)", "Clock durations are configuration in regulatory_rules with a mandatory source citation. Values must be confirmed against the rules text.", "verify"],
  ["ALCOA+ data integrity", "Attributable actor on every record, server timestamps, versioned CRF entries with reason for change, hash-chained append-only audit trail.", "met"],
  ["Immutable, time-stamped audit trail", "Database trigger computes the SHA-256 chain; UPDATE/DELETE/TRUNCATE blocked; verify endpoint; Merkle checkpoints for external anchoring.", "met"],
  ["Electronic signatures", "Reason-for-change and attributable sign-offs; DSC / eSign integration is on the roadmap.", "partial"],
  ["DPDP Act 2023", "Purpose-logged identity access, separate encrypted PII store, pseudonymised exports, data minimisation by role.", "met"],
  ["Role-based access incl. read-only regulator", "Deny-by-default permission map, Postgres row-level security for site isolation, automated RBAC matrix tests.", "met"],
  ["Interoperability", "HL7 FHIR R4 bundle export (validated), FHIR import with de-identification, CDISC SDTM DM/AE export with controlled terminology.", "met"],
  ["Data residency", "Deployable to an India-region host (NIC / MeghRaj or India cloud region) with Docker Compose.", "partial"],
];

const TONE = { met: "green", partial: "amber", verify: "blue" } as const;
const LABEL = { met: "Implemented", partial: "Partial / roadmap", verify: "Verify citation" };

export default function CompliancePage() {
  const { can } = useAuth();
  const { data: rules = [] } = useQuery<any[]>({ queryKey: ["rules"], queryFn: () => get("/admin/rules"), enabled: can("rules.read") });
  const { data: prov = [] } = useQuery<any[]>({ queryKey: ["lookup", "provenance"], queryFn: () => get("/lookups/provenance") });
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Compliance</h1>
        <p className="text-sm text-slate-500">How the system maps to the regulatory and standards requirements of the problem statement.</p>
      </div>
      <Card title="Compliance matrix">
        <Table head={["Requirement", "How it is addressed", "Status"]}>
          {MATRIX.map(([r, how, st]) => (
            <tr key={r}><td className="td font-medium">{r}</td><td className="td">{how}</td><td className="td whitespace-nowrap"><Badge tone={TONE[st]}>{LABEL[st]}</Badge></td></tr>
          ))}
        </Table>
      </Card>
      {rules.length > 0 && (
        <Card title="Regulatory clock configuration">
          <Table head={["Rule", "Description", "Hours", "Source"]}>
            {rules.map((r) => <tr key={r.id}><td className="td mono">{r.rule_key}</td><td className="td">{r.description}</td><td className="td">{r.hours_allowed}</td><td className="td text-xs">{r.source_note}</td></tr>)}
          </Table>
        </Card>
      )}
      <Card title="Data provenance (all data is synthetic)">
        <Table head={["Table", "Source", "Licence note", "Loaded"]}>
          {prov.map((p) => <tr key={p.id}><td className="td mono">{p.table_name}</td><td className="td">{p.source_name}</td><td className="td text-xs">{p.licence_note}</td><td className="td">{fmtDate(p.accessed_on)}</td></tr>)}
        </Table>
      </Card>
    </div>
  );
}
