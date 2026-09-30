import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileJson, Plus } from "lucide-react";
import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { download, get, post, put } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Can } from "../auth/RoleGuard";
import { Badge, Button, Card, Empty, ErrorBox, Field, fmtDate, human, Loading, Modal, PageHeader, Table, Tabs, useToast } from "../components/ui";
import { EnrolmentChart, KpiCard, LifecycleStepper, SaeClockChip, STATE_TONE, STATES } from "../components/widgets";
import ParticipantDrawer from "./ParticipantDrawer";

type Tab = "overview" | "participants" | "deviations" | "queries" | "safety" | "documents" | "exports";

function useInvalidate(id: string) {
  const qc = useQueryClient();
  // Cancel any in-flight fetch for these keys before invalidating. Without this, an older
  // request - e.g. from a previous mutation on this same page - can resolve after a newer one
  // and clobber it with stale data, since a plain invalidate doesn't cancel requests already
  // in flight. Cancelling first guarantees only the latest fetch for each key ever commits.
  const bump = (key: unknown[]) => {
    qc.cancelQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: key });
  };
  return () => {
    bump(["study", id]);
    bump(["studies"]);
    bump(["study-dash", id]);
  };
}

function Overview({ s }: { s: any }) {
  const { me, can } = useAuth();
  const toast = useToast();
  const refresh = useInvalidate(String(s.id));
  const { data: dash } = useQuery<any>({ queryKey: ["study-dash", String(s.id)], queryFn: () => get(`/dashboard/study/${s.id}`) });
  const [reason, setReason] = useState("");
  const qc = useQueryClient();
  const tr = useMutation({
    mutationFn: () => post(`/studies/${s.id}/transition`, { target_state: s.next_state, reason: reason || undefined }),
    onSuccess: (data: { state: string }) => {
      // Cancel any fetch already in flight for this key before patching, so a stale response
      // from an earlier action on this page can't land afterward and overwrite this update.
      qc.cancelQueries({ queryKey: ["study", String(s.id)] });
      const idx = STATES.indexOf(data.state);
      qc.setQueryData(["study", String(s.id)], (prev: any) => prev && {
        ...prev, state: data.state,
        next_state: idx >= 0 && idx + 1 < STATES.length ? STATES[idx + 1] : null,
        next_state_blockers: [],
      });
      toast(`Study moved to ${human(data.state)}`);
      setReason("");
      refresh();
    },
  });
  const canTransition =
    s.next_state && can("study.transition") &&
    (me?.role === "ADMIN" || (me?.role === "IEC" && s.next_state === "EC_APPROVED") || (me?.role === "PI" && s.pi_user_id === me.id && s.next_state !== "EC_APPROVED"));
  const idx = STATES.indexOf(s.state);
  const today = new Date();
  const exp = s.planned_start && s.planned_end && s.state === "ENROLLING"
    ? Math.round((s.target_sample * Math.min(Math.max((+today - Date.parse(s.planned_start)) / 864e5, 0), (Date.parse(s.planned_end) - Date.parse(s.planned_start)) / 864e5)) / ((Date.parse(s.planned_end) - Date.parse(s.planned_start)) / 864e5))
    : null;
  return (
    <div className="space-y-5">
      <Card title="Lifecycle">
        <LifecycleStepper state={s.state} blockers={s.next_state_blockers} />
        {canTransition && (
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <div className="w-72"><Field label="Reason / note (audited)"><input className="input" value={reason} onChange={(e) => setReason(e.target.value)} /></Field></div>
            <Button disabled={tr.isPending} onClick={() => tr.mutate()}>Advance to {human(s.next_state)}</Button>
          </div>
        )}
        <div className="mt-2"><ErrorBox error={tr.error} /></div>
      </Card>
      {dash && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard label="Enrolled" value={`${s.enrolled} / ${s.target_sample}`} sub={exp != null ? `expected ${exp} by today` : undefined} tone={exp != null && s.enrolled < exp * 0.85 ? "warn" : "default"} />
          <KpiCard label="Visits" value={dash.visits.done} sub={`${dash.visits.missed} missed - ${dash.visits.out_of_window} out of window`} tone={dash.visits.missed ? "warn" : "default"} />
          <KpiCard label="Deviations" value={dash.deviations.open} sub={`open (${dash.deviations.major} major/critical total)`} />
          <KpiCard label="Safety" value={`${dash.safety.sae} SAE`} sub={`${dash.safety.ae} adverse events`} tone={dash.safety.sae ? "warn" : "default"} />
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Enrolment curve" className="lg:col-span-2">
          {dash?.enrolment_curve?.length ? <EnrolmentChart curve={dash.enrolment_curve} target={s.target_sample} expected={exp} /> : <Empty>No enrolment yet</Empty>}
        </Card>
        <Card title="Study details">
          <dl className="space-y-2.5 text-sm">
            {[["Design", human(s.type)], ["Phase", s.phase], ["Intervention", s.intervention], ["Arms", (s.arms ?? []).join(" / ")], ["PI", s.pi_name],
              ["Planned", `${fmtDate(s.planned_start)} - ${fmtDate(s.planned_end)}`], ["CTRI", s.ctri?.ctri_number ?? "Not registered"],
              ["CTRI registered", fmtDate(s.ctri?.registered_on)]].map(([k, v]) => (
              <div key={k} className="grid grid-cols-3 gap-2 py-1 border-b border-[var(--border)] last:border-0">
                <dt className="text-xs font-mono text-[var(--text-muted)] uppercase tracking-wider">{k}</dt>
                <dd className="col-span-2 text-xs text-[var(--text)] font-medium">{v || "-"}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Sites">
          <Table head={["Site", "City", "Activated", "Enrolled / target"]}>
            {s.sites.map((x: any) => (
              <tr key={x.id}><td className="td font-medium">{x.code}</td><td className="td">{x.city}</td><td className="td">{fmtDate(x.activated_on)}</td><td className="td">{x.enrolled} / {x.site_target ?? "-"}</td></tr>
            ))}
          </Table>
        </Card>
        <Card title="Milestones">
          <Table head={["Milestone", "Planned", "Actual", ""]} empty={!s.milestones.length}>
            {s.milestones.map((m: any) => {
              const late = !m.actual_date && Date.parse(m.planned_date) < +today;
              return (
                <tr key={m.id}><td className="td">{m.name}</td><td className="td">{fmtDate(m.planned_date)}</td><td className="td">{fmtDate(m.actual_date)}</td>
                  <td className="td">{m.actual_date ? <Badge tone="green">Done</Badge> : late ? <Badge tone="amber">Overdue</Badge> : <Badge>Planned</Badge>}</td></tr>
              );
            })}
          </Table>
        </Card>
      </div>
      {idx >= 1 && <RegulatoryPanel s={s} />}
    </div>
  );
}

function RegulatoryPanel({ s }: { s: any }) {
  const toast = useToast();
  const refresh = useInvalidate(String(s.id));
  const [ec, setEc] = useState({ committee_name: "AIIA Institutional Ethics Committee", approval_ref: "", approved_on: "", valid_to: "", continuing_review_due: "" });
  const [ctri, setCtri] = useState({ ctri_number: s.ctri?.ctri_number ?? "", registered_on: s.ctri?.registered_on ?? "" });
  const ecM = useMutation({ mutationFn: () => post(`/studies/${s.id}/ethics-approvals`, { ...ec, continuing_review_due: ec.continuing_review_due || null }), onSuccess: () => { toast("Ethics approval recorded"); refresh(); } });
  const ctriM = useMutation({ mutationFn: () => put(`/studies/${s.id}/ctri`, ctri), onSuccess: () => { toast("CTRI registration saved"); refresh(); } });
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Ethics committee approvals">
        <Table head={["Committee", "Reference", "Approved", "Valid to"]} empty={!s.ethics.length}>
          {s.ethics.map((e: any) => (
            <tr key={e.id}><td className="td">{e.committee_name}</td><td className="td mono">{e.approval_ref}</td><td className="td">{fmtDate(e.approved_on)}</td>
              <td className="td">{fmtDate(e.valid_to)} {Date.parse(e.valid_to) < Date.now() ? <Badge tone="red">expired</Badge> : Date.parse(e.valid_to) - Date.now() < 30 * 864e5 ? <Badge tone="amber">expiring</Badge> : null}</td></tr>
          ))}
        </Table>
        <Can perm="ethics.create">
          <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); ecM.mutate(); }}>
            <Field label="Committee"><input className="input" required value={ec.committee_name} onChange={(e) => setEc({ ...ec, committee_name: e.target.value })} /></Field>
            <Field label="Approval reference"><input className="input" value={ec.approval_ref} onChange={(e) => setEc({ ...ec, approval_ref: e.target.value })} /></Field>
            <Field label="Approved on"><input className="input" type="date" required value={ec.approved_on} onChange={(e) => setEc({ ...ec, approved_on: e.target.value })} /></Field>
            <Field label="Valid to"><input className="input" type="date" required value={ec.valid_to} onChange={(e) => setEc({ ...ec, valid_to: e.target.value })} /></Field>
            <div className="sm:col-span-2"><ErrorBox error={ecM.error} /></div>
            <div className="sm:col-span-2"><Button size="sm" disabled={ecM.isPending}>Record approval</Button></div>
          </form>
        </Can>
      </Card>
      <Card title="CTRI registration">
        {s.ctri ? (
          <p className="text-sm">Registered as <b className="mono">{s.ctri.ctri_number}</b> on {fmtDate(s.ctri.registered_on)}; last updated {fmtDate(s.ctri.last_updated_on)}.</p>
        ) : <Empty>Not yet registered. Enrolment is blocked until CTRI registration is recorded.</Empty>}
        <Can perm="ctri.set">
          <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); ctriM.mutate(); }}>
            <Field label="CTRI number" hint="Format CTRI/YYYY/MM/NNNNNN"><input className="input mono" required pattern="CTRI/\d{4}/\d{2}/\d{6}" value={ctri.ctri_number} onChange={(e) => setCtri({ ...ctri, ctri_number: e.target.value })} /></Field>
            <Field label="Registered on"><input className="input" type="date" required value={ctri.registered_on} onChange={(e) => setCtri({ ...ctri, registered_on: e.target.value })} /></Field>
            <div className="sm:col-span-2"><ErrorBox error={ctriM.error} /></div>
            <div className="sm:col-span-2"><Button size="sm" disabled={ctriM.isPending}>Save registration</Button></div>
          </form>
        </Can>
      </Card>
    </div>
  );
}

