import { useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import {
  Activity,
  Bell,
  ChevronRight,
  ClipboardList,
  FileSearch,
  Gauge,
  Grid3x3,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { get, post, wsUrl } from "../api/client";
import { ROLE_HOME, ROLE_LABEL, useAuth } from "../auth/AuthContext";
import { BrandMark } from "./BrandMark";
import { Badge, fmtDateTime, LEVEL_TONE, useToast } from "./ui";

/* ── Live 1Hz Regulatory Clock Chip ── */
function LiveClockChip() {
  const [timeStr, setTimeStr] = useState(() => {
    const d = new Date();
    return d.toTimeString().slice(0, 8);
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setTimeStr(d.toTimeString().slice(0, 8));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden lg:flex items-center gap-2 rounded-full border border-[#22302A] bg-[#101815]/90 px-3 py-1 font-mono text-[11px] text-[#8FA398] shadow-sm">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2FB39A] opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2FB39A]" />
      </span>
      <span className="text-[#39C8AD] font-bold tabular-nums">{timeStr} IST</span>
      <span className="text-[#56685F]">·</span>
      <span className="text-[#56685F] uppercase tracking-wider text-[10px]">1Hz Telemetry</span>
    </div>
  );
}

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
        className="relative rounded-xl p-2 text-[#8FA398] hover:text-[#E8EFE9] hover:bg-[#16201C] transition-colors border border-transparent hover:border-[#22302A]"
      >
        <Bell size={18} />
        {alerts.length > 0 && (
          <span
            className={clsx(
              "absolute -right-1 -top-1 min-w-5 h-5 rounded-full px-1 flex items-center justify-center text-[10px] font-mono font-bold text-white shadow-md",
              critical ? "bg-[#E5484D]" : "bg-[#D9A441]",
            )}
          >
            {alerts.length > 99 ? "99+" : alerts.length}
          </span>
        )}
        <span
          title={live ? "WebSocket Connected" : "Connecting to telemetry"}
          className={clsx(
            "absolute bottom-1 right-1 h-2 w-2 rounded-full ring-2 ring-[#101815]",
            live ? "bg-[#2FB39A] shadow-[0_0_6px_#2FB39A]" : "bg-[#56685F]",
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-96 max-w-[90vw] rounded-2xl border border-[#22302A] bg-[#101815] shadow-2xl overflow-hidden backdrop-blur-xl animate-fade-in">
          <div className="flex items-center justify-between border-b border-[#22302A] px-5 py-3.5 bg-[#16201C]">
            <span className="font-mono text-xs font-semibold tracking-wider uppercase text-[#E8EFE9] flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2FB39A]" />
              Operational Alerts ({alerts.length})
            </span>
            <Link
              to="/app/alerts"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-[#2FB39A] hover:underline"
            >
              View all
            </Link>
          </div>
          <ul className="max-h-96 divide-y divide-[#1D2A24] overflow-y-auto">
            {alerts.length === 0 && (
              <li className="p-8 text-center text-xs text-[#8FA398]">
                No unacknowledged alerts
              </li>
            )}
            {alerts.slice(0, 20).map((a) => (
              <li key={a.id} className="flex gap-3 px-5 py-3.5 text-xs hover:bg-[#16201C]/60 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge tone={LEVEL_TONE[a.level]}>{a.level}</Badge>
                    <span className="text-[11px] font-mono text-[#8FA398]">
                      {fmtDateTime(a.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#E8EFE9] line-clamp-2 leading-relaxed">
                    {a.message}
                  </p>
                </div>
                {can("alert.ack") && (
                  <button
                    className="self-start text-[11px] font-semibold text-[#2FB39A] hover:underline whitespace-nowrap font-mono"
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
  { to: "/app/studies", label: "Studies", icon: ClipboardList, perm: "study.read" },
  { to: "/app/safety", label: "Safety & Clocks", icon: ShieldAlert, perm: "ae.read" },
  { to: "/app/signals", label: "Signal Detection", icon: Activity, perm: "pv.signals" },
  { to: "/app/risk", label: "Risk Topography", icon: Grid3x3, perm: "dashboard.read" },
  { to: "/app/audit", label: "Audit Ledger", icon: FileSearch, perm: "audit.read" },
  { to: "/app/compliance", label: "Standards Matrix", icon: ShieldCheck },
  { to: "/app/settings", label: "Administration", icon: Settings, perm: "rules.read" },
];

export default function Layout() {
  const { me, can, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  if (!me) return null;

  const items = NAV.filter((n) => !n.perm || can(n.perm)).map((n) => ({
    ...n,
    to: n.to === "home" ? ROLE_HOME[me.role] : n.to,
  }));

  const isRegulator = me.role === "REGULATOR";
  const activeNavItem = items.find((i) => i.to === loc.pathname || (i.to !== "/" && loc.pathname.startsWith(i.to)));

  return (
    <div className="relative min-h-screen bg-[#0A0F0D] text-[#E8EFE9] flex overflow-x-hidden">
      {/* ── Ambient Radial Glows & Subtle Celestial Arc Decorations ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[#2FB39A]/10 blur-[140px]" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 rounded-full bg-[#C8A45C]/8 blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 rounded-full bg-[#2FB39A]/8 blur-[140px]" />

        <svg className="absolute inset-0 w-full h-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10%" cy="10%" r="520" stroke="#2FB39A" strokeWidth="1" strokeDasharray="8 8" fill="none" />
          <circle cx="90%" cy="85%" r="620" stroke="#C8A45C" strokeWidth="1" strokeDasharray="4 12" fill="none" />
        </svg>
      </div>

      {/* ── Slim Left Rail Navigation (Collapses on Tablet, Drawer on Mobile) ── */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 w-64 border-r border-[#22302A] bg-[#101815]/95 backdrop-blur-xl transition-transform duration-200 lg:static lg:translate-x-0 flex flex-col justify-between shadow-2xl",
          mobileMenu ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Brand Header with official BrandMark and wordmark */}
          <div className="flex h-18 items-center gap-3 border-b border-[#22302A] px-5 bg-[#16201C]/60">
            <Link to="/" className="flex items-center gap-3 group">
              <BrandMark size={34} />
              <div>
                <div className="font-serif text-lg font-bold tracking-tight text-[#E8EFE9] flex items-center gap-1.5 leading-none">
                  AyuCTMS
                  <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#2FB39A]/15 text-[#39C8AD] border border-[#2FB39A]/30 font-bold">
                    AIIA
                  </span>
                </div>
                <div className="font-mono text-[10px] tracking-wide text-[#8FA398] mt-1 leading-none">
                  Ministry of Ayush · SIH 26046
                </div>
              </div>
            </Link>
            {/* Close button on mobile */}
            <button
              onClick={() => setMobileMenu(false)}
              className="lg:hidden ml-auto p-1 text-[#8FA398] hover:text-[#E8EFE9]"
              aria-label="Close navigation"
            >
              <X size={18} />
            </button>
          </div>

          {/* Active Role Status Pill */}
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-[#22302A] bg-[#16201C]/80 shadow-inner">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-2 w-2 rounded-full bg-[#2FB39A] shadow-[0_0_6px_#2FB39A] shrink-0" />
                <span className="font-mono text-[11px] font-semibold tracking-wider text-[#E8EFE9] truncate">
                  {ROLE_LABEL[me.role]}
                </span>
              </div>
              {isRegulator && (
                <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#C8A45C]/20 text-[#C8A45C] font-bold shrink-0">
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
                  onClick={() => setMobileMenu(false)}
                  className={clsx(
                    "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold tracking-wide transition-all duration-150 relative group select-none",
                    active
                      ? "bg-[#1D2A24] text-[#39C8AD] border border-[#2FB39A]/30 font-bold shadow-[0_0_16px_rgba(47,179,154,0.12)]"
                      : "text-[#8FA398] hover:text-[#E8EFE9] hover:bg-[#16201C] border border-transparent",
                  )}
                >
                  {/* Left teal active accent bar */}
                  {active && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-[#2FB39A] shadow-[0_0_8px_#2FB39A]" />
                  )}

                  <n.icon
                    size={17}
                    className={clsx(
                      "shrink-0 transition-colors",
                      active
                        ? "text-[#2FB39A]"
                        : "text-[#56685F] group-hover:text-[#E8EFE9]",
                    )}
                  />
                  <span>{n.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Regulatory & Synthetic Data Disclaimer Footer */}
        <div className="border-t border-[#22302A] p-4 bg-[#16201C]/40 text-[11px] leading-relaxed text-[#8FA398]">
          <div className="flex items-center gap-2 font-mono text-[#56685F] uppercase font-semibold text-[10px]">
            <ShieldCheck size={13} className="text-[#2FB39A]" />
            <span>Integrity Guard Active</span>
          </div>
          <p className="mt-1 text-[11px] text-[#56685F] font-sans">
            Forward-secure SHA-256 hash chains · 21 CFR Part 11
          </p>
        </div>
      </aside>

      {/* Backdrop for mobile drawer */}
      {mobileMenu && (
        <div
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenu(false)}
        />
      )}

      {/* ── Main Command Canvas ── */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* Top Operational Command Bar */}
        <header className="sticky top-0 z-30 flex h-18 items-center justify-between gap-4 border-b border-[#22302A] bg-[#0A0F0D]/85 px-6 backdrop-blur-xl">
          <div className="flex items-center gap-4 min-w-0">
            {/* Mobile Hamburger */}
            <button
              className="rounded-xl p-2 text-[#8FA398] hover:text-[#E8EFE9] hover:bg-[#16201C] lg:hidden border border-[#22302A]"
              aria-label="Open navigation"
              onClick={() => setMobileMenu(true)}
            >
              <Menu size={20} />
            </button>

            {/* Monospace Breadcrumb */}
            <div className="flex items-center gap-2 font-mono text-xs text-[#8FA398]">
              <Link to="/" className="text-[#56685F] hover:text-[#2FB39A] transition-colors uppercase tracking-wider">
                AyuCTMS
              </Link>
              <ChevronRight size={13} className="text-[#56685F]" />
              <span className="text-[#39C8AD] font-semibold uppercase tracking-wider">
                {activeNavItem?.label || "Workspace"}
              </span>
            </div>

            {/* Quick Search Input */}
            <div className="hidden md:flex items-center gap-2 rounded-full border border-[#22302A] bg-[#101815]/90 px-3 py-1.5 text-xs text-[#8FA398] w-64 focus-within:border-[#2FB39A]/60 focus-within:shadow-[0_0_12px_rgba(47,179,154,0.15)] transition-all">
              <Search size={14} className="text-[#56685F]" />
              <input
                type="text"
                placeholder="Search studies, SAEs, subjects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-[#E8EFE9] placeholder-[#56685F] focus:outline-none w-full"
              />
            </div>
          </div>

          {/* Right Status Actions */}
          <div className="flex items-center gap-3">
            {/* Live 1Hz Clock */}
            <LiveClockChip />

            {/* Synthetic Data Indicator Pill */}
            <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#C8A45C]/35 bg-[#C8A45C]/10 px-3 py-1 font-mono text-[10px] uppercase font-bold tracking-wider text-[#C8A45C]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C8A45C] animate-pulse" />
              Synthetic Data Mode
            </div>

            {/* Role Badge Chip */}
            <div className="inline-flex items-center gap-1 rounded-full border border-[#2FB39A]/35 bg-[#2FB39A]/10 px-2.5 py-1 font-mono text-[11px] font-bold text-[#39C8AD]">
              {me.role}
            </div>

            {/* Alert Bell */}
            <AlertBell />

            {/* Account Pill */}
            <Link
              to="/app/account"
              className="flex items-center gap-2.5 rounded-xl border border-[#22302A] bg-[#16201C]/80 px-3 py-1.5 hover:border-[#2FB39A]/40 hover:bg-[#1D2A24] transition-all"
            >
              <div className="h-7 w-7 rounded-lg bg-[#2FB39A]/20 text-[#39C8AD] border border-[#2FB39A]/30 flex items-center justify-center font-bold text-xs font-mono">
                {me.full_name.charAt(0)}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-semibold text-[#E8EFE9] leading-tight">
                  {me.full_name}
                </div>
                <div className="font-mono text-[10px] text-[#8FA398]">
                  {ROLE_LABEL[me.role]}
                </div>
              </div>
            </Link>

            {/* Sign Out Button */}
            <button
              aria-label="Sign out"
              title="Sign out"
              className="rounded-xl p-2 text-[#8FA398] hover:text-[#E5484D] hover:bg-[#E5484D]/15 border border-transparent hover:border-[#E5484D]/30 transition-colors"
              onClick={() => {
                logout();
                nav("/");
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* Dynamic Workspace Canvas with smooth fade transition */}
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
