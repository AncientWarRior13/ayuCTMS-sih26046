import clsx from "clsx";
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { BrandMark } from "./BrandMark";

export { BrandMark };

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "brass";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <button
      {...p}
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] font-medium transition-all duration-150 select-none active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "px-2.5 py-1 text-xs" : size === "lg" ? "px-5 py-2.5 text-base" : "px-3.5 py-1.5 text-sm",
        variant === "primary" &&
          "bg-[var(--brand)] text-[#0A0F0D] font-semibold hover:bg-[var(--brand-hover)] shadow-sm hover:shadow-[0_0_14px_var(--brand-glow)]",
        variant === "secondary" &&
          "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface-3)] hover:border-[var(--brand)]/40",
        variant === "danger" &&
          "bg-[var(--danger)] text-white hover:opacity-90 shadow-sm",
        variant === "ghost" &&
          "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]",
        variant === "brass" &&
          "border border-[var(--accent-brass)]/60 bg-[var(--accent-brass-subtle)] text-[var(--accent-brass)] hover:bg-[var(--accent-brass)] hover:text-[#0A0F0D] font-medium",
        className,
      )}
    />
  );
}

export function Card({
  title,
  eyebrow,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx("card overflow-hidden", className)}>
      {(title || actions || eyebrow) && (
        <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 sm:px-5 py-3 bg-[var(--surface-2)]/60">
          <div>
            {eyebrow && (
              <div className="font-mono text-[0.6875rem] uppercase font-bold tracking-wider text-[var(--accent-brass)] mb-0.5">
                {eyebrow}
              </div>
            )}
            {title && (
              <h2 className="text-section-title text-[var(--text)] font-sans flex items-center gap-2">
                {title}
              </h2>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        </header>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("mb-6 flex flex-col md:flex-row md:items-end justify-between gap-3 pb-3.5 border-b border-[#22302A]/80", className)}>
      <div className="space-y-1">
        {eyebrow && (
          <div className="font-mono text-[0.6875rem] uppercase tracking-widest text-[#C8A45C] flex items-center gap-1.5 font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-[#2FB39A] shadow-[0_0_6px_#2FB39A]" />
            {eyebrow}
          </div>
        )}
        <h1 className="text-page-title text-[#E8EFE9]">
          {title}
        </h1>
        {description && (
          <p className="text-[0.875rem] text-[#8FA398] leading-relaxed max-w-[65ch] font-sans">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0 mt-2 md:mt-0">{actions}</div>}
    </div>
  );
}

export function Chip({
  tone = "teal",
  children,
  className,
}: {
  tone?: "teal" | "brass" | "danger" | "ok" | "gray" | "info" | "purple";
  children: ReactNode;
  className?: string;
}) {
  const CHIP_TONES = {
    teal: "bg-[#2FB39A]/15 text-[#39C8AD] border-[#2FB39A]/35 shadow-[0_0_12px_rgba(47,179,154,0.15)]",
    brass: "bg-[#C8A45C]/15 text-[#C8A45C] border-[#C8A45C]/35",
    danger: "bg-[#E5484D]/15 text-[#E5484D] border-[#E5484D]/35",
    ok: "bg-[#2FB39A]/15 text-[#2FB39A] border-[#2FB39A]/35",
    gray: "bg-[#16201C] text-[#8FA398] border-[#22302A]",
    info: "bg-[#4C8DFF]/15 text-[#4C8DFF] border-[#4C8DFF]/35",
    purple: "bg-[#8B6CF0]/15 text-[#8B6CF0] border-[#8B6CF0]/35",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[0.6875rem] font-semibold uppercase tracking-wider border",
        CHIP_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function AlertCallout({
  tone = "warn",
  title,
  children,
  icon,
  className,
}: {
  tone?: "warn" | "danger" | "ok" | "info";
  title?: ReactNode;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  const CALLOUT_TONES = {
    warn: "border-[#C8A45C]/40 bg-[#C8A45C]/10 text-[#E8EFE9]",
    danger: "border-[#E5484D]/40 bg-[#E5484D]/10 text-[#E8EFE9]",
    ok: "border-[#2FB39A]/40 bg-[#2FB39A]/10 text-[#E8EFE9]",
    info: "border-[#4C8DFF]/40 bg-[#4C8DFF]/10 text-[#E8EFE9]",
  };
  const ACCENT_COLORS = {
    warn: "text-[#C8A45C]",
    danger: "text-[#E5484D]",
    ok: "text-[#2FB39A]",
    info: "text-[#4C8DFF]",
  };
  return (
    <div
      className={clsx(
        "rounded-2xl border p-4.5 shadow-lg relative overflow-hidden backdrop-blur-md flex items-start gap-3.5",
        CALLOUT_TONES[tone],
        className,
      )}
    >
      <div className={clsx("shrink-0 mt-0.5", ACCENT_COLORS[tone])}>
        {icon || <AlertTriangle size={20} />}
      </div>
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className={clsx("font-display text-base font-semibold mb-1", ACCENT_COLORS[tone])}>
            {title}
          </h4>
        )}
        <div className="text-xs sm:text-sm text-[#CBDAD0] leading-relaxed font-sans">{children}</div>
      </div>
    </div>
  );
}

const TONES = {
  gray: "bg-[var(--surface-3)] text-[var(--text-muted)] border border-[var(--border)]",
  green: "bg-[var(--ok-bg)] text-[var(--ok)] border border-[var(--ok-border)]",
  teal: "bg-[var(--brand-glow)] text-[var(--brand-text)] border border-[var(--brand)]/30",
  amber: "bg-[var(--warn-bg)] text-[var(--warn)] border border-[var(--warn-border)]",
  red: "bg-[var(--danger-bg)] text-[var(--danger)] border border-[var(--danger-border)]",
  blue: "bg-[var(--info-bg)] text-[var(--info)] border border-[var(--info-border)]",
  purple: "bg-[#8B6CF0]/10 text-[#8B6CF0] border border-[#8B6CF0]/30",
};
export type Tone = keyof typeof TONES;

export function Badge({
  tone = "gray",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-mono font-semibold uppercase tracking-wider border",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const LEVEL_TONE: Record<string, Tone> = {
  INFO: "blue",
  WARN: "amber",
  CRITICAL: "red",
};

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 backdrop-blur-sm p-4 sm:p-10 animate-fade-in"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={clsx(
          "w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)] shadow-2xl relative",
          wide ? "max-w-4xl" : "max-w-xl",
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5 bg-[var(--surface-2)]/60 rounded-t-[var(--radius-lg)]">
          <h3 className="font-display text-base font-semibold tracking-wide text-[var(--text)]">
            {title}
          </h3>
          <button
            aria-label="Close"
            onClick={onClose}
            className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={clsx("block", className)}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-[var(--text-faint)]">{hint}</span>}
    </label>
  );
}

export function Empty({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--border)] p-8 text-center bg-[var(--surface-1)]/40 flex flex-col items-center justify-center gap-3">
      <div className="text-sm text-[var(--text-muted)] max-w-sm">{children}</div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex flex-col gap-3 p-6 animate-pulse">
      <div className="h-4 w-1/3 bg-[var(--surface-3)] rounded"></div>
      <div className="h-8 w-full bg-[var(--surface-2)] rounded"></div>
      <div className="h-8 w-2/3 bg-[var(--surface-2)] rounded"></div>
    </div>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null;
  const msg = (error as Error).message || String(error);
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger)] flex items-start gap-2.5">
      <AlertCircle size={18} className="shrink-0 mt-0.5" />
      <div>{msg}</div>
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: [T, string][];
  value: T;
  onChange: (t: T) => void;
}) {
  return (
    <div
      role="tablist"
      className="flex gap-2 overflow-x-auto border-b border-[var(--border)] px-1"
    >
      {tabs.map(([k, label]) => {
        const active = value === k;
        return (
          <button
            key={k}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(k)}
            className={clsx(
              "relative whitespace-nowrap px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors",
              active
                ? "text-[var(--brand)] font-bold"
                : "text-[var(--text-muted)] hover:text-[var(--text)]",
            )}
          >
            {label}
            {active && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--brand)] shadow-[0_0_8px_var(--brand)]" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Table({
  head,
  children,
  empty,
}: {
  head: ReactNode[];
  children: ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="overflow-x-auto border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--surface-1)]">
      <table className="min-w-full divide-y divide-[var(--border)]">
        <thead className="bg-[var(--surface-2)]">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="th">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)] font-sans">
          {children}
        </tbody>
      </table>
      {empty && (
        <div className="p-8 text-center text-xs text-[var(--text-muted)]">
          No records matching the selected criteria.
        </div>
      )}
    </div>
  );
}

