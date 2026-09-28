from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.engine import Connection

from ..core.deps import User, db, require
from ..core.security import sha256_hex
from ..services import audit, lifecycle
from ..services.common import ensure_own_study, get_or_404, one, rows, study_or_404

router = APIRouter(tags=["studies"])

STUDY_COLS = ("s.id, s.protocol_no, s.title, s.type, s.phase, s.intervention, s.arms, s.state, s.pi_user_id,"
              " s.target_sample, s.planned_start, s.planned_end, s.source_ctri_ref, s.created_at")


class StudyCreate(BaseModel):
    protocol_no: str = Field(min_length=2, max_length=64)
    title: str = Field(min_length=3)
    type: str = Field(pattern="^(INTERVENTIONAL|OBSERVATIONAL)$")
    phase: str | None = None
    intervention: str | None = None
    arms: list[str] = ["Intervention", "Control"]
    target_sample: int = Field(gt=0)
    planned_start: date | None = None
    planned_end: date | None = None
    site_ids: list[int] = []
    pi_user_id: int | None = None


class StudyUpdate(BaseModel):
    title: str | None = None
    phase: str | None = None
    intervention: str | None = None
    target_sample: int | None = Field(default=None, gt=0)
    planned_start: date | None = None
    planned_end: date | None = None
    reason: str = Field(min_length=3)


class TransitionIn(BaseModel):
    target_state: str
    reason: str | None = None


class EthicsIn(BaseModel):
    committee_name: str
    approval_ref: str | None = None
    approved_on: date
    valid_to: date
    continuing_review_due: date | None = None


class CtriIn(BaseModel):
    ctri_number: str = Field(pattern=r"^CTRI/\d{4}/\d{2}/\d{6}$")
    registered_on: date
    last_updated_on: date | None = None


class MilestoneIn(BaseModel):
    name: str
    planned_date: date
    actual_date: date | None = None


class MonitoringIn(BaseModel):
    site_id: int
    visit_date: date
    findings: str | None = None


class ConsentDocIn(BaseModel):
    version: str
    language: str = "en"
    content: str = Field(min_length=10, description="Full consent text; only its SHA-256 is stored")
    effective_from: date


class AmendmentIn(BaseModel):
    version: str
    summary: str
    approved_on: date
    requires_reconsent: bool = False
    consent_document_id: int | None = None


def enrolment_count(conn: Connection, sid: int) -> int:
    return conn.execute(text("SELECT count(*) FROM participants WHERE study_id = :s AND enrolled_on IS NOT NULL"),
                        {"s": sid}).scalar()


@router.get("/studies")
def list_studies(state: str | None = None, user: User = Depends(require("study.read")), conn=Depends(db)):
    q = f"""SELECT {STUDY_COLS}, u.full_name AS pi_name,
              (SELECT count(*) FROM participants p WHERE p.study_id = s.id AND p.enrolled_on IS NOT NULL) AS enrolled,
              (SELECT count(*) FROM adverse_events a WHERE a.study_id = s.id AND a.is_serious) AS sae_count,
              (SELECT ctri_number FROM ctri_registrations c WHERE c.study_id = s.id) AS ctri_number
            FROM studies s LEFT JOIN users u ON u.id = s.pi_user_id WHERE (CAST(:st AS study_state) IS NULL OR s.state = CAST(:st AS study_state))"""
    params: dict = {"st": state}
    if not user.is_global:
        q += " AND EXISTS (SELECT 1 FROM study_sites ss WHERE ss.study_id = s.id AND ss.site_id = ANY(:sites))"
        params["sites"] = user.site_ids
    return rows(conn, q + " ORDER BY s.id", params)


@router.post("/studies", status_code=201)
def create_study(body: StudyCreate, user: User = Depends(require("study.create")), conn=Depends(db)):
    if body.planned_start and body.planned_end and body.planned_end <= body.planned_start:
        raise HTTPException(422, "planned_end must be after planned_start")
    pi = user.id if user.role == "PI" else body.pi_user_id
    if pi is not None and not one(conn, "SELECT 1 FROM users WHERE id = :u AND role = 'PI'", {"u": pi}):
        raise HTTPException(422, "pi_user_id must reference a PI user")
    if one(conn, "SELECT 1 FROM studies WHERE protocol_no = :p", {"p": body.protocol_no}):
        raise HTTPException(409, "Protocol number already exists")
    s = one(conn, """INSERT INTO studies (protocol_no, title, type, phase, intervention, arms, target_sample,
                     planned_start, planned_end, pi_user_id) VALUES (:protocol_no, :title, :type, :phase, :intervention,
                     :arms, :target_sample, :planned_start, :planned_end, :pi) RETURNING *""",
            {**body.model_dump(exclude={"site_ids", "pi_user_id"}), "pi": pi})
    for sid in body.site_ids:
        conn.execute(text("INSERT INTO study_sites (study_id, site_id) VALUES (:s, :si)"), {"s": s["id"], "si": sid})
    audit.write(conn, user, "CREATE", "study", s["id"], after={**body.model_dump(), "pi_user_id": pi})
    return s


