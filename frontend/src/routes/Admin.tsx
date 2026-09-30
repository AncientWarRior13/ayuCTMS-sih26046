import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { get, patch, post, put } from "../api/client";
import { ROLE_LABEL, useAuth, type Role } from "../auth/AuthContext";
import { Badge, Button, Card, ErrorBox, Field, fmtDateTime, Loading, Modal, PageHeader, Table, Tabs, useToast } from "../components/ui";

const ROLES = Object.keys(ROLE_LABEL) as Role[];

function Users() {
  const qc = useQueryClient();
  const toast = useToast();
  const { data: users = [], isLoading } = useQuery<any[]>({ queryKey: ["users"], queryFn: () => get("/admin/users") });
  const { data: sites = [] } = useQuery<any[]>({ queryKey: ["sites"], queryFn: () => get("/admin/sites") });
  const [edit, setEdit] = useState<any>(null);
  const [create, setCreate] = useState(false);
  const [nu, setNu] = useState({ email: "", full_name: "", role: "COORDINATOR", password: "", site_ids: [] as number[] });
  const inv = () => qc.invalidateQueries({ queryKey: ["users"] });
  const save = useMutation({ mutationFn: () => patch(`/admin/users/${edit.id}`, { role: edit.role, is_active: edit.is_active, site_ids: edit.site_ids, unlock: edit.unlock, reason: edit.reason }), onSuccess: () => { toast("User updated"); setEdit(null); inv(); } });
  const add = useMutation({ mutationFn: () => post("/admin/users", nu), onSuccess: () => { toast("User created"); setCreate(false); inv(); } });
  const siteBoxes = (val: number[], set: (v: number[]) => void) => (
    <div className="flex flex-wrap gap-3">{sites.map((s) => <label key={s.id} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={val.includes(s.id)} onChange={(e) => set(e.target.checked ? [...val, s.id] : val.filter((x) => x !== s.id))} />{s.code}</label>)}</div>
  );
  if (isLoading) return <Loading />;
  return (
    <Card title="Users and roles" actions={<Button size="sm" onClick={() => setCreate(true)}>Add user</Button>}>
      <Table head={["Name", "Email", "Role", "Sites", "Status", ""]}>
        {users.map((u) => (
          <tr key={u.id}>
            <td className="td font-medium">{u.full_name}</td><td className="td">{u.email}</td><td className="td">{ROLE_LABEL[u.role as Role]}</td>
            <td className="td text-xs">{u.site_ids.map((id: number) => sites.find((s) => s.id === id)?.code).join(", ") || "all (global role)"}</td>
            <td className="td">{!u.is_active ? <Badge tone="gray">Inactive</Badge> : u.locked_until && Date.parse(u.locked_until) > Date.now() ? <Badge tone="red">Locked</Badge> : <Badge tone="green">Active</Badge>}</td>
            <td className="td"><Button size="sm" variant="secondary" onClick={() => setEdit({ ...u, reason: "", unlock: false })}>Edit</Button></td>
          </tr>
        ))}
      </Table>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={`Edit ${edit?.full_name ?? ""}`}>
        {edit && (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
            <Field label="Role"><select className="input" value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></Field>
            <Field label="Sites">{siteBoxes(edit.site_ids, (v) => setEdit({ ...edit, site_ids: v }))}</Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.is_active} onChange={(e) => setEdit({ ...edit, is_active: e.target.checked })} /> Active</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.unlock} onChange={(e) => setEdit({ ...edit, unlock: e.target.checked })} /> Clear lockout</label>
            <Field label="Reason (audited)"><input className="input" required minLength={3} value={edit.reason} onChange={(e) => setEdit({ ...edit, reason: e.target.value })} /></Field>
            <ErrorBox error={save.error} />
            <Button disabled={save.isPending}>Save</Button>
          </form>
        )}
      </Modal>
      <Modal open={create} onClose={() => setCreate(false)} title="Add user">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); add.mutate(); }}>
          <Field label="Full name"><input className="input" required value={nu.full_name} onChange={(e) => setNu({ ...nu, full_name: e.target.value })} /></Field>
          <Field label="Email"><input className="input" type="email" required value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} /></Field>
          <Field label="Role"><select className="input" value={nu.role} onChange={(e) => setNu({ ...nu, role: e.target.value })}>{ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}</select></Field>
          <Field label="Initial password" hint="At least 10 characters"><input className="input" type="password" minLength={10} required value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} /></Field>
          <Field label="Sites">{siteBoxes(nu.site_ids, (v) => setNu({ ...nu, site_ids: v }))}</Field>
          <ErrorBox error={add.error} />
          <Button disabled={add.isPending}>Create user</Button>
        </form>
      </Modal>
    </Card>
  );
}

function Sites() {
  const qc = useQueryClient();
  const toast = useToast();
  const { data = [] } = useQuery<any[]>({ queryKey: ["sites"], queryFn: () => get("/admin/sites") });
  const [f, setF] = useState({ code: "", name: "", city: "" });
  const m = useMutation({ mutationFn: () => post("/admin/sites", f), onSuccess: () => { toast("Site added"); setF({ code: "", name: "", city: "" }); qc.invalidateQueries({ queryKey: ["sites"] }); } });
  return (
    <Card title="Sites">
      <Table head={["Code", "Name", "City"]}>{data.map((s) => <tr key={s.id}><td className="td font-medium">{s.code}</td><td className="td">{s.name}</td><td className="td">{s.city}</td></tr>)}</Table>
      <form className="mt-4 grid gap-3 sm:grid-cols-4" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
        <Field label="Code"><input className="input" required value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></Field>
        <Field label="Name"><input className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="City"><input className="input" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></Field>
        <div className="self-end"><Button disabled={m.isPending}>Add site</Button></div>
        <div className="sm:col-span-4"><ErrorBox error={m.error} /></div>
      </form>
    </Card>
  );
}

