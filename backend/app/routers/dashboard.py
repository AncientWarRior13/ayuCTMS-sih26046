from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import text

from ..core.deps import User, db, require
from ..core.security import decode
from ..services import audit
from ..services.alerts import AUDIENCE, hub
from ..services.common import get_or_404, kpi, one, rows, study_or_404
from ..services.prakriti_analysis import by_prakriti
from ..services.predictive_risk import participant_risk

router = APIRouter(tags=["dashboard & alerts"])


def _audience_types(role: str) -> list[str]:
    return [k for k, roles in AUDIENCE.items() if role in roles]


@router.get("/dashboard/portfolio")
def portfolio(user: User = Depends(require("dashboard.read")), conn=Depends(db)):
    by_state = rows(conn, "SELECT state, count(*) AS n FROM studies GROUP BY state ORDER BY state")
    enrolment = rows(conn, """
        SELECT s.id, s.protocol_no, s.title, s.state, s.target_sample, s.planned_start, s.planned_end,
               (SELECT count(*) FROM participants p WHERE p.study_id = s.id AND p.enrolled_on IS NOT NULL) AS enrolled
        FROM studies s ORDER BY s.id""")
    today = date.today()
    for s in enrolment:
        exp = None
        if s["planned_start"] and s["planned_end"] and s["planned_end"] > s["planned_start"] and s["state"] == "ENROLLING":
            span = (s["planned_end"] - s["planned_start"]).days
            exp = round(s["target_sample"] * min(max((today - s["planned_start"]).days, 0), span) / span)
        s["expected_to_date"] = exp
        s["pct_of_target"] = round(100 * s["enrolled"] / s["target_sample"], 1)
    safety = one(conn, """SELECT count(*) AS ae_total, count(*) FILTER (WHERE is_serious) AS sae_total,
                          count(*) FILTER (WHERE created_at > now() - interval '30 days') AS ae_last_30d FROM adverse_events""")
    clocks = one(conn, """SELECT count(*) FILTER (WHERE status = 'RUNNING') AS running,
                          count(*) FILTER (WHERE status = 'OVERDUE') AS overdue,
                          count(*) FILTER (WHERE status = 'COMPLETED' AND completed_at <= due_at) AS on_time,
                          count(*) FILTER (WHERE status = 'COMPLETED') AS completed FROM ae_clocks""")
    cfg = kpi(conn)
    overdue = one(conn, """SELECT
        (SELECT count(*) FROM queries WHERE status <> 'CLOSED' AND opened_at < now() - make_interval(days => :q)) AS aged_queries,
        (SELECT count(*) FROM queries WHERE status <> 'CLOSED') AS open_queries,
        (SELECT count(*) FROM deviations WHERE closed_at IS NULL) AS open_deviations,
        (SELECT count(*) FROM visits v JOIN participants p ON p.id = v.participant_id WHERE v.status = 'MISSED') AS missed_visits,
        (SELECT count(*) FROM ethics_approvals e WHERE e.valid_to BETWEEN current_date AND current_date + make_interval(days => :ec))
            AS ec_expiring""", {"q": int(cfg.get("query_ageing_days", 14)), "ec": int(cfg.get("ec_expiry_warn_days", 30))})
    unack = conn.execute(text("SELECT count(*) FROM alerts WHERE acknowledged_at IS NULL AND rule_type = ANY(:t)"),
                         {"t": _audience_types(user.role)}).scalar()
    return {"studies_by_state": by_state, "enrolment": enrolment, "safety": safety, "clocks": clocks,
            "overdue": overdue, "unacknowledged_alerts": unack,
            "totals": {"studies": sum(r["n"] for r in by_state),
                       "enrolled": sum(s["enrolled"] for s in enrolment),
                       "target": sum(s["target_sample"] for s in enrolment)}}