export const fmtDate = (v?: string | null) =>
  v
    ? new Date(v).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "-";

export const fmtDateTime = (v?: string | null) =>
  v
    ? new Date(v).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

export const human = (s?: string | null) =>
  s
    ? s
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/^\w/, (c) => c.toUpperCase())
    : "-";

type Toast = { id: number; text: string; tone: "ok" | "err" | "info" };
const ToastCtx = createContext<(text: string, tone?: Toast["tone"]) => void>(
  () => {},
);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast["tone"] = "ok") => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, text, tone }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 5000);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[999] flex w-80 flex-col gap-2"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={clsx(
              "flex items-center gap-2.5 rounded-[var(--radius-md)] border px-4 py-3 text-sm shadow-xl backdrop-blur-md transition-all duration-200 animate-slide-up",
              t.tone === "ok" &&
                "bg-[var(--surface-1)] border-[var(--ok-border)] text-[var(--ok)]",
              t.tone === "err" &&
                "bg-[var(--surface-1)] border-[var(--danger-border)] text-[var(--danger)]",
              t.tone === "info" &&
                "bg-[var(--surface-1)] border-[var(--info-border)] text-[var(--info)]",
            )}
          >
            {t.tone === "ok" && <CheckCircle size={16} className="shrink-0" />}
            {t.tone === "err" && <AlertTriangle size={16} className="shrink-0" />}
            {t.tone === "info" && <Info size={16} className="shrink-0" />}
            <span className="text-xs font-medium text-[var(--text)]">{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
