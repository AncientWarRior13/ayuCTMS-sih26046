from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel, Field

from ..core.deps import User, db, require
from ..services import audit
from ..services.alerts import AUDIENCE, clock_pct, hub
from ..services.common import ensure_own_study, get_or_404, kpi, one, participant_or_404, rows, study_or_404
from ..services.report import sae_pdf, sae_report

router = APIRouter(tags=["pharmacovigilance"])

SERIOUSNESS = {"death", "life-threatening", "hospitalisation", "disability", "congenital-anomaly", "other-medically-important"}
CAUSALITY = ["CERTAIN", "PROBABLE", "POSSIBLE", "UNLIKELY", "CONDITIONAL", "UNASSESSABLE", "UNRELATED"]


class AECreate(BaseModel):
    participant_id: int
    onset_date: date
    awareness_at: datetime
    description: str = Field(min_length=3)
    severity: str = Field(pattern="^(MILD|MODERATE|SEVERE)$")
    is_serious: bool = False
    seriousness_criteria: list[str] = []
    suspect_intervention: str | None = None
    concomitant_meds: str | None = None
    action_taken: str | None = None
    outcome: str = "UNKNOWN"
    meddra_pt: str | None = None
    who_drug_code: str | None = None
    ayush_morbidity_code: str | None = None
    icd11_code: str | None = None


class CausalityIn(BaseModel):
    causality: str
    naranjo_score: int | None = Field(default=None, ge=-4, le=13)
    outcome: str | None = None
    reason: str = Field(min_length=3)


class SubmitIn(BaseModel):
    clock_id: int | None = None
    reference: str | None = None


def naranjo_category(score: int | None) -> str | None:
    if score is None:
        return None
    return "Definite" if score >= 9 else "Probable" if score >= 5 else "Possible" if score >= 1 else "Doubtful"


def _with_clocks(conn, ae_rows: list[dict]) -> list[dict]:
    ids = [a["id"] for a in ae_rows]
    clocks = rows(conn, "SELECT c.*, r.rule_key, r.description AS rule_description, r.hours_allowed FROM ae_clocks c"
                        " JOIN regulatory_rules r ON r.id = c.rule_id WHERE c.adverse_event_id = ANY(:ids) ORDER BY c.due_at",
                  {"ids": ids}) if ids else []
    by: dict[int, list] = {}
    now = datetime.now(timezone.utc)
    for c in clocks:
        c["pct_elapsed"] = 100.0 if c["status"] == "COMPLETED" else clock_pct(c["started_at"], c["due_at"], now)
        c["seconds_left"] = None if c["status"] == "COMPLETED" else int((c["due_at"] - now).total_seconds())
        by.setdefault(c["adverse_event_id"], []).append(c)
    for a in ae_rows:
        a["clocks"] = by.get(a["id"], [])
        a["naranjo_category"] = naranjo_category(a.get("naranjo_score"))
    return ae_rows


AE_SELECT = """SELECT a.*, p.subject_code, p.site_id, s.protocol_no, u.full_name AS reported_by_name
               FROM adverse_events a JOIN participants p ON p.id = a.participant_id JOIN studies s ON s.id = a.study_id
               LEFT JOIN users u ON u.id = a.reported_by"""


@router.get("/ae")
def list_ae(study_id: int | None = None, serious: bool | None = None, user: User = Depends(require("ae.read")),
            conn=Depends(db)):
    data = rows(conn, AE_SELECT + """ WHERE (CAST(:s AS int) IS NULL OR a.study_id = :s)
               AND (CAST(:ser AS boolean) IS NULL OR a.is_serious = :ser) ORDER BY a.awareness_at DESC""",
                {"s": study_id, "ser": serious})
    return _with_clocks(conn, data)


@router.get("/ae/{aid}")
def get_ae(aid: int, user: User = Depends(require("ae.read")), conn=Depends(db)):
    a = get_or_404(conn, AE_SELECT + " WHERE a.id = :id", {"id": aid}, "Adverse event")
    return _with_clocks(conn, [a])[0]


