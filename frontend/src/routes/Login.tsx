import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ROLE_HOME, ROLE_LABEL, useAuth, type Role } from "../auth/AuthContext";
import { Button, ErrorBox, Field } from "../components/ui";

const DEMO: [Role, string][] = [
  ["PI", "pi@demo.test"],
  ["COORDINATOR", "coord@demo.test"],
  ["MONITOR", "monitor@demo.test"],
  ["IEC", "iec@demo.test"],
  ["PV", "pv@demo.test"],
  ["ADMIN", "admin@demo.test"],
  ["REGULATOR", "regulator@demo.test"],
];
const DEMO_PASSWORD = "Demo@12345";

export default function Login() {
  const { me, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [needTotp, setNeedTotp] = useState(false);
  const [err, setErr] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  if (me) return <Navigate to={ROLE_HOME[me.role]} replace />;

  async function submit(e?: FormEvent, creds?: { email: string; password: string }) {
    e?.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await login(creds?.email ?? email, creds?.password ?? password, totp);
      nav("/");
    } catch (ex) {
      if ((ex as Error).message.includes("TOTP")) setNeedTotp(true);
      setErr(ex);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-brand-50 via-white to-emerald-50 p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl md:grid-cols-2">
        <div className="hidden flex-col justify-between bg-brand-800 p-8 text-brand-50 md:flex">
          <div>
            <img src="/favicon.svg" alt="" className="h-10 w-10" />
            <h1 className="mt-4 text-2xl font-bold">AyuCTMS</h1>
            <p className="mt-1 text-sm text-brand-100">AIIA Clinical Trials Dashboard</p>
          </div>
          <ul className="space-y-2 text-sm text-brand-100">
            <li>Study lifecycle with CTRI and ethics guards</li>
            <li>Pharmacovigilance with live SAE reporting clocks</li>
            <li>Tamper-evident, hash-chained audit trail</li>
            <li>FHIR R4 and CDISC SDTM exports</li>
          </ul>
          <p className="text-xs text-brand-200">Ministry of Ayush - All India Institute of Ayurveda</p>
        </div>
        <div className="p-8">
          <h2 className="text-xl font-semibold">Sign in</h2>
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <Field label="Email">
              <input className="input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Password">
              <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            {needTotp && (
              <Field label="Authenticator code">
                <input className="input" inputMode="numeric" value={totp} onChange={(e) => setTotp(e.target.value)} />
              </Field>
            )}
            <ErrorBox error={err} />
            <Button className="w-full" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</Button>
          </form>
          <div className="mt-8">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Demo accounts (synthetic data)</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {DEMO.map(([role, e]) => (
                <button
                  key={role}
                  disabled={busy}
                  onClick={() => submit(undefined, { email: e, password: DEMO_PASSWORD })}
                  className="rounded-md border border-slate-200 px-2 py-1.5 text-left text-xs hover:border-brand-600 hover:bg-brand-50"
                >
                  <span className="block font-medium text-slate-800">{ROLE_LABEL[role]}</span>
                  <span className="text-slate-500">{e}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
