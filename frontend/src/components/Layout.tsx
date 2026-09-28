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
  Settings,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { get, post, wsUrl } from "../api/client";
import { ROLE_HOME, ROLE_LABEL, useAuth } from "../auth/AuthContext";
import { Badge, fmtDateTime, LEVEL_TONE, useToast } from "./ui";

function AlertBell() {
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = useAuth();
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: alerts = [] } = useQuery<any[]>({ queryKey: ["alerts"], queryFn: () => get("/alerts?limit=50"), refetchInterval: 60_000 });

  useEffect(() => {
    let ws: WebSocket | null = null;
    let stop = false;
    let ping: ReturnType<typeof setInterval>;
    const connect = () => {
      ws = new WebSocket(wsUrl());
      ws.onopen = () => {
        setLive(true);
        ping = setInterval(() => ws?.readyState === 1 && ws.send("ping"), 25_000);
      };
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.event === "alert") {
          qc.invalidateQueries({ queryKey: ["alerts"] });
          toast(msg.data.message, msg.data.level === "CRITICAL" ? "err" : "info");
        } else if (msg.event === "sae_created") {
          qc.invalidateQueries({ queryKey: ["ae"] });
          toast(`New SAE reported: ${msg.data.subject_code} - ${msg.data.description}`, "err");
        } else if (msg.event === "clock_completed") {
          qc.invalidateQueries({ queryKey: ["ae"] });
        } else if (msg.event === "tick") {
          qc.invalidateQueries({ queryKey: ["ae"] });
        }
      };
      ws.onclose = () => {
        setLive(false);
        clearInterval(ping);
        if (!stop) setTimeout(connect, 3000);
      };
    };
    connect();
    return () => {
      stop = true;
      clearInterval(ping);
      ws?.close();
    };
  }, [qc, toast]);

  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const critical = alerts.some((a) => a.level === "CRITICAL");
  return (
    <div className="relative" ref={ref}>
      <button
        aria-label={`Alerts: ${alerts.length} unacknowledged`}
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100"
      >
        <Bell size={20} />
        {alerts.length > 0 && (
          <span className={clsx("absolute -right-0.5 -top-0.5 min-w-5 rounded-full px-1 text-center text-[10px] font-bold text-white", critical ? "bg-red-600" : "bg-amber-500")}>
            {alerts.length > 99 ? "99+" : alerts.length}
          </span>
        )}
        <span title={live ? "Live" : "Reconnecting"} className={clsx("absolute bottom-1 right-1 h-2 w-2 rounded-full", live ? "bg-emerald-500" : "bg-slate-300")} />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-96 max-w-[90vw] rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-2 text-sm font-semibold">
            Alerts <Link to="/alerts" onClick={() => setOpen(false)} className="text-xs font-medium text-brand-700 hover:underline">View all</Link>
          </div>
          <ul className="max-h-96 divide-y overflow-y-auto">
            {alerts.length === 0 && <li className="p-4 text-sm text-slate-500">No open alerts</li>}
            {alerts.slice(0, 20).map((a) => (
              <li key={a.id} className="flex gap-2 px-4 py-2.5 text-sm">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge tone={LEVEL_TONE[a.level]}>{a.level}</Badge>
                    <span className="text-xs text-slate-500">{fmtDateTime(a.created_at)}</span>
                  </div>
                  <p className="mt-1 text-slate-700">{a.message}</p>
                </div>
                {can("alert.ack") && (
                  <button
                    className="self-start text-xs font-medium text-brand-700 hover:underline"
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
  { to: "/safety", label: "Safety / PV", icon: ShieldAlert, perm: "ae.read" },
  { to: "/signals", label: "Signals", icon: Activity, perm: "pv.signals" },
  { to: "/risk", label: "Risk heatmap", icon: Grid3x3, perm: "dashboard.read" },
  { to: "/audit", label: "Audit trail", icon: FileSearch, perm: "audit.read" },
  { to: "/compliance", label: "Compliance", icon: ShieldCheck },
  { to: "/settings", label: "Administration", icon: Settings, perm: "rules.read" },
];

export default function Layout() {
  const { me, can, logout } = useAuth();
  const nav = useNavigate();
  const [menu, setMenu] = useState(false);
  if (!me) return null;
  const items = NAV.filter((n) => !n.perm || can(n.perm)).map((n) => ({ ...n, to: n.to === "home" ? ROLE_HOME[me.role] : n.to }));

  return (
    <div className="flex min-h-full">
      <aside className={clsx("fixed inset-y-0 left-0 z-30 w-60 border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0", menu ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <img src="/favicon.svg" alt="" className="h-7 w-7" />
          <div>
            <div className="text-sm font-bold text-brand-800">AyuCTMS</div>
            <div className="text-[10px] text-slate-500">AIIA Clinical Trials Dashboard</div>
          </div>
        </div>
        <nav className="space-y-0.5 p-3" aria-label="Main">
          {items.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              onClick={() => setMenu(false)}
              className={({ isActive }) =>
                clsx("flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium", isActive ? "bg-brand-50 text-brand-800" : "text-slate-600 hover:bg-slate-50")
              }
            >
              <n.icon size={17} /> {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 w-full border-t p-3 text-[10px] leading-snug text-slate-400">
          Synthetic demo data only. Ministry of Ayush / AIIA - SIH26046
        </div>
      </aside>
      {menu && <div className="fixed inset-0 z-20 bg-slate-900/30 lg:hidden" onClick={() => setMenu(false)} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur">
          <button className="rounded p-1.5 hover:bg-slate-100 lg:hidden" aria-label="Open menu" onClick={() => setMenu(true)}>
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <AlertBell />
          <Link to="/account" className="hidden text-right hover:opacity-80 sm:block">
            <div className="text-sm font-medium">{me.full_name}</div>
            <div className="text-xs text-slate-500">{ROLE_LABEL[me.role]}{me.sites.length ? ` - ${me.sites.map((s) => s.code).join(", ")}` : ""}</div>
          </Link>
          <button
            aria-label="Sign out"
            title="Sign out"
            className="rounded-full p-2 text-slate-600 hover:bg-slate-100"
            onClick={() => {
              logout();
              nav("/login");
            }}
          >
            <LogOut size={18} />
          </button>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