@router.get("/studies/{sid}")
def get_study(sid: int, user: User = Depends(require("study.read")), conn=Depends(db)):
    s = get_or_404(conn, f"SELECT {STUDY_COLS}, u.full_name AS pi_name FROM studies s"
                         " LEFT JOIN users u ON u.id = s.pi_user_id WHERE s.id = :id", {"id": sid}, "Study")
    s["sites"] = rows(conn, "SELECT si.id, si.code, si.name, si.city, ss.activated_on, ss.site_target,"
                            " (SELECT count(*) FROM participants p WHERE p.study_id = :s AND p.site_id = si.id"
                            "  AND p.enrolled_on IS NOT NULL) AS enrolled"
                            " FROM study_sites ss JOIN sites si ON si.id = ss.site_id WHERE ss.study_id = :s ORDER BY si.id",
                      {"s": sid})
    s["ethics"] = rows(conn, "SELECT * FROM ethics_approvals WHERE study_id = :s ORDER BY approved_on DESC", {"s": sid})
    s["ctri"] = lifecycle.ctri(conn, sid)
    s["milestones"] = rows(conn, "SELECT * FROM study_milestones WHERE study_id = :s ORDER BY planned_date", {"s": sid})
    s["consent_documents"] = rows(conn, "SELECT * FROM consent_documents WHERE study_id = :s ORDER BY effective_from",
                                  {"s": sid})
    s["amendments"] = rows(conn, "SELECT * FROM protocol_amendments WHERE study_id = :s ORDER BY approved_on", {"s": sid})
    s["enrolled"] = enrolment_count(conn, sid)
    idx = lifecycle.STATES.index(s["state"])
    nxt = lifecycle.STATES[idx + 1] if idx + 1 < len(lifecycle.STATES) else None
    s["next_state"] = nxt
    s["next_state_blockers"] = lifecycle.check_preconditions(conn, s, nxt) if nxt else []
    return s


@router.patch("/studies/{sid}")
def update_study(sid: int, body: StudyUpdate, user: User = Depends(require("study.update")), conn=Depends(db)):
    s = study_or_404(conn, sid)
    ensure_own_study(user, s)
    changes = body.model_dump(exclude_none=True, exclude={"reason"})
    if not changes:
        raise HTTPException(422, "Nothing to update")
    sets = ", ".join(f"{k} = :{k}" for k in changes)
    after = one(conn, f"UPDATE studies SET {sets} WHERE id = :id RETURNING *", {**changes, "id": sid})
    audit.write(conn, user, "UPDATE", "study", sid, {k: s[k] for k in changes}, changes, body.reason)
    return after


@router.post("/studies/{sid}/transition")
def transition(sid: int, body: TransitionIn, user: User = Depends(require("study.transition")), conn=Depends(db)):
    return lifecycle.transition(conn, user, sid, body.target_state, body.reason)


@router.post("/studies/{sid}/ethics-approvals", status_code=201)
def add_ethics(sid: int, body: EthicsIn, user: User = Depends(require("ethics.create")), conn=Depends(db)):
    study_or_404(conn, sid)
    if body.valid_to < body.approved_on:
        raise HTTPException(422, "valid_to must be on or after approved_on")
    r = one(conn, """INSERT INTO ethics_approvals (study_id, committee_name, approval_ref, approved_on, valid_to,
                     continuing_review_due) VALUES (:s, :committee_name, :approval_ref, :approved_on, :valid_to,
                     :continuing_review_due) RETURNING *""", {"s": sid, **body.model_dump()})
    audit.write(conn, user, "CREATE", "ethics_approval", r["id"], after=r)
    return r


@router.put("/studies/{sid}/ctri")
def set_ctri(sid: int, body: CtriIn, user: User = Depends(require("ctri.set")), conn=Depends(db)):
    s = study_or_404(conn, sid)
    ensure_own_study(user, s)
    first = conn.execute(text("SELECT min(enrolled_on) FROM participants WHERE study_id = :s"), {"s": sid}).scalar()
    if first and body.registered_on > first:
        raise HTTPException(409, f"CTRI registration must be prospective: first enrolment was {first}")
    before = lifecycle.ctri(conn, sid)
    r = one(conn, """INSERT INTO ctri_registrations (study_id, ctri_number, registered_on, last_updated_on)
                     VALUES (:s, :n, :r, :u) ON CONFLICT (study_id) DO UPDATE SET ctri_number = EXCLUDED.ctri_number,
                     registered_on = EXCLUDED.registered_on, last_updated_on = EXCLUDED.last_updated_on RETURNING *""",
            {"s": sid, "n": body.ctri_number, "r": body.registered_on, "u": body.last_updated_on or body.registered_on})
    audit.write(conn, user, "UPDATE" if before else "CREATE", "ctri_registration", r["id"], before, r)
    return r


@router.get("/studies/{sid}/milestones")
def list_milestones(sid: int, user: User = Depends(require("milestone.read")), conn=Depends(db)):
    return rows(conn, "SELECT * FROM study_milestones WHERE study_id = :s ORDER BY planned_date", {"s": sid})


