import clsx from "clsx";
import { Check, Lock } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, human } from "./ui";

export function KpiCard({ label, value, sub, tone = "default", icon }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "default" | "warn" | "danger" | "ok"; icon?: ReactNode }) {
  return (
    <div
      className={clsx(
        "rounded-xl border bg-white p-4 shadow-sm",
        tone === "danger" && "border-red-200 bg-red-50/50",
        tone === "warn" && "border-amber-200 bg-amber-50/50",
        tone === "ok" && "border-emerald-200",
        tone === "default" && "border-slate-200",
      )}
    >
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
        {icon}
      </div>
      <div className={clsx("mt-1 text-2xl font-semibold", tone === "danger" ? "text-red-700" : tone === "warn" ? "text-amber-700" : "text-slate-900")}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export const STATES = ["DRAFT", "PROTOCOL_APPROVED", "EC_APPROVED", "CTRI_REGISTERED", "SITE_ACTIVE", "ENROLLING", "FOLLOW_UP", "CLOSED"];

export function LifecycleStepper({ state, blockers }: { state: string; blockers?: string[] }) {
  const idx = STATES.indexOf(state);
  return (
    <div>
      <ol className="flex flex-wrap items-center gap-y-3">
        {STATES.map((s, i) => (
          <li key={s} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <span
                className={clsx(
                  "flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold",
                  i < idx && "border-brand-700 bg-brand-700 text-white",
                  i === idx && "border-brand-700 bg-white text-brand-800 ring-4 ring-brand-100",
                  i === idx + 1 && blockers?.length ? "border-amber-400 bg-amber-50 text-amber-700" : "",
                  i > idx && !(i === idx + 1 && blockers?.length) && "border-slate-300 bg-white text-slate-400",
                )}
              >
                {i < idx ? <Check size={14} /> : i === idx + 1 && blockers?.length ? <Lock size={12} /> : i + 1}
              </span>
              <span className={clsx("w-20 text-center text-[10px] leading-tight", i <= idx ? "font-medium text-slate-800" : "text-slate-400")}>{human(s)}</span>
            </div>
            {i < STATES.length - 1 && <span className={clsx("mx-1 mb-5 h-0.5 w-6", i < idx ? "bg-brand-700" : "bg-slate-200")} />}
          </li>
        ))}
      </ol>
      {!!blockers?.length && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <b>Next step blocked:</b> {blockers.join("; ")}
        </div>
      )}
    </div>
  );
}

function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export interface Clock {
  id: number;
  rule_key: string;
  rule_description?: string;
  started_at: string;
  due_at: string;
  status: string;
  completed_at?: string | null;
}

/** Live countdown chip for a regulatory reporting clock. */
export function SaeClockChip({ clock, compact }: { clock: Clock; compact?: boolean }) {
  const now = useNow();
  const start = Date.parse(clock.started_at);
  const due = Date.parse(clock.due_at);
  if (clock.status === "COMPLETED") {
    const late = clock.completed_at && Date.parse(clock.completed_at) > due;
    return <Badge tone={late ? "amber" : "green"}>{compact ? "" : `${clock.rule_key.replace(/_/g, " ")}: `}{late ? "submitted late" : "submitted"}</Badge>;
  }
  const pct = Math.min(100, Math.max(0, ((now - start) / (due - start)) * 100));
  const left = due - now;
  const abs = Math.abs(left);
  const h = Math.floor(abs / 3.6e6);
  const m = Math.floor((abs % 3.6e6) / 6e4);
  const s = Math.floor((abs % 6e4) / 1000);
  const text = h >= 48 ? `${Math.floor(h / 24)}d ${h % 24}h` : `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  const color = left < 0 ? "bg-red-600" : pct >= 80 ? "bg-red-500" : pct >= 50 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className={clsx("min-w-44 rounded-md border px-2 py-1", left < 0 ? "border-red-300 bg-red-50" : "border-slate-200 bg-white")}>
      {!compact && <div className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-500">{clock.rule_key.replace(/_/g, " ")}</div>}
      <div className={clsx("font-mono text-sm font-semibold tabular-nums", left < 0 ? "text-red-700" : pct >= 80 ? "text-red-600" : "text-slate-800")}>
        {left < 0 ? `OVERDUE ${text}` : `${text} left`}
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-200" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className={clsx("h-full", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function EnrolmentChart({ curve, target, expected }: { curve: { week: string; n: number; cumulative: number }[]; target: number; expected?: number | null }) {
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <ComposedChart data={curve.map((c) => ({ ...c, target }))} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="week" tick={{ fontSize: 10 }} tickFormatter={(w: string) => w.slice(5)} />
          <YAxis yAxisId="l" tick={{ fontSize: 10 }} />
          <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="r" dataKey="n" name="Enrolled / week" fill="#99f6e4" />
          <Line yAxisId="l" dataKey="cumulative" name="Cumulative" stroke="#0f766e" strokeWidth={2} dot={false} />
          <Line yAxisId="l" dataKey="target" name="Target" stroke="#94a3b8" strokeDasharray="4 4" dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
      {expected != null && <p className="mt-1 text-xs text-slate-500">Expected by today on a linear plan: {expected}</p>}
    </div>
  );
}

export const STATE_TONE: Record<string, "gray" | "blue" | "teal" | "green" | "amber" | "purple"> = {
  DRAFT: "gray",
  PROTOCOL_APPROVED: "blue",
  EC_APPROVED: "blue",
  CTRI_REGISTERED: "purple",
  SITE_ACTIVE: "purple",
  ENROLLING: "green",
  FOLLOW_UP: "teal",
  CLOSED: "gray",
};
