import json
import random
from datetime import date, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.engine import Connection

from ..core.deps import User, db, require
from ..core.security import decrypt_pii, encrypt_pii
from ..services import audit
from ..services.common import ensure_own_study, get_or_404, one, participant_or_404, rows, study_or_404

router = APIRouter(tags=["participants"])

DEFAULT_SCHEDULE = [("Baseline", 0), ("Week 2", 14), ("Week 4", 28), ("Week 8", 56), ("Week 12", 84)]


class ParticipantCreate(BaseModel):
    site_id: int
    sex: str = Field(pattern="^(M|F|U)$")
    age_years: int = Field(ge=0, le=120)
    name: str = Field(min_length=2, description="Stored encrypted in participant_pii")
    contact: str | None = None
    consent_document_id: int | None = None
    witness_name: str | None = None
    guardian_consent: bool = False
    comprehension_answers: list[int] | None = Field(
        default=None, description="Selected option index per comprehension question, in order")


class ConsentIn(BaseModel):
    consent_document_id: int
    witness_name: str | None = None
    guardian_consent: bool = False
    comprehension_answers: list[int] | None = None


class WithdrawIn(BaseModel):
    reason: str = Field(min_length=3)


class VisitIn(BaseModel):
    visit_name: str
    planned_date: date
    window_days: int = Field(default=3, ge=0, le=30)


class CrfIn(BaseModel):
    template_id: int
    data: dict[str, Any]
    reason_for_change: str | None = None


def block_arm(arms: list[str], study_id: int, n: int) -> str:
    """Permuted-block randomisation, reproducible per study (block size = 2 x arms)."""
    block = [a for a in arms for _ in range(2)]
    random.Random(f"ayuctms-{study_id}-{(n - 1) // len(block)}").shuffle(block)
    return block[(n - 1) % len(block)]


def pending_reconsent(conn: Connection, pid: int) -> list[str]:
    return [r["version"] for r in rows(conn, """
        SELECT pa.version FROM protocol_amendments pa JOIN participants p ON p.study_id = pa.study_id
        WHERE p.id = :p AND pa.requires_reconsent AND p.status IN ('ENROLLED','RANDOMIZED')
          AND NOT EXISTS (SELECT 1 FROM consents c WHERE c.participant_id = p.id
                          AND c.consent_document_id = pa.consent_document_id AND c.withdrawn_at IS NULL)""", {"p": pid})]


def _check_consent_doc(conn: Connection, study_id: int, doc_id: int) -> None:
    if not one(conn, "SELECT 1 FROM consent_documents WHERE id = :d AND study_id = :s AND effective_from <= current_date",
               {"d": doc_id, "s": study_id}):
        raise HTTPException(422, "Consent document is not valid for this study")


def _score_comprehension(conn: Connection, doc_id: int, answers: list[int] | None) -> float | None:
    """Scores against the correct_index stored in the database - never against anything the
    client sent - so the score can't be gamed by echoing back a client-supplied answer key."""
    doc = get_or_404(conn, "SELECT comprehension_questions FROM consent_documents WHERE id = :d", {"d": doc_id},
                     "Consent document")
    questions = doc["comprehension_questions"]
    if not questions:
        return None
    if not answers or len(answers) != len(questions):
        raise HTTPException(422, f"This consent document requires {len(questions)} comprehension answer(s)")
    correct = sum(1 for q, a in zip(questions, answers) if a == q["correct_index"])
    return round(correct / len(questions), 2)


@router.get("/studies/{sid}/participants")
def list_participants(sid: int, status: str | None = None, site_id: int | None = None,
                      user: User = Depends(require("participant.read")), conn=Depends(db)):
    return rows(conn, """
        SELECT p.id, p.subject_code, p.status, p.arm, p.site_id, si.code AS site_code, p.enrolled_on, p.sex, p.age_years,
               p.is_synthetic,
               (SELECT max(consented_at) FROM consents c WHERE c.participant_id = p.id AND c.withdrawn_at IS NULL) AS consented_at,
               (SELECT count(*) FROM visits v WHERE v.participant_id = p.id AND v.status = 'MISSED') AS missed_visits,
               (SELECT count(*) FROM adverse_events a WHERE a.participant_id = p.id) AS ae_count
        FROM participants p JOIN sites si ON si.id = p.site_id
        WHERE p.study_id = :s AND (CAST(:st AS participant_status) IS NULL OR p.status = CAST(:st AS participant_status))
          AND (CAST(:site AS int) IS NULL OR p.site_id = :site)
        ORDER BY p.subject_code""", {"s": sid, "st": status, "site": site_id})


