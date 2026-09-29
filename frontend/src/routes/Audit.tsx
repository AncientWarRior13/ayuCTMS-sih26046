import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Anchor,
  CheckCircle2,
  Link2,
  ShieldCheck,
} from "lucide-react";
import { Fragment, useState } from "react";
import { get, post } from "../api/client";
import { Can } from "../auth/RoleGuard";
import {
  Badge,
  Button,
  Card,
  ErrorBox,
  Field,
  fmtDateTime,
  Loading,
  Modal,
  Table,
  useToast,
} from "../components/ui";

function JsonDiffViewer({ before, after }: { before: unknown; after: unknown }) {
  const b = before ? JSON.stringify(before, null, 2) : "null";
  const a = after ? JSON.stringify(after, null, 2) : "null";

  return (
    <div className="grid gap-3 md:grid-cols-2 text-xs font-mono">
      <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-1)] p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--danger)] mb-1 flex items-center gap-1">
          <span>● Before Mutation</span>
        </div>
        <pre className="max-h-48 overflow-auto text-[11px] text-[var(--text-muted)] leading-relaxed">
          {b}
        </pre>
      </div>

      <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-1)] p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ok)] mb-1 flex items-center gap-1">
          <span>● After Mutation</span>
        </div>
        <pre className="max-h-48 overflow-auto text-[11px] text-[var(--text)] leading-relaxed">
          {a}
        </pre>
      </div>
    </div>
  );
}

