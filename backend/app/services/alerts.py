"""Rule/alert engine: evaluates regulatory clocks and KPI thresholds on a tick and on events."""
import asyncio
import logging
from datetime import datetime, timezone

from fastapi import WebSocket
from sqlalchemy import text
from sqlalchemy.engine import Connection

from ..core.db import system_tx
from .common import kpi, rows

log = logging.getLogger("ayuctms.alerts")

AUDIENCE: dict[str, set[str]] = {
    "SAE_CLOCK": {"PI", "PV", "ADMIN", "IEC", "REGULATOR"},
    "SAE_CREATED": {"PI", "PV", "ADMIN", "IEC", "REGULATOR", "MONITOR"},
    "EC_EXPIRY": {"PI", "IEC", "ADMIN", "REGULATOR"},
    "CTRI_UPDATE_DUE": {"PI", "ADMIN", "REGULATOR"},
    "ENROLMENT_LAG": {"PI", "COORDINATOR", "ADMIN", "REGULATOR"},
    "MONITORING_OVERDUE": {"PI", "MONITOR", "ADMIN"},
    "QUERY_AGEING": {"PI", "COORDINATOR", "MONITOR", "ADMIN"},
    "RECONSENT_DUE": {"PI", "COORDINATOR", "IEC", "ADMIN"},
    "SIGNAL": {"PV", "PI", "IEC", "ADMIN", "REGULATOR"},
}

THRESHOLDS = [(50, "INFO"), (80, "WARN"), (100, "CRITICAL")]


def _insert(conn: Connection, rule: str, etype: str, eid: int, study_id: int | None, level: str, msg: str,
            dedup: str) -> dict | None:
    r = conn.execute(
        text("INSERT INTO alerts (rule_type, entity_type, entity_id, study_id, level, message, dedup_key)"
             " VALUES (:r, :et, :eid, :sid, :lvl, :m, :d) ON CONFLICT (dedup_key) DO NOTHING"
             " RETURNING id, rule_type, entity_type, entity_id, study_id, level, message, created_at"),
        {"r": rule, "et": etype, "eid": eid, "sid": study_id, "lvl": level, "m": msg, "d": dedup},
    ).first()
    return dict(r._mapping) if r else None


def clock_pct(started_at: datetime, due_at: datetime, now: datetime | None = None) -> float:
    now = now or datetime.now(timezone.utc)
    total = (due_at - started_at).total_seconds()
    return round(max(0.0, (now - started_at).total_seconds()) / total * 100, 1) if total > 0 else 100.0


def eval_clocks(conn: Connection) -> list[dict]:
    new = []
    for c in rows(conn, """
        SELECT c.*, r.rule_key, r.description, a.study_id, p.subject_code
        FROM ae_clocks c JOIN regulatory_rules r ON r.id = c.rule_id
        JOIN adverse_events a ON a.id = c.adverse_event_id JOIN participants p ON p.id = a.participant_id
        WHERE c.status <> 'COMPLETED'"""):
        pct = clock_pct(c["started_at"], c["due_at"])
        last = c["last_alert_pct"]
        for th, level in THRESHOLDS:
            if pct >= th > last:
                label = "OVERDUE" if th == 100 else f"{th}% elapsed"
                a = _insert(conn, "SAE_CLOCK", "ae_clock", c["id"], c["study_id"], level,
                            f"SAE #{c['adverse_event_id']} ({c['subject_code']}): {c['description']} - {label}",
                            f"SAE_CLOCK:{c['id']}:{th}")
                if a:
                    new.append(a)
                last = th
        status = "OVERDUE" if pct >= 100 else c["status"]
        if last != c["last_alert_pct"] or status != c["status"]:
            conn.execute(text("UPDATE ae_clocks SET last_alert_pct = :l, status = :s WHERE id = :id"),
                         {"l": last, "s": status, "id": c["id"]})
    return new


