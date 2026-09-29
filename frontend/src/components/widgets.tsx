import clsx from "clsx";
import { Check, Lock, AlertCircle, ShieldCheck } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge, human } from "./ui";

/* ── 1. KPI Tile with High Authority Numerals & Accent Bar ── */
export function KpiCard({
  label,
  value,
  sub,
  tone = "default",
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "default" | "warn" | "danger" | "ok";
  icon?: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "card p-4 transition-all duration-200 relative overflow-hidden group border",
        tone === "danger" && "border-[var(--danger-border)] bg-[var(--danger-bg)]/20",
        tone === "warn" && "border-[var(--warn-border)] bg-[var(--warn-bg)]/20",
        tone === "ok" && "border-[var(--ok-border)] bg-[var(--ok-bg)]/20",
        tone === "default" && "border-[var(--border)] hover:border-[var(--brand)]/40",
      )}
    >
      <div
        className={clsx(
          "absolute left-0 top-0 bottom-0 w-1",
          tone === "danger" && "bg-[var(--danger)]",
          tone === "warn" && "bg-[var(--warn)]",
          tone === "ok" && "bg-[var(--ok)]",
          tone === "default" && "bg-[var(--border)] group-hover:bg-[var(--brand)]",
        )}
      />
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        <span>{label}</span>
        <span className="text-[var(--text-faint)] group-hover:text-[var(--text)] transition-colors">
          {icon}
        </span>
      </div>
      <div
        className={clsx(
          "mt-2 font-display text-3xl font-semibold tracking-tight tabular-nums",
          tone === "danger"
            ? "text-[var(--danger)]"
            : tone === "warn"
              ? "text-[var(--warn)]"
              : tone === "ok"
                ? "text-[var(--ok)]"
                : "text-[var(--text)]",
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-[var(--text-muted)]">{sub}</div>}
    </div>
  );
}

export const STATES = [
  "DRAFT",
  "PROTOCOL_APPROVED",
  "EC_APPROVED",
  "CTRI_REGISTERED",
  "SITE_ACTIVE",
  "ENROLLING",
  "FOLLOW_UP",
  "CLOSED",
];

