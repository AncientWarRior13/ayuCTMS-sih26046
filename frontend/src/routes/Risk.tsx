import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { useState } from "react";
import { get } from "../api/client";
import { Badge, Card, Empty, human, Loading, Table, Tabs } from "../components/ui";

const LABELS: Record<string, string> = {
  major_deviation_rate: "Major Protocol Deviations (Weight 25%)",
  open_query_rate: "EDC Open Query Load (Weight 20%)",
  visit_non_compliance: "Out-of-Window / Missed Visits (Weight 20%)",
  sae_rate: "Adverse Event Frequency (Weight 15%)",
  overdue_reports: "Regulatory Reporting Delays (Weight 20%)",
};

const PARTICIPANT_LABELS: Record<string, string> = {
  visit_slippage: "Visit-Window Slippage (Weight 35%)",
  query_burden: "Aged Data Queries (Weight 30%)",
  site_workload: "Investigator Site Load (Weight 20%)",
  recent_deviation: "Recent Deviations (Weight 15%)",
};

function Heatmap() {
  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["risk"],
    queryFn: () => get("/dashboard/risk"),
  });
  const [sel, setSel] = useState<any>(null);

  if (isLoading) return <Loading />;
  if (data.length === 0) return <Empty>No active protocol cohorts found</Empty>;

  const studies = [
    ...new Map(data.map((c) => [c.study_id, c.protocol_no])).entries(),
  ];
  const sites = [...new Set(data.map((c) => c.site_code))].sort();

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* 2D Heatmap Grid Card */}
      <Card
        title="Protocol × Site Operational Risk Topography"
        className="lg:col-span-2"
        actions={
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[var(--ok)] shadow-[0_0_6px_var(--ok)]" />
              LOW (&lt;25)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[var(--warn)] shadow-[0_0_6px_var(--warn)]" />
              MED (25–49)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[var(--danger)] shadow-[0_0_6px_var(--danger)]" />
              HIGH (50+)
            </span>
          </div>
        }
      >
        <div className="overflow-x-auto p-1">
          <table className="min-w-full border-separate border-spacing-2">
            <thead>
              <tr>
                <th className="th text-left font-mono">Protocol Study</th>
                {sites.map((s) => (
                  <th key={s} className="th text-center font-mono">
                    Site {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {studies.map(([sid, pn]) => (
                <tr key={sid}>
                  <td className="td font-mono font-bold text-xs whitespace-nowrap text-[var(--brand-text)]">
                    {pn}
                  </td>
                  {sites.map((site) => {
                    const c = data.find(
                      (x) => x.study_id === sid && x.site_code === site,
                    );
                    if (!c) {
                      return (
                        <td
                          key={site}
                          className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-2)]/30 text-center text-xs font-mono text-[var(--text-faint)]"
                        >
                          —
                        </td>
                      );
                    }

                    const isHigh = c.band === "HIGH";
                    const isMed = c.band === "MEDIUM";
                    const isSelected = sel?.study_id === sid && sel?.site_code === site;

                    return (
                      <td key={site}>
                        <button
                          type="button"
                          onClick={() => setSel(c)}
                          className={clsx(
                            "h-16 w-full min-w-24 rounded-[var(--radius-md)] p-2 text-center transition-all duration-150 border flex flex-col items-center justify-center relative overflow-hidden group select-none active:scale-[0.97]",
                            isHigh &&
                              "bg-[var(--danger-bg)] border-[var(--danger-border)] text-[var(--danger)] hover:shadow-[0_0_12px_var(--danger-border)]",
                            isMed &&
                              "bg-[var(--warn-bg)] border-[var(--warn-border)] text-[var(--warn)] hover:shadow-[0_0_12px_var(--warn-border)]",
                            !isHigh &&
                              !isMed &&
                              "bg-[var(--ok-bg)] border-[var(--ok-border)] text-[var(--ok)] hover:shadow-[0_0_12px_var(--ok-border)]",
                            isSelected &&
                              "ring-2 ring-[var(--brand)] ring-offset-2 ring-offset-[var(--bg)]",
                          )}
                        >
                          <div className="font-display text-xl font-bold tabular-nums">
                            {c.score}
                          </div>
                          <div className="font-mono text-[9px] font-bold tracking-widest uppercase mt-0.5">
                            {human(c.band)} RISK
                          </div>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Side Drilldown Panel */}
      <Card
        title={
          sel
            ? `${sel.protocol_no} · Site ${sel.site_code}`
            : "Indicator Decomposition"
        }
      >
        {!sel ? (
          <Empty>Select a risk matrix cell to inspect weighted components</Empty>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <span className="text-[10px] font-mono uppercase text-[var(--text-muted)]">
                  Composite Risk Score
                </span>
                <div className="font-display text-3xl font-bold text-[var(--text)]">
                  {sel.score} <span className="text-xs font-mono font-normal text-[var(--text-muted)]">/ 100</span>
                </div>
              </div>
              <Badge
                tone={
                  sel.band === "HIGH"
                    ? "red"
                    : sel.band === "MEDIUM"
                      ? "amber"
                      : "green"
                }
              >
                {sel.band} RISK
              </Badge>
            </div>

            <div className="space-y-3">
              {Object.entries<number>(sel.indicators).map(([k, v]) => (
                <div key={k} className="text-xs">
                  <div className="flex justify-between font-mono text-[11px] mb-1">
                    <span className="text-[var(--text)]">{LABELS[k] || k}</span>
                    <b className="text-[var(--brand-text)]">{v} pts</b>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--surface-3)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--brand)] to-[var(--accent-brass)] transition-all duration-300"
                      style={{ width: `${Math.min(100, (v / 25) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <dl className="grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-4 text-xs font-mono">
              <div className="p-2 rounded bg-[var(--surface-2)]/60 border border-[var(--border-subtle)]">
                <dt className="text-[10px] text-[var(--text-muted)] uppercase">Enrolled</dt>
                <dd className="font-bold text-sm text-[var(--text)]">{sel.enrolled}</dd>
              </div>
              <div className="p-2 rounded bg-[var(--surface-2)]/60 border border-[var(--border-subtle)]">
                <dt className="text-[10px] text-[var(--text-muted)] uppercase">Major Deviations</dt>
                <dd className="font-bold text-sm text-[var(--danger)]">{sel.major_dev}</dd>
              </div>
              <div className="p-2 rounded bg-[var(--surface-2)]/60 border border-[var(--border-subtle)]">
                <dt className="text-[10px] text-[var(--text-muted)] uppercase">Open Queries</dt>
                <dd className="font-bold text-sm text-[var(--warn)]">{sel.open_q}</dd>
              </div>
              <div className="p-2 rounded bg-[var(--surface-2)]/60 border border-[var(--border-subtle)]">
                <dt className="text-[10px] text-[var(--text-muted)] uppercase">Missed Visits</dt>
                <dd className="font-bold text-sm text-[var(--text)]">{sel.bad_visits} / {sel.due_visits}</dd>
              </div>
              <div className="p-2 rounded bg-[var(--surface-2)]/60 border border-[var(--border-subtle)]">
                <dt className="text-[10px] text-[var(--text-muted)] uppercase">Reported SAEs</dt>
                <dd className="font-bold text-sm text-[var(--danger)]">{sel.sae}</dd>
              </div>
              <div className="p-2 rounded bg-[var(--surface-2)]/60 border border-[var(--border-subtle)]">
                <dt className="text-[10px] text-[var(--text-muted)] uppercase">Overdue Clocks</dt>
                <dd className="font-bold text-sm text-[var(--danger)]">{sel.overdue_clocks}</dd>
              </div>
            </dl>
          </div>
        )}
      </Card>
    </div>
  );
}

function PredictiveRisk() {
  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["predictive-risk"],
    queryFn: () => get("/dashboard/predictive-risk"),
  });
  const [sel, setSel] = useState<any>(null);

  if (isLoading) return <Loading />;
  if (data.length === 0) return <Empty>No active trial subjects found</Empty>;

  const tone = (band: string): "red" | "amber" | "green" =>
    band === "HIGH" ? "red" : band === "MEDIUM" ? "amber" : "green";

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card
        title="Participant Deviation Propensity Scoring"
        actions={
          <span className="text-xs font-mono text-[var(--text-muted)]">
            Leading Indicators · Pre-deviation Action
          </span>
        }
        className="lg:col-span-2"
      >
        <Table head={["Subject ID", "Protocol", "Site", "Risk Score", "Category", ""]}>
          {data.map((r) => {
            const isSelected = sel?.id === r.id;
            return (
              <tr
                key={r.id}
                className={clsx(
                  "cursor-pointer transition-colors",
                  isSelected
                    ? "bg-[var(--surface-3)] border-l-2 border-[var(--brand)]"
                    : "hover:bg-[var(--surface-2)]/60",
                )}
                onClick={() => setSel(r)}
              >
                <td className="td font-mono font-bold text-xs">{r.subject_code}</td>
                <td className="td font-mono text-xs">{r.protocol_no}</td>
                <td className="td font-mono text-xs">{r.site_code}</td>
                <td className="td font-mono font-bold text-sm text-[var(--text)]">
                  {r.score}
                </td>
                <td className="td">
                  <Badge tone={tone(r.band)}>{r.band}</Badge>
                </td>
                <td className="td text-right">
                  <span className="text-xs font-semibold text-[var(--brand-text)] hover:underline">
                    {isSelected ? "Inspecting" : "Inspect →"}
                  </span>
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>

      <Card title={sel ? `Subject: ${sel.subject_code}` : "Leading Indicator Vectors"}>
        {!sel ? (
          <Empty>Select a subject to view leading deviation indicators</Empty>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div>
                <span className="text-[10px] font-mono uppercase text-[var(--text-muted)]">
                  Predicted Slippage
                </span>
                <div className="font-display text-2xl font-bold text-[var(--text)]">
                  {sel.score} <span className="text-xs font-mono font-normal text-[var(--text-muted)]">pts</span>
                </div>
              </div>
              <Badge tone={tone(sel.band)}>{sel.band} RISK</Badge>
            </div>

            <div className="space-y-3">
              {Object.entries<number>(sel.indicators).map(([k, v]) => (
                <div key={k} className="text-xs">
                  <div className="flex justify-between font-mono text-[11px] mb-1">
                    <span className="text-[var(--text)]">{PARTICIPANT_LABELS[k] || k}</span>
                    <b className="text-[var(--brand-text)]">{v} pts</b>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-[var(--surface-3)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--brand)] to-[var(--accent-brass)]"
                      style={{ width: `${Math.min(100, (v / 35) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <dl className="grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-4 text-xs font-mono">
              <div className="p-2 rounded bg-[var(--surface-2)]/60 border border-[var(--border-subtle)]">
                <dt className="text-[10px] text-[var(--text-muted)] uppercase">Visits Slipped</dt>
                <dd className="font-bold text-sm text-[var(--text)]">{sel.visits_bad} / {sel.visits_due}</dd>
              </div>
              <div className="p-2 rounded bg-[var(--surface-2)]/60 border border-[var(--border-subtle)]">
                <dt className="text-[10px] text-[var(--text-muted)] uppercase">Aged Queries</dt>
                <dd className="font-bold text-sm text-[var(--warn)]">{sel.aged_queries}</dd>
              </div>
              <div className="p-2 rounded bg-[var(--surface-2)]/60 border border-[var(--border-subtle)]">
                <dt className="text-[10px] text-[var(--text-muted)] uppercase">Recent Deviations</dt>
                <dd className="font-bold text-sm text-[var(--danger)]">{sel.recent_deviations}</dd>
              </div>
              <div className="p-2 rounded bg-[var(--surface-2)]/60 border border-[var(--border-subtle)]">
                <dt className="text-[10px] text-[var(--text-muted)] uppercase">Site Active Load</dt>
                <dd className="font-bold text-sm text-[var(--text)]">{sel.site_active_count}</dd>
              </div>
            </dl>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function RiskPage() {
  const [tab, setTab] = useState<"heatmap" | "predictive">("heatmap");

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="border-b border-[var(--border)] pb-4">
        <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text)]">
          Risk-Based Monitoring Command
        </h1>
        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
          {tab === "heatmap"
            ? "Multi-dimensional study × site scoring (0–100) from weighted compliance, query aging, and safety markers."
            : "Predictive risk scoring from leading trial indicators to avert protocol deviations before incident occurrence."}
        </p>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          ["heatmap", "Study × Site Heatmap"],
          ["predictive", "Predictive Subject Risk"],
        ]}
      />

      {tab === "heatmap" ? <Heatmap /> : <PredictiveRisk />}
    </div>
  );
}