def eval_kpis(conn: Connection) -> list[dict]:
    cfg = kpi(conn)
    new: list[dict] = []
    week = datetime.now(timezone.utc).strftime("%G-W%V")

    for s in rows(conn, """
        SELECT s.id, s.protocol_no, s.target_sample, s.planned_start, s.planned_end,
               (SELECT count(*) FROM participants p WHERE p.study_id = s.id AND p.enrolled_on IS NOT NULL) AS enrolled
        FROM studies s WHERE s.state = 'ENROLLING' AND s.planned_start IS NOT NULL AND s.planned_end > s.planned_start"""):
        span = (s["planned_end"] - s["planned_start"]).days
        elapsed = min(max((datetime.now(timezone.utc).date() - s["planned_start"]).days, 0), span)
        expected = s["target_sample"] * elapsed / span
        tol = cfg.get("enrolment_lag_tolerance_pct", 15) / 100
        if expected > 0 and s["enrolled"] < expected * (1 - tol):
            a = _insert(conn, "ENROLMENT_LAG", "study", s["id"], s["id"], "WARN",
                        f"{s['protocol_no']}: enrolment {s['enrolled']} vs expected {expected:.0f} by today",
                        f"ENROLMENT_LAG:{s['id']}:{week}")
            new += [a] if a else []

    for e in rows(conn, """
        SELECT e.id, e.study_id, e.valid_to, s.protocol_no FROM ethics_approvals e JOIN studies s ON s.id = e.study_id
        WHERE s.state NOT IN ('CLOSED','DRAFT') AND e.valid_to <= current_date + make_interval(days => :d)
          AND e.id = (SELECT id FROM ethics_approvals x WHERE x.study_id = e.study_id ORDER BY valid_to DESC LIMIT 1)""",
                   {"d": int(cfg.get("ec_expiry_warn_days", 30))}):
        expired = e["valid_to"] < datetime.now(timezone.utc).date()
        a = _insert(conn, "EC_EXPIRY", "ethics_approval", e["id"], e["study_id"], "CRITICAL" if expired else "WARN",
                    f"{e['protocol_no']}: ethics approval {'expired' if expired else 'expires'} on {e['valid_to']}",
                    f"EC_EXPIRY:{e['id']}:{'expired' if expired else 'warn'}")
        new += [a] if a else []

    for c in rows(conn, """
        SELECT c.id, c.study_id, c.ctri_number, COALESCE(c.last_updated_on, c.registered_on) AS upd, s.protocol_no
        FROM ctri_registrations c JOIN studies s ON s.id = c.study_id
        WHERE s.state NOT IN ('CLOSED') AND COALESCE(c.last_updated_on, c.registered_on) < current_date - :d""",
                   {"d": int(cfg.get("ctri_update_warn_days", 180))}):
        a = _insert(conn, "CTRI_UPDATE_DUE", "ctri", c["id"], c["study_id"], "WARN",
                    f"{c['protocol_no']}: CTRI record {c['ctri_number']} not updated since {c['upd']}",
                    f"CTRI_UPDATE_DUE:{c['id']}:{c['upd']}")
        new += [a] if a else []

    for m in rows(conn, """
        SELECT ss.study_id, ss.site_id, s.protocol_no, si.code,
               (SELECT max(visit_date) FROM monitoring_visits mv WHERE mv.study_id = ss.study_id AND mv.site_id = ss.site_id) AS last_visit,
               ss.activated_on
        FROM study_sites ss JOIN studies s ON s.id = ss.study_id JOIN sites si ON si.id = ss.site_id
        WHERE s.state IN ('ENROLLING','FOLLOW_UP') AND ss.activated_on IS NOT NULL"""):
        ref = m["last_visit"] or m["activated_on"]
        if (datetime.now(timezone.utc).date() - ref).days > cfg.get("monitoring_overdue_days", 90):
            a = _insert(conn, "MONITORING_OVERDUE", "study", m["study_id"], m["study_id"], "WARN",
                        f"{m['protocol_no']} @ {m['code']}: no monitoring visit since {ref}",
                        f"MONITORING_OVERDUE:{m['study_id']}:{m['site_id']}:{ref}")
            new += [a] if a else []

    for q in rows(conn, """
        SELECT q.id, q.study_id, q.opened_at, s.protocol_no FROM queries q JOIN studies s ON s.id = q.study_id
        WHERE q.status <> 'CLOSED' AND q.opened_at < now() - make_interval(days => :d)""",
                   {"d": int(cfg.get("query_ageing_days", 14))}):
        a = _insert(conn, "QUERY_AGEING", "query", q["id"], q["study_id"], "INFO",
                    f"{q['protocol_no']}: query #{q['id']} open since {q['opened_at']:%Y-%m-%d}",
                    f"QUERY_AGEING:{q['id']}")
        new += [a] if a else []

    for r in rows(conn, """
        SELECT pa.id, pa.study_id, pa.version, s.protocol_no, count(p.id) AS pending
        FROM protocol_amendments pa JOIN studies s ON s.id = pa.study_id
        JOIN participants p ON p.study_id = pa.study_id AND p.status IN ('ENROLLED','RANDOMIZED')
        WHERE pa.requires_reconsent AND pa.consent_document_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM consents c WHERE c.participant_id = p.id
                          AND c.consent_document_id = pa.consent_document_id AND c.withdrawn_at IS NULL)
        GROUP BY pa.id, s.protocol_no"""):
        a = _insert(conn, "RECONSENT_DUE", "protocol_amendment", r["id"], r["study_id"], "WARN",
                    f"{r['protocol_no']}: {r['pending']} participants need re-consent for amendment {r['version']}",
                    f"RECONSENT_DUE:{r['id']}")
        new += [a] if a else []

    thr = int(cfg.get("signal_pt_threshold", 3))
    for s in rows(conn, """
        SELECT a.study_id, a.meddra_pt, count(*) AS n, s.protocol_no FROM adverse_events a JOIN studies s ON s.id = a.study_id
        WHERE a.meddra_pt IS NOT NULL GROUP BY a.study_id, a.meddra_pt, s.protocol_no HAVING count(*) >= :t""", {"t": thr}):
        a = _insert(conn, "SIGNAL", "study", s["study_id"], s["study_id"], "WARN",
                    f"{s['protocol_no']}: possible signal - {s['n']} reports of '{s['meddra_pt']}'",
                    f"SIGNAL:{s['study_id']}:{s['meddra_pt']}:{s['n'] // thr}")
        new += [a] if a else []

    # visit windows
    conn.execute(text("UPDATE visits SET status = 'MISSED' WHERE status = 'PLANNED'"
                      " AND planned_date + window_days < current_date"))
    return new


