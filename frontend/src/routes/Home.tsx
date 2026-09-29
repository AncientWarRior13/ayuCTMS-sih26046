import { useQueries, useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { get } from "../api/client";
import { ROLE_LABEL, useAuth } from "../auth/AuthContext";
import {
  Badge,
  Card,
  Empty,
  fmtDate,
  fmtDateTime,
  human,
  LEVEL_TONE,
  Loading,
  Table,
} from "../components/ui";
import {
  ClockRing,
  KpiCard,
  STATE_TONE,
} from "../components/widgets";

const PIE_COLORS = [
  "#2FB39A",
  "#269984",
  "#1D7A69",
  "#4C8DFF",
  "#8B6CF0",
  "#C8A45C",
  "#F2A93B",
  "#56685F",
];

function PortfolioKpis({ p }: { p: any }) {
  return (
    <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-6">
      <KpiCard
        label="Clinical Studies"
        value={p.totals.studies}
        sub={`${p.studies_by_state.find((s: any) => s.state === "ENROLLING")?.n ?? 0} actively enrolling`}
      />
      <KpiCard
        label="Subject Enrolment"
        value={p.totals.enrolled}
        sub={`of ${p.totals.target} sample quota`}
        icon={<Users size={16} />}
      />
      <KpiCard
        label="Adverse Events"
        value={p.safety.sae_total}
        sub={`${p.safety.ae_total} non-serious reported`}
        tone={p.safety.sae_total ? "danger" : "default"}
      />
      <KpiCard
        label="Reporting Clocks"
        value={`${p.clocks.overdue} overdue`}
        sub={`${p.clocks.running} running · ${p.clocks.completed ? Math.round((100 * p.clocks.on_time) / p.clocks.completed) : 100}% on time`}
        tone={p.clocks.overdue ? "danger" : "ok"}
      />
      <KpiCard
        label="Open Queries"
        value={p.overdue.open_queries}
        sub={`${p.overdue.aged_queries} aging past threshold`}
        tone={p.overdue.aged_queries ? "warn" : "default"}
      />
      <KpiCard
        label="Protocol Deviations"
        value={p.overdue.open_deviations}
        sub={`${p.overdue.missed_visits} missed visit flags`}
      />
    </div>
  );
}

function EnrolmentVsTarget({ p }: { p: any }) {
  const data = p.enrolment.map((s: any) => ({
    name: s.protocol_no,
    Enrolled: s.enrolled,
    Expected: s.expected_to_date ?? undefined,
    Target: s.target_sample,
  }));

  return (
    <Card title="Enrolment Trajectory vs Target Sample">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: -15, right: 10, top: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
              stroke="var(--border)"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "var(--text-muted)" }}
              stroke="var(--border)"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--surface-1)",
                borderColor: "var(--border)",
                borderRadius: "8px",
                color: "var(--text)",
                fontSize: "12px",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
            <Bar dataKey="Enrolled" fill="var(--brand)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Expected" fill="var(--info)" radius={[3, 3, 0, 0]} opacity={0.6} />
            <Bar dataKey="Target" fill="var(--border)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function StudiesByState({ p }: { p: any }) {
  return (
    <Card title="Studies by Lifecycle State">
      <div className="h-64 w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={p.studies_by_state}
              dataKey="n"
              nameKey="state"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              stroke="var(--bg)"
              strokeWidth={2}
            >
              {p.studies_by_state.map((_: any, i: number) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: any, n: any) => [v, human(n)]}
              contentStyle={{
                backgroundColor: "var(--surface-1)",
                borderColor: "var(--border)",
                borderRadius: "8px",
                color: "var(--text)",
                fontSize: "12px",
              }}
            />
            <Legend
              formatter={(v: any) => human(v)}
              wrapperStyle={{ fontSize: 11 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function StudyTable() {
  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["studies"],
    queryFn: () => get("/studies"),
  });

  if (isLoading) return <Loading />;

  return (
    <Card
      title="Protocol Cohorts"
      actions={
        <Link to="/app/studies" className="text-xs font-semibold text-[var(--brand)] hover:underline">
          View all studies →
        </Link>
      }
    >
      <Table
        head={["Protocol No.", "Study Title", "Lifecycle State", "Enrolment Ratio", "Active SAEs"]}
        empty={!data.length}
      >
        {data.map((s) => (
          <tr key={s.id} className="hover:bg-[var(--surface-2)]/60 transition-colors">
            <td className="td font-mono font-semibold">
              <Link className="text-[var(--brand-text)] hover:underline" to={`/app/studies/${s.id}`}>
                {s.protocol_no}
              </Link>
            </td>
            <td className="td max-w-md truncate" title={s.title}>
              {s.title}
            </td>
            <td className="td">
              <Badge tone={STATE_TONE[s.state]}>{human(s.state)}</Badge>
            </td>
            <td className="td font-mono">
              <span className="text-[var(--text)] font-semibold">{s.enrolled}</span>
              <span className="text-[var(--text-muted)]"> / {s.target_sample}</span>
            </td>
            <td className="td">
              {s.sae_count ? (
                <Badge tone="red">{s.sae_count} reported</Badge>
              ) : (
                <span className="text-[var(--text-faint)] font-mono text-xs">0</span>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </Card>
  );
}

function ActiveClocks() {
  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["ae", "serious"],
    queryFn: () => get("/ae?serious=true"),
  });

  const open = data.filter((a) =>
    a.clocks.some((c: any) => c.status !== "COMPLETED"),
  );

  return (
    <Card
      title="Priority Pharmacovigilance Regulatory Clocks"
      actions={
        <Link to="/safety" className="text-xs font-semibold text-[var(--brand)] hover:underline">
          Safety Command Center →
        </Link>
      }
    >
      {isLoading ? (
        <Loading />
      ) : open.length === 0 ? (
        <Empty>No active regulatory reporting clocks require escalation</Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {open.map((a) => (
            <div
              key={a.id}
              className="p-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)]/40 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge tone="red">SAE #{a.id}</Badge>
                    <span className="font-mono text-xs text-[var(--text-muted)]">
                      {a.protocol_no}
                    </span>
                  </div>
                  <h4 className="mt-1 text-sm font-semibold text-[var(--text)] line-clamp-1">
                    {a.subject_code} — {a.description}
                  </h4>
                </div>
                <Link
                  to={`/safety?ae=${a.id}`}
                  className="text-xs font-mono text-[var(--brand)] hover:underline whitespace-nowrap"
                >
                  Manage →
                </Link>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                {a.clocks
                  .filter((c: any) => c.status !== "COMPLETED")
                  .map((c: any) => (
                    <ClockRing key={c.id} clock={c} size={94} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function RecentAlerts() {
  const { data = [] } = useQuery<any[]>({
    queryKey: ["alerts"],
    queryFn: () => get("/alerts?limit=50"),
  });

  return (
    <Card
      title="System & Safety Telemetry"
      actions={
        <Link to="/alerts" className="text-xs font-semibold text-[var(--brand)] hover:underline">
          Audit telemetry →
        </Link>
      }
    >
      {data.length === 0 ? (
        <Empty>System running nominal</Empty>
      ) : (
        <ul className="divide-y divide-[var(--border-subtle)]">
          {data.slice(0, 6).map((a) => (
            <li key={a.id} className="flex items-start gap-3 py-2.5 text-xs">
              <Badge tone={LEVEL_TONE[a.level]}>{a.level}</Badge>
              <span className="flex-1 text-[var(--text)] leading-relaxed">{a.message}</span>
              <span className="whitespace-nowrap font-mono text-[10px] text-[var(--text-muted)]">
                {fmtDateTime(a.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function StudyQueues({ kind }: { kind: "queries" | "deviations" }) {
  const { data: studies = [] } = useQuery<any[]>({
    queryKey: ["studies"],
    queryFn: () => get("/studies"),
  });
  const active = studies.filter((s) =>
    ["ENROLLING", "FOLLOW_UP"].includes(s.state),
  );
  const results = useQueries({
    queries: active.map((s) => ({
      queryKey: [kind, s.id],
      queryFn: () => get<any[]>(`/studies/${s.id}/${kind}`),
    })),
  });
  const items = results.flatMap((r, i) =>
    (r.data ?? []).map((x) => ({ ...x, study: active[i] })),
  );
  const open =
    kind === "queries"
      ? items.filter((q) => q.status !== "CLOSED")
      : items.filter((d) => !d.closed_at);

  return (
    <Card
      title={
        kind === "queries"
          ? "Unresolved EDC Data Queries"
          : "Protocol Deviations Pending Sign-off"
      }
    >
      {open.length === 0 ? (
        <Empty>No active items</Empty>
      ) : (
        <Table
          head={
            kind === "queries"
              ? ["Protocol", "Subject", "Query Context", "Status", "Age"]
              : ["Protocol", "Subject", "Category", "Severity", "Logged Date"]
          }
        >
          {open.slice(0, 8).map((x) => (
            <tr key={x.id} className="hover:bg-[var(--surface-2)]/60 transition-colors">
              <td className="td font-mono font-semibold">
                <Link
                  className="text-[var(--brand-text)] hover:underline"
                  to={`/app/studies/${x.study.id}?tab=${kind}`}
                >
                  {x.study.protocol_no}
                </Link>
              </td>
              <td className="td font-mono">{x.subject_code ?? "-"}</td>
              {kind === "queries" ? (
                <>
                  <td className="td max-w-xs truncate" title={x.text}>
                    {x.text}
                  </td>
                  <td className="td">
                    <Badge tone={x.status === "OPEN" ? "amber" : "blue"}>
                      {human(x.status)}
                    </Badge>
                  </td>
                  <td className="td font-mono">{x.age_days}d</td>
                </>
              ) : (
                <>
                  <td className="td">{x.category}</td>
                  <td className="td">
                    <Badge tone={x.severity === "MINOR" ? "gray" : "red"}>
                      {human(x.severity)}
                    </Badge>
                  </td>
                  <td className="td font-mono">{fmtDate(x.opened_at)}</td>
                </>
              )}
            </tr>
          ))}
        </Table>
      )}
    </Card>
  );
}

function EthicsOverview() {
  const { data: studies = [] } = useQuery<any[]>({
    queryKey: ["studies"],
    queryFn: () => get("/studies"),
  });
  const details = useQueries({
    queries: studies.map((s) => ({
      queryKey: ["study", String(s.id)],
      queryFn: () => get(`/studies/${s.id}`),
    })),
  });
  const rows = details.flatMap((d) =>
    (d.data?.ethics ?? []).slice(0, 1).map((e: any) => ({ ...e, study: d.data })),
  );
  const today = Date.now();

  return (
    <Card title="Ethics Approvals & Continuing Review Schedule">
      <Table
        head={[
          "Study",
          "Institutional Ethics Committee",
          "Approval Valid Till",
          "Continuing Review Due",
          "Governance Status",
        ]}
        empty={!rows.length}
      >
        {rows.map((e) => {
          const days = Math.round((Date.parse(e.valid_to) - today) / 864e5);
          return (
            <tr key={e.id} className="hover:bg-[var(--surface-2)]/60 transition-colors">
              <td className="td font-mono font-semibold">
                <Link
                  className="text-[var(--brand-text)] hover:underline"
                  to={`/app/studies/${e.study.id}`}
                >
                  {e.study.protocol_no}
                </Link>
              </td>
              <td className="td">{e.committee_name}</td>
              <td className="td font-mono">{fmtDate(e.valid_to)}</td>
              <td className="td font-mono">{fmtDate(e.continuing_review_due)}</td>
              <td className="td">
                {e.study.state === "CLOSED" ? (
                  <Badge>Study closed</Badge>
                ) : days < 0 ? (
                  <Badge tone="red">Expired</Badge>
                ) : days <= 30 ? (
                  <Badge tone="amber">Renewal due ({days}d)</Badge>
                ) : (
                  <Badge tone="green">Active Approval</Badge>
                )}
              </td>
            </tr>
          );
        })}
      </Table>
    </Card>
  );
}

function AuditBadge() {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["audit-verify"],
    queryFn: () => get("/audit/verify"),
    staleTime: 60_000,
  });

  return (
    <Card
      title="Cryptographic Hash-Chain Health"
      actions={
        <Link to="/audit" className="text-xs font-semibold text-[var(--brand)] hover:underline">
          Verify complete chain →
        </Link>
      }
    >
      {isLoading || !data ? (
        <Loading />
      ) : data.intact ? (
        <div className="flex items-center gap-3.5 text-[var(--ok)] p-2">
          <div className="h-10 w-10 rounded-full bg-[var(--ok-bg)] flex items-center justify-center border border-[var(--ok-border)]">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-[var(--text)]">
              Append-Only Ledger Intact
            </div>
            <div className="text-xs font-mono text-[var(--text-muted)]">
              {data.rows_checked} SHA-256 chained transaction blocks validated
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3.5 text-[var(--danger)] p-2">
          <div className="h-10 w-10 rounded-full bg-[var(--danger-bg)] flex items-center justify-center border border-[var(--danger-border)]">
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-[var(--danger)]">
              Integrity Violation Detected
            </div>
            <div className="text-xs font-mono text-[var(--danger)]">
              Broken hash at transaction row #{data.first_broken_id}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function Home() {
  const { me, can } = useAuth();
  const { data: p, isLoading } = useQuery<any>({
    queryKey: ["portfolio"],
    queryFn: () => get("/dashboard/portfolio"),
  });

  if (!me) return null;
  const r = me.role;

  return (
    <div className="space-y-6">
      {/* ── Editorial Header ── */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-[var(--brand-text)] font-semibold">
            Institutional Dashboard · {ROLE_LABEL[r]}
          </div>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text)]">
            Welcome back, {me.full_name}
          </h1>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            Command view scoped for {ROLE_LABEL[r]} operations
            {r === "REGULATOR" && " with strict read-only regulatory governance"}
          </p>
        </div>

        {r === "REGULATOR" && (
          <Badge tone="purple" className="py-1 px-2.5 text-xs font-semibold">
            <ShieldCheck size={14} className="mr-1.5" /> Read-Only Sovereign Oversight
          </Badge>
        )}
      </div>

      {isLoading || !p ? <Loading /> : <PortfolioKpis p={p} />}

      {(r === "PV" ||
        r === "PI" ||
        r === "IEC" ||
        r === "REGULATOR" ||
        r === "ADMIN") && <ActiveClocks />}

      <div className="grid gap-6 lg:grid-cols-2">
        {p && ["PI", "ADMIN", "REGULATOR", "COORDINATOR"].includes(r) && (
          <EnrolmentVsTarget p={p} />
        )}
        {p && ["ADMIN", "REGULATOR", "IEC"].includes(r) && (
          <StudiesByState p={p} />
        )}
        {(r === "MONITOR" || r === "COORDINATOR" || r === "PI") && (
          <StudyQueues kind="queries" />
        )}
        {(r === "MONITOR" || r === "PI") && <StudyQueues kind="deviations" />}
        <RecentAlerts />
        {can("audit.verify") && <AuditBadge />}
      </div>

      {(r === "IEC" || r === "PI" || r === "ADMIN") && <EthicsOverview />}

      <StudyTable />
    </div>
  );
}
