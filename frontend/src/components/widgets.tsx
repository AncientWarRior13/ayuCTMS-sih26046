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
import {
  CHART_PALETTE,
  ChartTooltip,
  sharedCartesianGridProps,
  sharedXAxisProps,
  sharedYAxisProps,
} from "./ChartTheme";

/* ── 1. KPI Tile with High Authority Numerals & Accent Bar ── */
export function KpiCard({
  label,
  value,
  unit,
  sub,
  tone = "default",
  icon,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  sub?: ReactNode;
  tone?: "default" | "warn" | "danger" | "ok";
  icon?: ReactNode;
}) {
  let displayVal = value;
  let displayUnit = unit;

  if (typeof value === "string") {
    const match = value.match(/^([\d\+\-\/\.\,\%]+(?:\s*\/\s*[\d\+\-\/\.\,]+)?)\s*([A-Za-z].*)$/);
    if (match) {
      displayVal = match[1].trim();
      if (!displayUnit) {
        displayUnit = match[2].trim().toUpperCase();
      }
    }
  }

  const unitColor =
    tone === "danger"
      ? "text-[#E5484D]"
      : tone === "warn"
        ? "text-[#D9A441]"
        : tone === "ok"
          ? "text-[#39C8AD]"
          : "text-[#8FA398]";

  return (
    <div
      className={clsx(
        "card p-4 transition-all duration-200 relative overflow-hidden group border rounded-xl bg-[#101815]/90 backdrop-blur-md shadow-md min-h-[114px] flex flex-col justify-between",
        tone === "danger" && "border-[#E5484D]/40 bg-[#E5484D]/10 hover:border-[#E5484D]/60",
        tone === "warn" && "border-[#D9A441]/40 bg-[#D9A441]/10 hover:border-[#D9A441]/60",
        tone === "ok" && "border-[#2FB39A]/40 bg-[#2FB39A]/10 hover:border-[#2FB39A]/60",
        tone === "default" && "border-[#22302A] hover:border-[#2FB39A]/40 hover:shadow-[0_0_16px_rgba(47,179,154,0.12)]",
      )}
    >
      <div
        className={clsx(
          "absolute left-0 top-0 bottom-0 w-[2.5px]",
          tone === "danger" && "bg-[#E5484D] shadow-[0_0_8px_#E5484D]",
          tone === "warn" && "bg-[#D9A441] shadow-[0_0_8px_#D9A441]",
          tone === "ok" && "bg-[#2FB39A] shadow-[0_0_8px_#2FB39A]",
          tone === "default" && "bg-[#22302A] group-hover:bg-[#2FB39A]",
        )}
      />
      <div className="flex items-center justify-between text-[0.6875rem] font-mono font-semibold uppercase tracking-wider text-[#8FA398]">
        <span className="truncate pr-2">{label}</span>
        <span className="text-[#56685F] group-hover:text-[#2FB39A] transition-colors shrink-0">
          {icon}
        </span>
      </div>
      <div className="mt-1.5 flex items-baseline whitespace-nowrap overflow-hidden">
        <span
          className={clsx(
            "text-kpi-numeral font-medium tracking-tight tabular-nums truncate",
            tone === "danger"
              ? "text-[#E5484D]"
              : tone === "warn"
                ? "text-[#D9A441]"
                : tone === "ok"
                  ? "text-[#39C8AD]"
                  : "text-[#E8EFE9]",
          )}
        >
          {displayVal}
        </span>
        {displayUnit && (
          <span className={clsx("font-mono text-[0.6875rem] font-bold uppercase tracking-wider ml-1.5 shrink-0", unitColor)}>
            {displayUnit}
          </span>
        )}
      </div>
      {sub && (
        <div className="mt-1 text-[0.8125rem] text-[#8FA398] font-sans truncate" title={typeof sub === "string" ? sub : undefined}>
          {sub}
        </div>
      )}
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
  size = 80,
}: {
  clock: Clock;
  size?: number;
}) {
  const now = useNow();
  const start = Date.parse(clock.started_at);
  const due = Date.parse(clock.due_at);

  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;

  if (clock.status === "COMPLETED") {
    const late = clock.completed_at && Date.parse(clock.completed_at) > due;
    return (
      <div className="flex flex-col items-center justify-center p-2.5 text-center border border-[var(--border)] rounded-xl bg-[var(--surface-1)]" style={{ width: size + 20 }}>
        <ShieldCheck
          size={24}
          className={late ? "text-[var(--warn)]" : "text-[var(--ok)]"}
        />
        <span className="mt-1 text-[0.6875rem] font-mono font-semibold tracking-wider text-[var(--text)]">
          {late ? "SUBMITTED LATE" : "ON TIME"}
        </span>
        <span className="text-[0.625rem] text-[var(--text-muted)] font-mono uppercase truncate max-w-[80px]">
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

  const sign = isOverdue ? "-" : "";
  const primaryTime =
    h >= 48
      ? `${sign}${Math.floor(h / 24)}d ${h % 24}h`
      : `${sign}${h}h ${String(m).padStart(2, "0")}m`;
  const secondsText = `${String(s).padStart(2, "0")}s`;

  return (
    <div className="flex flex-col items-center p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] shadow-sm">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--border)"
            strokeWidth="5"
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1 pointer-events-none">
          <span
            className={clsx(
              "font-mono text-[0.75rem] font-bold tabular-nums tracking-tight whitespace-nowrap leading-none",
              isOverdue ? "text-[var(--danger)]" : "text-[var(--text)]",
            )}
          >
            {primaryTime}
          </span>
          <span className="font-mono text-[0.625rem] text-[var(--text-muted)] tabular-nums mt-0.5 leading-none">
            {secondsText}
          </span>
          <span
            className={clsx(
              "text-[0.5625rem] font-mono uppercase tracking-widest font-bold mt-1 leading-none",
              isOverdue ? "text-[var(--danger)]" : "text-[var(--text-muted)]",
            )}
          >
            {isOverdue ? "OVERDUE" : "REMAINING"}
          </span>
        </div>
      </div>
      <div className="mt-1.5 text-center text-[0.625rem] font-mono font-semibold uppercase tracking-wider text-[var(--text-muted)] max-w-[100px] truncate" title={clock.rule_key.replace(/_/g, " ")}>
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
    <div className="h-[270px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={curve.map((c) => ({ ...c, target }))}
          margin={{ top: 8, right: 12, left: -15, bottom: 0 }}
        >
          <CartesianGrid {...sharedCartesianGridProps} />
          <XAxis
            dataKey="week"
            {...sharedXAxisProps}
            tickFormatter={(w: string) => w.slice(5)}
          />
          <YAxis yAxisId="l" {...sharedYAxisProps} />
          <YAxis yAxisId="r" orientation="right" {...sharedYAxisProps} />
          <Tooltip
            content={<ChartTooltip />}
            cursor={CHART_PALETTE.cursorBar}
          />
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{
              fontSize: "0.6875rem",
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              paddingBottom: 10,
            }}
          />
          <Bar
            yAxisId="r"
            dataKey="n"
            name="Enrolled / week"
            fill={CHART_PALETTE.enrolled}
            opacity={0.85}
            radius={[6, 6, 0, 0]}
            maxBarSize={28}
          />
          <Line
            yAxisId="l"
            dataKey="cumulative"
            name="Cumulative"
            stroke={CHART_PALETTE.brandText}
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="l"
            dataKey="target"
            name="Target"
            stroke={CHART_PALETTE.target}
            strokeDasharray="4 4"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      {expected != null && (
        <p className="mt-1 text-[0.8125rem] text-[#8FA398] font-sans">
          Expected by today on linear timeline: <span className="text-[#E8EFE9] font-mono font-semibold">{expected}</span>
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