def evaluate() -> list[dict]:
    with system_tx() as conn:
        return eval_clocks(conn) + eval_kpis(conn)


class Hub:
    """Tracks WebSocket clients and pushes alerts to the roles in each alert's audience."""

    def __init__(self) -> None:
        self.clients: dict[WebSocket, str] = {}
        self.loop: asyncio.AbstractEventLoop | None = None
        self.wake = asyncio.Event()

    async def connect(self, ws: WebSocket, role: str) -> None:
        await ws.accept()
        self.clients[ws] = role

    def disconnect(self, ws: WebSocket) -> None:
        self.clients.pop(ws, None)

    async def broadcast(self, event: str, payload: dict, audience: set[str] | None = None) -> None:
        for ws, role in list(self.clients.items()):
            if audience is None or role in audience:
                try:
                    await ws.send_json({"event": event, "data": payload})
                except Exception:
                    self.disconnect(ws)

    def kick(self) -> None:
        """Request an immediate evaluation (safe to call from worker threads)."""
        if self.loop:
            self.loop.call_soon_threadsafe(self.wake.set)

    def emit(self, event: str, payload: dict, audience: set[str] | None = None) -> None:
        if self.loop:
            asyncio.run_coroutine_threadsafe(self.broadcast(event, payload, audience), self.loop)

    async def run(self, interval: int) -> None:
        self.loop = asyncio.get_running_loop()
        while True:
            try:
                new = await asyncio.to_thread(evaluate)
                for a in new:
                    await self.broadcast("alert", _jsonable(a), AUDIENCE.get(a["rule_type"]))
                await self.broadcast("tick", {"at": datetime.now(timezone.utc).isoformat()})
            except Exception:
                log.exception("alert evaluation failed")
            try:
                await asyncio.wait_for(self.wake.wait(), timeout=interval)
            except asyncio.TimeoutError:
                pass
            self.wake.clear()


def _jsonable(d: dict) -> dict:
    return {k: (v.isoformat() if isinstance(v, datetime) else v) for k, v in d.items()}


hub = Hub()
