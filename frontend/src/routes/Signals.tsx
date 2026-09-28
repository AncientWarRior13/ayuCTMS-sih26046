import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { get } from "../api/client";
import { Badge, Card, Loading, Table } from "../components/ui";
import { KpiCard } from "../components/widgets";

export default function SignalsPage() {
  const [study, setStudy] = useState("");
  const { data: studies = [] } = useQuery<any[]>({ queryKey: ["studies"], queryFn: () => get("/studies") });
  const { data: s, isLoading } = useQuery<any>({ queryKey: ["signals", study], queryFn: () => get(`/pv/signals${study ? `?study_id=${study}` : ""}`) });
  if (isLoading || !s) return <Loading />;
  const cc = s.clock_compliance;
  const done = cc.on_time + cc.late;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Safety signals</h1>
          <p className="text-sm text-slate-500">Disproportionate reporting is flagged when a preferred term reaches {s.threshold} reports in a study (configurable).</p>
        </div>
        <select className="input w-56" value={study} onChange={(e) => setStudy(e.target.value)} aria-label="Study filter">
          <option value="">All studies</option>
          {studies.map((x) => <option key={x.id} value={x.id}>{x.protocol_no}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Reports on time" value={done ? `${Math.round((100 * cc.on_time) / done)}%` : "-"} sub={`${cc.on_time} of ${done} submitted`} tone="ok" />
        <KpiCard label="Late submissions" value={cc.late} tone={cc.late ? "warn" : "default"} />
        <KpiCard label="Overdue now" value={cc.overdue} tone={cc.overdue ? "danger" : "default"} />
        <KpiCard label="Clocks running" value={cc.running} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Reports by preferred term">
          <Table head={["Preferred term", "System organ class", "Reports", "Serious", "Signal"]}>
            {s.by_pt.map((r: any) => (
              <tr key={r.pt} className={r.flag ? "bg-amber-50" : ""}>
                <td className="td font-medium">{r.pt}</td><td className="td text-xs">{r.soc}</td><td className="td">{r.n}</td><td className="td">{r.serious}</td>
                <td className="td">{r.flag ? <Badge tone="amber">Review</Badge> : "-"}</td>
              </tr>
            ))}
          </Table>
        </Card>
        <div className="space-y-5">
          <Card title="Weekly trend">
            <div className="h-56"><ResponsiveContainer>
              <AreaChart data={s.trend} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="week" tick={{ fontSize: 10 }} tickFormatter={(w: string) => w.slice(5)} /><YAxis tick={{ fontSize: 10 }} allowDecimals={false} /><Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} />
                <Area dataKey="n" name="All AEs" stroke="#0f766e" fill="#99f6e4" /><Area dataKey="serious" name="Serious" stroke="#dc2626" fill="#fecaca" />
              </AreaChart>
            </ResponsiveContainer></div>
          </Card>
          <Card title="By system organ class">
            <div className="h-56"><ResponsiveContainer>
              <BarChart data={s.by_soc} layout="vertical" margin={{ left: 60 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} /><YAxis type="category" dataKey="soc" tick={{ fontSize: 10 }} width={150} /><Tooltip /><Bar dataKey="n" fill="#0f766e" />
              </BarChart>
            </ResponsiveContainer></div>
          </Card>
        </div>
        <Card title="By study arm">
          <Table head={["Arm", "Reports"]}>{s.by_arm.map((r: any) => <tr key={r.arm}><td className="td">{r.arm}</td><td className="td">{r.n}</td></tr>)}</Table>
        </Card>
        <Card title="By suspect intervention">
          <Table head={["Intervention", "Reports"]}>{s.by_intervention.map((r: any) => <tr key={r.intervention}><td className="td">{r.intervention}</td><td className="td">{r.n}</td></tr>)}</Table>
        </Card>
      </div>
    </div>
  );
}