@router.post("/ae", status_code=201)
def create_ae(body: AECreate, user: User = Depends(require("ae.create")), conn=Depends(db)):
    p = participant_or_404(conn, body.participant_id)
    s = study_or_404(conn, p["study_id"])
    if user.role == "PI":
        ensure_own_study(user, s)
    if body.onset_date > date.today():
        raise HTTPException(422, "Onset date cannot be in the future")
    aware = body.awareness_at if body.awareness_at.tzinfo else body.awareness_at.replace(tzinfo=timezone.utc)
    if aware > datetime.now(timezone.utc) + timedelta(minutes=5):
        raise HTTPException(422, "Awareness time cannot be in the future")
    bad = set(body.seriousness_criteria) - SERIOUSNESS
    if bad:
        raise HTTPException(422, f"Unknown seriousness criteria: {sorted(bad)}")
    if body.is_serious and not body.seriousness_criteria:
        raise HTTPException(422, "A serious event needs at least one seriousness criterion")
    a = one(conn, """INSERT INTO adverse_events (study_id, participant_id, onset_date, awareness_at, description, severity,
                     is_serious, seriousness_criteria, suspect_intervention, concomitant_meds, action_taken, outcome,
                     meddra_pt, who_drug_code, ayush_morbidity_code, icd11_code, reported_by)
                     VALUES (:study, :participant_id, :onset_date, :aware, :description, :severity, :is_serious,
                     :seriousness_criteria, :suspect_intervention, :concomitant_meds, :action_taken, :outcome, :meddra_pt,
                     :who_drug_code, :ayush_morbidity_code, :icd11_code, :u) RETURNING *""",
            {**body.model_dump(exclude={"awareness_at"}), "aware": aware, "study": s["id"], "u": user.id,
             "suspect_intervention": body.suspect_intervention or s["intervention"]})
    clocks = []
    if body.is_serious:
        for r in rows(conn, "SELECT * FROM regulatory_rules WHERE applies_to = 'SAE' ORDER BY hours_allowed"):
            clocks.append(one(conn, "INSERT INTO ae_clocks (adverse_event_id, rule_id, started_at, due_at) VALUES"
                                    " (:a, :r, :st, :due) RETURNING *",
                              {"a": a["id"], "r": r["id"], "st": aware, "due": aware + timedelta(hours=r["hours_allowed"])}))
    audit.write(conn, user, "CREATE", "adverse_event", a["id"], after={**a, "clocks": len(clocks)})
    if body.is_serious:
        hub.emit("sae_created", {"id": a["id"], "study_id": s["id"], "subject_code": p["subject_code"],
                                 "description": a["description"]}, AUDIENCE["SAE_CREATED"])
        hub.kick()
    return {**a, "clocks": clocks}


@router.post("/ae/{aid}/causality")
def assess_causality(aid: int, body: CausalityIn, user: User = Depends(require("ae.causality")), conn=Depends(db)):
    if body.causality not in CAUSALITY:
        raise HTTPException(422, f"causality must be one of {CAUSALITY}")
    a = get_or_404(conn, "SELECT * FROM adverse_events WHERE id = :id", {"id": aid}, "Adverse event")
    if user.role == "PI":
        ensure_own_study(user, study_or_404(conn, a["study_id"]))
    r = one(conn, "UPDATE adverse_events SET causality = :c, naranjo_score = :n, outcome = COALESCE(:o, outcome)"
                  " WHERE id = :id RETURNING *", {"c": body.causality, "n": body.naranjo_score, "o": body.outcome, "id": aid})
    audit.write(conn, user, "CAUSALITY", "adverse_event", aid,
                {k: a[k] for k in ["causality", "naranjo_score", "outcome"]},
                {k: r[k] for k in ["causality", "naranjo_score", "outcome"]}, body.reason)
    return r


@router.get("/ae/{aid}/clocks")
def ae_clocks(aid: int, user: User = Depends(require("ae.read")), conn=Depends(db)):
    get_or_404(conn, "SELECT id FROM adverse_events WHERE id = :id", {"id": aid}, "Adverse event")
    return _with_clocks(conn, [{"id": aid}])[0]["clocks"]


