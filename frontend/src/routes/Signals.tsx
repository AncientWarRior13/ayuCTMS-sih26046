import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { get } from "../api/client";
import { Badge, Card, Empty, Loading, PageHeader, Table } from "../components/ui";
import { KpiCard } from "../components/widgets";
import { Activity } from "lucide-react";
import {
  CHART_PALETTE,
  ChartLegend,
  ChartTooltip,
  sharedCartesianGridProps,
  sharedXAxisProps,
  sharedYAxisProps,
} from "../components/ChartTheme";

/* ── Forest Plot Style Disproportionality Analysis ── */
function SignalForestPlot({ rows }: { rows: any[] }) {
  if (!rows || rows.length === 0) return null;

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)]/40 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono uppercase font-bold tracking-wider text-[var(--text)] flex items-center gap-1.5">
          <Activity size={14} className="text-[var(--brand)]" />
          ROR 95% Confidence Interval Forest Plot (Baseline ROR = 1.0)
        </span>
        <span className="text-[10px] font-mono text-[var(--text-muted)]">
          Right of dashed line indicates disproportionate association
        </span>
      </div>

      <div className="space-y-3 font-mono text-xs">
        {rows.slice(0, 6).map((r) => {
          const ror = Number(r.ror) || 1;
          const low = Number(r.ror_ci_low) || 0.5;
          const high = Math.min(10, Number(r.ror_ci_high) || 2);

          // Map range 0 - 6 to percentage 0% - 100%
          const clamp = (val: number) => Math.min(100, Math.max(0, (val / 6) * 100));
          const leftPct = clamp(low);
          const rightPct = clamp(high);
          const centerPct = clamp(ror);

          return (
            <div key={`${r.intervention}-${r.pt}`} className="grid grid-cols-12 items-center gap-3 py-1 border-b border-[var(--border-subtle)]">
              <div className="col-span-4 truncate text-[11px]">
                <strong className="text-[var(--text)]">{r.pt}</strong>
                <div className="text-[10px] text-[var(--text-muted)] truncate">{r.intervention}</div>
              </div>

              <div className="col-span-6 relative h-6 flex items-center">
                {/* ROR = 1 baseline reference line */}
                <div
                  className="absolute top-0 bottom-0 w-[1px] bg-[var(--text-muted)]/40 border-r border-dashed border-[var(--text-muted)]"
                  style={{ left: `${(1 / 6) * 100}%` }}
                />

                {/* Whisker Bar */}
                <div
                  className="absolute h-1 rounded-full bg-[var(--border)]"
                  style={{
                    left: `${leftPct}%`,
                    width: `${Math.max(4, rightPct - leftPct)}%`,
                  }}
                />

                {/* Point Estimate Dot */}
                <div
                  className={`absolute h-3 w-3 -ml-1.5 rounded-full shadow-sm ${
                    r.signal ? "bg-[var(--warn)] shadow-[0_0_8px_var(--warn)]" : "bg-[var(--brand)]"
                  }`}
                  style={{ left: `${centerPct}%` }}
                />
              </div>

              <div className="col-span-2 text-right text-[10px] text-[var(--text-muted)]">
                {r.ror} <span className="text-[9px]">({r.ror_ci_low}–{r.ror_ci_high})</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DisproportionalityCard({ rows }: { rows: any[] }) {
  return (
    <Card
      title="Disproportionality Signal Detection (PRR / ROR)"
      actions={
        <span className="text-xs font-mono text-[var(--text-muted)]">
          Evans Criteria: PRR ≥ 2, χ² ≥ 4, n ≥ 3
        </span>
      }
    >
      <p className="mb-4 text-xs text-[var(--text-muted)] leading-relaxed">
        Compares each botanical formulation × adverse event pair against the rest of the safety database utilizing the Proportional Reporting Ratio and Reporting Odds Ratio (with 95% confidence intervals)—mirroring WHO-UMC VigiBase statistical methodology.
      </p>

      {rows.length > 0 && <SignalForestPlot rows={rows} />}

      {rows.length === 0 ? (
        <Empty>Insufficient adverse reaction frequency to compute statistical disproportionality</Empty>
      ) : (
        <Table
          head={[
            "Intervention",
            "Preferred Term",
            "Contingency (a/b/c/d)",
            "PRR",
            "χ²",
            "ROR (95% CI)",
            "Signal Status",
          ]}
        >
          {rows.map((r) => (
            <tr
              key={`${r.intervention}-${r.pt}`}
              className={r.signal ? "bg-[var(--warn-bg)]/20" : "hover:bg-[var(--surface-2)]/60"}
            >
              <td className="td font-medium text-xs">{r.intervention}</td>
              <td className="td font-semibold text-xs text-[var(--text)]">{r.pt}</td>
              <td className="td font-mono text-[11px] text-[var(--text-muted)]">
                {r.a}/{r.b}/{r.c}/{r.d}
              </td>
              <td className="td font-mono font-semibold text-xs">{r.prr ?? "—"}</td>
              <td className="td font-mono text-xs">{r.chi_square}</td>
              <td className="td font-mono text-xs text-[var(--text)]">
                {r.ror} <span className="text-[10px] text-[var(--text-muted)]">({r.ror_ci_low}–{r.ror_ci_high})</span>
              </td>
              <td className="td">
                {r.signal ? (
                  <Badge tone="amber">Emerging Signal</Badge>
                ) : (
                  <span className="text-[var(--text-faint)] text-xs font-mono">Nominal</span>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </Card>
  );
}

/* ── Prakriti Triad Glyph & Stratification ── */
function PrakritiGlyph({ prakriti }: { prakriti: string }) {
  const p = (prakriti || "").toUpperCase();
  const isVata = p.includes("VATA");
  const isPitta = p.includes("PITTA");
  const isKapha = p.includes("KAPHA");

  return (
    <div className="flex items-center gap-1 font-mono text-[10px]">
      {isVata && <span className="h-2 w-2 rounded-full bg-[#7A8FB8]" title="Vata (Air)" />}
      {isPitta && <span className="h-2 w-2 rounded-full bg-[#E0713A]" title="Pitta (Agni)" />}
      {isKapha && <span className="h-2 w-2 rounded-full bg-[#6FA36B]" title="Kapha (Earth)" />}
      <span className="ml-1 text-[var(--text)] font-semibold">{prakriti}</span>
    </div>
  );
}

function PrakritiCard({ rows }: { rows: any[] }) {
  return (
    <Card title="Outcomes Stratified by Prakriti (Constitutional Phenotype)">
      <p className="mb-4 text-xs text-[var(--text-muted)] leading-relaxed">
        Cross-tabulates Ayurvedic constitutional phenotypes against safety and efficacy endpoints—demonstrating whether specific doshic archetypes correlate with altered adverse event incidence or primary outcome efficacy.
      </p>
      {rows.length === 0 ? (
        <Empty>No baseline Prakriti phenotype assessments recorded in EDC</Empty>
      ) : (
        <Table
          head={[
            "Prakriti Archetype",
            "Cohort (n)",
            "Avg. Primary Endpoint Delta",
            "Avg. AEs / Subject",
            "Severe SAEs",
          ]}
        >
          {rows.map((r) => (
            <tr key={r.prakriti} className="hover:bg-[var(--surface-2)]/60">
              <td className="td">
                <PrakritiGlyph prakriti={r.prakriti} />
              </td>
              <td className="td font-mono">
                {r.n}
                {r.low_n && (
                  <span className="ml-2 font-mono text-[10px] text-[var(--text-muted)] border border-[var(--border)] px-1 py-0.5 rounded">
                    small n (&lt;5)
                  </span>
                )}
              </td>
              <td className="td font-mono font-semibold text-xs text-[var(--text)]">
                {r.avg_score_change ?? "—"}
              </td>
              <td className="td font-mono text-xs">{r.avg_ae_per_participant}</td>
              <td className="td font-mono text-xs">
                {r.sae_total > 0 ? (
                  <Badge tone="red">{r.sae_total}</Badge>
                ) : (
                  <span className="text-[var(--text-faint)]">0</span>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </Card>
  );
}

export default function SignalsPage() {
  const [study, setStudy] = useState("");
  const { data: studies = [] } = useQuery<any[]>({
    queryKey: ["studies"],
    queryFn: () => get("/studies"),
  });
  const { data: s, isLoading } = useQuery<any>({
    queryKey: ["signals", study],
    queryFn: () => get(`/pv/signals${study ? `?study_id=${study}` : ""}`),
  });
  const { data: prakriti = [] } = useQuery<any[]>({
    queryKey: ["prakriti", study],
    queryFn: () =>
      get(`/dashboard/prakriti${study ? `?study_id=${study}` : ""}`),
  });

  if (isLoading || !s) return <Loading />;
  const cc = s.clock_compliance;
  const done = cc.on_time + cc.late;

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <PageHeader
        eyebrow="PHARMACOVIGILANCE & SAFETY COMMAND"
        title="Pharmacovigilance Signal Surveillance"
        description="Disproportionality ratios, MedDRA clustering, and Ayurvedic Prakriti phenotypic stratification"
        actions={
          <select
            className="input w-64 text-xs font-mono"
            value={study}
            onChange={(e) => setStudy(e.target.value)}
            aria-label="Filter by protocol study"
          >
            <option value="">All Protocol Studies</option>
            {studies.map((x) => (
              <option key={x.id} value={x.id}>
                {x.protocol_no} — {x.title}
              </option>
            ))}
          </select>
        }
      />

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
        <KpiCard
          label="Regulatory Clock Compliance"
          value={done ? `${Math.round((100 * cc.on_time) / done)}%` : "—"}
          sub={`${cc.on_time} of ${done} transmitted on time`}
          tone="ok"
        />
        <KpiCard
          label="Late Submissions"
          value={cc.late}
          sub="Transmitted past statutory SLA"
          tone={cc.late ? "warn" : "default"}
        />
        <KpiCard
          label="Overdue Clocks"
          value={cc.overdue}
          sub="Requires immediate dispatch"
          tone={cc.overdue ? "danger" : "default"}
        />
        <KpiCard
          label="Active Running Clocks"
          value={cc.running}
          sub="Under active surveillance"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Preferred Terms Table */}
        <Card title="Adverse Incidents by Preferred Term (PT)">
          <Table
            head={[
              "Preferred Term",
              "System Organ Class",
              "Count",
              "Serious",
              "Flag",
            ]}
          >
            {s.by_pt.map((r: any) => (
              <tr
                key={r.pt}
                className={r.flag ? "bg-[var(--warn-bg)]/20" : "hover:bg-[var(--surface-2)]/60"}
              >
                <td className="td font-medium text-xs text-[var(--text)]">{r.pt}</td>
                <td className="td text-xs text-[var(--text-muted)]">{r.soc}</td>
                <td className="td font-mono text-xs">{r.n}</td>
                <td className="td font-mono text-xs">
                  {r.serious > 0 ? (
                    <Badge tone="red">{r.serious}</Badge>
                  ) : (
                    <span className="text-[var(--text-faint)]">0</span>
                  )}
                </td>
                <td className="td">
                  {r.flag ? <Badge tone="amber">Review</Badge> : "—"}
                </td>
              </tr>
            ))}
          </Table>
        </Card>

        {/* Charts Column */}
        <div className="space-y-6">
          <Card
            title="Weekly Incident Trajectory"
            actions={
              <ChartLegend
                items={[
                  { label: "All AEs", color: CHART_PALETTE.enrolled },
                  { label: "Serious (SAE)", color: CHART_PALETTE.escalated },
                ]}
              />
            }
          >
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={s.trend} margin={{ left: -20, right: 10, top: 10 }}>
                  <CartesianGrid {...sharedCartesianGridProps} />
                  <XAxis
                    dataKey="week"
                    {...sharedXAxisProps}
                    tickFormatter={(w: string) => w.slice(5)}
                  />
                  <YAxis
                    {...sharedYAxisProps}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={CHART_PALETTE.cursorLine}
                    content={<ChartTooltip />}
                  />
                  <Area
                    dataKey="n"
                    name="All Adverse Events"
                    stroke={CHART_PALETTE.enrolled}
                    fill={CHART_PALETTE.enrolled}
                    fillOpacity={0.2}
                  />
                  <Area
                    dataKey="serious"
                    name="Serious (SAE)"
                    stroke={CHART_PALETTE.escalated}
                    fill={CHART_PALETTE.escalated}
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Distribution by System Organ Class (SOC)">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.by_soc} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 0 }}>
                  <CartesianGrid horizontal={false} stroke="rgba(47, 179, 154, 0.08)" strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    {...sharedXAxisProps}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="soc"
                    {...sharedYAxisProps}
                    width={130}
                  />
                  <Tooltip
                    cursor={CHART_PALETTE.cursorBar}
                    content={<ChartTooltip />}
                  />
                  <Bar
                    dataKey="n"
                    name="Adverse Events"
                    fill={CHART_PALETTE.enrolled}
                    radius={[0, 6, 6, 0]}
                    maxBarSize={22}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>

      {/* Disproportionality & Prakriti Cards */}
      <DisproportionalityCard rows={s.disproportionality ?? []} />
      <PrakritiCard rows={prakriti} />
    </div>
  );
}