export default function AuditPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState({ entity_type: "", action: "" });
  const [open, setOpen] = useState<number | null>(null);

  const qs = new URLSearchParams({
    page: String(page),
    page_size: "50",
    ...Object.fromEntries(Object.entries(filter).filter(([, v]) => v)),
  });

  const { data, isLoading } = useQuery<any>({
    queryKey: ["audit", page, filter],
    queryFn: () => get(`/audit?${qs}`),
  });

  const verify = useMutation({
    mutationFn: () => get("/audit/verify"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["audit"] }),
  });

  const { data: cps = [] } = useQuery<any[]>({
    queryKey: ["checkpoints"],
    queryFn: () => get("/audit/checkpoints"),
  });

  const cp = useMutation({
    mutationFn: () => post("/audit/checkpoints"),
    onSuccess: () => {
      toast("Merkle checkpoint generated successfully");
      qc.invalidateQueries({ queryKey: ["checkpoints"] });
    },
  });

  const [cpCheck, setCpCheck] = useState<Record<number, any>>({});
  const [anchorFor, setAnchorFor] = useState<any>(null);
  const [anchorText, setAnchorText] = useState("");
  const [anchorUrl, setAnchorUrl] = useState("");

  const anchorM = useMutation({
    mutationFn: () =>
      post(`/audit/checkpoints/${anchorFor.id}/anchor`, {
        anchor_url: anchorUrl,
      }),
    onSuccess: () => {
      toast("Checkpoint anchored permanently");
      setAnchorFor(null);
      setAnchorUrl("");
      qc.invalidateQueries({ queryKey: ["checkpoints"] });
    },
  });

  const openAnchor = async (c: any) => {
    setAnchorFor(c);
    setAnchorText(
      (await get<{ text: string }>(`/audit/checkpoints/${c.id}/anchor-text`))
        .text,
    );
  };

  const v = verify.data;

  return (
    <div className="space-y-6">
      {/* ── Editorial Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text)]">
            Cryptographic Audit Ledger
          </h1>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            SHA-256 append-only transaction hash-chains with external Merkle anchoring (ALCOA+ certified)
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Verification Hero Card */}
        <Card title="Hash-Chain Integrity Engine">
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Every clinical mutate action (consent, CRF observation, AE triage, permission change) writes an immutable record chaining the SHA-256 digest of the previous row. A single altered bit breaks mathematical verification from that record onward.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Button
              onClick={() => verify.mutate()}
              disabled={verify.isPending}
              size="md"
            >
              <ShieldCheck size={16} />
              {verify.isPending ? "Validating Hashes..." : "Verify Entire Audit Chain"}
            </Button>

            {v &&
              (v.intact ? (
                <div className="flex items-center gap-2 font-mono text-xs font-semibold text-[var(--ok)] bg-[var(--ok-bg)] px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--ok-border)]">
                  <CheckCircle2 size={16} />
                  <span>Chain Intact · {v.rows_checked} verified records</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-[var(--danger)] bg-[var(--danger-bg)] px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--danger-border)] animate-pulse">
                  <AlertTriangle size={16} />
                  <span>Tamper Detected at Record #{v.first_broken_id}</span>
                </div>
              ))}
          </div>
          <ErrorBox error={verify.error} />
        </Card>

        {/* Merkle Checkpoints Card */}
        <Card
          title="Merkle Checkpoints & External Anchoring"
          actions={
            <Can perm="audit.checkpoint">
              <Button
                size="sm"
                variant="brass"
                onClick={() => cp.mutate()}
                disabled={cp.isPending}
              >
                Publish Merkle Checkpoint
              </Button>
            </Can>
          }
        >
          <p className="mb-3 text-xs text-[var(--text-muted)] leading-relaxed">
            Publishes a cryptographic Merkle root of the current log state. Anchoring externally (public timestamp, public gist, or IEC dispatch) renders retroactive database modifications detectable even against full database administrator credentials.
          </p>

          <Table
            head={["#", "Timestamp", "Rows", "Merkle Root", "State", "Anchor"]}
            empty={!cps.length}
          >
            {cps.slice(0, 5).map((c) => (
              <tr key={c.id} className="hover:bg-[var(--surface-2)]/60">
                <td className="td font-mono font-bold">{c.id}</td>
                <td className="td font-mono text-[11px] whitespace-nowrap">
                  {fmtDateTime(c.created_at)}
                </td>
                <td className="td font-mono">{c.row_count}</td>
                <td
                  className="td font-mono text-[10px] text-[var(--brand-text)]"
                  title={c.merkle_root}
                >
                  {c.merkle_root.slice(0, 14)}...
                </td>
                <td className="td">
                  {cpCheck[c.id] ? (
                    cpCheck[c.id].matches ? (
                      <Badge tone="green">Matches</Badge>
                    ) : (
                      <Badge tone="red">Mismatch</Badge>
                    )
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () =>
                        setCpCheck({
                          ...cpCheck,
                          [c.id]: await get(
                            `/audit/checkpoints/${c.id}/verify`,
                          ),
                        })
                      }
                    >
                      Check
                    </Button>
                  )}
                </td>
                <td className="td">
                  {c.anchored_at ? (
                    <a
                      href={c.anchor_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 font-mono text-[10px] text-[var(--brand-text)] hover:underline"
                    >
                      <Anchor size={11} /> {fmtDateTime(c.anchored_at)}
                    </a>
                  ) : (
                    <Can perm="audit.checkpoint">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openAnchor(c)}
                      >
                        <Anchor size={11} /> Anchor
                      </Button>
                    </Can>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>

      {/* Anchor Modal */}
      <Modal
        open={!!anchorFor}
        onClose={() => setAnchorFor(null)}
        title={`Anchor Merkle Checkpoint #${anchorFor?.id ?? ""} Externally`}
        wide
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Publish the canonical payload below to an immutable third-party surface (e.g. GitHub Gist, public transparency log, or registered email to IEC). Paste the resulting reference URL below to lock the anchor permanently.
          </p>

          <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <pre className="whitespace-pre-wrap font-mono text-[11px] text-[var(--text)] select-all">
              {anchorText}
            </pre>
          </div>

          <form
            className="flex items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              anchorM.mutate();
            }}
          >
            <div className="flex-1">
              <Field label="External Publication Reference URL">
                <input
                  className="input font-mono text-xs"
                  type="url"
                  required
                  value={anchorUrl}
                  onChange={(e) => setAnchorUrl(e.target.value)}
                  placeholder="https://gist.github.com/..."
                />
              </Field>
            </div>
            <Button disabled={anchorM.isPending}>
              Commit Anchor
            </Button>
          </form>
          <ErrorBox error={anchorM.error} />
        </div>
      </Modal>

      {/* Ledger Records Table */}
      <Card
        title={`Ledger Transactions${data ? ` (${data.total.toLocaleString()} total)` : ""}`}
        actions={
          <div className="flex items-center gap-2">
            <input
              className="input w-36 py-1 text-xs font-mono"
              placeholder="Filter Entity..."
              value={filter.entity_type}
              onChange={(e) => {
                setPage(1);
                setFilter({ ...filter, entity_type: e.target.value });
              }}
            />
            <select
              className="input w-40 py-1 text-xs font-mono"
              value={filter.action}
              onChange={(e) => {
                setPage(1);
                setFilter({ ...filter, action: e.target.value });
              }}
              aria-label="Action Filter"
            >
              <option value="">All Actions</option>
              {[
                "CREATE",
                "UPDATE",
                "TRANSITION",
                "LOGIN",
                "LOGIN_FAILED",
                "EXPORT",
                "READ_PII",
                "CAUSALITY",
                "SUBMIT_REPORT",
                "SIGNOFF",
                "WITHDRAW",
                "PERMISSION_CHANGE",
                "VERIFY",
                "SEED",
              ].map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {isLoading || !data ? (
          <Loading />
        ) : (
          <>
            <Table
              head={[
                "ID",
                "Timestamp (UTC)",
                "Operator",
                "Operation",
                "Entity Reference",
                "Justification Reason",
                "SHA-256 Link",
              ]}
              empty={!data.items.length}
            >
              {data.items.map((r: any) => (
                <Fragment key={r.id}>
                  <tr
                    className="cursor-pointer hover:bg-[var(--surface-2)]/60 transition-colors"
                    onClick={() => setOpen(open === r.id ? null : r.id)}
                  >
                    <td className="td font-mono font-bold text-xs">{r.id}</td>
                    <td className="td font-mono text-[11px] whitespace-nowrap text-[var(--text-muted)]">
                      {new Date(r.occurred_at)
                        .toISOString()
                        .replace("T", " ")
                        .slice(0, 19)}
                    </td>
                    <td className="td text-xs">
                      <div className="font-semibold text-[var(--text)]">
                        {r.actor_name ?? "System Daemon"}
                      </div>
                      <div className="text-[10px] font-mono text-[var(--text-muted)]">
                        {r.actor_role}
                      </div>
                    </td>
                    <td className="td">
                      <Badge
                        tone={
                          r.action.includes("FAIL")
                            ? "red"
                            : r.action === "EXPORT" || r.action === "READ_PII"
                              ? "purple"
                              : "teal"
                        }
                      >
                        {r.action}
                      </Badge>
                    </td>
                    <td className="td font-mono text-xs">
                      {r.entity_type}
                      {r.entity_id && (
                        <span className="text-[var(--text-muted)]"> #{r.entity_id}</span>
                      )}
                    </td>
                    <td className="td text-xs max-w-xs truncate text-[var(--text-muted)]">
                      {r.reason ?? "—"}
                    </td>
                    <td className="td font-mono text-[10px] text-[var(--text-faint)]">
                      <span className="inline-flex items-center gap-1 font-semibold text-[var(--text-muted)]">
                        <Link2 size={11} />
                        {r.prev_hash.slice(0, 8)} → {r.row_hash.slice(0, 8)}
                      </span>
                    </td>
                  </tr>

                  {/* Expandable JSON Diff Row */}
                  {open === r.id && (
                    <tr>
                      <td colSpan={7} className="bg-[var(--surface-2)]/70 px-4 py-4 border-b border-[var(--border)]">
                        <JsonDiffViewer
                          before={r.before_data}
                          after={r.after_data}
                        />
                        <div className="mt-3 font-mono text-[10px] text-[var(--text-muted)] flex flex-wrap gap-x-6 gap-y-1 bg-[var(--surface-1)] p-2.5 rounded border border-[var(--border)]">
                          <div>
                            <span className="text-[var(--text-faint)]">PREV HASH:</span> {r.prev_hash}
                          </div>
                          <div>
                            <span className="text-[var(--text-faint)]">ROW HASH:</span> {r.row_hash}
                          </div>
                          {r.ip && (
                            <div>
                              <span className="text-[var(--text-faint)]">CLIENT IP:</span> {r.ip}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </Table>

            <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
              <div>
                Showing records {((page - 1) * 50) + 1}–{Math.min(page * 50, data.total)} of {data.total}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <span>
                  Page {page} / {Math.max(1, Math.ceil(data.total / 50))}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page * 50 >= data.total}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
