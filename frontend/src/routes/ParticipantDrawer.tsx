import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, X } from "lucide-react";
import { useState } from "react";
import { get, post } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Can } from "../auth/RoleGuard";
import { Badge, Button, ErrorBox, Field, fmtDate, fmtDateTime, human, Loading, Modal, useToast } from "../components/ui";

const VISIT_TONE: Record<string, "gray" | "green" | "red" | "amber"> = { PLANNED: "gray", DONE: "green", MISSED: "red", OUT_OF_WINDOW: "amber" };

function CrfForm({ visit, template, entries, onDone }: { visit: any; template: any; entries: any[]; onDone: () => void }) {
  const schema = template.json_schema;
  const last = entries.at(-1);
  const [data, setData] = useState<Record<string, any>>(last?.data ?? {});
  const [reason, setReason] = useState("");
  const toast = useToast();
  const m = useMutation({
    mutationFn: () => {
      const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== "" && v != null));
      return post(`/visits/${visit.id}/crf`, { template_id: template.id, data: clean, reason_for_change: last ? reason : undefined });
    },
    onSuccess: () => { toast(last ? "CRF updated; previous version retained in audit trail" : "CRF saved"); onDone(); },
  });
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries<any>(schema.properties).map(([k, spec]) => {
          const req = schema.required?.includes(k);
          const label = `${spec.title ?? k}${req ? " *" : ""}`;
          if (spec.enum)
            return (
              <Field key={k} label={label}>
                <select className="input" required={req} value={data[k] ?? ""} onChange={(e) => setData({ ...data, [k]: e.target.value })}>
                  <option value="">-</option>
                  {spec.enum.map((o: string) => <option key={o}>{o}</option>)}
                </select>
              </Field>
            );
          if (spec.type === "number")
            return (
              <Field key={k} label={label}>
                <input className="input" type="number" step="any" min={spec.minimum} max={spec.maximum} required={req} value={data[k] ?? ""}
                  onChange={(e) => setData({ ...data, [k]: e.target.value === "" ? "" : Number(e.target.value) })} />
              </Field>
            );
          return (
            <Field key={k} label={label}>
              <input className="input" required={req} value={data[k] ?? ""} onChange={(e) => setData({ ...data, [k]: e.target.value })} />
            </Field>
          );
        })}
      </div>
      {last && <Field label="Reason for change (required, audited)"><input className="input" required minLength={3} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>}
      <ErrorBox error={m.error} />
      <Button disabled={m.isPending}>{last ? "Save new version" : "Save CRF"}</Button>
    </form>
  );
}

