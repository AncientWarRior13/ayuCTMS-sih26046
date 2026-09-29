import { useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import {
  Activity,
  Bell,
  ClipboardList,
  FileSearch,
  Gauge,
  Grid3x3,
  LogOut,
  Menu,
  Moon,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { get, post, wsUrl } from "../api/client";
import { ROLE_HOME, ROLE_LABEL, useAuth } from "../auth/AuthContext";
import { Badge, fmtDateTime, LEVEL_TONE, useToast } from "./ui";

/* ── Live Alert Dropdown ── */
function AlertBell() {
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = useAuth();
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: alerts = [] } = useQuery<any[]>({
    queryKey: ["alerts"],
    queryFn: () => get("/alerts?limit=50"),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    let ws: WebSocket | null = null;
    let stop = false;
    let ping: ReturnType<typeof setInterval>;
    const connect = () => {
      try {
        ws = new WebSocket(wsUrl());
        ws.onopen = () => {
          setLive(true);
          ping = setInterval(() => ws?.readyState === 1 && ws.send("ping"), 25_000);
        };
        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.event === "alert") {
              qc.invalidateQueries({ queryKey: ["alerts"] });
              toast(msg.data.message, msg.data.level === "CRITICAL" ? "err" : "info");
            } else if (msg.event === "sae_created") {
              qc.invalidateQueries({ queryKey: ["ae"] });
              toast(
                `New SAE reported: ${msg.data.subject_code} - ${msg.data.description}`,
                "err",
              );
            } else if (msg.event === "clock_completed" || msg.event === "tick") {
              qc.invalidateQueries({ queryKey: ["ae"] });
            }
          } catch {}
        };
        ws.onclose = () => {
          setLive(false);
          clearInterval(ping);
          if (!stop) setTimeout(connect, 3000);
        };
      } catch {
        setLive(false);
      }
    };
    connect();
    return () => {
      stop = true;
      clearInterval(ping);
      ws?.close();
    };
  }, [qc, toast]);

  useEffect(() => {
    const h = (e: MouseEvent) =>
      ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const critical = alerts.some((a) => a.level === "CRITICAL");

  return (
    <div className="relative" ref={ref}>
      <button
        aria-label={`Alerts: ${alerts.length} unacknowledged`}
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors border border-transparent hover:border-[var(--border)]"
      >
        <Bell size={18} />
        {alerts.length > 0 && (
          <span
            className={clsx(
              "absolute -right-1 -top-1 min-w-5 h-5 rounded-full px-1 flex items-center justify-center text-[10px] font-mono font-bold text-white shadow-sm",
              critical ? "bg-[var(--danger)]" : "bg-[var(--warn)]",
            )}
          >
            {alerts.length > 99 ? "99+" : alerts.length}
          </span>
        )}
        <span
          title={live ? "WebSocket Connected" : "Connecting to telemetry"}
          className={clsx(
            "absolute bottom-1 right-1 h-2 w-2 rounded-full ring-2 ring-[var(--surface-1)]",
            live ? "bg-[var(--ok)] shadow-[0_0_6px_var(--ok)]" : "bg-[var(--text-faint)]",
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-96 max-w-[90vw] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)] shadow-2xl overflow-hidden animate-slide-up">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3 bg-[var(--surface-2)]">
            <span className="text-xs font-semibold tracking-wider uppercase text-[var(--text)]">
              Operational Alerts ({alerts.length})
            </span>
            <Link
              to="/alerts"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-[var(--brand)] hover:underline"
            >
              View all
            </Link>
          </div>
          <ul className="max-h-96 divide-y divide-[var(--border-subtle)] overflow-y-auto">
            {alerts.length === 0 && (
              <li className="p-6 text-center text-xs text-[var(--text-muted)]">
                No unacknowledged alerts
              </li>
            )}
            {alerts.slice(0, 20).map((a) => (
              <li key={a.id} className="flex gap-3 px-4 py-3 text-xs hover:bg-[var(--surface-2)]/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge tone={LEVEL_TONE[a.level]}>{a.level}</Badge>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">
                      {fmtDateTime(a.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--text)] line-clamp-2 leading-relaxed">
                    {a.message}
                  </p>
                </div>
                {can("alert.ack") && (
                  <button
                    className="self-start text-[11px] font-semibold text-[var(--brand)] hover:underline whitespace-nowrap"
                    onClick={async () => {
                      await post(`/alerts/${a.id}/ack`);
                      qc.invalidateQueries({ queryKey: ["alerts"] });
                    }}
                  >
                    Ack
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const NAV: { to: string; label: string; icon: typeof Gauge; perm?: string }[] = [
  { to: "home", label: "Dashboard", icon: Gauge },
  { to: "/studies", label: "Studies", icon: ClipboardList, perm: "study.read" },
  { to: "/safety", label: "Safety & Clocks", icon: ShieldAlert, perm: "ae.read" },
  { to: "/signals", label: "Signal Detection", icon: Activity, perm: "pv.signals" },
  { to: "/risk", label: "Risk Topography", icon: Grid3x3, perm: "dashboard.read" },
  { to: "/audit", label: "Audit Ledger", icon: FileSearch, perm: "audit.read" },
  { to: "/compliance", label: "Standards Matrix", icon: ShieldCheck },
  { to: "/settings", label: "Administration", icon: Settings, perm: "rules.read" },
];

export default function Layout() {
  const { me, can, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [menu, setMenu] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  }, [isDark]);

  if (!me) return null;

  const items = NAV.filter((n) => !n.perm || can(n.perm)).map((n) => ({
    ...n,
    to: n.to === "home" ? ROLE_HOME[me.role] : n.to,
  }));

  const isRegulator = me.role === "REGULATOR";

  return (
    <div className="flex min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* ── Left Rail Navigation ── */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-[var(--border)] bg-[var(--surface-1)] transition-transform duration-200 lg:static lg:translate-x-0 flex flex-col justify-between",
          menu ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Brand & Crest Header */}
          <div className="flex h-16 items-center gap-3 border-b border-[var(--border)] px-5 bg-[var(--surface-2)]/40">
            {/* Custom Leaf-in-Hash-Chain SVG Mark */}
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[var(--brand)] to-[#0A0F0D] p-1.5 flex items-center justify-center shadow-[0_0_12px_var(--brand-glow)]">
              <svg viewBox="0 0 24 24" className="w-full h-full text-white fill-none stroke-current stroke-2">
                <path d="M11 20A7 7 0 0 1 4 13C4 7 11 3 11 3s7 4 7 10a7 7 0 0 1-7 7Z" />
                <path d="M11 3v17" />
                <circle cx="11" cy="13" r="2" fill="currentColor" />
              </svg>
            </div>
            <div>
              <div className="font-display text-base font-bold tracking-tight text-[var(--text)] flex items-center gap-1.5">
                AyuCTMS
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--brand)]/15 text-[var(--brand-text)] font-semibold">
                  AIIA
                </span>
              </div>
              <div className="text-[10px] font-mono tracking-wide text-[var(--text-muted)]">
                Ayurveda Clinical Trials
              </div>
            </div>
          </div>

          {/* Role Status Tag */}
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[var(--brand)] shadow-[0_0_6px_var(--brand)]" />
                <span className="text-[11px] font-mono font-semibold tracking-wider text-[var(--text)]">
                  {ROLE_LABEL[me.role]}
                </span>
              </div>
              {isRegulator && (
                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--accent-brass)]/20 text-[var(--accent-brass)] font-bold">
                  Read-Only
                </span>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 p-3 flex-1" aria-label="Main Navigation">
            {items.map((n) => {
              const active =
                loc.pathname === n.to ||
                (n.to !== "/" && loc.pathname.startsWith(n.to));

              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  onClick={() => setMenu(false)}
                  className={clsx(
                    "flex items-center gap-3 rounded-[var(--radius-sm)] px-3.5 py-2.5 text-xs font-semibold tracking-wide transition-all duration-150 relative group",
                    active
                      ? "bg-[var(--surface-3)] text-[var(--brand-text)] border border-[var(--brand)]/30 font-bold shadow-sm"
                      : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]",
                  )}
                >
                  <n.icon
                    size={17}
                    className={clsx(
                      "shrink-0 transition-colors",
                      active
                        ? "text-[var(--brand)]"
                        : "text-[var(--text-faint)] group-hover:text-[var(--text)]",
                    )}
                  />
                  <span>{n.label}</span>
                  {active && (
                    <span className="absolute right-2.5 h-1.5 w-1.5 rounded-full bg-[var(--brand)] shadow-[0_0_6px_var(--brand)]" />
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Regulatory & Synthetic Data Disclaimer Footer */}
        <div className="border-t border-[var(--border)] p-4 bg-[var(--surface-2)]/30 text-[10px] leading-relaxed text-[var(--text-muted)]">
          <div className="flex items-center gap-1.5 font-mono text-[var(--text-faint)] uppercase font-semibold">
            <ShieldCheck size={12} className="text-[var(--brand)]" />
            <span>Integrity Guard</span>
          </div>
          <p className="mt-1 text-[var(--text-faint)]">
            Synthetic demo dataset · AIIA & Ministry of Ayush · SIH 26046
          </p>
        </div>
      </aside>

      {menu && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMenu(false)}
        />
      )}

      {/* ── Main Content Area ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Operational Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface-1)]/90 px-5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] lg:hidden"
              aria-label="Open navigation"
              onClick={() => setMenu(true)}
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-[var(--text-muted)]">
              <span className="text-[var(--text)] font-semibold">AyuCTMS</span>
              <span>/</span>
              <span className="text-[var(--brand-text)] font-medium">
                {items.find((i) => i.to === loc.pathname || (i.to !== "/" && loc.pathname.startsWith(i.to)))?.label || "Workspace"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              aria-label="Toggle Theme"
              onClick={() => setIsDark(!isDark)}
              className="rounded-lg p-2 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] border border-transparent hover:border-[var(--border)] transition-colors"
              title={isDark ? "Switch to Parchment (Light)" : "Switch to Ink (Dark)"}
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Alert Bell */}
            <AlertBell />

            {/* Account Pill */}
            <Link
              to="/account"
              className="flex items-center gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/60 px-3 py-1.5 hover:border-[var(--brand)]/40 transition-colors"
            >
              <div className="h-6 w-6 rounded-full bg-[var(--brand)]/20 text-[var(--brand-text)] flex items-center justify-center font-bold text-xs">
                {me.full_name.charAt(0)}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-semibold text-[var(--text)] leading-tight">
                  {me.full_name}
                </div>
                <div className="text-[10px] font-mono text-[var(--text-muted)]">
                  {ROLE_LABEL[me.role]}
                </div>
              </div>
            </Link>

            {/* Logout */}
            <button
              aria-label="Sign out"
              title="Sign out"
              className="rounded-lg p-2 text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger-bg)] border border-transparent transition-colors"
              onClick={() => {
                logout();
                nav("/login");
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>

        {/* Workspace Canvas */}
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