function Participants({ s }: { s: any }) {
  const { me, can } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [enrol, setEnrol] = useState(false);
  const { data = [], isLoading } = useQuery<any[]>({ queryKey: ["participants", s.id, status], queryFn: () => get(`/studies/${s.id}/participants${status ? `?status=${status}` : ""}`), enabled: can("participant.read") });
  const { data: reconsent = [] } = useQuery<any[]>({ queryKey: ["reconsent", s.id], queryFn: () => get(`/studies/${s.id}/reconsent`), enabled: can("participant.read") });
  const mySites = s.sites.filter((x: any) => me?.sites.some((m) => m.id === x.id) && x.activated_on);
  const docs = s.consent_documents.filter((d: any) => Date.parse(d.effective_from) <= Date.now());
  const [f, setF] = useState({ site_id: mySites[0]?.id ?? 0, sex: "F", age_years: 35, name: "", contact: "", consent_document_id: docs.at(-1)?.id ?? 0, witness_name: "", guardian_consent: false });
  const [answers, setAnswers] = useState<number[]>([]);
  const selectedDoc = docs.find((d: any) => d.id === f.consent_document_id);
  const questions: { question: string; options: string[] }[] = selectedDoc?.comprehension_questions ?? [];
  const m = useMutation({
    mutationFn: () => post(`/studies/${s.id}/participants`, { ...f, site_id: +f.site_id, consent_document_id: +f.consent_document_id || null,
      comprehension_answers: questions.length ? answers : undefined }),
    onSuccess: (p: any) => { toast(`Enrolled ${p.subject_code}${p.arm ? ` - randomised to ${p.arm}` : ""}`); setEnrol(false); qc.invalidateQueries({ queryKey: ["participants", s.id] }); qc.invalidateQueries({ queryKey: ["study", String(s.id)] }); },
  });
  if (!can("participant.read")) return <Empty>Your role does not have access to participant-level data.</Empty>;
  return (
    <Card
      title={`Participants (${data.length})`}
      actions={
        <>
          <select className="input w-40 py-1" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter status">
            <option value="">All statuses</option>
            {["ENROLLED", "RANDOMIZED", "COMPLETED", "WITHDRAWN"].map((x) => <option key={x} value={x}>{human(x)}</option>)}
          </select>
          <Can perm="participant.create"><Button size="sm" onClick={() => setEnrol(true)}><Plus size={14} /> Enrol</Button></Can>
        </>
      }
    >
      {reconsent.length > 0 && (
        <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-300 flex items-center gap-2">
          <span className="font-mono font-bold uppercase tracking-wider text-[11px] bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/40">Action Required</span>
          <span>{reconsent.length} participant(s) must re-consent under {reconsent[0].amendment}. Data entry is blocked for them until re-consent is recorded.</span>
        </div>
      )}
      {isLoading ? <Loading /> : (
        <Table head={["Subject", "Site", "Status", "Arm", "Sex / age", "Enrolled", "Missed visits", "AEs"]} empty={!data.length}>
          {data.map((p) => (
            <tr key={p.id} className="cursor-pointer hover:bg-[var(--surface-2)]/60 transition-colors" onClick={() => setOpen(p.id)}>
              <td className="td mono font-medium text-[var(--brand-text)] flex items-center gap-1.5">{p.subject_code}{reconsent.some((r) => r.id === p.id) && <Badge tone="amber">re-consent</Badge>}</td>
              <td className="td">{p.site_code}</td>
              <td className="td"><Badge tone={p.status === "WITHDRAWN" ? "red" : p.status === "COMPLETED" ? "gray" : "green"}>{human(p.status)}</Badge></td>
              <td className="td">{p.arm ?? "-"}</td>
              <td className="td">{p.sex} / {p.age_years}</td>
              <td className="td">{fmtDate(p.enrolled_on)}</td>
              <td className="td">{p.missed_visits ? <Badge tone="amber">{p.missed_visits}</Badge> : 0}</td>
              <td className="td">{p.ae_count}</td>
            </tr>
          ))}
        </Table>
      )}
      {open && <ParticipantDrawer pid={open} study={s} onClose={() => setOpen(null)} />}
      <Modal open={enrol} onClose={() => setEnrol(false)} title="Enrol participant with informed consent" wide>
        {s.state !== "ENROLLING" && <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">This study is in state {human(s.state)}. The server will refuse enrolment until the study reaches ENROLLING.</div>}
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
          <Field label="Site">
            <select className="input" value={f.site_id} onChange={(e) => setF({ ...f, site_id: +e.target.value })}>
              {mySites.length === 0 && <option value={0}>No active site assigned to you</option>}
              {mySites.map((x: any) => <option key={x.id} value={x.id}>{x.code} - {x.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sex"><select className="input" value={f.sex} onChange={(e) => setF({ ...f, sex: e.target.value })}><option value="F">Female</option><option value="M">Male</option><option value="U">Unknown</option></select></Field>
            <Field label="Age (years)"><input className="input" type="number" min={0} max={120} value={f.age_years} onChange={(e) => setF({ ...f, age_years: +e.target.value })} /></Field>
          </div>
          <Field label="Full name" hint="Encrypted at rest; visible only to PI and coordinators"><input className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Contact"><input className="input" value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} /></Field>
          <Field label="Consent document">
            <select className="input" value={f.consent_document_id} onChange={(e) => { setF({ ...f, consent_document_id: +e.target.value }); setAnswers([]); }}>
              <option value={0}>- Consent not obtained -</option>
              {docs.map((d: any) => <option key={d.id} value={d.id}>v{d.version} ({d.language}) - sha256 {d.content_hash.slice(0, 10)}...</option>)}
            </select>
          </Field>
          <Field label="Witness"><input className="input" value={f.witness_name} onChange={(e) => setF({ ...f, witness_name: e.target.value })} /></Field>
          {questions.length > 0 && (
            <div className="rounded-xl border border-[#2FB39A]/30 bg-[#2FB39A]/10 p-3 sm:col-span-2">
              <p className="mb-2 text-xs font-mono uppercase tracking-wider font-semibold text-[#2FB39A]">Comprehension check - read each question aloud and record the participant's answer</p>
              <div className="space-y-3">
                {questions.map((q, i) => (
                  <div key={i} className="rounded-lg bg-[var(--surface-2)] p-2.5 border border-[var(--border)]">
                    <p className="text-xs font-medium text-[var(--text)]">{i + 1}. {q.question}</p>
                    <div className="mt-1 flex flex-wrap gap-3">
                      {q.options.map((opt, oi) => (
                        <label key={oi} className="flex items-center gap-1.5 text-sm">
                          <input type="radio" name={`ans-${i}`} required checked={answers[i] === oi}
                            onChange={() => setAnswers((a) => { const next = [...a]; next[i] = oi; return next; })} />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {f.age_years < 18 && (
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={f.guardian_consent} onChange={(e) => setF({ ...f, guardian_consent: e.target.checked })} /> Verifiable guardian consent obtained (participant is a minor)</label>
          )}
          <div className="sm:col-span-2"><ErrorBox error={m.error} /></div>
          <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="secondary" onClick={() => setEnrol(false)}>Cancel</Button><Button disabled={m.isPending}>Enrol and randomise</Button></div>
        </form>
      </Modal>
    </Card>
  );
}

function Deviations({ s }: { s: any }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { data = [] } = useQuery<any[]>({ queryKey: ["deviations", s.id], queryFn: () => get(`/studies/${s.id}/deviations`) });
  const [f, setF] = useState({ category: "Visit window", severity: "MINOR", description: "", capa: "" });
  const [sign, setSign] = useState<any>(null);
  const [capa, setCapa] = useState("");
  const inv = () => qc.invalidateQueries({ queryKey: ["deviations", s.id] });
  const add = useMutation({ mutationFn: () => post(`/studies/${s.id}/deviations`, { ...f, capa: f.capa || null }), onSuccess: () => { toast("Deviation logged"); setF({ ...f, description: "", capa: "" }); inv(); } });
  const so = useMutation({ mutationFn: () => post(`/deviations/${sign.id}/signoff`, { capa }), onSuccess: () => { toast("Signed off"); setSign(null); setCapa(""); inv(); } });
  return (
    <div className="space-y-5">
      <Can perm="deviation.create">
        <Card title="Log protocol deviation">
          <form className="grid gap-3 md:grid-cols-4" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
            <Field label="Category"><select className="input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{["Visit window", "Eligibility", "Consent process", "Dosing error", "Concomitant medication", "Lab sample handling", "Data recording", "Other"].map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Severity"><select className="input" value={f.severity} onChange={(e) => setF({ ...f, severity: e.target.value })}>{["MINOR", "MAJOR", "CRITICAL"].map((c) => <option key={c} value={c}>{human(c)}</option>)}</select></Field>
            <div className="md:col-span-2"><Field label="Description"><input className="input" required minLength={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field></div>
            <div className="md:col-span-4"><ErrorBox error={add.error} /></div>
            <div><Button size="sm" disabled={add.isPending}>Log deviation</Button></div>
          </form>
        </Card>
      </Can>
      <Card title="Deviation log">
        <Table head={["Opened", "Subject", "Category", "Severity", "Description", "CAPA", "Status", ""]} empty={!data.length}>
          {data.map((d) => (
            <tr key={d.id}>
              <td className="td whitespace-nowrap">{fmtDate(d.opened_at)}</td>
              <td className="td mono">{d.subject_code ?? "-"}</td>
              <td className="td">{d.category}</td>
              <td className="td"><Badge tone={d.severity === "MINOR" ? "gray" : d.severity === "MAJOR" ? "amber" : "red"}>{human(d.severity)}</Badge></td>
              <td className="td max-w-xs">{d.description}</td>
              <td className="td max-w-xs">{d.capa ?? "-"}</td>
              <td className="td">{d.closed_at ? <Badge tone="green">Signed off by {d.signoff_name}</Badge> : <Badge tone="amber">Open</Badge>}</td>
              <td className="td">{!d.closed_at && <Can perm="deviation.signoff"><Button size="sm" variant="secondary" onClick={() => { setSign(d); setCapa(d.capa ?? ""); }}>Sign off</Button></Can>}</td>
            </tr>
          ))}
        </Table>
      </Card>
      <Modal open={!!sign} onClose={() => setSign(null)} title="Monitor sign-off">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); so.mutate(); }}>
          <p className="text-xs text-[var(--text-muted)]">{sign?.description}</p>
          <Field label="Corrective and preventive action (CAPA)"><textarea className="input" rows={3} required minLength={3} value={capa} onChange={(e) => setCapa(e.target.value)} /></Field>
          <ErrorBox error={so.error} />
          <Button disabled={so.isPending}>Sign off deviation</Button>
        </form>
      </Modal>
    </div>
  );
}

function Queries({ s }: { s: any }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { data = [] } = useQuery<any[]>({ queryKey: ["queries", s.id], queryFn: () => get(`/studies/${s.id}/queries`) });
  const [txt, setTxt] = useState("");
  const [ans, setAns] = useState<Record<number, string>>({});
  const inv = () => qc.invalidateQueries({ queryKey: ["queries", s.id] });
  const raise = useMutation({ mutationFn: () => post(`/studies/${s.id}/queries`, { text: txt }), onSuccess: () => { toast("Query raised"); setTxt(""); inv(); } });
  const act = useMutation({ mutationFn: ({ id, kind }: { id: number; kind: "answer" | "close" }) => post(`/queries/${id}/${kind}`, kind === "answer" ? { answer: ans[id] } : undefined), onSuccess: () => inv() });
  return (
    <Card title="Data queries">
      <Can perm="query.create">
        <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); raise.mutate(); }}>
          <input className="input" placeholder="Raise a study-level query (open a participant's CRF to query a specific entry)" required minLength={3} value={txt} onChange={(e) => setTxt(e.target.value)} />
          <Button disabled={raise.isPending}>Raise</Button>
        </form>
      </Can>
      <ErrorBox error={raise.error || act.error} />
      <Table head={["Opened", "Age", "Subject", "Query", "Answer", "Status", ""]} empty={!data.length}>
        {data.map((q) => (
          <tr key={q.id}>
            <td className="td whitespace-nowrap">{fmtDate(q.opened_at)}</td>
            <td className="td">{q.status === "CLOSED" ? "-" : <Badge tone={q.age_days > 14 ? "red" : "gray"}>{q.age_days}d</Badge>}</td>
            <td className="td mono">{q.subject_code ?? "-"}</td>
            <td className="td max-w-xs">{q.text}</td>
            <td className="td max-w-xs">
              {q.answer ?? (q.status === "OPEN" ? (
                <Can perm="query.answer">
                  <div className="flex gap-1"><input className="input py-1" aria-label="Answer" value={ans[q.id] ?? ""} onChange={(e) => setAns({ ...ans, [q.id]: e.target.value })} /><Button size="sm" disabled={!ans[q.id]} onClick={() => act.mutate({ id: q.id, kind: "answer" })}>Send</Button></div>
                </Can>
              ) : "-")}
            </td>
            <td className="td"><Badge tone={q.status === "OPEN" ? "amber" : q.status === "ANSWERED" ? "blue" : "green"}>{human(q.status)}</Badge></td>
            <td className="td">{q.status !== "CLOSED" && <Can perm="query.close"><Button size="sm" variant="secondary" onClick={() => act.mutate({ id: q.id, kind: "close" })}>Close</Button></Can>}</td>
          </tr>
        ))}
      </Table>
    </Card>
  );
}

function Safety({ s }: { s: any }) {
  const { data = [] } = useQuery<any[]>({ queryKey: ["ae", "study", s.id], queryFn: () => get(`/ae?study_id=${s.id}`) });
  return (
    <Card title="Adverse events" actions={<Link to="/safety" className="text-xs font-medium text-brand-700 hover:underline">Open safety inbox</Link>}>
      <Table head={["Awareness", "Subject", "Event", "Severity", "Serious", "Causality", "Clocks"]} empty={!data.length}>
        {data.map((a) => (
          <tr key={a.id}>
            <td className="td whitespace-nowrap">{fmtDate(a.awareness_at)}</td>
            <td className="td mono">{a.subject_code}</td>
            <td className="td"><Link className="text-brand-700 hover:underline" to={`/safety?ae=${a.id}`}>{a.description}</Link></td>
            <td className="td">{human(a.severity)}</td>
            <td className="td">{a.is_serious ? <Badge tone="red">SAE</Badge> : "No"}</td>
            <td className="td">{human(a.causality)}</td>
            <td className="td"><div className="flex flex-wrap gap-1">{a.clocks.filter((c: any) => c.status !== "COMPLETED").slice(0, 2).map((c: any) => <SaeClockChip key={c.id} clock={c} />)}</div></td>
          </tr>
        ))}
      </Table>
    </Card>
  );
}

function Documents({ s }: { s: any }) {
  const qc = useQueryClient();
  const toast = useToast();
  const inv = () => qc.invalidateQueries({ queryKey: ["study", String(s.id)] });
  const { can } = useAuth();
  const { data: mv = [] } = useQuery<any[]>({ queryKey: ["monitoring", s.id], queryFn: () => get(`/studies/${s.id}/monitoring-visits`), enabled: can("monitoring.read") });
  const [doc, setDoc] = useState<{ version: string; language: string; content: string; effective_from: string;
    comprehension_questions: { question: string; options: string[]; correct_index: number }[] }>(
    { version: "", language: "en", content: "", effective_from: "", comprehension_questions: [] });
  const addQuestion = () => setDoc({ ...doc, comprehension_questions: [...doc.comprehension_questions,
    { question: "", options: ["", ""], correct_index: 0 }] });
  const updateQuestion = (i: number, patch: Partial<{ question: string; options: string[]; correct_index: number }>) =>
    setDoc({ ...doc, comprehension_questions: doc.comprehension_questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) });
  const removeQuestion = (i: number) => setDoc({ ...doc, comprehension_questions: doc.comprehension_questions.filter((_, j) => j !== i) });
  const [am, setAm] = useState({ version: "", summary: "", approved_on: "", requires_reconsent: false, consent_document_id: 0 });
  const [visit, setVisit] = useState({ site_id: s.sites[0]?.id ?? 0, visit_date: "", findings: "" });
  const docM = useMutation({
    mutationFn: () => post(`/studies/${s.id}/consent-documents`, doc),
    onSuccess: () => {
      toast("Consent document versioned");
      setDoc({ version: "", language: "en", content: "", effective_from: "", comprehension_questions: [] });
      inv();
    },
  });
  const amM = useMutation({ mutationFn: () => post(`/studies/${s.id}/amendments`, { ...am, consent_document_id: am.consent_document_id || null }), onSuccess: () => { toast("Amendment recorded"); inv(); } });
  const mvM = useMutation({ mutationFn: () => post(`/studies/${s.id}/monitoring-visits`, { ...visit, site_id: +visit.site_id }), onSuccess: () => { toast("Monitoring visit logged"); qc.invalidateQueries({ queryKey: ["monitoring", s.id] }); } });
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="Consent documents (versioned)">
        <Table head={["Version", "Language", "Effective", "Content SHA-256", "Comprehension check"]} empty={!s.consent_documents.length}>
          {s.consent_documents.map((d: any) => (
            <tr key={d.id}>
              <td className="td">v{d.version}</td><td className="td">{d.language}</td><td className="td">{fmtDate(d.effective_from)}</td>
              <td className="td mono" title={d.content_hash}>{d.content_hash.slice(0, 16)}...</td>
              <td className="td">{d.comprehension_questions?.length ? <Badge tone="teal">{d.comprehension_questions.length} question{d.comprehension_questions.length > 1 ? "s" : ""}</Badge> : "-"}</td>
            </tr>
          ))}
        </Table>
        <Can perm="ethics.create">
          <form className="mt-4 grid gap-3 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); docM.mutate(); }}>
            <Field label="Version"><input className="input" required value={doc.version} onChange={(e) => setDoc({ ...doc, version: e.target.value })} /></Field>
            <Field label="Language"><select className="input" value={doc.language} onChange={(e) => setDoc({ ...doc, language: e.target.value })}><option value="en">English</option><option value="hi">Hindi</option></select></Field>
            <Field label="Effective from"><input className="input" type="date" required value={doc.effective_from} onChange={(e) => setDoc({ ...doc, effective_from: e.target.value })} /></Field>
            <div className="sm:col-span-3"><Field label="Full consent text (only its hash is stored)"><textarea className="input" rows={3} required minLength={10} value={doc.content} onChange={(e) => setDoc({ ...doc, content: e.target.value })} /></Field></div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-3.5 sm:col-span-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-[var(--text-muted)]">Comprehension check (optional) - a short quiz administered alongside consent, per ICH-GCP informed-consent practice</p>
                <Button type="button" size="sm" variant="secondary" onClick={addQuestion}>Add question</Button>
              </div>
              {doc.comprehension_questions.map((q, i) => (
                <div key={i} className="mb-3 space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-2.5">
                  <div className="flex gap-2">
                    <input className="input" placeholder="Question" required value={q.question} onChange={(e) => updateQuestion(i, { question: e.target.value })} />
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeQuestion(i)}>Remove</Button>
                  </div>
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input type="radio" name={`correct-${i}`} checked={q.correct_index === oi} onChange={() => updateQuestion(i, { correct_index: oi })} title="Correct answer" />
                      <input className="input" placeholder={`Option ${oi + 1}`} required value={opt} onChange={(e) => updateQuestion(i, { options: q.options.map((o, j) => (j === oi ? e.target.value : o)) })} />
                      {q.options.length > 2 && <Button type="button" size="sm" variant="ghost" onClick={() => updateQuestion(i, { options: q.options.filter((_, j) => j !== oi), correct_index: q.correct_index >= oi ? Math.max(0, q.correct_index - 1) : q.correct_index })}>x</Button>}
                    </div>
                  ))}
                  {q.options.length < 6 && <Button type="button" size="sm" variant="ghost" onClick={() => updateQuestion(i, { options: [...q.options, ""] })}>+ option</Button>}
                </div>
              ))}
            </div>
            <div className="sm:col-span-3"><ErrorBox error={docM.error} /></div>
            <div><Button size="sm" disabled={docM.isPending}>Add version</Button></div>
          </form>
        </Can>
      </Card>
      <Card title="Protocol amendments">
        {s.amendments.length === 0 ? <Empty>No amendments</Empty> : (
          <ul className="space-y-2">
            {s.amendments.map((a: any) => (
              <li key={a.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-3.5 text-xs">
                <div className="flex items-center justify-between"><b className="text-[var(--text)] font-mono">{a.version}</b><span className="text-[11px] font-mono text-[var(--text-muted)]">{fmtDate(a.approved_on)}</span></div>
                <p className="mt-1 text-[var(--text-muted)]">{a.summary}</p>
                {a.requires_reconsent && <Badge tone="amber" className="mt-2">Re-consent required</Badge>}
              </li>
            ))}
          </ul>
        )}
        <Can perm="ethics.create">
          <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); amM.mutate(); }}>
            <Field label="Amendment"><input className="input" required value={am.version} onChange={(e) => setAm({ ...am, version: e.target.value })} /></Field>
            <Field label="Approved on"><input className="input" type="date" required value={am.approved_on} onChange={(e) => setAm({ ...am, approved_on: e.target.value })} /></Field>
            <div className="sm:col-span-2"><Field label="Summary"><input className="input" required value={am.summary} onChange={(e) => setAm({ ...am, summary: e.target.value })} /></Field></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={am.requires_reconsent} onChange={(e) => setAm({ ...am, requires_reconsent: e.target.checked })} /> Requires re-consent</label>
            {am.requires_reconsent && (
              <select className="input" value={am.consent_document_id} onChange={(e) => setAm({ ...am, consent_document_id: +e.target.value })} aria-label="New consent document">
                <option value={0}>Select new consent document</option>
                {s.consent_documents.map((d: any) => <option key={d.id} value={d.id}>v{d.version} ({d.language})</option>)}
              </select>
            )}
            <div className="sm:col-span-2"><ErrorBox error={amM.error} /></div>
            <div><Button size="sm" disabled={amM.isPending}>Record amendment</Button></div>
          </form>
        </Can>
      </Card>
      {can("monitoring.read") && (
        <Card title="Monitoring visits" className="lg:col-span-2">
          <Table head={["Date", "Site", "Monitor", "Findings"]} empty={!mv.length}>
            {mv.map((v) => <tr key={v.id}><td className="td">{fmtDate(v.visit_date)}</td><td className="td">{v.site_code}</td><td className="td">{v.monitor}</td><td className="td">{v.findings}</td></tr>)}
          </Table>
          <Can perm="monitoring.write">
            <form className="mt-4 grid gap-3 sm:grid-cols-4" onSubmit={(e) => { e.preventDefault(); mvM.mutate(); }}>
              <Field label="Site"><select className="input" value={visit.site_id} onChange={(e) => setVisit({ ...visit, site_id: +e.target.value })}>{s.sites.map((x: any) => <option key={x.id} value={x.id}>{x.code}</option>)}</select></Field>
              <Field label="Visit date"><input className="input" type="date" required value={visit.visit_date} onChange={(e) => setVisit({ ...visit, visit_date: e.target.value })} /></Field>
              <div className="sm:col-span-2"><Field label="Findings"><input className="input" value={visit.findings} onChange={(e) => setVisit({ ...visit, findings: e.target.value })} /></Field></div>
              <div className="sm:col-span-4"><ErrorBox error={mvM.error} /></div>
              <div><Button size="sm" disabled={mvM.isPending}>Log visit</Button></div>
            </form>
          </Can>
        </Card>
      )}
    </div>
  );
}