/* ── 2. Lifecycle Vine / Stepper with Organic Node Visuals ── */
export function LifecycleStepper({
  state,
  blockers,
}: {
  state: string;
  blockers?: string[];
}) {
  const idx = STATES.indexOf(state);

  return (
    <div className="w-full">
      <div className="overflow-x-auto pb-2">
        <ol className="flex items-center min-w-[700px] justify-between relative py-2">
          {STATES.map((s, i) => {
            const isDone = i < idx;
            const isCurrent = i === idx;
            const isNext = i === idx + 1;
            const hasBlockers = isNext && blockers?.length;

            return (
              <li key={s} className="flex-1 flex items-center relative group">
                <div className="flex flex-col items-center gap-1.5 z-10 mx-auto">
                  <span
                    className={clsx(
                      "flex h-8 w-8 items-center justify-center rounded-full text-xs font-mono font-semibold transition-all duration-300 border",
                      isDone &&
                        "border-[var(--brand)] bg-[var(--brand)] text-[#0A0F0D] shadow-[0_0_8px_var(--brand-glow)]",
                      isCurrent &&
                        "border-[var(--brand)] bg-[var(--surface-1)] text-[var(--brand)] ring-4 ring-[var(--brand-glow)] animate-pulse-subtle",
                      hasBlockers &&
                        "border-[var(--warn)] bg-[var(--warn-bg)] text-[var(--warn)]",
                      !isDone &&
                        !isCurrent &&
                        !hasBlockers &&
                        "border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]",
                    )}
                  >
                    {isDone ? (
                      <Check size={14} strokeWidth={3} />
                    ) : hasBlockers ? (
                      <Lock size={12} />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span
                    className={clsx(
                      "w-20 text-center text-[10px] uppercase tracking-wider leading-tight",
                      isCurrent
                        ? "font-bold text-[var(--brand)]"
                        : isDone
                          ? "font-medium text-[var(--text)]"
                          : "text-[var(--text-faint)]",
                    )}
                  >
                    {human(s)}
                  </span>
                </div>

                {/* Connecting vine/hairline */}
                {i < STATES.length - 1 && (
                  <div
                    className={clsx(
                      "absolute top-4 left-1/2 w-full h-[2px] -z-0 transition-colors",
                      isDone
                        ? "bg-[var(--brand)]"
                        : isCurrent
                          ? "bg-gradient-to-r from-[var(--brand)] to-[var(--border)]"
                          : "bg-[var(--border)]",
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>
      {!!blockers?.length && (
        <div className="mt-3 rounded-[var(--radius-sm)] border border-[var(--warn-border)] bg-[var(--warn-bg)] px-3.5 py-2 text-xs text-[var(--warn)] flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <div>
            <strong className="font-semibold">Gate Blocked:</strong> {blockers.join("; ")}
          </div>
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

/* ── 3. Radial ClockRing and Compact Chip ── */
export function ClockRing({
  clock,
  size = 110,
}: {
  clock: Clock;
  size?: number;
}) {
  const now = useNow();
  const start = Date.parse(clock.started_at);
  const due = Date.parse(clock.due_at);

  const radius = (size - 14) / 2;
  const circumference = 2 * Math.PI * radius;

  if (clock.status === "COMPLETED") {
    const late = clock.completed_at && Date.parse(clock.completed_at) > due;
    return (
      <div className="flex flex-col items-center justify-center p-3 text-center border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-1)]">
        <ShieldCheck
          size={28}
          className={late ? "text-[var(--warn)]" : "text-[var(--ok)]"}
        />
        <span className="mt-1 text-xs font-mono font-medium">
          {late ? "SUBMITTED LATE" : "SUBMITTED ON TIME"}
        </span>
        <span className="text-[10px] text-[var(--text-muted)] uppercase">
          {clock.rule_key.replace(/_/g, " ")}
        </span>
      </div>
    );
  }

  const pct = Math.min(100, Math.max(0, ((now - start) / (due - start)) * 100));
  const left = due - now;
  const abs = Math.abs(left);
  const h = Math.floor(abs / 3.6e6);
  const m = Math.floor((abs % 3.6e6) / 6e4);
  const s = Math.floor((abs % 6e4) / 1000);

  const isOverdue = left < 0;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  const color = isOverdue
    ? "var(--danger)"
    : pct >= 80
      ? "var(--danger)"
      : pct >= 50
        ? "var(--warn)"
        : "var(--ok)";

  const formattedTime =
    h >= 48
      ? `${Math.floor(h / 24)}d ${h % 24}h`
      : `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;

  return (
    <div className="flex flex-col items-center p-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-1)] shadow-sm">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--border)"
            strokeWidth="6"
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span
            className={clsx(
              "text-xs font-mono font-bold tabular-nums",
              isOverdue ? "text-[var(--danger)] animate-pulse" : "text-[var(--text)]",
            )}
          >
            {isOverdue ? `-${formattedTime}` : formattedTime}
          </span>
          <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
            {isOverdue ? "Overdue" : "Remaining"}
          </span>
        </div>
      </div>
      <div className="mt-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] max-w-[120px] truncate">
        {clock.rule_key.replace(/_/g, " ")}
      </div>
    </div>
  );
}

/** Standard SaeClockChip kept for backward compatibility */
export function SaeClockChip({
  clock,
  compact,
}: {
  clock: Clock;
  compact?: boolean;
}) {
  const now = useNow();
  const start = Date.parse(clock.started_at);
  const due = Date.parse(clock.due_at);

  if (clock.status === "COMPLETED") {
    const late = clock.completed_at && Date.parse(clock.completed_at) > due;
    return (
      <Badge tone={late ? "amber" : "green"}>
        {compact ? "" : `${clock.rule_key.replace(/_/g, " ")}: `}
        {late ? "submitted late" : "submitted"}
      </Badge>
    );
  }

  const pct = Math.min(100, Math.max(0, ((now - start) / (due - start)) * 100));
  const left = due - now;
  const abs = Math.abs(left);
  const h = Math.floor(abs / 3.6e6);
  const m = Math.floor((abs % 3.6e6) / 6e4);
  const s = Math.floor((abs % 6e4) / 1000);
  const text =
    h >= 48
      ? `${Math.floor(h / 24)}d ${h % 24}h`
      : `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;

  const color =
    left < 0
      ? "bg-[var(--danger)]"
      : pct >= 80
        ? "bg-[var(--danger)]"
        : pct >= 50
          ? "bg-[var(--warn)]"
          : "bg-[var(--ok)]";

  return (
    <div
      className={clsx(
        "min-w-44 rounded-[var(--radius-sm)] border px-2.5 py-1.5 transition-colors",
        left < 0
          ? "border-[var(--danger-border)] bg-[var(--danger-bg)]"
          : "border-[var(--border)] bg-[var(--surface-1)]",
      )}
    >
      {!compact && (
        <div className="truncate text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {clock.rule_key.replace(/_/g, " ")}
        </div>
      )}
      <div
        className={clsx(
          "font-mono text-xs font-semibold tabular-nums mt-0.5",
          left < 0
            ? "text-[var(--danger)] font-bold"
            : pct >= 80
              ? "text-[var(--danger)]"
              : "text-[var(--text)]",
        )}
      >
        {left < 0 ? `OVERDUE ${text}` : `${text} left`}
      </div>
      <div
        className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={clsx("h-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ── 4. Re-skinned Clinical Enrolment Chart ── */
export function EnrolmentChart({
  curve,
  target,
  expected,
}: {
  curve: { week: string; n: number; cumulative: number }[];
  target: number;
  expected?: number | null;
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={curve.map((c) => ({ ...c, target }))}
          margin={{ top: 8, right: 12, left: -10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
          <XAxis
            dataKey="week"
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            tickFormatter={(w: string) => w.slice(5)}
            stroke="var(--border)"
          />
          <YAxis
            yAxisId="l"
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            stroke="var(--border)"
          />
          <YAxis
            yAxisId="r"
            orientation="right"
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
          <Bar
            yAxisId="r"
            dataKey="n"
            name="Enrolled / week"
            fill="var(--brand)"
            opacity={0.7}
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="l"
            dataKey="cumulative"
            name="Cumulative"
            stroke="var(--brand-text)"
            strokeWidth={2.5}
            dot={false}
          />
          <Line
            yAxisId="l"
            dataKey="target"
            name="Target"
            stroke="var(--accent-brass)"
            strokeDasharray="4 4"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      {expected != null && (
        <p className="mt-2 text-xs text-[var(--text-muted)] font-mono">
          Expected by today on linear timeline: <span className="text-[var(--text)] font-semibold">{expected}</span>
        </p>
      )}
    </div>
  );
}

export const STATE_TONE: Record<
  string,
  "gray" | "blue" | "teal" | "green" | "amber" | "purple"
> = {
  DRAFT: "gray",
  PROTOCOL_APPROVED: "blue",
  EC_APPROVED: "blue",
  CTRI_REGISTERED: "purple",
  SITE_ACTIVE: "purple",
  ENROLLING: "green",
  FOLLOW_UP: "teal",
  CLOSED: "gray",
};
