import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { useState } from "react";
import { get } from "../api/client";
import { Card, Empty, human, Loading } from "../components/ui";

const LABELS: Record<string, string> = {
  major_deviation_rate: "Major deviations (25)",
  open_query_rate: "Open queries (20)",
  visit_non_compliance: "Missed / out-of-window visits (20)",
  sae_rate: "SAE rate (15)",
  overdue_reports: "Overdue SAE reports (20)",
};

export default function RiskPage() {
  const { data = [], isLoading } = useQuery<any[]>({ queryKey: ["risk"], queryFn: () => get("/dashboard/risk") });
  const [sel, setSel] = useState<any>(null);
  if (isLoading) return <Loading />;
  const studies = [...new Map(data.map((c) => [c.study_id, c.protocol_no])).entries()];
  const sites = [...new Set(data.map((c) => c.site_code))].sort();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Risk-based monitoring</h1>
        <p className="text-sm text-slate-500">Each cell scores a study site from 0 to 100 using weighted quality and safety indicators, so monitors can target visits where risk is highest.</p>
      </div>
      {data.length === 0 ? <Empty>No active studies</Empty> : (
        <div className="grid gap-5 lg:grid-cols-3">
          <Card title="Study x site heatmap" className="lg:col-span-2">
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-1">
                <thead><tr><th className="th">Study</th>{sites.map((s) => <th key={s} className="th text-center">{s}</th>)}</tr></thead>
                <tbody>
                  {studies.map(([sid, pn]) => (
                    <tr key={sid}>
                      <td className="td font-medium">{pn}</td>
                      {sites.map((site) => {
                        const c = data.find((x) => x.study_id === sid && x.site_code === site);
                        if (!c) return <td key={site} className="rounded bg-slate-50 text-center text-xs text-slate-300">-</td>;
                        return (
                          <td key={site}>
                            <button
                              onClick={() => setSel(c)}
                              className={clsx("h-16 w-full min-w-24 rounded-md text-center font-semibold ring-offset-2 transition hover:ring-2",
                                c.band === "HIGH" ? "bg-red-500 text-white ring-red-400" : c.band === "MEDIUM" ? "bg-amber-300 text-amber-950 ring-amber-400" : "bg-emerald-200 text-emerald-900 ring-emerald-400",
                                sel === c && "ring-2")}
                            >
                              <div className="text-xl">{c.score}</div>
                              <div className="text-[10px] font-medium uppercase">{human(c.band)}</div>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-emerald-200" /> Low &lt; 25</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-300" /> Medium 25-49</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-red-500" /> High 50+</span>
            </div>
          </Card>
          <Card title={sel ? `${sel.protocol_no} @ ${sel.site_code}` : "Indicator breakdown"}>
            {!sel ? <Empty>Select a cell</Empty> : (
              <div className="space-y-3">
                {Object.entries<number>(sel.indicators).map(([k, v]) => (
                  <div key={k}>
                    <div className="flex justify-between text-xs"><span>{LABELS[k]}</span><b>{v}</b></div>
                    <div className="mt-1 h-2 rounded bg-slate-100"><div className="h-full rounded bg-brand-600" style={{ width: `${(v / 25) * 100}%` }} /></div>
                  </div>
                ))}
                <dl className="grid grid-cols-2 gap-2 border-t pt-3 text-xs">
                  <dt className="text-slate-500">Enrolled</dt><dd>{sel.enrolled}</dd>
                  <dt className="text-slate-500">Major deviations</dt><dd>{sel.major_dev}</dd>
                  <dt className="text-slate-500">Open queries</dt><dd>{sel.open_q}</dd>
                  <dt className="text-slate-500">Visit issues</dt><dd>{sel.bad_visits} of {sel.due_visits}</dd>
                  <dt className="text-slate-500">SAEs</dt><dd>{sel.sae}</dd>
                  <dt className="text-slate-500">Overdue reports</dt><dd>{sel.overdue_clocks}</dd>
                </dl>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
