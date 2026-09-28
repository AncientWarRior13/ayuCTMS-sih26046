import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { get, post } from "../api/client";
import { Can } from "../auth/RoleGuard";
import { Badge, Button, Card, ErrorBox, Field, human, Loading, Modal, Table, useToast } from "../components/ui";
import { STATE_TONE, STATES } from "../components/widgets";

function NewStudy({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const toast = useToast();
  const { data: sites = [] } = useQuery<any[]>({ queryKey: ["sites"], queryFn: () => get("/admin/sites"), enabled: open });
  const [f, setF] = useState({ protocol_no: "", title: "", type: "INTERVENTIONAL", phase: "Phase II", intervention: "", arms: "Intervention, Control", target_sample: 60, planned_start: "", planned_end: "", site_ids: [] as number[] });
  const m = useMutation({
    mutationFn: () =>
      post("/studies", {
        ...f,
        arms: f.arms.split(",").map((a) => a.trim()).filter(Boolean),
        planned_start: f.planned_start || null,
        planned_end: f.planned_end || null,
      }),
    onSuccess: (s: any) => {
      qc.invalidateQueries({ queryKey: ["studies"] });
      toast(`Study ${s.protocol_no} created in DRAFT`);
      onClose();
      nav(`/studies/${s.id}`);
    },
  });
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });
  return (
    <Modal open={open} onClose={onClose} title="New study" wide>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
        <Field label="Protocol number"><input className="input" required value={f.protocol_no} onChange={set("protocol_no")} placeholder="AIIA/2026/010" /></Field>
        <Field label="Design">
          <select className="input" value={f.type} onChange={set("type")}>
            <option value="INTERVENTIONAL">Interventional</option>
            <option value="OBSERVATIONAL">Observational</option>
          </select>
        </Field>
        <div className="sm:col-span-2"><Field label="Title"><input className="input" required minLength={3} value={f.title} onChange={set("title")} /></Field></div>
        <Field label="Phase"><input className="input" value={f.phase} onChange={set("phase")} /></Field>
        <Field label="Target sample size"><input className="input" type="number" min={1} required value={f.target_sample} onChange={(e) => setF({ ...f, target_sample: +e.target.value })} /></Field>
        <div className="sm:col-span-2"><Field label="Ayurveda intervention (formulation, dose, route)"><input className="input" value={f.intervention} onChange={set("intervention")} /></Field></div>
        <Field label="Arms (comma separated)" hint="Used for permuted-block randomisation"><input className="input" value={f.arms} onChange={set("arms")} /></Field>
        <Field label="Sites">
          <div className="flex flex-wrap gap-3 pt-1">
            {sites.map((s) => (
              <label key={s.id} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" checked={f.site_ids.includes(s.id)} onChange={(e) => setF({ ...f, site_ids: e.target.checked ? [...f.site_ids, s.id] : f.site_ids.filter((x) => x !== s.id) })} />
                {s.code}
              </label>
            ))}
          </div>
        </Field>
        <Field label="Planned start"><input className="input" type="date" value={f.planned_start} onChange={set("planned_start")} /></Field>
        <Field label="Planned end"><input className="input" type="date" value={f.planned_end} onChange={set("planned_end")} /></Field>
        <div className="sm:col-span-2"><ErrorBox error={m.error} /></div>
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button disabled={m.isPending}>Create study</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function StudiesPage() {
  const [state, setState] = useState("");
  const [open, setOpen] = useState(false);
  const { data = [], isLoading } = useQuery<any[]>({ queryKey: ["studies", state], queryFn: () => get(`/studies${state ? `?state=${state}` : ""}`) });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Studies</h1>
        <div className="flex gap-2">
          <select className="input w-48" value={state} onChange={(e) => setState(e.target.value)} aria-label="Filter by state">
            <option value="">All states</option>
            {STATES.map((s) => <option key={s} value={s}>{human(s)}</option>)}
          </select>
          <Can perm="study.create"><Button onClick={() => setOpen(true)}><Plus size={16} /> New study</Button></Can>
        </div>
      </div>
      <Card>
        {isLoading ? <Loading /> : (
          <Table head={["Protocol", "Title", "Type", "State", "CTRI", "PI", "Enrolment", "SAEs"]} empty={!data.length}>
            {data.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="td whitespace-nowrap font-medium"><Link className="text-brand-700 hover:underline" to={`/studies/${s.id}`}>{s.protocol_no}</Link></td>
                <td className="td max-w-sm"><div className="line-clamp-2" title={s.title}>{s.title}</div></td>
                <td className="td">{human(s.type)}</td>
                <td className="td"><Badge tone={STATE_TONE[s.state]}>{human(s.state)}</Badge></td>
                <td className="td mono">{s.ctri_number ?? <span className="text-slate-400">not registered</span>}</td>
                <td className="td whitespace-nowrap">{s.pi_name}</td>
                <td className="td min-w-32">
                  <div className="text-xs">{s.enrolled} / {s.target_sample}</div>
                  <div className="mt-1 h-1.5 rounded bg-slate-200"><div className="h-full rounded bg-brand-600" style={{ width: `${Math.min(100, (100 * s.enrolled) / s.target_sample)}%` }} /></div>
                </td>
                <td className="td">{s.sae_count ? <Badge tone="red">{s.sae_count}</Badge> : 0}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <NewStudy open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
