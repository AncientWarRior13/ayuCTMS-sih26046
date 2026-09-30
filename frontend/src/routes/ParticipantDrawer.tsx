import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, X } from "lucide-react";
import { useState } from "react";
import { get, post } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Can } from "../auth/RoleGuard";
import {
  Badge,
  Button,
  ErrorBox,
  Field,
  fmtDate,
  fmtDateTime,
  human,
  Loading,
  Modal,
  useToast,
} from "../components/ui";
import { AyurvedicPhenotypeSection } from "../components/clinical/AyurvedicPhenotypeCard";
import { ElectronicSignatureModal, EntitySignaturesList } from "../components/signatures/ElectronicSignatureModal";

const VISIT_TONE: Record<string, "gray" | "green" | "red" | "amber"> = {
  PLANNED: "gray",
  DONE: "green",
  MISSED: "red",
  OUT_OF_WINDOW: "amber",
};

function CrfForm({
  visit,
  template,
  entries,
  onDone,
}: {
  visit: any;
  template: any;
  entries: any[];
  onDone: () => void;
}) {
  const schema = template.json_schema;
  const last = entries.at(-1);
  const [data, setData] = useState<Record<string, any>>(last?.data ?? {});
  const [reason, setReason] = useState("");
  const toast = useToast();
  const m = useMutation({
    mutationFn: () => {
      const clean = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== "" && v != null),
      );
      return post(`/visits/${visit.id}/crf`, {
        template_id: template.id,
        data: clean,
        reason_for_change: last ? reason : undefined,
      });
    },
    onSuccess: () => {
      toast(
        last
          ? "CRF updated; previous version retained in audit trail"
          : "CRF saved",
      );
      onDone();
    },
  });

  return (
    <form
      className="space-y-4 rounded-xl border border-[#22302A] bg-[#16201C]/80 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        m.mutate();
      }}
    >
      <div className="font-mono text-xs uppercase tracking-wider text-[#C8A45C]">
        Electronic Case Report Form (eCRF)
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries<any>(schema.properties).map(([k, spec]) => {
          const req = schema.required?.includes(k);
          const label = `${spec.title ?? k}${req ? " *" : ""}`;
          if (spec.enum)
            return (
              <Field key={k} label={label}>
                <select
                  className="input"
                  required={req}
                  value={data[k] ?? ""}
                  onChange={(e) => setData({ ...data, [k]: e.target.value })}
                >
                  <option value="">-</option>
                  {spec.enum.map((o: string) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </Field>
            );
          if (spec.type === "number")
            return (
              <Field key={k} label={label}>
                <input
                  className="input font-mono"
                  type="number"
                  step="any"
                  min={spec.minimum}
                  max={spec.maximum}
                  required={req}
                  value={data[k] ?? ""}
                  onChange={(e) =>
                    setData({
                      ...data,
                      [k]: e.target.value === "" ? "" : Number(e.target.value),
                    })
                  }
                />
              </Field>
            );
          return (
            <Field key={k} label={label}>
              <input
                className="input"
                required={req}
                value={data[k] ?? ""}
                onChange={(e) => setData({ ...data, [k]: e.target.value })}
              />
            </Field>
          );
        })}
      </div>
      {last && (
        <Field label="Reason for change (required, audited)">
          <input
            className="input"
            required
            minLength={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Field>
      )}
      <ErrorBox error={m.error} />
      <Button disabled={m.isPending}>
        {last ? "Save new version" : "Save CRF"}
      </Button>
    </form>
  );
}