function Exports({ s }: { s: any }) {
  const { me, can } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState("");
  const full = can("export.study") && !(me?.role === "PI" && s.pi_user_id !== me.id);
  const safety = full || can("export.safety");
  async function go(path: string, name: string) {
    setBusy(path);
    try { await download(path, name); toast("Export downloaded (logged in audit trail)"); }
    catch (e) { toast((e as Error).message, "err"); }
    finally { setBusy(""); }
  }
  if (!safety) return <Empty>Your role cannot export data for this study.</Empty>;
  const items = [
    { path: `/export/fhir/study/${s.id}`, name: "fhir.json", title: full ? "FHIR R4 Bundle" : "FHIR R4 Bundle (safety only)", desc: full ? "ResearchStudy, ResearchSubject, Patient (pseudonymised) and AdverseEvent resources, validated before download." : "ResearchStudy and AdverseEvent resources.", icon: FileJson, show: true },
    { path: `/export/sdtm/study/${s.id}/DM`, name: "dm.csv", title: "SDTM DM (Demographics)", desc: "STUDYID, USUBJID, SITEID, AGE, SEX, ARM, RFSTDTC using CDISC controlled terminology.", icon: Download, show: full },
    { path: `/export/sdtm/study/${s.id}/AE`, name: "ae.csv", title: "SDTM AE (Adverse Events)", desc: "AETERM, AEDECOD, AESEV, AESER, AEREL, AEOUT per the mapping in docs/05.", icon: Download, show: true },
    { path: `/export/adam/study/${s.id}/ADSL`, name: "adsl.csv", title: "ADaM ADSL (Subject-Level Analysis)", desc: "CDISC Analysis Data Model with Ayush extensions: PRAKRITI, AGNITYPE, SAFFL, ITTFL flags.", icon: Download, show: full },
    { path: `/export/adam/study/${s.id}/ADAE`, name: "adae.csv", title: "ADaM ADAE (Adverse Events Analysis)", desc: "Treatment-emergent flags (TRTEMFL), MedDRA PT/SOC coding, and toxicity grading (AETOXGR).", icon: Download, show: true },
    { path: `/export/cdisc/define-xml/study/${s.id}`, name: "define.xml", title: "CDISC Define-XML 2.0", desc: "Machine-readable clinical dataset definition conforming to CDISC Define-XML Schema 2.0.", icon: FileJson, show: full },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.filter((i) => i.show).map((i) => (
        <Card key={i.path} title={i.title}>
          <p className="mb-4 text-xs text-[var(--text-muted)] leading-relaxed">{i.desc}</p>
          <Button variant="secondary" disabled={busy === i.path} onClick={() => go(i.path, `${s.protocol_no}-${i.name}`)}><i.icon size={16} /> {busy === i.path ? "Preparing..." : "Download"}</Button>
        </Card>
      ))}
    </div>
  );
}

