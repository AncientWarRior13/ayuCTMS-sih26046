import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import { get, login as apiLogin, tokens } from "../api/client";

export type Role = "PI" | "COORDINATOR" | "MONITOR" | "IEC" | "PV" | "ADMIN" | "REGULATOR";

export interface Me {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  totp_enabled: boolean;
  sites: { id: number; code: string; name: string }[];
  permissions: string[];
}

interface AuthState {
  me: Me | null;
  loading: boolean;
  can: (perm: string) => boolean;
  login: (email: string, password: string, totp?: string) => Promise<Me>;
  logout: () => void;
}

const Ctx = createContext<AuthState | null>(null);

export const ROLE_LABEL: Record<Role, string> = {
  PI: "Principal Investigator",
  COORDINATOR: "Study Coordinator",
  MONITOR: "Clinical Monitor",
  IEC: "Ethics Committee",
  PV: "Pharmacovigilance Officer",
  ADMIN: "Administrator",
  REGULATOR: "Regulator (read-only)",
};

export const ROLE_HOME: Record<Role, string> = {
  PI: "/app/pi",
  COORDINATOR: "/app/coordinator",
  MONITOR: "/app/monitor",
  IEC: "/app/iec",
  PV: "/app/pv",
  ADMIN: "/app/admin",
  REGULATOR: "/app/regulator",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<Me | null>({
    queryKey: ["me"],
    queryFn: () => (tokens.access ? get<Me>("/auth/me") : Promise.resolve(null)),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const logout = useCallback(() => {
    tokens.clear();
    qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });
    qc.setQueryData(["me"], null);
  }, [qc]);

  useEffect(() => {
    const h = () => logout();
    window.addEventListener("ayuctms:logout", h);
    return () => window.removeEventListener("ayuctms:logout", h);
  }, [logout]);

  const value = useMemo<AuthState>(
    () => ({
      me: data ?? null,
      loading: isLoading,
      can: (perm) => !!data?.permissions.includes(perm),
      login: async (email, password, totp) => {
        await apiLogin(email, password, totp);
        const fresh = await get<Me>("/auth/me");
        qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "me" });
        qc.setQueryData(["me"], fresh);
        return fresh;
      },
      logout,
    }),
    [data, isLoading, qc, logout],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}