@router.post("/ae/{aid}/submit-report")
def submit_report(aid: int, body: SubmitIn | None = None, user: User = Depends(require("ae.submit")), conn=Depends(db)):
    a = get_or_404(conn, "SELECT * FROM adverse_events WHERE id = :id", {"id": aid}, "Adverse event")
    if user.role == "PI":
        ensure_own_study(user, study_or_404(conn, a["study_id"]))
    body = body or SubmitIn()
    q = "SELECT * FROM ae_clocks WHERE adverse_event_id = :a AND status <> 'COMPLETED'"
    params = {"a": aid}
    if body.clock_id:
        q += " AND id = :c"
        params["c"] = body.clock_id
    open_clocks = rows(conn, q, params)
    if not open_clocks:
        raise HTTPException(409, "No open regulatory clock for this event")
    done = []
    for c in open_clocks:
        r = one(conn, "UPDATE ae_clocks SET status = 'COMPLETED', completed_at = now() WHERE id = :id RETURNING *",
                {"id": c["id"]})
        done.append({**r, "on_time": r["completed_at"] <= c["due_at"]})
        audit.write(conn, user, "SUBMIT_REPORT", "ae_clock", c["id"], {"status": c["status"]},
                    {"status": "COMPLETED", "reference": body.reference}, "Regulatory report submitted")
    hub.emit("clock_completed", {"adverse_event_id": aid, "clock_ids": [c["id"] for c in done]}, AUDIENCE["SAE_CLOCK"])
    return done


@router.get("/ae/{aid}/report")
def get_report(aid: int, format: str = Query("json", pattern="^(json|pdf)$"), user: User = Depends(require("ae.report")),
               conn=Depends(db)):
    rep = sae_report(conn, aid)
    audit.write(conn, user, "EXPORT", "sae_report", aid, after={"format": format})
    if format == "pdf":
        return Response(sae_pdf(rep), media_type="application/pdf",
                        headers={"Content-Disposition": f'attachment; filename="sae-report-{aid}.pdf"'})
    return rep


@router.get("/pv/signals")
def signals(study_id: int | None = None, user: User = Depends(require("pv.signals")), conn=Depends(db)):
    thr = int(kpi(conn).get("signal_pt_threshold", 3))
    f = "(CAST(:s AS int) IS NULL OR a.study_id = :s)"
    p = {"s": study_id}
    by_pt = rows(conn, f"""SELECT COALESCE(a.meddra_pt, 'Uncoded') AS pt, COALESCE(m.soc, 'Unknown') AS soc, count(*) AS n,
                           count(*) FILTER (WHERE a.is_serious) AS serious
                           FROM adverse_events a LEFT JOIN lookup_meddra_stub m ON m.pt_name = a.meddra_pt
                           WHERE {f} GROUP BY 1, 2 ORDER BY n DESC""", p)
    for r in by_pt:
        r["flag"] = r["pt"] != "Uncoded" and r["n"] >= thr
    return {
        "threshold": thr,
        "by_pt": by_pt,
        "by_soc": rows(conn, f"""SELECT COALESCE(m.soc, 'Unknown') AS soc, count(*) AS n FROM adverse_events a
                                LEFT JOIN lookup_meddra_stub m ON m.pt_name = a.meddra_pt WHERE {f} GROUP BY 1 ORDER BY n DESC""", p),
        "by_study": rows(conn, f"""SELECT s.protocol_no, count(*) AS n, count(*) FILTER (WHERE a.is_serious) AS serious
                                  FROM adverse_events a JOIN studies s ON s.id = a.study_id WHERE {f}
                                  GROUP BY 1 ORDER BY 1""", p),
        "by_intervention": rows(conn, f"""SELECT COALESCE(a.suspect_intervention, 'Unspecified') AS intervention,
                                         count(*) AS n FROM adverse_events a WHERE {f} GROUP BY 1 ORDER BY n DESC""", p),
        "by_arm": rows(conn, f"""SELECT COALESCE(pp.arm, 'Unassigned') AS arm, count(*) AS n FROM adverse_events a
                                JOIN participants pp ON pp.id = a.participant_id WHERE {f} GROUP BY 1 ORDER BY 1""", p),
        "trend": rows(conn, f"""SELECT to_char(date_trunc('week', a.onset_date), 'YYYY-MM-DD') AS week, count(*) AS n,
                               count(*) FILTER (WHERE a.is_serious) AS serious FROM adverse_events a WHERE {f}
                               GROUP BY 1 ORDER BY 1""", p),
        "clock_compliance": one(conn, f"""SELECT count(*) FILTER (WHERE c.status = 'COMPLETED' AND c.completed_at <= c.due_at) AS on_time,
                                          count(*) FILTER (WHERE c.status = 'COMPLETED' AND c.completed_at > c.due_at) AS late,
                                          count(*) FILTER (WHERE c.status = 'OVERDUE') AS overdue,
                                          count(*) FILTER (WHERE c.status = 'RUNNING') AS running
                                          FROM ae_clocks c JOIN adverse_events a ON a.id = c.adverse_event_id WHERE {f}""", p),
    }
