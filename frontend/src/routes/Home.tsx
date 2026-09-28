import { useQueries, useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { get } from "../api/client";
import { ROLE_LABEL, useAuth } from "../auth/AuthContext";
import { Badge, Card, Empty, fmtDate, fmtDateTime, human, LEVEL_TONE, Loading, Table } from "../components/ui";
import { KpiCard, SaeClockChip, STATE_TONE } from "../components/widgets";

const PIE = ["#0f766e", "#14b8a6", "#5eead4", "#0ea5e9", "#6366f1", "#a855f7", "#f59e0b", "#94a3b8"];

function PortfolioKpis({ p }: { p: any }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <KpiCard label="Studies" value={p.totals.studies} sub={`${p.studies_by_state.find((s: any) => s.state === "ENROLLING")?.n ?? 0} enrolling`} />
      <KpiCard label="Enrolled" value={p.totals.enrolled} sub={`of ${p.totals.target} target`} icon={<Users size={14} />} />
      <KpiCard label="SAEs" value={p.safety.sae_total} sub={`${p.safety.ae_total} AEs total`} tone={p.safety.sae_total ? "warn" : "default"} />
      <KpiCard
        label="Reporting clocks"
        value={`${p.clocks.overdue} overdue`}
        sub={`${p.clocks.running} running - ${p.clocks.completed ? Math.round((100 * p.clocks.on_time) / p.clocks.completed) : 100}% on time`}
        tone={p.clocks.overdue ? "danger" : "ok"}
      />
      <KpiCard label="Open queries" value={p.overdue.open_queries} sub={`${p.overdue.aged_queries} ageing`} tone={p.overdue.aged_queries ? "warn" : "default"} />
      <KpiCard label="Open deviations" value={p.overdue.open_deviations} sub={`${p.overdue.missed_visits} missed visits`} />
    </div>
  );
}