@router.get("/dashboard/study/{sid}")
def study_dashboard(sid: int, user: User = Depends(require("dashboard.read")), conn=Depends(db)):
    s = study_or_404(conn, sid)
    curve = rows(conn, """SELECT to_char(date_trunc('week', enrolled_on), 'YYYY-MM-DD') AS week, count(*) AS n
                          FROM participants WHERE study_id = :s AND enrolled_on IS NOT NULL GROUP BY 1 ORDER BY 1""", {"s": sid})
    total = 0
    for c in curve:
        total += c["n"]
        c["cumulative"] = total
    return {
        "study": {k: s[k] for k in ["id", "protocol_no", "title", "state", "target_sample", "planned_start", "planned_end"]},
        "enrolment_curve": curve,
        "by_site": rows(conn, """SELECT si.code, ss.site_target,
                                 count(p.id) FILTER (WHERE p.enrolled_on IS NOT NULL) AS enrolled,
                                 count(p.id) FILTER (WHERE p.status = 'WITHDRAWN') AS withdrawn
                                 FROM study_sites ss JOIN sites si ON si.id = ss.site_id
                                 LEFT JOIN participants p ON p.study_id = ss.study_id AND p.site_id = ss.site_id
                                 WHERE ss.study_id = :s GROUP BY si.code, ss.site_target ORDER BY si.code""", {"s": sid}),
        "by_arm": rows(conn, "SELECT COALESCE(arm, 'Unassigned') AS arm, count(*) AS n FROM participants WHERE study_id = :s"
                             " GROUP BY 1 ORDER BY 1", {"s": sid}),
        "by_status": rows(conn, "SELECT status, count(*) AS n FROM participants WHERE study_id = :s GROUP BY 1 ORDER BY 1",
                          {"s": sid}),
        "visits": one(conn, """SELECT count(*) FILTER (WHERE v.status = 'DONE') AS done,
                               count(*) FILTER (WHERE v.status = 'MISSED') AS missed,
                               count(*) FILTER (WHERE v.status = 'OUT_OF_WINDOW') AS out_of_window,
                               count(*) FILTER (WHERE v.status = 'PLANNED') AS planned
                               FROM visits v JOIN participants p ON p.id = v.participant_id WHERE p.study_id = :s""", {"s": sid}),
        "deviations": one(conn, """SELECT count(*) AS total, count(*) FILTER (WHERE closed_at IS NULL) AS open,
                                   count(*) FILTER (WHERE severity IN ('MAJOR','CRITICAL')) AS major
                                   FROM deviations WHERE study_id = :s""", {"s": sid}),
        "queries": one(conn, """SELECT count(*) FILTER (WHERE status = 'OPEN') AS open,
                                count(*) FILTER (WHERE status = 'ANSWERED') AS answered,
                                count(*) FILTER (WHERE status = 'CLOSED') AS closed FROM queries WHERE study_id = :s""", {"s": sid}),
        "safety": one(conn, """SELECT count(*) AS ae, count(*) FILTER (WHERE is_serious) AS sae
                               FROM adverse_events WHERE study_id = :s""", {"s": sid}),
    }


