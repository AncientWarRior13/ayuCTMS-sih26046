export const PATHS = {
  root: "/",
  login: "/login",
  landing: "/landing",
  
  app: {
    root: "/app",
    pi: "/app/pi",
    coordinator: "/app/coordinator",
    monitor: "/app/monitor",
    iec: "/app/iec",
    pv: "/app/pv",
    admin: "/app/admin",
    regulator: "/app/regulator",
    studies: "/app/studies",
    studyDetail: (id: string | number) => `/app/studies/${id}`,
    safety: "/app/safety",
    signals: "/app/signals",
    risk: "/app/risk",
    audit: "/app/audit",
    alerts: "/app/alerts",
    account: "/app/account",
    compliance: "/app/compliance",
    settings: "/app/settings",
  },
} as const;

export const ROLE_HOMES: Record<string, string> = {
  PI: PATHS.app.pi,
  COORDINATOR: PATHS.app.coordinator,
  MONITOR: PATHS.app.monitor,
  IEC: PATHS.app.iec,
  PV: PATHS.app.pv,
  ADMIN: PATHS.app.admin,
  REGULATOR: PATHS.app.regulator,
};

export function sanitizeNext(next: string | null | undefined, fallback: string): string {
  if (!next) return fallback;
  // Must start with /app, not // (protocol relative) or http
  if (next.startsWith("/app") && !next.startsWith("//")) {
    return next;
  }
  return fallback;
}
