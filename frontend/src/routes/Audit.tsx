import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Anchor, CheckCircle2, Link2, ShieldCheck } from "lucide-react";
import { Fragment, useState } from "react";
import { get, post } from "../api/client";
import { Can } from "../auth/RoleGuard";
import { Badge, Button, Card, ErrorBox, Field, fmtDateTime, Loading, Modal, Table, useToast } from "../components/ui";

function Json({ v }: { v: unknown }) {
  if (v == null) return <span className="text-slate-400">-</span>;
  return <pre className="max-h-48 overflow-auto rounded bg-slate-50 p-2 text-[11px]">{JSON.stringify(v, null, 2)}</pre>;
}

export default function AuditPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState({ entity_type: "", action: "" });
  const [open, setOpen] = useState<number | null>(null);
  const qs = new URLSearchParams({ page: String(page), page_size: "50", ...Object.fromEntries(Object.entries(filter).filter(([, v]) => v)) });
  const { data, isLoading } = useQuery<any>({ queryKey: ["audit", page, filter], queryFn: () => get(`/audit?${qs}`) });
  const verify = useMutation({ mutationFn: () => get("/audit/verify"), onSuccess: () => qc.invalidateQueries({ queryKey: ["audit"] }) });
  const { data: cps = [] } = useQuery<any[]>({ queryKey: ["checkpoints"], queryFn: () => get("/audit/checkpoints") });
  const cp = useMutation({ mutationFn: () => post("/audit/checkpoints"), onSuccess: () => { toast("Checkpoint created"); qc.invalidateQueries({ queryKey: ["checkpoints"] }); } });
  const [cpCheck, setCpCheck] = useState<Record<number, any>>({});
  const [anchorFor, setAnchorFor] = useState<any>(null);
  const [anchorText, setAnchorText] = useState("");
  const [anchorUrl, setAnchorUrl] = useState("");
  const anchorM = useMutation({
    mutationFn: () => post(`/audit/checkpoints/${anchorFor.id}/anchor`, { anchor_url: anchorUrl }),
    onSuccess: () => { toast("Checkpoint anchored"); setAnchorFor(null); setAnchorUrl(""); qc.invalidateQueries({ queryKey: ["checkpoints"] }); },
  });
  const openAnchor = async (c: any) => {
    setAnchorFor(c);
    setAnchorText((await get<{ text: string }>(`/audit/checkpoints/${c.id}/anchor-text`)).text);
  };
  const v = verify.data;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold">Audit trail</h1>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Hash-chain verification">
          <p className="text-sm text-slate-600">Every create, update, login, export and permission change is written to an append-only log. Each record stores the SHA-256 of the previous record, so editing any row breaks the chain from that point.</p>
          <div className="mt-4 flex items-center gap-4">
            <Button onClick={() => verify.mutate()} disabled={verify.isPending}><ShieldCheck size={16} /> {verify.isPending ? "Verifying..." : "Verify entire chain"}</Button>
            {v && (v.intact ? (
              <span className="flex items-center gap-2 font-medium text-emerald-700"><CheckCircle2 size={20} /> Intact - {v.rows_checked} records</span>
            ) : (
              <span className="flex items-center gap-2 font-semibold text-red-700"><AlertTriangle size={20} /> Tampering detected at record #{v.first_broken_id}</span>
            ))}
          </div>
          <ErrorBox error={verify.error} />
        </Card>
        <Card title="Merkle checkpoints" actions={<Can perm="audit.checkpoint"><Button size="sm" onClick={() => cp.mutate()} disabled={cp.isPending}>Create checkpoint</Button></Can>}>
          <p className="mb-3 text-sm text-slate-600">A checkpoint publishes a Merkle root over the chain. Anchoring it somewhere outside this system (a public gist, a timestamping service, an email to the IEC) makes a later rewrite of history detectable even by a database administrator - until anchored, a checkpoint only proves integrity to someone who trusts this database's own record of it.</p>
          <Table head={["#", "Created", "Records", "Merkle root", "Verify", "Anchor"]} empty={!cps.length}>
            {cps.slice(0, 5).map((c) => (
              <tr key={c.id}>
                <td className="td">{c.id}</td><td className="td">{fmtDateTime(c.created_at)}</td><td className="td">{c.row_count}</td>
                <td className="td mono" title={c.merkle_root}>{c.merkle_root.slice(0, 16)}...</td>
                <td className="td">
                  {cpCheck[c.id] ? (cpCheck[c.id].matches ? <Badge tone="green">matches</Badge> : <Badge tone="red">mismatch</Badge>) : (
                    <Button size="sm" variant="secondary" onClick={async () => setCpCheck({ ...cpCheck, [c.id]: await get(`/audit/checkpoints/${c.id}/verify`) })}>Check</Button>
                  )}
                </td>
                <td className="td">
                  {c.anchored_at ? (
                    <a href={c.anchor_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-brand-700 hover:underline">
                      <Anchor size={12} /> {fmtDateTime(c.anchored_at)}
                    </a>
                  ) : (
                    <Can perm="audit.checkpoint"><Button size="sm" variant="secondary" onClick={() => openAnchor(c)}><Anchor size={12} /> Anchor</Button></Can>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
      <Modal open={!!anchorFor} onClose={() => setAnchorFor(null)} title={`Anchor checkpoint #${anchorFor?.id ?? ""} externally`} wide>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Publish the text below somewhere outside this system - a public GitHub gist, an OpenTimestamps-style proof, an email to the Ethics Committee - then paste the link back here. Anyone who kept a copy of that publication can independently detect if this database's history is later altered, even by an administrator.</p>
          <div className="rounded-md bg-slate-50 p-3">
            <pre className="whitespace-pre-wrap text-xs">{anchorText}</pre>
          </div>
          <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); anchorM.mutate(); }}>
            <div className="flex-1"><Field label="Published at (URL)"><input className="input" type="url" required value={anchorUrl} onChange={(e) => setAnchorUrl(e.target.value)} placeholder="https://gist.github.com/..." /></Field></div>
            <Button disabled={anchorM.isPending}>Record anchor</Button>
          </form>
          <ErrorBox error={anchorM.error} />
        </div>
      </Modal>
      <Card
        title={`Records${data ? ` (${data.total})` : ""}`}
        actions={
          <>
            <input className="input w-40 py-1" placeholder="Entity type" value={filter.entity_type} onChange={(e) => { setPage(1); setFilter({ ...filter, entity_type: e.target.value }); }} />
            <select className="input w-40 py-1" value={filter.action} onChange={(e) => { setPage(1); setFilter({ ...filter, action: e.target.value }); }} aria-label="Action">
              <option value="">All actions</option>
              {["CREATE", "UPDATE", "TRANSITION", "LOGIN", "LOGIN_FAILED", "EXPORT", "READ_PII", "CAUSALITY", "SUBMIT_REPORT", "SIGNOFF", "WITHDRAW", "PERMISSION_CHANGE", "VERIFY", "SEED"].map((a) => <option key={a}>{a}</option>)}
            </select>
          </>
        }
      >
        {isLoading || !data ? <Loading /> : (
          <>
            <Table head={["#", "Time (UTC)", "Actor", "Action", "Entity", "Reason", "Hash chain"]} empty={!data.items.length}>
              {data.items.map((r: any) => (
                <Fragment key={r.id}>
                  <tr className="cursor-pointer hover:bg-slate-50" onClick={() => setOpen(open === r.id ? null : r.id)}>
                    <td className="td mono">{r.id}</td>
                    <td className="td whitespace-nowrap text-xs">{new Date(r.occurred_at).toISOString().replace("T", " ").slice(0, 19)}</td>
                    <td className="td text-xs">{r.actor_name ?? "system"}<div className="text-slate-400">{r.actor_role}</div></td>
                    <td className="td"><Badge tone={r.action.includes("FAIL") ? "red" : r.action === "EXPORT" || r.action === "READ_PII" ? "purple" : "teal"}>{r.action}</Badge></td>
                    <td className="td text-xs">{r.entity_type}{r.entity_id && ` #${r.entity_id}`}</td>
                    <td className="td max-w-xs truncate text-xs">{r.reason ?? "-"}</td>
                    <td className="td mono text-[10px] text-slate-500"><Link2 size={10} className="mr-1 inline" />{r.prev_hash.slice(0, 8)} {"→"} {r.row_hash.slice(0, 8)}</td>
                  </tr>
                  {open === r.id && (
                    <tr><td colSpan={7} className="bg-slate-50/60 px-3 py-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div><div className="label">Before</div><Json v={r.before_data} /></div>
                        <div><div className="label">After</div><Json v={r.after_data} /></div>
                      </div>
                      <div className="mono mt-2 break-all text-[10px] text-slate-500">prev {r.prev_hash}<br />hash {r.row_hash}{r.ip && <><br />ip {r.ip}</>}</div>
                    </td></tr>
                  )}
                </Fragment>
              ))}
            </Table>
            <div className="mt-3 flex items-center justify-end gap-2 text-sm">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <span>Page {page} of {Math.max(1, Math.ceil(data.total / 50))}</span>
              <Button size="sm" variant="secondary" disabled={page * 50 >= data.total} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
