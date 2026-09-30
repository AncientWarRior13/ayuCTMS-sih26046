import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ROLE_LABEL, useAuth, type Role } from "../auth/AuthContext";
import { Button, ErrorBox, Field } from "../components/ui";
import { ShieldCheck, Activity, KeyRound, Sparkles, CheckCircle2, ArrowLeft } from "lucide-react";
import { BrandMark } from "../components/BrandMark";
import { ROLE_HOMES, sanitizeNext } from "./paths";

const DEMO: [Role, string, string][] = [
  ["PI", "pi@demo.test", "Principal Investigator"],
  ["COORDINATOR", "coord@demo.test", "Clinical Coordinator"],
  ["MONITOR", "monitor@demo.test", "Trial Monitor"],
  ["IEC", "iec@demo.test", "Ethics Committee"],
  ["PV", "pv@demo.test", "Pharmacovigilance Officer"],
  ["ADMIN", "admin@demo.test", "System Administrator"],
  ["REGULATOR", "regulator@demo.test", "Auditor / Regulator (Read-Only)"],
];
const DEMO_PASSWORD = "Demo@12345";

export default function Login() {
  const { me, login } = useAuth();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const nextParam = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [needTotp, setNeedTotp] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  if (me) {
    const target = sanitizeNext(nextParam, ROLE_HOMES[me.role] || "/app/pi");
    return <Navigate to={target} replace />;
  }

  async function submit(
    e?: FormEvent,
    creds?: { email: string; password: string },
  ) {
    e?.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const fresh = await login(creds?.email ?? email, creds?.password ?? password, totp);
      const role = fresh?.role || "PI";
      const target = sanitizeNext(nextParam, ROLE_HOMES[role] || "/app/pi");
      nav(target);
    } catch (ex) {
      if ((ex as Error).message.includes("TOTP")) setNeedTotp(true);
      setErr(ex);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-[#0A0F0D]">
      {/* ── Top-Left Ghost Pill: Back to Home ── */}
      <div className="absolute top-6 left-6 z-30">
        <Link
          to="/"
          aria-label="Back to Home"
          className="group inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-xs uppercase tracking-widest text-[#2FB39A]/90 border border-[#22302A] bg-[#101815]/90 backdrop-blur-md hover:text-[#39C8AD] hover:border-[#2FB39A]/60 hover:shadow-[0_0_16px_rgba(47,179,154,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2FB39A] transition-all duration-200"
        >
          <ArrowLeft size={14} className="text-[#2FB39A] transition-transform duration-200 group-hover:-translate-x-1" />
          <span>← Back to Home</span>
        </Link>
      </div>

      {/* ── Cinematic Botanical Particle Glow Background ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Ambient radial glows */}
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[var(--brand)]/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-[var(--accent-brass)]/10 blur-[120px]" />

        {/* Botanical Mandala / Hash Rings Pattern */}
        <svg
          className="absolute inset-0 w-full h-full opacity-10 animate-pulse-subtle"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="ringGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="50%" cy="50%" r="420" stroke="var(--brand)" strokeWidth="1" strokeDasharray="6 6" fill="none" />
          <circle cx="50%" cy="50%" r="300" stroke="var(--accent-brass)" strokeWidth="1" strokeDasharray="3 9" fill="none" />
          <circle cx="50%" cy="50%" r="180" stroke="var(--brand)" strokeWidth="1" fill="none" />
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-1)]/95 shadow-2xl backdrop-blur-xl overflow-hidden mt-12 sm:mt-0">
        {/* ── Left Cinematic Editorial Column ── */}
        <div className="lg:col-span-6 p-8 lg:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[var(--border)] bg-gradient-to-b from-[var(--surface-2)]/80 to-[var(--surface-1)]">
          <div>
            {/* Ministry & Institute Badges */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[var(--brand)]/15 text-[var(--brand-text)] border border-[var(--brand)]/30">
                Ministry of Ayush
              </span>
              <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[var(--accent-brass)]/15 text-[var(--accent-brass)] border border-[var(--accent-brass)]/30">
                AIIA · SIH 26046
              </span>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <BrandMark size={42} />
              <div>
                <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--text)]">
                  AyuCTMS
                </h1>
                <p className="text-xs font-mono text-[var(--text-muted)] tracking-wide">
                  Clinical Trial Management & Safety Command
                </p>
              </div>
            </div>

            {/* Core Differentiators */}
            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-2)]/40">
                <ShieldCheck size={18} className="text-[var(--brand)] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-[var(--text)]">
                    SHA-256 Hash-Chained Audit Trail
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] leading-relaxed mt-0.5">
                    Append-only cryptographic integrity verification with external Merkle checkpoints.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-2)]/40">
                <Activity size={18} className="text-[var(--accent-brass)] shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-semibold text-[var(--text)]">
                    Pharmacovigilance & Herb-Drug Engine
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] leading-relaxed mt-0.5">
                    Live 1Hz regulatory countdowns, Evans PRR/ROR signal detection, and Ayurvedic interaction warnings.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-[var(--border)] text-[10px] text-[var(--text-faint)] flex items-center justify-between font-mono">
            <span>STRICT ALCOA+ COMPLIANCE</span>
            <span>FHIR R4 & CDISC SDTM</span>
          </div>
        </div>

        {/* ── Right Form & Role Card Picker ── */}
        <div className="lg:col-span-6 p-8 lg:p-10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-[var(--text)]">
                Access Gateway
              </h2>
              <span className="text-[11px] font-mono text-[var(--text-muted)]">
                Secure Sign-in
              </span>
            </div>

            <form className="mt-6 space-y-4" onSubmit={submit}>
              <Field label="Operator Email">
                <input
                  className="input"
                  type="email"
                  placeholder="operator@aiia.gov.in"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>

              <Field label="Password">
                <input
                  className="input"
                  type="password"
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>

              {needTotp && (
                <Field label="2FA Authenticator Token (TOTP)">
                  <div className="relative">
                    <input
                      className="input pl-8 font-mono text-center tracking-widest"
                      inputMode="numeric"
                      placeholder="000 000"
                      maxLength={6}
                      value={totp}
                      onChange={(e) => setTotp(e.target.value)}
                    />
                    <KeyRound size={15} className="absolute left-2.5 top-3 text-[var(--brand)]" />
                  </div>
                </Field>
              )}

              <ErrorBox error={err} />

              <Button className="w-full" disabled={busy} size="lg">
                {busy ? "Authorizing Identity..." : "Authenticate Session"}
              </Button>
            </form>
          </div>

          {/* Quick Demo Access Roles */}
          <div className="mt-8 pt-6 border-t border-[var(--border)]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                1-Click Role Exploration (Synthetic Data)
              </span>
              <Sparkles size={13} className="text-[var(--accent-brass)]" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DEMO.map(([role, e]) => (
                <button
                  key={role}
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    submit(undefined, { email: e, password: DEMO_PASSWORD })
                  }
                  className="p-2 text-left rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)]/60 hover:bg-[var(--surface-3)] hover:border-[var(--brand)]/50 transition-all duration-150 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[var(--text)] group-hover:text-[var(--brand)]">
                      {ROLE_LABEL[role]}
                    </span>
                    <CheckCircle2 size={11} className="text-[var(--text-faint)] group-hover:text-[var(--brand)]" />
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                    {e}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
