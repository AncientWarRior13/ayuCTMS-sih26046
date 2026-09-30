import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Download,
  FileText,
  Flame,
  HelpCircle,
  Plus,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { download, get, post } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Can } from "../auth/RoleGuard";
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorBox,
  Field,
  fmtDate,
  fmtDateTime,
  human,
  Loading,
  Modal,
  PageHeader,
  Table,
  useToast,
} from "../components/ui";
import { ClockRing, SaeClockChip } from "../components/widgets";

const CAUSALITY = [
  "CERTAIN",
  "PROBABLE",
  "POSSIBLE",
  "UNLIKELY",
  "CONDITIONAL",
  "UNASSESSABLE",
  "UNRELATED",
];
const OUTCOMES = [
  "RECOVERED",
  "RECOVERING",
  "NOT_RECOVERED",
  "RECOVERED_WITH_SEQUELAE",
  "FATAL",
  "UNKNOWN",
];
const SERIOUSNESS = [
  "death",
  "life-threatening",
  "hospitalisation",
  "disability",
  "congenital-anomaly",
  "other-medically-important",
];

// Naranjo ADR probability scale
const NARANJO: [string, number, number][] = [
  ["Are there previous conclusive reports on this reaction?", 1, 0],
  ["Did the adverse event appear after the suspected product was given?", 2, -1],
  ["Did the reaction improve when the product was discontinued?", 1, 0],
  ["Did the reaction reappear when the product was re-administered?", 2, -1],
  ["Are there alternative causes that could on their own have caused the reaction?", -1, 2],
  ["Did the reaction reappear when a placebo was given?", -1, 1],
  ["Was the product detected in blood or other fluids in toxic concentrations?", 1, 0],
  ["Was the reaction more severe when the dose was increased, or less severe when decreased?", 1, 0],
  ["Did the patient have a similar reaction to the same or similar products before?", 1, 0],
  ["Was the adverse event confirmed by any objective evidence?", 1, 0],
];
const naranjoCat = (n: number) =>
  n >= 9 ? "Definite" : n >= 5 ? "Probable" : n >= 1 ? "Possible" : "Doubtful";

