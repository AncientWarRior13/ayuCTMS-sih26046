import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { get, post } from "../api/client";
import { Can } from "../auth/RoleGuard";
import { Badge, Button, Card, fmtDateTime, human, LEVEL_TONE, Loading, Table } from "../components/ui";

export default function AlertsPage() {
  const qc = useQueryClient();
  const [all, setAll] = useState(false);
  const { data = [], isLoading } = useQuery<any[]>({ queryKey: ["alerts", all], queryFn: () => get(`/alerts?limit=300${all ? "&include_acknowledged=true" : ""}`) });
  const ack = useMutation({ mutationFn: (id: number) => post(`/alerts/${id}/ack`), onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }) });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Alerts</h1>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Include acknowledged</label>
      </div>
      <Card>
        {isLoading ? <Loading /> : (
          <Table head={["Level", "Rule", "Study", "Message", "Raised", "Status"]} empty={!data.length}>
            {data.map((a) => (
              <tr key={a.id} className={a.acknowledged_at ? "opacity-60" : ""}>
                <td className="td"><Badge tone={LEVEL_TONE[a.level]}>{a.level}</Badge></td>
                <td className="td text-xs">{human(a.rule_type)}</td>
                <td className="td text-xs">{a.protocol_no ?? "-"}</td>
                <td className="td">{a.message}</td>
                <td className="td whitespace-nowrap text-xs">{fmtDateTime(a.created_at)}</td>
                <td className="td whitespace-nowrap">
                  {a.acknowledged_at ? <span className="text-xs text-slate-500">Ack by {a.acknowledged_by_name}</span> : (
                    <Can perm="alert.ack"><Button size="sm" variant="secondary" onClick={() => ack.mutate(a.id)}>Acknowledge</Button></Can>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