@router.post("/studies/{sid}/participants", status_code=201)
def enrol(sid: int, body: ParticipantCreate, user: User = Depends(require("participant.create")), conn=Depends(db)):
    s = study_or_404(conn, sid)
    if s["state"] != "ENROLLING":
        raise HTTPException(409, f"Study is in state {s['state']}; enrolment requires ENROLLING")
    ctri = one(conn, "SELECT registered_on FROM ctri_registrations WHERE study_id = :s", {"s": sid})
    today = date.today()
    if not ctri or ctri["registered_on"] > today:
        raise HTTPException(409, "CTRI registration must precede first enrolment (prospective registration)")
    if not body.consent_document_id:
        raise HTTPException(409, "Informed consent must be recorded before enrolment")
    _check_consent_doc(conn, sid, body.consent_document_id)
    if body.age_years < 18 and not body.guardian_consent:
        raise HTTPException(409, "Participant is a minor: verifiable guardian consent is required")
    if not one(conn, "SELECT 1 FROM study_sites WHERE study_id = :s AND site_id = :si AND activated_on IS NOT NULL",
               {"s": sid, "si": body.site_id}):
        raise HTTPException(422, "Site is not active for this study")
    if body.site_id not in user.site_ids:
        raise HTTPException(403, "You are not assigned to this site")
    comprehension_score = _score_comprehension(conn, body.consent_document_id, body.comprehension_answers)

    n = conn.execute(text("SELECT next_subject_seq(:s)"), {"s": sid}).scalar()
    code = f"AIIA-{sid:03d}-{n:04d}"
    randomised = s["type"] == "INTERVENTIONAL" and bool(s["arms"])
    arm = block_arm(s["arms"], sid, n) if randomised else None
    p = one(conn, """INSERT INTO participants (study_id, site_id, subject_code, status, arm, enrolled_on, sex, age_years)
                     VALUES (:s, :si, :c, :st, :arm, :d, :sex, :age) RETURNING *""",
            {"s": sid, "si": body.site_id, "c": code, "st": "RANDOMIZED" if randomised else "ENROLLED", "arm": arm,
             "d": today, "sex": body.sex, "age": body.age_years})
    conn.execute(text("INSERT INTO participant_pii (participant_id, name_enc, contact_enc) VALUES (:p, :n, :c)"),
                 {"p": p["id"], "n": encrypt_pii(body.name), "c": encrypt_pii(body.contact)})
    conn.execute(text("""INSERT INTO consents (participant_id, consent_document_id, consented_at, witness_name,
                      guardian_consent, comprehension_answers, comprehension_score)
                      VALUES (:p, :d, now(), :w, :g, CAST(:a AS jsonb), :sc)"""),
                 {"p": p["id"], "d": body.consent_document_id, "w": body.witness_name, "g": body.guardian_consent,
                  "a": json.dumps(body.comprehension_answers), "sc": comprehension_score})
    for name, offset in DEFAULT_SCHEDULE:
        conn.execute(text("INSERT INTO visits (participant_id, visit_name, planned_date) VALUES (:p, :n, :d)"),
                     {"p": p["id"], "n": name, "d": today + timedelta(days=offset)})
    audit.write(conn, user, "CREATE", "participant", p["id"],
                after={k: p[k] for k in ["subject_code", "site_id", "status", "arm", "sex", "age_years", "enrolled_on"]},
                reason="Enrolment with informed consent")
    return p