@router.get("/dashboard/risk")
def risk_heatmap(user: User = Depends(require("dashboard.read")), conn=Depends(db)):
    """Risk-based monitoring heatmap: one cell per study x site, scored 0-100 from weighted indicators."""
    cells = rows(conn, """
        SELECT s.id AS study_id, s.protocol_no, si.id AS site_id, si.code AS site_code,
          (SELECT count(*) FROM participants p WHERE p.study_id = s.id AND p.site_id = si.id AND p.enrolled_on IS NOT NULL) AS enrolled,
          (SELECT count(*) FROM deviations d JOIN participants p ON p.id = d.participant_id
             WHERE d.study_id = s.id AND p.site_id = si.id AND d.severity IN ('MAJOR','CRITICAL')) AS major_dev,
          (SELECT count(*) FROM queries q JOIN participants p ON p.id = q.participant_id
             WHERE q.study_id = s.id AND p.site_id = si.id AND q.status <> 'CLOSED') AS open_q,
          (SELECT count(*) FROM visits v JOIN participants p ON p.id = v.participant_id
             WHERE p.study_id = s.id AND p.site_id = si.id AND v.status IN ('MISSED','OUT_OF_WINDOW')) AS bad_visits,
          (SELECT count(*) FROM visits v JOIN participants p ON p.id = v.participant_id
             WHERE p.study_id = s.id AND p.site_id = si.id AND v.status <> 'PLANNED') AS due_visits,
          (SELECT count(*) FROM adverse_events a JOIN participants p ON p.id = a.participant_id
             WHERE a.study_id = s.id AND p.site_id = si.id AND a.is_serious) AS sae,
          (SELECT count(*) FROM ae_clocks c JOIN adverse_events a ON a.id = c.adverse_event_id
             JOIN participants p ON p.id = a.participant_id
             WHERE a.study_id = s.id AND p.site_id = si.id AND c.status = 'OVERDUE') AS overdue_clocks
        FROM studies s JOIN study_sites ss ON ss.study_id = s.id JOIN sites si ON si.id = ss.site_id
        WHERE s.state IN ('SITE_ACTIVE','ENROLLING','FOLLOW_UP') ORDER BY s.id, si.code""")
    for c in cells:
        n = max(c["enrolled"], 1)
        indicators = {
            "major_deviation_rate": min(c["major_dev"] / n * 10, 1.0) * 25,
            "open_query_rate": min(c["open_q"] / n * 5, 1.0) * 20,
            "visit_non_compliance": (c["bad_visits"] / c["due_visits"] if c["due_visits"] else 0) * 20,
            "sae_rate": min(c["sae"] / n * 10, 1.0) * 15,
            "overdue_reports": min(c["overdue_clocks"], 1) * 20,
        }
        c["indicators"] = {k: round(v, 1) for k, v in indicators.items()}
        c["score"] = round(sum(indicators.values()))
        c["band"] = "HIGH" if c["score"] >= 50 else "MEDIUM" if c["score"] >= 25 else "LOW"
    return cells


@router.get("/dashboard/predictive-risk")
def predictive_risk(study_id: int | None = None, user: User = Depends(require("dashboard.read")), conn=Depends(db)):
    """Per-participant deviation risk from leading indicators (visit slippage, query pile-up,
    site workload), so monitoring can target participants before a deviation occurs."""
    return participant_risk(conn, study_id)


@router.get("/dashboard/prakriti")
def prakriti_analysis(study_id: int | None = None, user: User = Depends(require("dashboard.read")), conn=Depends(db)):
    """Adverse-event rate and primary-outcome change stratified by Prakriti (constitutional type)."""
    return by_prakriti(conn, study_id)


@router.get("/alerts")
def list_alerts(include_acknowledged: bool = False, limit: int = Query(100, le=500),
                user: User = Depends(require("alert.read")), conn=Depends(db)):
    return rows(conn, """SELECT a.*, s.protocol_no, u.full_name AS acknowledged_by_name FROM alerts a
                         LEFT JOIN studies s ON s.id = a.study_id LEFT JOIN users u ON u.id = a.acknowledged_by
                         WHERE a.rule_type = ANY(:t) AND (:all OR a.acknowledged_at IS NULL)
                         ORDER BY a.acknowledged_at IS NOT NULL, a.level DESC, a.created_at DESC LIMIT :l""",
                {"t": _audience_types(user.role), "all": include_acknowledged, "l": limit})


@router.post("/alerts/{alert_id}/ack")
def ack(alert_id: int, user: User = Depends(require("alert.ack")), conn=Depends(db)):
    a = get_or_404(conn, "SELECT * FROM alerts WHERE id = :id AND rule_type = ANY(:t)",
                   {"id": alert_id, "t": _audience_types(user.role)}, "Alert")
    if a["acknowledged_at"]:
        raise HTTPException(409, "Already acknowledged")
    r = one(conn, "UPDATE alerts SET acknowledged_by = :u, acknowledged_at = now() WHERE id = :id RETURNING *",
            {"u": user.id, "id": alert_id})
    audit.write(conn, user, "ACK", "alert", alert_id)
    return r


@router.websocket("/ws/alerts")
async def ws_alerts(ws: WebSocket, token: str):
    data = decode(token, "access")
    if not data:
        await ws.close(code=4401)
        return
    await hub.connect(ws, data["role"])
    try:
        while True:
            await ws.receive_text()  # keep-alive pings from client
    except WebSocketDisconnect:
        hub.disconnect(ws)