export default function StudyDetail() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const { can } = useAuth();
  const tabs = ([
    ["overview", "Overview", true],
    ["participants", "Participants", can("participant.read")],
    ["deviations", "Deviations", can("deviation.read")],
    ["queries", "Queries", can("query.read")],
    ["safety", "Safety", can("ae.read")],
    ["documents", "Consent & amendments", true],
    ["exports", "Exports", can("export.safety")],
  ] as [Tab, string, boolean][]).filter((t) => t[2]).map(([k, l]) => [k, l] as [Tab, string]);
  const requested = params.get("tab") as Tab;
  const tab: Tab = tabs.some(([k]) => k === requested) ? requested : "overview";
  const { data: s, isLoading, error } = useQuery<any>({ queryKey: ["study", id], queryFn: () => get(`/studies/${id}`) });
  if (isLoading) return <Loading />;
  if (error || !s) return <ErrorBox error={error} />;
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`PROTOCOL / ${s.protocol_no}`}
        title={s.protocol_no}
        description={s.title}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={STATE_TONE[s.state]} className="px-2.5 py-1 text-xs font-semibold">
              {human(s.state)}
            </Badge>
            {s.ctri && (
              <Badge tone="purple" className="px-2.5 py-1 text-xs font-mono font-semibold">
                CTRI: {s.ctri.ctri_number}
              </Badge>
            )}
          </div>
        }
      />
      <Tabs<Tab>
        value={tab}
        onChange={(t) => setParams({ tab: t })}
        tabs={tabs}
      />
      {tab === "overview" && <Overview s={s} />}
      {tab === "participants" && <Participants s={s} />}
      {tab === "deviations" && <Deviations s={s} />}
      {tab === "queries" && <Queries s={s} />}
      {tab === "safety" && <Safety s={s} />}
      {tab === "documents" && <Documents s={s} />}
      {tab === "exports" && <Exports s={s} />}
    </div>
  );
}