@router.get("/participants/{pid}")
def get_participant(pid: int, user: User = Depends(require("participant.read")), conn=Depends(db)):
    p = participant_or_404(conn, pid)
    p["consents"] = rows(conn, "SELECT c.*, d.version, d.language FROM consents c JOIN consent_documents d"
                               " ON d.id = c.consent_document_id WHERE c.participant_id = :p ORDER BY consented_at",
                         {"p": pid})
    p["pending_reconsent"] = pending_reconsent(conn, pid)
    return p


@router.get("/participants/{pid}/pii")
def read_pii(pid: int, purpose: str = Query(min_length=3), user: User = Depends(require("participant.pii")),
             conn=Depends(db)):
    p = participant_or_404(conn, pid)
    if user.role == "PI":
        ensure_own_study(user, study_or_404(conn, p["study_id"]))
    r = get_or_404(conn, "SELECT * FROM participant_pii WHERE participant_id = :p", {"p": pid}, "PII")
    audit.write(conn, user, "READ_PII", "participant", pid, reason=purpose)
    return {"participant_id": pid, "name": decrypt_pii(r["name_enc"]), "contact": decrypt_pii(r["contact_enc"])}


@router.post("/participants/{pid}/consent", status_code=201)
def consent(pid: int, body: ConsentIn, user: User = Depends(require("consent.write")), conn=Depends(db)):
    p = participant_or_404(conn, pid)
    if p["status"] == "WITHDRAWN":
        raise HTTPException(409, "Participant has withdrawn consent")
    _check_consent_doc(conn, p["study_id"], body.consent_document_id)
    if (p["age_years"] or 0) < 18 and not body.guardian_consent:
        raise HTTPException(409, "Participant is a minor: verifiable guardian consent is required")
    comprehension_score = _score_comprehension(conn, body.consent_document_id, body.comprehension_answers)
    r = one(conn, """INSERT INTO consents (participant_id, consent_document_id, consented_at, witness_name,
                     guardian_consent, comprehension_answers, comprehension_score)
                     VALUES (:p, :d, now(), :w, :g, CAST(:a AS jsonb), :sc) RETURNING *""",
            {"p": pid, "d": body.consent_document_id, "w": body.witness_name, "g": body.guardian_consent,
             "a": json.dumps(body.comprehension_answers), "sc": comprehension_score})
    audit.write(conn, user, "CREATE", "consent", r["id"], after=r)
    return r


@router.post("/participants/{pid}/withdraw")
def withdraw(pid: int, body: WithdrawIn, user: User = Depends(require("consent.write")), conn=Depends(db)):
    p = participant_or_404(conn, pid)
    if p["status"] == "WITHDRAWN":
        raise HTTPException(409, "Already withdrawn")
    conn.execute(text("UPDATE consents SET withdrawn_at = now(), withdrawal_reason = :r"
                      " WHERE participant_id = :p AND withdrawn_at IS NULL"), {"r": body.reason, "p": pid})
    conn.execute(text("UPDATE participants SET status = 'WITHDRAWN' WHERE id = :p"), {"p": pid})
    conn.execute(text("UPDATE visits SET status = 'MISSED' WHERE participant_id = :p AND status = 'PLANNED'"
                      " AND planned_date < current_date"), {"p": pid})
    audit.write(conn, user, "WITHDRAW", "participant", pid, {"status": p["status"]}, {"status": "WITHDRAWN"}, body.reason)
    return {"id": pid, "status": "WITHDRAWN"}


@router.get("/participants/{pid}/visits")
def list_visits(pid: int, user: User = Depends(require("visit.read")), conn=Depends(db)):
    participant_or_404(conn, pid)
    return rows(conn, "SELECT v.*, (SELECT count(*) FROM crf_entries e WHERE e.visit_id = v.id) AS crf_count"
                      " FROM visits v WHERE participant_id = :p ORDER BY planned_date", {"p": pid})


@router.post("/participants/{pid}/visits", status_code=201)
def add_visit(pid: int, body: VisitIn, user: User = Depends(require("visit.write")), conn=Depends(db)):
    p = participant_or_404(conn, pid)
    if p["status"] == "WITHDRAWN":
        raise HTTPException(409, "Participant has withdrawn consent")
    r = one(conn, "INSERT INTO visits (participant_id, visit_name, planned_date, window_days) VALUES"
                  " (:p, :visit_name, :planned_date, :window_days) RETURNING *", {"p": pid, **body.model_dump()})
    audit.write(conn, user, "CREATE", "visit", r["id"], after=r)
    return r