function Rules() {
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = useAuth();
  const { data = [] } = useQuery<any[]>({ queryKey: ["rules"], queryFn: () => get("/admin/rules") });
  const [edit, setEdit] = useState<any>(null);
  const m = useMutation({ mutationFn: () => put("/admin/rules", { rule_key: edit.rule_key, hours_allowed: +edit.hours_allowed, source_note: edit.source_note }), onSuccess: () => { toast("Rule updated"); setEdit(null); qc.invalidateQueries({ queryKey: ["rules"] }); } });
  return (
    <Card title="Regulatory reporting rules">
      <p className="mb-3 text-xs text-[var(--text-muted)] leading-relaxed">Durations drive every SAE clock. Changing a value requires a citation of the regulation clause; changes are audited.</p>
      <Table head={["Rule", "Description", "Hours", "Source citation", ""]}>
        {data.map((r) => (
          <tr key={r.id}>
            <td className="td mono">{r.rule_key}</td><td className="td">{r.description}</td><td className="td">{r.hours_allowed}</td>
            <td className="td text-xs">{r.source_note.startsWith("VERIFY") ? <Badge tone="amber">{r.source_note}</Badge> : r.source_note}</td>
            <td className="td">{can("rules.write") && <Button size="sm" variant="secondary" onClick={() => setEdit({ ...r })}>Edit</Button>}</td>
          </tr>
        ))}
      </Table>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.rule_key ?? ""}>
        {edit && (
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
            <Field label="Hours allowed"><input className="input" type="number" min={1} required value={edit.hours_allowed} onChange={(e) => setEdit({ ...edit, hours_allowed: e.target.value })} /></Field>
            <Field label="Source citation (clause of NDCT Rules 2019 / GCP-ASU)"><input className="input" required minLength={5} value={edit.source_note} onChange={(e) => setEdit({ ...edit, source_note: e.target.value })} /></Field>
            <ErrorBox error={m.error} />
            <Button disabled={m.isPending}>Save</Button>
          </form>
        )}
      </Modal>
    </Card>
  );
}

function Kpis() {
  const qc = useQueryClient();
  const toast = useToast();
  const { can } = useAuth();
  const { data = [] } = useQuery<any[]>({ queryKey: ["kpi"], queryFn: () => get("/admin/kpi-config") });
  const [vals, setVals] = useState<Record<string, number>>({});
  const m = useMutation({ mutationFn: () => put("/admin/kpi-config", Object.entries(vals).map(([key, value_num]) => ({ key, value_num }))), onSuccess: () => { toast("Thresholds saved"); setVals({}); qc.invalidateQueries({ queryKey: ["kpi"] }); } });
  return (
    <Card title="KPI and alert thresholds">
      <div className="grid gap-4 sm:grid-cols-2">
        {data.map((k) => (
          <Field key={k.key} label={k.description ?? k.key}>
            <input className="input" type="number" min={0} disabled={!can("kpi.write")} value={vals[k.key] ?? Number(k.value_num)} onChange={(e) => setVals({ ...vals, [k.key]: +e.target.value })} />
          </Field>
        ))}
      </div>
      <ErrorBox error={m.error} />
      {can("kpi.write") && <Button className="mt-4" disabled={!Object.keys(vals).length || m.isPending} onClick={() => m.mutate()}>Save thresholds</Button>}
    </Card>
  );
}

function Provenance() {
  const { data = [] } = useQuery<any[]>({ queryKey: ["lookup", "provenance"], queryFn: () => get("/lookups/provenance") });
  return (
    <Card title="Data provenance">
      <Table head={["Table", "Source", "URL", "Licence", "Notes", "Loaded"]}>
        {data.map((p) => <tr key={p.id}><td className="td mono">{p.table_name}</td><td className="td">{p.source_name}</td><td className="td text-xs">{p.source_url ?? "-"}</td><td className="td text-xs">{p.licence_note}</td><td className="td text-xs">{p.notes}</td><td className="td text-xs">{fmtDateTime(p.accessed_on)}</td></tr>)}
      </Table>
    </Card>
  );
}

type T = "users" | "sites" | "rules" | "kpi" | "provenance";

export default function AdminPage() {
  const { can } = useAuth();
  const tabs: [T, string][] = [
    ...(can("admin.users") ? ([["users", "Users"], ["sites", "Sites"]] as [T, string][]) : []),
    ["rules", "Regulatory rules"], ["kpi", "KPI thresholds"], ["provenance", "Data provenance"],
  ];
  const [tab, setTab] = useState<T>(tabs[0][0]);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="SYSTEM CONFIGURATION & ACCESS GOVERNANCE"
        title="System Administration"
        description="User RBAC management, site registration, regulatory SLA clock rules, and data provenance"
      />
      <Tabs value={tab} onChange={setTab} tabs={tabs} />
      {tab === "users" && <Users />}
      {tab === "sites" && <Sites />}
      {tab === "rules" && <Rules />}
      {tab === "kpi" && <Kpis />}
      {tab === "provenance" && <Provenance />}
    </div>
  );
}