function EnrolmentVsTarget({ p }: { p: any }) {
  const data = p.enrolment.map((s: any) => ({ name: s.protocol_no, Enrolled: s.enrolled, Expected: s.expected_to_date ?? undefined, Target: s.target_sample }));
  return (
    <Card title="Enrolment vs target">
      <div className="h-64">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Enrolled" fill="#0f766e" />
            <Bar dataKey="Expected" fill="#5eead4" />
            <Bar dataKey="Target" fill="#cbd5e1" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function StudiesByState({ p }: { p: any }) {
  return (
    <Card title="Studies by lifecycle state">
      <div className="h-64">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={p.studies_by_state} dataKey="n" nameKey="state" innerRadius={50} outerRadius={85} label={(e: any) => human(e.state)}>
              {p.studies_by_state.map((_: any, i: number) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
            </Pie>
            <Tooltip formatter={(v: any, n: any) => [v, human(n)]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function StudyTable() {
  const { data = [], isLoading } = useQuery<any[]>({ queryKey: ["studies"], queryFn: () => get("/studies") });
  if (isLoading) return <Loading />;
  return (
    <Card title="Studies" actions={<Link to="/studies" className="text-xs font-medium text-brand-700 hover:underline">All studies</Link>}>
      <Table head={["Protocol", "Title", "State", "Enrolled", "SAEs"]} empty={!data.length}>
        {data.map((s) => (
          <tr key={s.id} className="hover:bg-slate-50">
            <td className="td font-medium"><Link className="text-brand-700 hover:underline" to={`/studies/${s.id}`}>{s.protocol_no}</Link></td>
            <td className="td max-w-md truncate" title={s.title}>{s.title}</td>
            <td className="td"><Badge tone={STATE_TONE[s.state]}>{human(s.state)}</Badge></td>
            <td className="td">{s.enrolled} / {s.target_sample}</td>
            <td className="td">{s.sae_count ? <Badge tone="red">{s.sae_count}</Badge> : 0}</td>
          </tr>
        ))}
      </Table>
    </Card>
  );
}

function ActiveClocks() {
  const { data = [], isLoading } = useQuery<any[]>({ queryKey: ["ae", "serious"], queryFn: () => get("/ae?serious=true") });
  const open = data.filter((a) => a.clocks.some((c: any) => c.status !== "COMPLETED"));
  return (
    <Card title="SAE reporting clocks" actions={<Link to="/safety" className="text-xs font-medium text-brand-700 hover:underline">Safety inbox</Link>}>
      {isLoading ? <Loading /> : open.length === 0 ? <Empty>No open SAE reporting clocks</Empty> : (
        <ul className="space-y-3">
          {open.map((a) => (
            <li key={a.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link to={`/safety?ae=${a.id}`} className="text-sm font-medium text-slate-800 hover:underline">
                  SAE #{a.id} - {a.subject_code} - {a.description}
                </Link>
                <span className="text-xs text-slate-500">{a.protocol_no}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {a.clocks.filter((c: any) => c.status !== "COMPLETED").map((c: any) => <SaeClockChip key={c.id} clock={c} />)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function RecentAlerts() {
  const { data = [] } = useQuery<any[]>({ queryKey: ["alerts"], queryFn: () => get("/alerts?limit=50") });
  return (
    <Card title="Open alerts" actions={<Link to="/alerts" className="text-xs font-medium text-brand-700 hover:underline">All alerts</Link>}>
      {data.length === 0 ? <Empty>Nothing needs attention</Empty> : (
        <ul className="divide-y">
          {data.slice(0, 8).map((a) => (
            <li key={a.id} className="flex items-start gap-2 py-2 text-sm">
              <Badge tone={LEVEL_TONE[a.level]}>{a.level}</Badge>
              <span className="flex-1 text-slate-700">{a.message}</span>
              <span className="whitespace-nowrap text-xs text-slate-400">{fmtDateTime(a.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function StudyQueues({ kind }: { kind: "queries" | "deviations" }) {
  const { data: studies = [] } = useQuery<any[]>({ queryKey: ["studies"], queryFn: () => get("/studies") });
  const active = studies.filter((s) => ["ENROLLING", "FOLLOW_UP"].includes(s.state));
  const results = useQueries({ queries: active.map((s) => ({ queryKey: [kind, s.id], queryFn: () => get<any[]>(`/studies/${s.id}/${kind}`) })) });
  const items = results.flatMap((r, i) => (r.data ?? []).map((x) => ({ ...x, study: active[i] })));
  const open = kind === "queries" ? items.filter((q) => q.status !== "CLOSED") : items.filter((d) => !d.closed_at);
  return (
    <Card title={kind === "queries" ? "Open data queries" : "Open protocol deviations"}>
      {open.length === 0 ? <Empty>None open</Empty> : (
        <Table head={kind === "queries" ? ["Study", "Subject", "Query", "Status", "Age"] : ["Study", "Subject", "Category", "Severity", "Opened"]}>
          {open.slice(0, 10).map((x) => (
            <tr key={x.id}>
              <td className="td"><Link className="text-brand-700 hover:underline" to={`/studies/${x.study.id}?tab=${kind}`}>{x.study.protocol_no}</Link></td>
              <td className="td mono">{x.subject_code ?? "-"}</td>
              {kind === "queries" ? (
                <>
                  <td className="td max-w-xs truncate" title={x.text}>{x.text}</td>
                  <td className="td"><Badge tone={x.status === "OPEN" ? "amber" : "blue"}>{human(x.status)}</Badge></td>
                  <td className="td">{x.age_days}d</td>
                </>
              ) : (
                <>
                  <td className="td">{x.category}</td>
                  <td className="td"><Badge tone={x.severity === "MINOR" ? "gray" : "red"}>{human(x.severity)}</Badge></td>
                  <td className="td">{fmtDate(x.opened_at)}</td>
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
  const { data: studies = [] } = useQuery<any[]>({ queryKey: ["studies"], queryFn: () => get("/studies") });
  const details = useQueries({ queries: studies.map((s) => ({ queryKey: ["study", String(s.id)], queryFn: () => get(`/studies/${s.id}`) })) });
  const rows = details.flatMap((d) => (d.data?.ethics ?? []).slice(0, 1).map((e: any) => ({ ...e, study: d.data })));
  const today = Date.now();
  return (
    <Card title="Ethics approvals and continuing review">
      <Table head={["Study", "Committee", "Valid to", "Continuing review", "Status"]} empty={!rows.length}>
        {rows.map((e) => {
          const days = Math.round((Date.parse(e.valid_to) - today) / 864e5);
          return (
            <tr key={e.id}>
              <td className="td"><Link className="text-brand-700 hover:underline" to={`/studies/${e.study.id}`}>{e.study.protocol_no}</Link></td>
              <td className="td">{e.committee_name}</td>
              <td className="td">{fmtDate(e.valid_to)}</td>
              <td className="td">{fmtDate(e.continuing_review_due)}</td>
              <td className="td">
                {e.study.state === "CLOSED" ? <Badge>Study closed</Badge> : days < 0 ? <Badge tone="red">Expired</Badge> : days <= 30 ? <Badge tone="amber">Expires in {days}d</Badge> : <Badge tone="green">Valid</Badge>}
              </td>
            </tr>
          );
        })}
      </Table>
    </Card>
  );
}

function AuditBadge() {
  const { data, isLoading } = useQuery<any>({ queryKey: ["audit-verify"], queryFn: () => get("/audit/verify"), staleTime: 60_000 });
  return (
    <Card title="Audit trail integrity" actions={<Link to="/audit" className="text-xs font-medium text-brand-700 hover:underline">Open audit trail</Link>}>
      {isLoading || !data ? <Loading /> : data.intact ? (
        <div className="flex items-center gap-3 text-emerald-800"><CheckCircle2 /> <div><b>Chain intact</b><div className="text-xs text-slate-500">{data.rows_checked} hash-linked records verified</div></div></div>
      ) : (
        <div className="flex items-center gap-3 text-red-700"><AlertTriangle /> <div><b>Tampering detected</b><div className="text-xs">First broken record: #{data.first_broken_id}</div></div></div>
      )}
    </Card>
  );
}

export default function Home() {
  const { me, can } = useAuth();
  const { data: p, isLoading } = useQuery<any>({ queryKey: ["portfolio"], queryFn: () => get("/dashboard/portfolio") });
  if (!me) return null;
  const r = me.role;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Welcome, {me.full_name}</h1>
          <p className="text-sm text-slate-500">{ROLE_LABEL[r]} dashboard{r === "REGULATOR" && " - read-only oversight"}</p>
        </div>
        {r === "REGULATOR" && <Badge tone="purple"><ShieldCheck size={12} className="mr-1" /> Read-only access</Badge>}
      </div>
      {isLoading || !p ? <Loading /> : <PortfolioKpis p={p} />}
      {(r === "PV" || r === "PI" || r === "IEC" || r === "REGULATOR" || r === "ADMIN") && <ActiveClocks />}
      <div className="grid gap-5 lg:grid-cols-2">
        {p && ["PI", "ADMIN", "REGULATOR", "COORDINATOR"].includes(r) && <EnrolmentVsTarget p={p} />}
        {p && ["ADMIN", "REGULATOR", "IEC"].includes(r) && <StudiesByState p={p} />}
        {(r === "MONITOR" || r === "COORDINATOR" || r === "PI") && <StudyQueues kind="queries" />}
        {(r === "MONITOR" || r === "PI") && <StudyQueues kind="deviations" />}
        <RecentAlerts />
        {can("audit.verify") && <AuditBadge />}
      </div>
      {(r === "IEC" || r === "PI" || r === "ADMIN") && <EthicsOverview />}
      <StudyTable />
    </div>
  );
}