@router.get("/studies/{sid}/crf-templates")
def crf_templates(sid: int, user: User = Depends(require("visit.read")), conn=Depends(db)):
    return rows(conn, "SELECT * FROM crf_templates WHERE study_id = :s ORDER BY id", {"s": sid})


@router.get("/visits/{vid}/crf")
def list_crf(vid: int, user: User = Depends(require("visit.read")), conn=Depends(db)):
    v = get_or_404(conn, "SELECT * FROM visits WHERE id = :v", {"v": vid}, "Visit")
    participant_or_404(conn, v["participant_id"])
    return rows(conn, "SELECT e.*, u.full_name AS entered_by_name FROM crf_entries e LEFT JOIN users u"
                      " ON u.id = e.entered_by WHERE visit_id = :v ORDER BY e.id", {"v": vid})


def validate_crf(schema: dict, data: dict) -> list[str]:
    errors = []
    props = schema.get("properties", {})
    for f in schema.get("required", []):
        if data.get(f) in (None, ""):
            errors.append(f"{f} is required")
    for k, v in data.items():
        spec = props.get(k)
        if spec is None:
            errors.append(f"{k} is not a field of this form")
            continue
        if v in (None, ""):
            continue
        if "enum" in spec and v not in spec["enum"]:
            errors.append(f"{k} must be one of {spec['enum']}")
        if spec.get("type") == "number":
            if not isinstance(v, (int, float)):
                errors.append(f"{k} must be a number")
            elif ("minimum" in spec and v < spec["minimum"]) or ("maximum" in spec and v > spec["maximum"]):
                errors.append(f"{k} out of range [{spec.get('minimum')}, {spec.get('maximum')}]")
    return errors


@router.post("/visits/{vid}/crf", status_code=201)
def submit_crf(vid: int, body: CrfIn, user: User = Depends(require("crf.write")), conn=Depends(db)):
    v = get_or_404(conn, "SELECT * FROM visits WHERE id = :v", {"v": vid}, "Visit")
    p = participant_or_404(conn, v["participant_id"])
    if p["status"] == "WITHDRAWN":
        raise HTTPException(409, "Consent withdrawn: no new data may be entered for this participant")
    pend = pending_reconsent(conn, p["id"])
    if pend:
        raise HTTPException(409, f"Re-consent required for amendment {', '.join(pend)} before further data entry")
    t = get_or_404(conn, "SELECT * FROM crf_templates WHERE id = :t AND study_id = :s",
                   {"t": body.template_id, "s": p["study_id"]}, "CRF template")
    errors = validate_crf(t["json_schema"], body.data)
    if errors:
        raise HTTPException(422, "; ".join(errors))
    prev = one(conn, "SELECT * FROM crf_entries WHERE visit_id = :v AND template_id = :t ORDER BY id DESC LIMIT 1",
               {"v": vid, "t": body.template_id})
    if prev and not (body.reason_for_change and body.reason_for_change.strip()):
        raise HTTPException(422, "reason_for_change is required when editing clinical data")

    r = one(conn, "INSERT INTO crf_entries (visit_id, template_id, data, entered_by, reason_for_change, supersedes_id)"
                  " VALUES (:v, :t, CAST(:d AS jsonb), :u, :r, :s) RETURNING *",
            {"v": vid, "t": body.template_id, "d": json.dumps(body.data), "u": user.id,
             "r": body.reason_for_change, "s": prev["id"] if prev else None})
    if v["actual_date"] is None:
        today = date.today()
        status = "DONE" if abs((today - v["planned_date"]).days) <= v["window_days"] else "OUT_OF_WINDOW"
        conn.execute(text("UPDATE visits SET actual_date = :d, status = :s WHERE id = :v"),
                     {"d": today, "s": status, "v": vid})
    audit.write(conn, user, "UPDATE" if prev else "CREATE", "crf_entry", r["id"],
                prev["data"] if prev else None, body.data, body.reason_for_change)
    return r
