import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { get, post } from "../api/client";
import { ROLE_LABEL, useAuth, type Me } from "../auth/AuthContext";
import { Badge, Button, Card, ErrorBox, Field, PageHeader, useToast } from "../components/ui";

function TotpSetup({ me }: { me: Me }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [setup, setSetup] = useState<{ secret: string; otpauth_uri: string } | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [disabling, setDisabling] = useState(false);
  const start = useMutation({ mutationFn: () => post("/auth/totp/setup"), onSuccess: (d: any) => setSetup(d) });
  const confirm = useMutation({
    mutationFn: () => post("/auth/totp/confirm", { code }),
    onSuccess: () => { toast("Two-factor authentication enabled"); setSetup(null); setCode(""); qc.invalidateQueries({ queryKey: ["me"] }); },
  });
  const disable = useMutation({
    mutationFn: () => post("/auth/totp/disable", { password }),
    onSuccess: () => { toast("Two-factor authentication disabled"); setDisabling(false); setPassword(""); qc.invalidateQueries({ queryKey: ["me"] }); },
  });

  if (me.totp_enabled) {
    return (
      <Card title="Two-factor authentication">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><Badge tone="green">Enabled</Badge><span className="text-xs text-[var(--text-muted)]">A code from your authenticator app is required at login.</span></div>
          <Button size="sm" variant="danger" onClick={() => setDisabling(true)}>Disable</Button>
        </div>
        {disabling && (
          <form className="mt-4 flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); disable.mutate(); }}>
            <div className="w-64"><Field label="Confirm your password"><input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field></div>
            <Button variant="danger" size="sm" disabled={disable.isPending}>Confirm disable</Button>
            <Button variant="secondary" size="sm" type="button" onClick={() => setDisabling(false)}>Cancel</Button>
          </form>
        )}
        <ErrorBox error={disable.error} />
      </Card>
    );
  }

  return (
    <Card title="Two-factor authentication">
      {!setup ? (
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--text-muted)]">Not enabled. Adds an authenticator-app code to login for this account.</p>
          <Button size="sm" onClick={() => start.mutate()} disabled={start.isPending}>Set up</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-muted)]">Add this key to an authenticator app (Google Authenticator, Authy, 1Password, ...), then enter the 6-digit code it shows.</p>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <div className="label">Secret key</div>
            <div className="mono select-all break-all text-sm font-semibold text-[var(--brand-text)]">{setup.secret}</div>
          </div>
          <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); confirm.mutate(); }}>
            <div className="w-40"><Field label="6-digit code"><input className="input" inputMode="numeric" required minLength={6} maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} /></Field></div>
            <Button size="sm" disabled={confirm.isPending}>Confirm and enable</Button>
            <Button size="sm" type="button" variant="secondary" onClick={() => setSetup(null)}>Cancel</Button>
          </form>
          <ErrorBox error={confirm.error} />
        </div>
      )}
      <ErrorBox error={start.error} />
    </Card>
  );
}

export default function AccountPage() {
  const { me: cached } = useAuth();
  const { data: me } = useQuery<Me>({ queryKey: ["me"], queryFn: () => get("/auth/me"), initialData: cached ?? undefined });
  if (!me) return null;
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SECURITY CREDENTIALS & PROFILE"
        title="My Account"
        description="Operator profile details, role permissions, and Two-Factor Authentication (TOTP)"
      />
      <Card title="Operator Profile">
        <dl className="grid grid-cols-3 gap-3 text-sm">
          <dt className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">Name</dt><dd className="col-span-2 font-medium text-[var(--text)]">{me.full_name}</dd>
          <dt className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">Email</dt><dd className="col-span-2 font-mono text-xs text-[var(--text)]">{me.email}</dd>
          <dt className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">Role</dt><dd className="col-span-2 font-medium text-[var(--brand-text)]">{ROLE_LABEL[me.role]}</dd>
          <dt className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)]">Sites</dt><dd className="col-span-2 text-xs font-mono text-[var(--text-muted)]">{me.sites.map((s) => s.code).join(", ") || "All sites (role-based)"}</dd>
        </dl>
      </Card>
      <TotpSetup me={me} />
    </div>
  );
}
