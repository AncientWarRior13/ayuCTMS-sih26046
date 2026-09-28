import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { download, get, post } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Can } from "../auth/RoleGuard";
import { Badge, Button, Card, Empty, ErrorBox, Field, fmtDate, fmtDateTime, human, Loading, Modal, Table, useToast } from "../components/ui";
import { SaeClockChip } from "../components/widgets";

const CAUSALITY = ["CERTAIN", "PROBABLE", "POSSIBLE", "UNLIKELY", "CONDITIONAL", "UNASSESSABLE", "UNRELATED"];
const OUTCOMES = ["RECOVERED", "RECOVERING", "NOT_RECOVERED", "RECOVERED_WITH_SEQUELAE", "FATAL", "UNKNOWN"];
const SERIOUSNESS = ["death", "life-threatening", "hospitalisation", "disability", "congenital-anomaly", "other-medically-important"];

// Naranjo ADR probability scale: [question, yes, no, don't know]
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
const naranjoCat = (n: number) => (n >= 9 ? "Definite" : n >= 5 ? "Probable" : n >= 1 ? "Possible" : "Doubtful");

function NaranjoHelper({ onScore }: { onScore: (n: number) => void }) {
  const [ans, setAns] = useState<("y" | "n" | "u")[]>(Array(10).fill("u"));
  const score = ans.reduce((s, a, i) => s + (a === "y" ? NARANJO[i][1] : a === "n" ? NARANJO[i][2] : 0), 0);
  return (
    <div className="space-y-2">
      {NARANJO.map(([q], i) => (
        <div key={i} className="flex items-center justify-between gap-3 text-sm">
          <span className="text-slate-700">{i + 1}. {q}</span>
          <div className="flex shrink-0 gap-1">
            {(["y", "n", "u"] as const).map((v) => (
              <button type="button" key={v} onClick={() => setAns(ans.map((a, j) => (j === i ? v : a)))}
                className={`rounded border px-2 py-0.5 text-xs ${ans[i] === v ? "border-brand-700 bg-brand-700 text-white" : "border-slate-300"}`}>
                {v === "y" ? "Yes" : v === "n" ? "No" : "Unknown"}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between rounded-md bg-slate-50 p-3 text-sm">
        <span>Score <b>{score}</b> - {naranjoCat(score)}</span>
        <Button type="button" size="sm" onClick={() => onScore(score)}>Use this score</Button>
      </div>
    </div>
  );
}

function AeDetail({ id }: { id: number }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { data: a, isLoading } = useQuery<any>({ queryKey: ["ae", id], queryFn: () => get(`/ae/${id}`) });
  const [f, setF] = useState({ causality: "", naranjo_score: "" as number | "", outcome: "", reason: "" });
  const [helper, setHelper] = useState(false);
  const inv = () => qc.invalidateQueries({ queryKey: ["ae"] });
  const cM = useMutation({
    mutationFn: () => post(`/ae/${id}/causality`, { causality: f.causality, naranjo_score: f.naranjo_score === "" ? null : f.naranjo_score, outcome: f.outcome || null, reason: f.reason }),
    onSuccess: () => { toast("Causality assessment recorded"); inv(); },
  });
  const sM = useMutation({ mutationFn: (clock_id: number) => post(`/ae/${id}/submit-report`, { clock_id }), onSuccess: () => { toast("Report submission recorded; clock stopped"); inv(); qc.invalidateQueries({ queryKey: ["alerts"] }); } });
  if (isLoading || !a) return <Loading />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{a.is_serious ? "SAE" : "AE"} #{a.id}: {a.description}</h2>
          <p className="text-sm text-slate-500">{a.protocol_no} - {a.subject_code} - reported by {a.reported_by_name} on {fmtDateTime(a.created_at)}</p>
        </div>
        <Can perm="ae.report">
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => download(`/ae/${id}/report?format=pdf`, `sae-report-${id}.pdf`)}><FileText size={14} /> PDF draft</Button>
            <Button size="sm" variant="secondary" onClick={() => download(`/ae/${id}/report?format=json`, `sae-report-${id}.json`)}>JSON</Button>
          </div>
        </Can>
      </div>
      {a.clocks.length > 0 && (
        <Card title="Regulatory reporting clocks">
          <ul className="space-y-3">
            {a.clocks.map((c: any) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{c.rule_description}</div>
                  <div className="text-xs text-slate-500">{c.hours_allowed}h from awareness {fmtDateTime(c.started_at)} - due {fmtDateTime(c.due_at)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <SaeClockChip clock={c} compact />
                  {c.status !== "COMPLETED" && <Can perm="ae.submit"><Button size="sm" disabled={sM.isPending} onClick={() => sM.mutate(c.id)}>Mark submitted</Button></Can>}
                </div>
              </li>
            ))}
          </ul>
          <ErrorBox error={sM.error} />
        </Card>
      )}
      <Card title="Event details">
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {[["Onset", fmtDate(a.onset_date)], ["Awareness", fmtDateTime(a.awareness_at)], ["Severity", human(a.severity)],
            ["Seriousness", a.seriousness_criteria?.join(", ") || (a.is_serious ? "Serious" : "Non-serious")], ["Outcome", human(a.outcome)],
            ["Action taken", a.action_taken], ["Suspect intervention", a.suspect_intervention], ["Concomitant medicines", a.concomitant_meds],
            ["MedDRA PT (stub)", a.meddra_pt], ["Ayush morbidity code", a.ayush_morbidity_code], ["ICD-11", a.icd11_code],
            ["Causality (WHO-UMC)", human(a.causality)], ["Naranjo", a.naranjo_score != null ? `${a.naranjo_score} (${a.naranjo_category})` : "-"]].map(([k, v]) => (
            <div key={k} className="grid grid-cols-5 gap-2"><dt className="col-span-2 text-slate-500">{k}</dt><dd className="col-span-3">{v || "-"}</dd></div>
          ))}
        </dl>
      </Card>
      <Can perm="ae.causality">
        <Card title="Causality assessment" actions={<Button size="sm" variant="ghost" onClick={() => setHelper(true)}>Naranjo helper</Button>}>
          <form className="grid gap-3 sm:grid-cols-4" onSubmit={(e) => { e.preventDefault(); cM.mutate(); }}>
            <Field label="WHO-UMC category"><select className="input" required value={f.causality} onChange={(e) => setF({ ...f, causality: e.target.value })}><option value="">-</option>{CAUSALITY.map((c) => <option key={c} value={c}>{human(c)}</option>)}</select></Field>
            <Field label="Naranjo score"><input className="input" type="number" min={-4} max={13} value={f.naranjo_score} onChange={(e) => setF({ ...f, naranjo_score: e.target.value === "" ? "" : +e.target.value })} /></Field>
            <Field label="Outcome"><select className="input" value={f.outcome} onChange={(e) => setF({ ...f, outcome: e.target.value })}><option value="">(unchanged)</option>{OUTCOMES.map((c) => <option key={c} value={c}>{human(c)}</option>)}</select></Field>
            <Field label="Rationale (audited)"><input className="input" required minLength={3} value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
            <div className="sm:col-span-4"><ErrorBox error={cM.error} /></div>
            <div><Button size="sm" disabled={cM.isPending}>Save assessment</Button></div>
          </form>
        </Card>
      </Can>
      <Modal open={helper} onClose={() => setHelper(false)} title="Naranjo adverse drug reaction probability scale" wide>
        <NaranjoHelper onScore={(n) => { setF({ ...f, naranjo_score: n }); setHelper(false); }} />
      </Modal>
    </div>
  );
}

function ReportAe({ open, onClose }: { open: boolean; onClose: (id?: number) => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { me } = useAuth();
  const { data: studies = [] } = useQuery<any[]>({ queryKey: ["studies"], queryFn: () => get("/studies"), enabled: open });
  const eligible = studies.filter((s) => ["ENROLLING", "FOLLOW_UP"].includes(s.state) && (me?.role !== "PI" || s.pi_user_id === me.id));
  const [sid, setSid] = useState<number>(0);
  const study = sid || eligible[0]?.id;
  const { data: parts = [] } = useQuery<any[]>({ queryKey: ["participants", study, ""], queryFn: () => get(`/studies/${study}/participants`), enabled: open && !!study });
  const { data: meddra = [] } = useQuery<any[]>({ queryKey: ["lookup", "meddra"], queryFn: () => get("/lookups/meddra"), enabled: open });
  const { data: ayush = [] } = useQuery<any[]>({ queryKey: ["lookup", "ayush-morbidity"], queryFn: () => get("/lookups/ayush-morbidity"), enabled: open });
  const nowLocal = useMemo(() => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16), [open]);
  const [f, setF] = useState<any>({ participant_id: 0, onset_date: nowLocal.slice(0, 10), awareness_at: nowLocal, description: "", severity: "MILD", is_serious: false, seriousness_criteria: [], meddra_pt: "", ayush_morbidity_code: "", icd11_code: "", concomitant_meds: "", action_taken: "" });
  const m = useMutation({
    mutationFn: () => post("/ae", {
      ...f, participant_id: +f.participant_id || parts.find((p) => p.status !== "WITHDRAWN")?.id,
      awareness_at: new Date(f.awareness_at).toISOString(),
      meddra_pt: f.meddra_pt || null, ayush_morbidity_code: f.ayush_morbidity_code || null, icd11_code: f.icd11_code || null,
    }),
    onSuccess: (a: any) => { toast(a.is_serious ? `SAE reported - ${a.clocks.length} regulatory clocks started` : "Adverse event reported"); qc.invalidateQueries({ queryKey: ["ae"] }); onClose(a.id); },
  });
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal open={open} onClose={() => onClose()} title="Report adverse event" wide>
      <form className="grid gap-3 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
        <Field label="Study"><select className="input" value={study ?? ""} onChange={(e) => setSid(+e.target.value)}>{eligible.map((s) => <option key={s.id} value={s.id}>{s.protocol_no}</option>)}</select></Field>
        <div className="sm:col-span-2"><Field label="Participant"><select className="input" required value={f.participant_id} onChange={set("participant_id")}><option value={0}>Select subject</option>{parts.filter((p) => p.status !== "WITHDRAWN").map((p) => <option key={p.id} value={p.id}>{p.subject_code} ({p.site_code}, {p.arm ?? "no arm"})</option>)}</select></Field></div>
        <div className="sm:col-span-3"><Field label="Event description (AETERM)"><input className="input" required minLength={3} value={f.description} onChange={set("description")} /></Field></div>
        <Field label="Onset date"><input className="input" type="date" required value={f.onset_date} onChange={set("onset_date")} /></Field>
        <Field label="Awareness date/time" hint="Regulatory clocks start here"><input className="input" type="datetime-local" required value={f.awareness_at} onChange={set("awareness_at")} /></Field>
        <Field label="Severity"><select className="input" value={f.severity} onChange={set("severity")}>{["MILD", "MODERATE", "SEVERE"].map((s) => <option key={s} value={s}>{human(s)}</option>)}</select></Field>
        <Field label="MedDRA PT (stub list)"><select className="input" value={f.meddra_pt} onChange={set("meddra_pt")}><option value="">-</option>{meddra.map((m) => <option key={m.pt_code} value={m.pt_name}>{m.pt_name}</option>)}</select></Field>
        <Field label="Ayush morbidity term"><select className="input" value={f.ayush_morbidity_code} onChange={set("ayush_morbidity_code")}><option value="">-</option>{ayush.map((m) => <option key={m.code} value={m.code}>{m.term}</option>)}</select></Field>
        <Field label="ICD-11 code"><input className="input" value={f.icd11_code} onChange={set("icd11_code")} /></Field>
        <Field label="Concomitant medicines"><input className="input" value={f.concomitant_meds} onChange={set("concomitant_meds")} /></Field>
        <Field label="Action taken"><select className="input" value={f.action_taken} onChange={set("action_taken")}><option value="">-</option>{["DOSE NOT CHANGED", "DOSE REDUCED", "DRUG INTERRUPTED", "DRUG WITHDRAWN", "NOT APPLICABLE"].map((x) => <option key={x}>{x}</option>)}</select></Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-red-700"><input type="checkbox" checked={f.is_serious} onChange={(e) => setF({ ...f, is_serious: e.target.checked })} /> Serious adverse event</label>
        {f.is_serious && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 sm:col-span-3">
            <p className="mb-2 text-xs font-medium text-red-800">Seriousness criteria (at least one)</p>
            <div className="flex flex-wrap gap-3">
              {SERIOUSNESS.map((c) => (
                <label key={c} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={f.seriousness_criteria.includes(c)} onChange={(e) => setF({ ...f, seriousness_criteria: e.target.checked ? [...f.seriousness_criteria, c] : f.seriousness_criteria.filter((x: string) => x !== c) })} />
                  {human(c)}
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="sm:col-span-3"><ErrorBox error={m.error} /></div>
        <div className="flex justify-end gap-2 sm:col-span-3"><Button type="button" variant="secondary" onClick={() => onClose()}>Cancel</Button><Button variant={f.is_serious ? "danger" : "primary"} disabled={m.isPending}>{f.is_serious ? "Report SAE and start clocks" : "Report AE"}</Button></div>
      </form>
    </Modal>
  );
}

export default function SafetyPage() {
  const [params, setParams] = useSearchParams();
  const sel = params.get("ae") ? Number(params.get("ae")) : null;
  const [serious, setSerious] = useState(true);
  const [report, setReport] = useState(false);
  const { data = [], isLoading } = useQuery<any[]>({ queryKey: ["ae", "list", serious], queryFn: () => get(`/ae${serious ? "?serious=true" : ""}`) });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Safety inbox</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={serious} onChange={(e) => setSerious(e.target.checked)} /> Serious only</label>
          <Can perm="ae.create"><Button onClick={() => setReport(true)}><Plus size={16} /> Report AE / SAE</Button></Can>
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          {isLoading ? <Loading /> : data.length === 0 ? <Empty>No events</Empty> : (
            <Table head={["Event", "Study / subject", "Clock"]}>
              {data.map((a) => {
                const next = a.clocks.find((c: any) => c.status !== "COMPLETED");
                return (
                  <tr key={a.id} onClick={() => setParams({ ae: String(a.id) })} className={`cursor-pointer ${sel === a.id ? "bg-brand-50" : "hover:bg-slate-50"}`}>
                    <td className="td">
                      <div className="flex items-center gap-1.5">{a.is_serious && <Badge tone="red">SAE</Badge>}<span className="font-medium">#{a.id}</span></div>
                      <div className="line-clamp-2 text-xs text-slate-600">{a.description}</div>
                    </td>
                    <td className="td text-xs">{a.protocol_no}<div className="mono">{a.subject_code}</div></td>
                    <td className="td">{next ? <SaeClockChip clock={next} compact /> : a.is_serious ? <Badge tone="green">All submitted</Badge> : "-"}</td>
                  </tr>
                );
              })}
            </Table>
          )}
        </Card>
        <div className="xl:col-span-3">{sel ? <AeDetail id={sel} /> : <Empty>Select an event to review clocks, causality and reports.</Empty>}</div>
      </div>
      <ReportAe open={report} onClose={(id) => { setReport(false); if (id) setParams({ ae: String(id) }); }} />
    </div>
  );
}
