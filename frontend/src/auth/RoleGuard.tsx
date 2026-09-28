import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { type Role, useAuth } from "./AuthContext";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { me, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="p-10 text-sm text-slate-500">Loading...</div>;
  if (!me) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
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
