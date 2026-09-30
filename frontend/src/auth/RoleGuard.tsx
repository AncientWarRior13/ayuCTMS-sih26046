import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { type Role, useAuth } from "./AuthContext";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { me, loading } = useAuth();
  const loc = useLocation();
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--bg)]">
        <div className="space-y-4 w-64 p-6">
          <div className="h-4 w-3/4 rounded bg-[var(--surface-3)] animate-pulse" />
          <div className="h-8 w-full rounded bg-[var(--surface-2)] animate-pulse" />
          <div className="h-4 w-1/2 rounded bg-[var(--surface-3)] animate-pulse" />
        </div>
      </div>
    );
  }
  if (!me) {
    const next = encodeURIComponent(loc.pathname + loc.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <>{children}</>;
}

/** Renders children only for the given roles or permission; otherwise a clear "no access" panel. */
export function RoleGuard({ roles, perm, children }: { roles?: Role[]; perm?: string; children: ReactNode }) {
  const { me, can } = useAuth();
  const ok = me && (!roles || roles.includes(me.role)) && (!perm || can(perm));
  if (!ok)
    return (
      <div className="m-8 rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        Your role does not have access to this page.
      </div>
    );
  return <>{children}</>;
}

/** Shows children only when the current user holds the permission. Used to hide write actions. */
export function Can({ perm, children }: { perm: string; children: ReactNode }) {
  const { can } = useAuth();
  return can(perm) ? <>{children}</> : null;
}
