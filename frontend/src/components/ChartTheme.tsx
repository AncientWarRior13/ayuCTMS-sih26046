import { useState, useEffect, type ReactNode } from "react";

export const CHART_PALETTE = {
  enrolled: "#2FB39A",
  expected: "#D9A441",
  target: "#6F8A80",
  targetText: "#9DB3AB",
  brandText: "#45D3B5",
  escalated: "#E05A47",
  muted: "#8FA398",
  faint: "#56685F",
  gridStroke: "rgba(255, 255, 255, 0.08)",
  cardBg: "#0F1C18",
  cursorBar: {
    fill: "rgba(47, 179, 154, 0.08)",
    stroke: "rgba(47, 179, 154, 0.25)",
    strokeWidth: 1,
    rx: 8,
    ry: 8,
  },
  cursorLine: {
    stroke: "rgba(47, 179, 154, 0.4)",
    strokeDasharray: "3 3",
  },
} as const;

export const sharedCartesianGridProps = {
  strokeDasharray: "3 3",
  stroke: CHART_PALETTE.gridStroke,
  vertical: false,
} as const;

export const sharedXAxisProps = {
  axisLine: false,
  tickLine: false,
  tick: {
    fontSize: 11,
    fill: CHART_PALETTE.muted,
    fontFamily: "var(--font-mono)",
  },
} as const;

export const sharedYAxisProps = {
  axisLine: false,
  tickLine: false,
  tick: {
    fontSize: 11,
    fill: CHART_PALETTE.muted,
    fontFamily: "var(--font-mono)",
  },
} as const;

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return reduced;
}

export interface ChartLegendItem {
  label: string;
  color: string;
}

export function ChartLegend({ items }: { items: ChartLegendItem[] }) {
  return (
    <div className="flex items-center gap-3 font-mono text-[0.6875rem] font-semibold uppercase tracking-wider select-none">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-1.5 text-[#8FA398]">
          <span
            className="h-2 w-2 rounded-full shrink-0 shadow-sm"
            style={{ backgroundColor: it.color }}
          />
          <span>{it.label}</span>
        </div>
      ))}
    </div>
  );
}

export function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter,
  labelFormatter,
}: {
  active?: boolean;
  payload?: any[];
  label?: string | number;
  valueFormatter?: (v: any, name: string) => ReactNode;
  labelFormatter?: (l: any) => ReactNode;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-[rgba(47,179,154,0.25)] bg-[#0F1C18]/95 p-3 shadow-xl backdrop-blur-md min-w-[150px] animate-fade-in pointer-events-none">
      {label != null && (
        <div className="mb-2 font-mono text-[0.6875rem] font-semibold uppercase tracking-wider text-[#8FA398] border-b border-[#22302A] pb-1">
          {labelFormatter ? labelFormatter(label) : String(label)}
        </div>
      )}
      <div className="space-y-1.5">
        {payload.map((entry: any, i: number) => {
          const name = entry.name ?? entry.dataKey ?? "";
          const isTarget = String(name).toLowerCase().includes("target");
          const color = entry.color || entry.fill || CHART_PALETTE.enrolled;
          const val = valueFormatter ? valueFormatter(entry.value, name) : entry.value;

          return (
            <div key={i} className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="h-2 w-2 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[#8FA398] text-[0.75rem] truncate font-sans">
                  {name}
                </span>
              </div>
              <span
                className="font-mono text-[0.75rem] font-semibold tabular-nums ml-2"
                style={{ color: isTarget ? CHART_PALETTE.targetText : "#E8EFE9" }}
              >
                {val}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