@router.post("/studies/{sid}/milestones", status_code=201)
def add_milestone(sid: int, body: MilestoneIn, user: User = Depends(require("milestone.write")), conn=Depends(db)):
    ensure_own_study(user, study_or_404(conn, sid))
    r = one(conn, "INSERT INTO study_milestones (study_id, name, planned_date, actual_date) VALUES (:s, :name,"
                  " :planned_date, :actual_date) RETURNING *", {"s": sid, **body.model_dump()})
    audit.write(conn, user, "CREATE", "milestone", r["id"], after=r)
    return r


@router.patch("/milestones/{mid}")
def complete_milestone(mid: int, body: MilestoneIn, user: User = Depends(require("milestone.write")), conn=Depends(db)):
    m = get_or_404(conn, "SELECT * FROM study_milestones WHERE id = :id", {"id": mid}, "Milestone")
    ensure_own_study(user, study_or_404(conn, m["study_id"]))
    r = one(conn, "UPDATE study_milestones SET name = :name, planned_date = :planned_date, actual_date = :actual_date"
                  " WHERE id = :id RETURNING *", {"id": mid, **body.model_dump()})
    audit.write(conn, user, "UPDATE", "milestone", mid, m, r)
    return r


@router.get("/studies/{sid}/monitoring-visits")
def list_monitoring(sid: int, user: User = Depends(require("monitoring.read")), conn=Depends(db)):
    return rows(conn, "SELECT mv.*, si.code AS site_code, u.full_name AS monitor FROM monitoring_visits mv"
                      " JOIN sites si ON si.id = mv.site_id LEFT JOIN users u ON u.id = mv.monitor_id"
                      " WHERE mv.study_id = :s ORDER BY visit_date DESC", {"s": sid})


@router.post("/studies/{sid}/monitoring-visits", status_code=201)
def add_monitoring(sid: int, body: MonitoringIn, user: User = Depends(require("monitoring.write")), conn=Depends(db)):
    study_or_404(conn, sid)
    if not one(conn, "SELECT 1 FROM study_sites WHERE study_id = :s AND site_id = :si", {"s": sid, "si": body.site_id}):
        raise HTTPException(422, "Site is not part of this study")
    r = one(conn, "INSERT INTO monitoring_visits (study_id, site_id, visit_date, monitor_id, findings) VALUES"
                  " (:s, :site_id, :visit_date, :u, :findings) RETURNING *", {"s": sid, "u": user.id, **body.model_dump()})
    audit.write(conn, user, "CREATE", "monitoring_visit", r["id"], after=r)
    return r


@router.post("/studies/{sid}/consent-documents", status_code=201)
def add_consent_doc(sid: int, body: ConsentDocIn, user: User = Depends(require("ethics.create")), conn=Depends(db)):
    study_or_404(conn, sid)
    r = one(conn, "INSERT INTO consent_documents (study_id, version, language, content_hash, effective_from)"
                  " VALUES (:s, :v, :l, :h, :e) RETURNING *",
            {"s": sid, "v": body.version, "l": body.language, "h": sha256_hex(body.content), "e": body.effective_from})
    audit.write(conn, user, "CREATE", "consent_document", r["id"], after=r)
    return r


@router.post("/studies/{sid}/amendments", status_code=201)
def add_amendment(sid: int, body: AmendmentIn, user: User = Depends(require("ethics.create")), conn=Depends(db)):
    study_or_404(conn, sid)
    if body.requires_reconsent and not body.consent_document_id:
        raise HTTPException(422, "A re-consent amendment must reference the new consent document")
    if body.consent_document_id and not one(conn, "SELECT 1 FROM consent_documents WHERE id = :d AND study_id = :s",
                                            {"d": body.consent_document_id, "s": sid}):
        raise HTTPException(422, "Consent document does not belong to this study")
    r = one(conn, """INSERT INTO protocol_amendments (study_id, version, summary, approved_on, requires_reconsent,
                     consent_document_id, created_by) VALUES (:s, :version, :summary, :approved_on, :requires_reconsent,
                     :consent_document_id, :u) RETURNING *""", {"s": sid, "u": user.id, **body.model_dump()})
    audit.write(conn, user, "CREATE", "protocol_amendment", r["id"], after=r)
    return r


@router.get("/studies/{sid}/reconsent")
def reconsent_pending(sid: int, user: User = Depends(require("participant.read")), conn=Depends(db)):
    return rows(conn, """
        SELECT p.id, p.subject_code, p.site_id, pa.version AS amendment, pa.consent_document_id
        FROM protocol_amendments pa JOIN participants p ON p.study_id = pa.study_id
        WHERE pa.study_id = :s AND pa.requires_reconsent AND p.status IN ('ENROLLED','RANDOMIZED')
          AND NOT EXISTS (SELECT 1 FROM consents c WHERE c.participant_id = p.id
                          AND c.consent_document_id = pa.consent_document_id AND c.withdrawn_at IS NULL)
        ORDER BY p.subject_code""", {"s": sid})