function NaranjoHelper({ onScore }: { onScore: (n: number) => void }) {
  const [ans, setAns] = useState<("y" | "n" | "u")[]>(Array(10).fill("u"));
  const score = ans.reduce(
    (s, a, i) =>
      s + (a === "y" ? NARANJO[i][1] : a === "n" ? NARANJO[i][2] : 0),
    0,
  );

  return (
    <div className="space-y-3">
      <div className="text-xs text-[var(--text-muted)] font-mono pb-1 border-b border-[var(--border)]">
        Standardized 10-point validated questionnaire for adverse drug reaction causality scoring.
      </div>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
        {NARANJO.map(([q], i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 p-2.5 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-2)]/30 text-xs"
          >
            <span className="text-[var(--text)]">
              <strong className="font-mono text-[var(--text-muted)] mr-1.5">{i + 1}.</strong>
              {q}
            </span>
            <div className="flex shrink-0 gap-1 font-mono">
              {(["y", "n", "u"] as const).map((v) => (
                <button
                  type="button"
                  key={v}
                  onClick={() =>
                    setAns(ans.map((a, j) => (j === i ? v : a)))
                  }
                  className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                    ans[i] === v
                      ? "bg-[var(--brand)] text-[#0A0F0D]"
                      : "border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)]"
                  }`}
                >
                  {v === "y" ? "Yes" : v === "n" ? "No" : "N/A"}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--brand)]/30 bg-[var(--surface-2)] p-4 text-sm mt-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">
            Total ADR Score
          </div>
          <div className="font-display text-2xl font-bold text-[var(--brand-text)] mt-0.5">
            {score} points — <span className="font-sans text-base font-medium">{naranjoCat(score)}</span>
          </div>
        </div>
        <Button type="button" onClick={() => onScore(score)}>
          Apply Score to Causality
        </Button>
      </div>
    </div>
  );
}

/* ── Botanical Herb-Drug Interaction Card ── */
export function HerbDrugCard({ interactions }: { interactions: any[] }) {
  if (!interactions?.length) return null;
  const tone = (sev: string): "red" | "amber" | "gray" =>
    sev === "MAJOR" ? "red" : sev === "MODERATE" ? "amber" : "gray";

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--warn-border)] bg-[var(--warn-bg)] p-4 shadow-sm relative overflow-hidden">
      {/* Decorative Botanical Leaf Watermark */}
      <svg
        className="absolute -right-4 -bottom-6 w-32 h-32 opacity-10 text-[var(--accent-brass)] pointer-events-none"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
      </svg>

      <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--warn)]">
        <Flame size={16} /> Ayurvedic Herb–Allopathic Drug Interaction Match
      </div>

      <ul className="space-y-3 relative z-10">
        {interactions.map((i, idx) => (
          <li
            key={idx}
            className="p-3 rounded-[var(--radius-sm)] border border-[var(--warn-border)]/60 bg-[var(--surface-1)]/90 text-xs"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={tone(i.severity)}>{human(i.severity)} Risk</Badge>
              <span className="font-semibold text-sm text-[var(--text)]">
                {i.herb} <span className="text-[var(--accent-brass)]">×</span> {i.drug_class}
              </span>
              <span className="font-mono text-[10px] text-[var(--text-muted)]">
                (Matched: "{i.matched_term}")
              </span>
            </div>
            <p className="mt-1.5 text-xs text-[var(--text)] leading-relaxed">
              <span className="font-semibold text-[var(--text-muted)]">Mechanism:</span> {i.mechanism}
            </p>
            <p className="mt-1 text-xs text-[var(--text)] leading-relaxed">
              <strong className="text-[var(--warn)]">Clinical Guidance:</strong> {i.recommendation}
            </p>
            <p className="mt-1 font-mono text-[10px] text-[var(--text-muted)]">
              Source: {i.source_note}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[10px] text-[var(--text-muted)] italic">
        Decision-support reference only (Ayurvedic Pharmacopoeia of India) · Validate with clinical investigator.
      </p>
    </div>
  );
}

function AeDetail({ id }: { id: number }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { data: a, isLoading } = useQuery<any>({
    queryKey: ["ae", id],
    queryFn: () => get(`/ae/${id}`),
  });
  const { data: interactions = [] } = useQuery<any[]>({
    queryKey: ["interactions", a?.suspect_intervention, a?.concomitant_meds],
    queryFn: () =>
      get(
        `/interactions/check?intervention=${encodeURIComponent(
          a.suspect_intervention,
        )}&concomitant_meds=${encodeURIComponent(a.concomitant_meds)}`,
      ),
    enabled: !!(a?.suspect_intervention && a?.concomitant_meds),
  });
  const [f, setF] = useState({
    causality: "",
    naranjo_score: "" as number | "",
    outcome: "",
    reason: "",
  });
  const [helper, setHelper] = useState(false);

  const inv = () => qc.invalidateQueries({ queryKey: ["ae"] });
  const cM = useMutation({
    mutationFn: () =>
      post(`/ae/${id}/causality`, {
        causality: f.causality,
        naranjo_score: f.naranjo_score === "" ? null : f.naranjo_score,
        outcome: f.outcome || null,
        reason: f.reason,
      }),
    onSuccess: () => {
      toast("Causality assessment recorded into audit ledger");
      inv();
    },
  });
  const sM = useMutation({
    mutationFn: (clock_id: number) =>
      post(`/ae/${id}/submit-report`, { clock_id }),
    onSuccess: () => {
      toast("Report submission filed; clock stopped");
      inv();
      qc.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  if (isLoading || !a) return <Loading />;

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-wrap items-start justify-between gap-4 p-5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)]">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone={a.is_serious ? "red" : "gray"}>
              {a.is_serious ? "Serious Adverse Event" : "Adverse Event"}
            </Badge>
            <span className="font-mono text-xs font-bold text-[var(--brand-text)]">
              #{a.id}
            </span>
          </div>
          <h2 className="mt-1.5 font-display text-xl font-bold text-[var(--text)]">
            {a.description}
          </h2>
          <p className="mt-0.5 text-xs text-[var(--text-muted)] font-mono">
            {a.protocol_no} · Subject {a.subject_code} · Logged by {a.reported_by_name} ({fmtDateTime(a.created_at)})
          </p>
        </div>

        <Can perm="ae.report">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                download(`/ae/${id}/report?format=pdf`, `sae-report-${id}.pdf`)
              }
            >
              <FileText size={14} /> Regulatory PDF Draft
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                download(`/ae/${id}/report?format=json`, `sae-report-${id}.json`)
              }
            >
              <Download size={14} /> JSON
            </Button>
          </div>
        </Can>
      </div>

      {/* Regulatory Clocks Grid */}
      {a.clocks.length > 0 && (
        <Card title="Statutory Pharmacovigilance Regulatory Clocks">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {a.clocks.map((c: any) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)]/40 gap-3"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[var(--text)] line-clamp-1">
                    {c.rule_description}
                  </div>
                  <div className="mt-0.5 text-[10px] font-mono text-[var(--text-muted)]">
                    {c.hours_allowed}h SLA from awareness ({fmtDateTime(c.started_at)})
                  </div>
                  <div className="mt-2">
                    {c.status !== "COMPLETED" && (
                      <Can perm="ae.submit">
                        <Button
                          size="sm"
                          disabled={sM.isPending}
                          onClick={() => sM.mutate(c.id)}
                        >
                          Mark Transmitted to Regulator
                        </Button>
                      </Can>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  <ClockRing clock={c} size={88} />
                </div>
              </div>
            ))}
          </div>
          <ErrorBox error={sM.error} />
        </Card>
      )}

      {/* Herb Drug Interaction Alert */}
      <HerbDrugCard interactions={interactions} />

      {/* Clinical Definitions Grid */}
      <Card title="Clinical Event Profile">
        <dl className="grid gap-x-6 gap-y-3 text-xs sm:grid-cols-2 font-sans">
          {[
            ["Onset Timestamp", fmtDate(a.onset_date)],
            ["Awareness Registered", fmtDateTime(a.awareness_at)],
            ["Reaction Severity", human(a.severity)],
            [
              "Seriousness Criteria",
              a.seriousness_criteria?.join(", ") || (a.is_serious ? "Serious" : "Non-serious"),
            ],
            ["Outcome Status", human(a.outcome)],
            ["Clinical Action Taken", a.action_taken],
            ["Suspect Intervention", a.suspect_intervention],
            ["Concomitant Medicines", a.concomitant_meds],
            ["MedDRA PT Term (Stub)", a.meddra_pt],
            ["Ayush Morbidity Code", a.ayush_morbidity_code],
            ["ICD-11 Diagnostic Code", a.icd11_code],
            ["Causality (WHO-UMC)", human(a.causality)],
            [
              "Naranjo ADR Score",
              a.naranjo_score != null
                ? `${a.naranjo_score} (${a.naranjo_category})`
                : "Not assessed",
            ],
          ].map(([k, v]) => (
            <div
              key={k}
              className="grid grid-cols-5 gap-2 p-2 rounded border border-[var(--border-subtle)] bg-[var(--surface-2)]/30"
            >
              <dt className="col-span-2 text-[var(--text-muted)] font-medium">
                {k}
              </dt>
              <dd className="col-span-3 text-[var(--text)] font-semibold truncate" title={v || ""}>
                {v || "—"}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* Causality Assessment Form */}
      <Can perm="ae.causality">
        <Card
          title="Safety Officer Causality Evaluation"
          actions={
            <Button size="sm" variant="brass" onClick={() => setHelper(true)}>
              <HelpCircle size={14} /> Open Naranjo Helper
            </Button>
          }
        >
          <form
            className="grid gap-4 sm:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              cM.mutate();
            }}
          >
            <Field label="WHO-UMC Causality">
              <select
                className="input"
                required
                value={f.causality}
                onChange={(e) => setF({ ...f, causality: e.target.value })}
              >
                <option value="">Select category</option>
                {CAUSALITY.map((c) => (
                  <option key={c} value={c}>
                    {human(c)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Naranjo Score (-4 to 13)">
              <input
                className="input font-mono"
                type="number"
                min={-4}
                max={13}
                placeholder="Calculated score"
                value={f.naranjo_score}
                onChange={(e) =>
                  setF({
                    ...f,
                    naranjo_score: e.target.value === "" ? "" : +e.target.value,
                  })
                }
              />
            </Field>

            <Field label="Event Outcome">
              <select
                className="input"
                value={f.outcome}
                onChange={(e) => setF({ ...f, outcome: e.target.value })}
              >
                <option value="">(Unchanged)</option>
                {OUTCOMES.map((c) => (
                  <option key={c} value={c}>
                    {human(c)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Assessment Rationale (Audited)">
              <input
                className="input"
                required
                minLength={3}
                placeholder="Reasoning for assessment..."
                value={f.reason}
                onChange={(e) => setF({ ...f, reason: e.target.value })}
              />
            </Field>

            <div className="sm:col-span-4">
              <ErrorBox error={cM.error} />
            </div>

            <div>
              <Button size="md" disabled={cM.isPending}>
                Save Causality Assessment
              </Button>
            </div>
          </form>
        </Card>
      </Can>

      <Modal
        open={helper}
        onClose={() => setHelper(false)}
        title="Naranjo Adverse Drug Reaction Probability Scale"
        wide
      >
        <NaranjoHelper
          onScore={(n) => {
            setF({ ...f, naranjo_score: n });
            setHelper(false);
          }}
        />
      </Modal>
    </div>
  );
}

function ReportAe({
  open,
  onClose,
}: {
  open: boolean;
  onClose: (id?: number) => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const { me } = useAuth();
  const { data: studies = [] } = useQuery<any[]>({
    queryKey: ["studies"],
    queryFn: () => get("/studies"),
    enabled: open,
  });
  const eligible = studies.filter(
    (s) =>
      ["ENROLLING", "FOLLOW_UP"].includes(s.state) &&
      (me?.role !== "PI" || s.pi_user_id === me.id),
  );
  const [sid, setSid] = useState<number>(0);
  const study = sid || eligible[0]?.id;

  const { data: parts = [] } = useQuery<any[]>({
    queryKey: ["participants", study, ""],
    queryFn: () => get(`/studies/${study}/participants`),
    enabled: open && !!study,
  });
  const { data: meddra = [] } = useQuery<any[]>({
    queryKey: ["lookup", "meddra"],
    queryFn: () => get("/lookups/meddra"),
    enabled: open,
  });
  const { data: ayush = [] } = useQuery<any[]>({
    queryKey: ["lookup", "ayush-morbidity"],
    queryFn: () => get("/lookups/ayush-morbidity"),
    enabled: open,
  });

  const nowLocal = useMemo(
    () =>
      new Date(Date.now() - new Date().getTimezoneOffset() * 6e4)
        .toISOString()
        .slice(0, 16),
    [open],
  );

  const [f, setF] = useState<any>({
    participant_id: 0,
    onset_date: nowLocal.slice(0, 10),
    awareness_at: nowLocal,
    description: "",
    severity: "MILD",
    is_serious: false,
    seriousness_criteria: [],
    meddra_pt: "",
    ayush_morbidity_code: "",
    icd11_code: "",
    concomitant_meds: "",
    action_taken: "",
  });

  const intervention = eligible.find((s) => s.id === study)?.intervention ?? "";
  const { data: interactions = [] } = useQuery<any[]>({
    queryKey: ["interactions", intervention, f.concomitant_meds],
    queryFn: () =>
      get(
        `/interactions/check?intervention=${encodeURIComponent(
          intervention,
        )}&concomitant_meds=${encodeURIComponent(f.concomitant_meds)}`,
      ),
    enabled: open && !!intervention && f.concomitant_meds.trim().length > 2,
  });

  const m = useMutation({
    mutationFn: () =>
      post("/ae", {
        ...f,
        participant_id:
          +f.participant_id ||
          parts.find((p) => p.status !== "WITHDRAWN")?.id,
        awareness_at: new Date(f.awareness_at).toISOString(),
        meddra_pt: f.meddra_pt || null,
        ayush_morbidity_code: f.ayush_morbidity_code || null,
        icd11_code: f.icd11_code || null,
      }),
    onSuccess: (a: any) => {
      toast(
        a.is_serious
          ? `SAE reported — ${a.clocks.length} regulatory clocks activated`
          : "Adverse event recorded into trial log",
      );
      qc.invalidateQueries({ queryKey: ["ae"] });
      onClose(a.id);
    },
  });

  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  return (
    <Modal open={open} onClose={() => onClose()} title="Report Adverse Event (Safety Incident)" wide>
      <form
        className="grid gap-4 sm:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          m.mutate();
        }}
      >
        <Field label="Protocol Study">
          <select
            className="input"
            value={study ?? ""}
            onChange={(e) => setSid(+e.target.value)}
          >
            {eligible.map((s) => (
              <option key={s.id} value={s.id}>
                {s.protocol_no} — {s.title}
              </option>
            ))}
          </select>
        </Field>

        <div className="sm:col-span-2">
          <Field label="Subject ID">
            <select
              className="input font-mono"
              required
              value={f.participant_id}
              onChange={set("participant_id")}
            >
              <option value={0}>Select participant</option>
              {parts
                .filter((p) => p.status !== "WITHDRAWN")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.subject_code} (Site: {p.site_code} · {p.arm ?? "No arm"})
                  </option>
                ))}
            </select>
          </Field>
        </div>

        <div className="sm:col-span-3">
          <Field label="Event Description (AETERM)">
            <input
              className="input"
              required
              minLength={3}
              placeholder="Primary adverse reaction symptoms and findings..."
              value={f.description}
              onChange={set("description")}
            />
          </Field>
        </div>

        <Field label="Onset Date">
          <input
            className="input font-mono"
            type="date"
            required
            value={f.onset_date}
            onChange={set("onset_date")}
          />
        </Field>

        <Field
          label="Awareness Timestamp"
          hint="Regulatory statutory clocks begin exactly here"
        >
          <input
            className="input font-mono"
            type="datetime-local"
            required
            value={f.awareness_at}
            onChange={set("awareness_at")}
          />
        </Field>

        <Field label="Severity Rating">
          <select
            className="input"
            value={f.severity}
            onChange={set("severity")}
          >
            {["MILD", "MODERATE", "SEVERE"].map((s) => (
              <option key={s} value={s}>
                {human(s)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="MedDRA Preferred Term">
          <select
            className="input"
            value={f.meddra_pt}
            onChange={set("meddra_pt")}
          >
            <option value="">Search terminology...</option>
            {meddra.map((m) => (
              <option key={m.pt_code} value={m.pt_name}>
                {m.pt_name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Ayush Morbidity Code">
          <select
            className="input"
            value={f.ayush_morbidity_code}
            onChange={set("ayush_morbidity_code")}
          >
            <option value="">Select NAMASTE / Ayush term...</option>
            {ayush.map((m) => (
              <option key={m.code} value={m.code}>
                {m.term} ({m.code})
              </option>
            ))}
          </select>
        </Field>

        <Field label="ICD-11 Diagnostic Code">
          <input
            className="input font-mono"
            placeholder="e.g. 5A11"
            value={f.icd11_code}
            onChange={set("icd11_code")}
          />
        </Field>

        <Field label="Concomitant Allopathic Medicines">
          <input
            className="input"
            placeholder="e.g. Warfarin, Metformin"
            value={f.concomitant_meds}
            onChange={set("concomitant_meds")}
          />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Action Taken Regarding Protocol Intervention">
            <select
              className="input"
              value={f.action_taken}
              onChange={set("action_taken")}
            >
              <option value="">Select clinical disposition...</option>
              {[
                "DOSE NOT CHANGED",
                "DOSE REDUCED",
                "DRUG INTERRUPTED",
                "DRUG WITHDRAWN",
                "NOT APPLICABLE",
              ].map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Live interaction check in report modal */}
        {interactions.length > 0 && (
          <div className="sm:col-span-3">
            <HerbDrugCard interactions={interactions} />
          </div>
        )}

        <div className="sm:col-span-3 pt-2">
          <label className="flex items-center gap-2.5 p-3 rounded-[var(--radius-sm)] border border-[var(--danger-border)] bg-[var(--danger-bg)]/40 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-[var(--border)] text-[var(--danger)] focus:ring-[var(--danger)]"
              checked={f.is_serious}
              onChange={(e) => setF({ ...f, is_serious: e.target.checked })}
            />
            <div>
              <span className="text-xs font-bold text-[var(--danger)] uppercase tracking-wider block">
                Classify as Serious Adverse Event (SAE)
              </span>
              <span className="text-[11px] text-[var(--text-muted)]">
                Will trigger mandatory Indian/IEC statutory reporting countdown clocks.
              </span>
            </div>
          </label>
        </div>

        {f.is_serious && (
          <div className="rounded-[var(--radius-md)] border border-[var(--danger-border)] bg-[var(--surface-2)] p-4 sm:col-span-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--danger)]">
              Seriousness Criteria (Minimum one mandatory)
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SERIOUSNESS.map((c) => (
                <label
                  key={c}
                  className="flex items-center gap-2 text-xs text-[var(--text)]"
                >
                  <input
                    type="checkbox"
                    checked={f.seriousness_criteria.includes(c)}
                    onChange={(e) =>
                      setF({
                        ...f,
                        seriousness_criteria: e.target.checked
                          ? [...f.seriousness_criteria, c]
                          : f.seriousness_criteria.filter(
                              (x: string) => x !== c,
                            ),
                      })
                    }
                  />
                  {human(c)}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="sm:col-span-3">
          <ErrorBox error={m.error} />
        </div>

        <div className="flex justify-end gap-3 sm:col-span-3 border-t border-[var(--border)] pt-4">
          <Button type="button" variant="secondary" onClick={() => onClose()}>
            Cancel
          </Button>
          <Button
            variant={f.is_serious ? "danger" : "primary"}
            disabled={m.isPending}
          >
            {f.is_serious ? "Report SAE and Activate Clocks" : "Record Adverse Event"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function SafetyPage() {
  const [params, setParams] = useSearchParams();
  const sel = params.get("ae") ? Number(params.get("ae")) : null;
  const [serious, setSerious] = useState(true);
  const [report, setReport] = useState(false);
  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["ae", "list", serious],
    queryFn: () => get(`/ae${serious ? "?serious=true" : ""}`),
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Page Header ── */}
      <PageHeader
        eyebrow="Safety & Statutory Telemetry"
        title="Pharmacovigilance Command"
        description="Surveillance inbox, 24h & 14d statutory reporting clocks, WHO-UMC causality evaluation, and Ayurvedic herb-drug interaction alerts."
        actions={
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#E8EFE9] cursor-pointer bg-[#16201C] px-3 py-1.5 rounded-xl border border-[#22302A]">
              <input
                type="checkbox"
                className="rounded accent-[#2FB39A]"
                checked={serious}
                onChange={(e) => setSerious(e.target.checked)}
              />
              Serious Only
            </label>
            <Can perm="ae.create">
              <Button onClick={() => setReport(true)}>
                <Plus size={16} /> Report Safety Incident
              </Button>
            </Can>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-5">
        {/* Left Column: Event List */}
        <Card className="xl:col-span-2">
          {isLoading ? (
            <Loading />
          ) : data.length === 0 ? (
            <Empty>No recorded adverse incidents match the filter</Empty>
          ) : (
            <Table head={["Incident", "Study & Subject", "Clock Status"]}>
              {data.map((a) => {
                const next = a.clocks.find((c: any) => c.status !== "COMPLETED");
                const isSelected = sel === a.id;

                return (
                  <tr
                    key={a.id}
                    onClick={() => setParams({ ae: String(a.id) })}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-[var(--surface-3)] border-l-2 border-[var(--brand)]"
                        : "hover:bg-[var(--surface-2)]/60"
                    }`}
                  >
                    <td className="td">
                      <div className="flex items-center gap-1.5">
                        {a.is_serious && <Badge tone="red">SAE</Badge>}
                        <span className="font-mono font-bold text-xs">#{a.id}</span>
                      </div>
                      <div className="line-clamp-2 text-xs text-[var(--text)] mt-1 font-medium">
                        {a.description}
                      </div>
                    </td>
                    <td className="td text-xs font-mono">
                      <div className="text-[var(--text)] font-semibold">{a.protocol_no}</div>
                      <div className="text-[var(--text-muted)]">{a.subject_code}</div>
                    </td>
                    <td className="td">
                      {next ? (
                        <SaeClockChip clock={next} compact />
                      ) : a.is_serious ? (
                        <Badge tone="green">All Submitted</Badge>
                      ) : (
                        <span className="text-[var(--text-faint)] text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </Table>
          )}
        </Card>

        {/* Right Column: Event Detail */}
        <div className="xl:col-span-3">
          {sel ? (
            <AeDetail id={sel} />
          ) : (
            <Empty>
              Select an adverse event from the inbox to inspect regulatory clocks, WHO-UMC / Naranjo causality, and generate compliant drafts.
            </Empty>
          )}
        </div>
      </div>

      <ReportAe
        open={report}
        onClose={(id) => {
          setReport(false);
          if (id) setParams({ ae: String(id) });
        }}
      />
    </div>
  );
}