function VisitRow({
  v,
  study,
  participant,
}: {
  v: any;
  study: any;
  participant: any;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const { me, can } = useAuth();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [signEntry, setSignEntry] = useState<any>(null);
  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["crf-templates", study.id],
    queryFn: () => get(`/studies/${study.id}/crf-templates`),
    enabled: open,
  });
  const { data: entries = [], refetch } = useQuery<any[]>({
    queryKey: ["crf", v.id],
    queryFn: () => get(`/visits/${v.id}/crf`),
    enabled: open,
  });
  const raise = useMutation({
    mutationFn: () =>
      post(`/studies/${study.id}/queries`, {
        text: q,
        crf_entry_id: entries.at(-1)?.id,
      }),
    onSuccess: () => {
      toast("Query raised on CRF entry");
      setQ("");
      qc.invalidateQueries({ queryKey: ["queries", study.id] });
    },
  });

  return (
    <li className="rounded-xl border border-[#22302A] bg-[#16201C]/50 overflow-hidden">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-[#16201C] transition-colors"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="font-medium text-[#E8EFE9]">{v.visit_name}</span>
        <span className="flex items-center gap-2">
          <span className="text-xs text-[#8FA398] font-mono">
            planned {fmtDate(v.planned_date)} +/- {v.window_days}d
            {v.actual_date && `, done ${fmtDate(v.actual_date)}`}
          </span>
          <Badge tone={VISIT_TONE[v.status]}>{human(v.status)}</Badge>
          {v.crf_count > 0 && <Badge tone="teal">CRF</Badge>}
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-[#22302A] px-4 py-4 bg-[#101815]">
          {entries.length > 0 && (
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-[#8FA398]">
                Entries ({entries.length} version{entries.length > 1 ? "s" : ""})
              </p>
              <ul className="mt-2 space-y-1.5">
                {entries.map((e) => (
                  <li
                    key={e.id}
                    className="rounded-lg bg-[#16201C] p-3 text-xs border border-[#22302A]"
                  >
                    <div className="font-mono text-[11px] text-[#8FA398]">
                      {fmtDateTime(e.entered_at)} by {e.entered_by_name ?? "system"}
                      {e.reason_for_change && ` - reason: ${e.reason_for_change}`}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[#E8EFE9]">
                      {Object.entries(e.data).map(([k, val]) => (
                        <span key={k} className="font-mono">
                          <strong className="text-[#8FA398]">{k}:</strong> {String(val)}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-[#22302A]">
                      <EntitySignaturesList
                        entityType="CRF_ENTRY"
                        entityId={e.id}
                        canSign={(can("signature.sign") || me?.role === "PI" || me?.role === "COORDINATOR" || me?.role === "ADMIN") && participant.status !== "WITHDRAWN"}
                        onOpenSign={() => setSignEntry(e)}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {can("crf.write") &&
            participant.status !== "WITHDRAWN" &&
            templates[0] && (
              <CrfForm
                visit={v}
                template={templates[0]}
                entries={entries}
                onDone={() => {
                  refetch();
                  qc.invalidateQueries({
                    queryKey: ["visits", participant.id],
                  });
                }}
              />
            )}

          {participant.status === "WITHDRAWN" && (
            <div className="rounded-xl border border-[#E5484D]/40 bg-[#E5484D]/15 p-3 text-xs text-[#E5484D]">
              Consent withdrawn — no new clinical data may be entered.
            </div>
          )}

          <Can perm="query.create">
            {entries.length > 0 && (
              <form
                className="flex gap-2 pt-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  raise.mutate();
                }}
              >
                <input
                  className="input flex-1"
                  placeholder="Raise a query on this CRF entry..."
                  required
                  minLength={3}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <Button size="sm" disabled={raise.isPending}>
                  Raise query
                </Button>
              </form>
            )}
          </Can>

          {signEntry && (
            <ElectronicSignatureModal
              open={!!signEntry}
              onClose={() => setSignEntry(null)}
              studyId={study.id}
              entityType="CRF_ENTRY"
              entityId={signEntry.id}
              title={`Electronic Signature — ${v.visit_name} CRF Entry`}
              onSigned={() => {
                qc.invalidateQueries({ queryKey: ["signatures", "CRF_ENTRY", signEntry.id] });
              }}
            />
          )}
        </div>
      )}
    </li>
  );
}

export default function ParticipantDrawer({
  pid,
  study,
  onClose,
}: {
  pid: number;
  study: any;
  onClose: () => void;
}) {
  const { can } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const { data: p, isLoading } = useQuery<any>({
    queryKey: ["participant", pid],
    queryFn: () => get(`/participants/${pid}`),
  });
  const { data: visits = [] } = useQuery<any[]>({
    queryKey: ["visits", pid],
    queryFn: () => get(`/participants/${pid}/visits`),
  });
  const [pii, setPii] = useState<any>(null);
  const [purpose, setPurpose] = useState("");
  const [askPii, setAskPii] = useState(false);
  const [withdraw, setWithdraw] = useState(false);
  const [reason, setReason] = useState("");
  const [reAnswers, setReAnswers] = useState<number[]>([]);

  const inv = () => {
    qc.invalidateQueries({ queryKey: ["participant", pid] });
    qc.invalidateQueries({ queryKey: ["participants", study.id] });
    qc.invalidateQueries({ queryKey: ["reconsent", study.id] });
  };

  const piiM = useMutation({
    mutationFn: () =>
      get(`/participants/${pid}/pii?purpose=${encodeURIComponent(purpose)}`),
    onSuccess: (d) => {
      setPii(d);
      setAskPii(false);
    },
  });

  const wM = useMutation({
    mutationFn: () => post(`/participants/${pid}/withdraw`, { reason }),
    onSuccess: () => {
      toast("Withdrawal recorded");
      setWithdraw(false);
      inv();
    },
  });

  const reconsentDocId = p
    ? study.amendments.find((a: any) =>
        p.pending_reconsent.includes(a.version),
      )?.consent_document_id
    : null;
  const reconsentDoc = study.consent_documents.find(
    (d: any) => d.id === reconsentDocId,
  );
  const reQuestions: { question: string; options: string[] }[] =
    reconsentDoc?.comprehension_questions ?? [];

  const reM = useMutation({
    mutationFn: () =>
      post(`/participants/${pid}/consent`, {
        consent_document_id: reconsentDocId,
        witness_name: "Site nurse",
        comprehension_answers: reQuestions.length ? reAnswers : undefined,
      }),
    onSuccess: () => {
      toast("Re-consent recorded");
      setReAnswers([]);
      inv();
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fade-in"
      onMouseDown={onClose}
    >
      <aside
        className="h-full w-full max-w-2xl overflow-y-auto bg-[#101815] text-[#E8EFE9] border-l border-[#22302A] shadow-2xl animate-slide-left"
        onMouseDown={(e) => e.stopPropagation()}
        aria-label="Participant details"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#22302A] bg-[#16201C]/95 backdrop-blur-md px-6 py-4">
          <div>
            <div className="font-mono text-xs uppercase tracking-widest text-[#C8A45C]">
              Subject Record
            </div>
            <h2 className="font-serif text-xl font-bold text-[#E8EFE9] mt-0.5">
              {p?.subject_code}
            </h2>
            <p className="font-mono text-xs text-[#8FA398]">{study.protocol_no}</p>
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-2 text-[#8FA398] hover:text-[#E8EFE9] hover:bg-[#1D2A24] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {isLoading || !p ? (
          <Loading />
        ) : (
          <div className="space-y-6 p-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div className="rounded-xl border border-[#22302A] bg-[#16201C] p-3">
                <div className="font-mono text-[10px] uppercase text-[#8FA398]">Status</div>
                <div className="mt-1">
                  <Badge tone={p.status === "WITHDRAWN" ? "red" : "green"}>
                    {human(p.status)}
                  </Badge>
                </div>
              </div>
              <div className="rounded-xl border border-[#22302A] bg-[#16201C] p-3">
                <div className="font-mono text-[10px] uppercase text-[#8FA398]">Arm</div>
                <div className="mt-1 font-semibold text-sm text-[#E8EFE9]">{p.arm ?? "-"}</div>
              </div>
              <div className="rounded-xl border border-[#22302A] bg-[#16201C] p-3">
                <div className="font-mono text-[10px] uppercase text-[#8FA398]">Sex / Age</div>
                <div className="mt-1 font-semibold text-sm text-[#E8EFE9]">{p.sex} / {p.age_years}y</div>
              </div>
              <div className="rounded-xl border border-[#22302A] bg-[#16201C] p-3">
                <div className="font-mono text-[10px] uppercase text-[#8FA398]">Enrolled</div>
                <div className="mt-1 font-mono text-xs text-[#E8EFE9]">{fmtDate(p.enrolled_on)}</div>
              </div>
            </div>

            {/* Pending Re-consent Alert */}
            {p.pending_reconsent.length > 0 && (
              <div className="rounded-xl border border-[#C8A45C]/40 bg-[#C8A45C]/15 p-4 text-sm text-[#E8EFE9] shadow-lg">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">
                    Re-consent required for version {p.pending_reconsent.join(", ")}.
                  </div>
                  {!reQuestions.length && (
                    <Can perm="consent.write">
                      <Button
                        size="sm"
                        onClick={() => reM.mutate()}
                        disabled={reM.isPending}
                      >
                        Record re-consent
                      </Button>
                    </Can>
                  )}
                </div>
                {reQuestions.length > 0 && (
                  <Can perm="consent.write">
                    <div className="mt-4 space-y-3 pt-3 border-t border-[#C8A45C]/30">
                      {reQuestions.map((q, i) => (
                        <div key={i}>
                          <p className="text-xs font-medium text-[#E8EFE9]">
                            {i + 1}. {q.question}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-3">
                            {q.options.map((opt, oi) => (
                              <label key={oi} className="flex items-center gap-1.5 text-xs text-[#CBDAD0] cursor-pointer">
                                <input
                                  type="radio"
                                  name={`re-ans-${i}`}
                                  checked={reAnswers[i] === oi}
                                  onChange={() =>
                                    setReAnswers((a) => {
                                      const next = [...a];
                                      next[i] = oi;
                                      return next;
                                    })
                                  }
                                />
                                {opt}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        onClick={() => reM.mutate()}
                        disabled={
                          reM.isPending || reAnswers.length !== reQuestions.length
                        }
                      >
                        Record re-consent
                      </Button>
                    </div>
                  </Can>
                )}
              </div>
            )}
            <ErrorBox error={reM.error} />

            {/* Consent History */}
            <section className="rounded-2xl border border-[#22302A] bg-[#16201C]/60 p-4 space-y-3">
              <h3 className="font-mono text-xs uppercase tracking-wider text-[#C8A45C]">
                Consent History (DPDP Audit Trail)
              </h3>
              <ul className="space-y-1.5 text-xs font-mono">
                {p.consents.map((c: any) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#101815] border border-[#22302A] px-3.5 py-2"
                  >
                    <span className="text-[#CBDAD0]">
                      v{c.version} ({c.language}) · {fmtDateTime(c.consented_at)}
                      {c.witness_name && `, witness: ${c.witness_name}`}
                    </span>
                    {c.withdrawn_at ? (
                      <Badge tone="red">Withdrawn {fmtDate(c.withdrawn_at)}</Badge>
                    ) : (
                      <Badge tone="green">Active</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            {/* Restricted Identity / PII Card */}
            <Can perm="participant.pii">
              <section className="rounded-2xl border border-[#22302A] bg-[#16201C]/80 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs uppercase tracking-wider text-[#E8EFE9] font-semibold">
                      Direct PII (AES-128 Fernet Encrypted)
                    </span>
                  </div>
                  {!pii && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setAskPii(true)}
                    >
                      <Eye size={14} /> Reveal Identity
                    </Button>
                  )}
                </div>
                {pii ? (
                  <div className="mt-2 p-3 rounded-lg bg-[#101815] border border-[#2FB39A]/40 text-sm font-mono text-[#39C8AD]">
                    {pii.name} · {pii.contact ?? "No contact provided"}
                  </div>
                ) : (
                  <p className="text-xs text-[#8FA398] leading-relaxed">
                    Encrypted at rest under DPDP Act 2023. Access requires an explicit justification logged immutably into the SHA-256 forward audit chain.
                  </p>
                )}
              </section>
            </Can>

            {/* Ayurvedic Phenotype CRF Section */}
            {(can("phenotype.read") || can("participant.read")) && (
              <AyurvedicPhenotypeSection
                participant={p}
                study={study}
                visits={visits}
              />
            )}

            {/* Visits & CRFs */}
            <section className="space-y-3">
              <h3 className="font-mono text-xs uppercase tracking-wider text-[#C8A45C]">
                Protocol Visits & Case Report Forms
              </h3>
              <ul className="space-y-2.5">
                {visits.map((v) => (
                  <VisitRow key={v.id} v={v} study={study} participant={p} />
                ))}
              </ul>
            </section>

            {/* Consent Withdrawal Action */}
            {p.status !== "WITHDRAWN" && (
              <Can perm="consent.write">
                <div className="pt-4 border-t border-[#22302A]">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setWithdraw(true)}
                  >
                    Record Consent Withdrawal
                  </Button>
                </div>
              </Can>
            )}
          </div>
        )}

        <Modal
          open={askPii}
          onClose={() => setAskPii(false)}
          title="Audit Justification for Identity Access"
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              piiM.mutate();
            }}
          >
            <Field
              label="Why do you require the subject's unmasked PII?"
              hint="Recorded into the cryptographic audit trail (DPDP Act 2023 Section 6)"
            >
              <input
                className="input"
                required
                minLength={3}
                placeholder="e.g. Mandatory serious adverse event hospital notification..."
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </Field>
            <ErrorBox error={piiM.error} />
            <Button disabled={piiM.isPending}>Reveal Identity</Button>
          </form>
        </Modal>

        <Modal
          open={withdraw}
          onClose={() => setWithdraw(false)}
          title="DPDP Participant Consent Withdrawal"
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              wM.mutate();
            }}
          >
            <p className="text-sm text-[#8FA398] leading-relaxed">
              Upon withdrawal, future CRF data collection is immediately frozen. Historical audit records remain preserved per ICH E6(R2) & GCP Schedule Y.
            </p>
            <Field label="Clinical Justification / Reason">
              <input
                className="input"
                required
                minLength={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
            <ErrorBox error={wM.error} />
            <Button variant="danger" disabled={wM.isPending}>
              Confirm Withdrawal
            </Button>
          </form>
        </Modal>
      </aside>
    </div>
  );
}