function VisitRow({ v, study, participant }: { v: any; study: any; participant: any }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = useAuth();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const { data: templates = [] } = useQuery<any[]>({ queryKey: ["crf-templates", study.id], queryFn: () => get(`/studies/${study.id}/crf-templates`), enabled: open });
  const { data: entries = [], refetch } = useQuery<any[]>({ queryKey: ["crf", v.id], queryFn: () => get(`/visits/${v.id}/crf`), enabled: open });
  const raise = useMutation({
    mutationFn: () => post(`/studies/${study.id}/queries`, { text: q, crf_entry_id: entries.at(-1)?.id }),
    onSuccess: () => { toast("Query raised on CRF entry"); setQ(""); qc.invalidateQueries({ queryKey: ["queries", study.id] }); },
  });
  return (
    <li className="rounded-lg border border-slate-200">
      <button className="flex w-full items-center justify-between px-3 py-2 text-left text-sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="font-medium">{v.visit_name}</span>
        <span className="flex items-center gap-2">
          <span className="text-xs text-slate-500">planned {fmtDate(v.planned_date)} +/- {v.window_days}d{v.actual_date && `, done ${fmtDate(v.actual_date)}`}</span>
          <Badge tone={VISIT_TONE[v.status]}>{human(v.status)}</Badge>
          {v.crf_count > 0 && <Badge tone="teal">CRF</Badge>}
        </span>
      </button>
      {open && (
        <div className="space-y-4 border-t px-3 py-3">
          {entries.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase text-slate-500">Entries ({entries.length} version{entries.length > 1 ? "s" : ""})</p>
              <ul className="mt-1 space-y-1">
                {entries.map((e) => (
                  <li key={e.id} className="rounded bg-slate-50 p-2 text-xs">
                    <div className="text-slate-500">{fmtDateTime(e.entered_at)} by {e.entered_by_name ?? "system"}{e.reason_for_change && ` - reason: ${e.reason_for_change}`}</div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">{Object.entries(e.data).map(([k, val]) => <span key={k}><b>{k}</b>: {String(val)}</span>)}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {can("crf.write") && participant.status !== "WITHDRAWN" && templates[0] && <CrfForm visit={v} template={templates[0]} entries={entries} onDone={() => { refetch(); qc.invalidateQueries({ queryKey: ["visits", participant.id] }); }} />}
          {participant.status === "WITHDRAWN" && <p className="text-sm text-red-700">Consent withdrawn - no new data may be entered.</p>}
          <Can perm="query.create">
            {entries.length > 0 && (
              <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); raise.mutate(); }}>
                <input className="input" placeholder="Raise a query on this CRF entry" required minLength={3} value={q} onChange={(e) => setQ(e.target.value)} />
                <Button size="sm" disabled={raise.isPending}>Raise query</Button>
              </form>
            )}
          </Can>
        </div>
      )}
    </li>
  );
}

export default function ParticipantDrawer({ pid, study, onClose }: { pid: number; study: any; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const { data: p, isLoading } = useQuery<any>({ queryKey: ["participant", pid], queryFn: () => get(`/participants/${pid}`) });
  const { data: visits = [] } = useQuery<any[]>({ queryKey: ["visits", pid], queryFn: () => get(`/participants/${pid}/visits`) });
  const [pii, setPii] = useState<any>(null);
  const [purpose, setPurpose] = useState("");
  const [askPii, setAskPii] = useState(false);
  const [withdraw, setWithdraw] = useState(false);
  const [reason, setReason] = useState("");
  const [reAnswers, setReAnswers] = useState<number[]>([]);
  const inv = () => { qc.invalidateQueries({ queryKey: ["participant", pid] }); qc.invalidateQueries({ queryKey: ["participants", study.id] }); qc.invalidateQueries({ queryKey: ["reconsent", study.id] }); };
  const piiM = useMutation({ mutationFn: () => get(`/participants/${pid}/pii?purpose=${encodeURIComponent(purpose)}`), onSuccess: (d) => { setPii(d); setAskPii(false); } });
  const wM = useMutation({ mutationFn: () => post(`/participants/${pid}/withdraw`, { reason }), onSuccess: () => { toast("Withdrawal recorded"); setWithdraw(false); inv(); } });
  const reconsentDocId = p ? study.amendments.find((a: any) => p.pending_reconsent.includes(a.version))?.consent_document_id : null;
  const reconsentDoc = study.consent_documents.find((d: any) => d.id === reconsentDocId);
  const reQuestions: { question: string; options: string[] }[] = reconsentDoc?.comprehension_questions ?? [];
  const reM = useMutation({
    mutationFn: () => post(`/participants/${pid}/consent`, {
      consent_document_id: reconsentDocId, witness_name: "Site nurse",
      comprehension_answers: reQuestions.length ? reAnswers : undefined,
    }),
    onSuccess: () => { toast("Re-consent recorded"); setReAnswers([]); inv(); },
  });

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30" onMouseDown={onClose}>
      <aside className="h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()} aria-label="Participant details">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-3">
          <div>
            <h2 className="mono text-base font-semibold">{p?.subject_code}</h2>
            <p className="text-xs text-slate-500">{study.protocol_no}</p>
          </div>
          <button aria-label="Close" onClick={onClose} className="rounded p-1 hover:bg-slate-100"><X size={18} /></button>
        </div>
        {isLoading || !p ? <Loading /> : (
          <div className="space-y-5 p-5">
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div><div className="label">Status</div><Badge tone={p.status === "WITHDRAWN" ? "red" : "green"}>{human(p.status)}</Badge></div>
              <div><div className="label">Arm</div>{p.arm ?? "-"}</div>
              <div><div className="label">Sex / age</div>{p.sex} / {p.age_years}</div>
              <div><div className="label">Enrolled</div>{fmtDate(p.enrolled_on)}</div>
            </div>

            {p.pending_reconsent.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <div className="flex items-center justify-between gap-3">
                  Re-consent required for {p.pending_reconsent.join(", ")}.
                  {!reQuestions.length && (
                    <Can perm="consent.write"><Button size="sm" onClick={() => reM.mutate()} disabled={reM.isPending}>Record re-consent</Button></Can>
                  )}
                </div>
                {reQuestions.length > 0 && (
                  <Can perm="consent.write">
                    <div className="mt-2 space-y-2">
                      {reQuestions.map((q, i) => (
                        <div key={i}>
                          <p className="text-xs font-medium text-amber-900">{i + 1}. {q.question}</p>
                          <div className="mt-1 flex flex-wrap gap-3">
                            {q.options.map((opt, oi) => (
                              <label key={oi} className="flex items-center gap-1.5 text-xs">
                                <input type="radio" name={`re-ans-${i}`} checked={reAnswers[i] === oi}
                                  onChange={() => setReAnswers((a) => { const next = [...a]; next[i] = oi; return next; })} />
                                {opt}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                      <Button size="sm" onClick={() => reM.mutate()} disabled={reM.isPending || reAnswers.length !== reQuestions.length}>Record re-consent</Button>
                    </div>
                  </Can>
                )}
              </div>
            )}
            <ErrorBox error={reM.error} />

            <section>
              <h3 className="mb-2 text-sm font-semibold">Consent history</h3>
              <ul className="space-y-1 text-sm">
                {p.consents.map((c: any) => (
                  <li key={c.id} className="flex flex-wrap justify-between gap-2 rounded bg-slate-50 px-3 py-1.5">
                    <span>v{c.version} ({c.language}) - {fmtDateTime(c.consented_at)}{c.witness_name && `, witness ${c.witness_name}`}</span>
                    {c.withdrawn_at ? <Badge tone="red">withdrawn {fmtDate(c.withdrawn_at)}</Badge> : <Badge tone="green">active</Badge>}
                  </li>
                ))}
              </ul>
            </section>

            <Can perm="participant.pii">
              <section className="rounded-md border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Identity (restricted)</h3>
                  {!pii && <Button size="sm" variant="secondary" onClick={() => setAskPii(true)}><Eye size={14} /> Reveal</Button>}
                </div>
                {pii ? <p className="mt-2 text-sm">{pii.name} - {pii.contact ?? "no contact"}</p> : <p className="mt-1 text-xs text-slate-500">Encrypted at rest. Access requires a stated purpose and is recorded in the audit trail.</p>}
              </section>
            </Can>

            <section>
              <h3 className="mb-2 text-sm font-semibold">Visits and CRFs</h3>
              <ul className="space-y-2">{visits.map((v) => <VisitRow key={v.id} v={v} study={study} participant={p} />)}</ul>
            </section>

            {p.status !== "WITHDRAWN" && (
              <Can perm="consent.write">
                <Button variant="danger" size="sm" onClick={() => setWithdraw(true)}>Record consent withdrawal</Button>
              </Can>
            )}
          </div>
        )}
        <Modal open={askPii} onClose={() => setAskPii(false)} title="Purpose of access">
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); piiM.mutate(); }}>
            <Field label="Why do you need the participant's identity?" hint="Recorded in the audit trail (DPDP purpose limitation)"><input className="input" required minLength={3} value={purpose} onChange={(e) => setPurpose(e.target.value)} /></Field>
            <ErrorBox error={piiM.error} />
            <Button disabled={piiM.isPending}>Reveal identity</Button>
          </form>
        </Modal>
        <Modal open={withdraw} onClose={() => setWithdraw(false)} title="Consent withdrawal">
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); wM.mutate(); }}>
            <p className="text-sm text-slate-600">After withdrawal no new data can be entered for this participant. Existing data is retained as permitted by the consent.</p>
            <Field label="Reason"><input className="input" required minLength={3} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
            <ErrorBox error={wM.error} />
            <Button variant="danger" disabled={wM.isPending}>Confirm withdrawal</Button>
          </form>
        </Modal>
      </aside>
    </div>
  );
}
