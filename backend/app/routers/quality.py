from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from ..core.deps import User, db, require
from ..services import audit
from ..services.common import get_or_404, one, participant_or_404, rows, study_or_404

router = APIRouter(tags=["deviations & queries"])


class DeviationIn(BaseModel):
    participant_id: int | None = None
    category: str = Field(min_length=2)
    severity: str = Field(pattern="^(MINOR|MAJOR|CRITICAL)$")
    description: str = Field(min_length=3)
    capa: str | None = None


class SignoffIn(BaseModel):
    capa: str = Field(min_length=3)


class QueryIn(BaseModel):
    text: str = Field(min_length=3)
    crf_entry_id: int | None = None
    participant_id: int | None = None


class AnswerIn(BaseModel):
    answer: str = Field(min_length=1)


@router.get("/studies/{sid}/deviations")
def list_deviations(sid: int, user: User = Depends(require("deviation.read")), conn=Depends(db)):
    return rows(conn, """SELECT d.*, p.subject_code, r.full_name AS reported_by_name, m.full_name AS signoff_name
                         FROM deviations d LEFT JOIN participants p ON p.id = d.participant_id
                         LEFT JOIN users r ON r.id = d.reported_by LEFT JOIN users m ON m.id = d.monitor_signoff_by
                         WHERE d.study_id = :s ORDER BY d.opened_at DESC""", {"s": sid})


@router.post("/studies/{sid}/deviations", status_code=201)
def add_deviation(sid: int, body: DeviationIn, user: User = Depends(require("deviation.create")), conn=Depends(db)):
    study_or_404(conn, sid)
    if body.participant_id and participant_or_404(conn, body.participant_id)["study_id"] != sid:
        raise HTTPException(422, "Participant is not in this study")
    r = one(conn, """INSERT INTO deviations (study_id, participant_id, category, severity, description, capa, reported_by)
                     VALUES (:s, :participant_id, :category, :severity, :description, :capa, :u) RETURNING *""",
            {"s": sid, "u": user.id, **body.model_dump()})
    audit.write(conn, user, "CREATE", "deviation", r["id"], after=r)
    return r


@router.post("/deviations/{did}/signoff")
def signoff(did: int, body: SignoffIn, user: User = Depends(require("deviation.signoff")), conn=Depends(db)):
    d = get_or_404(conn, "SELECT * FROM deviations WHERE id = :id", {"id": did}, "Deviation")
    if d["closed_at"]:
        raise HTTPException(409, "Deviation already signed off")
    r = one(conn, "UPDATE deviations SET capa = :c, monitor_signoff_by = :u, closed_at = now() WHERE id = :id RETURNING *",
            {"c": body.capa, "u": user.id, "id": did})
    audit.write(conn, user, "SIGNOFF", "deviation", did, d, r, "Monitor sign-off with CAPA")
    return r


@router.get("/studies/{sid}/queries")
def list_queries(sid: int, status: str | None = None, user: User = Depends(require("query.read")), conn=Depends(db)):
    return rows(conn, """SELECT q.*, p.subject_code, u.full_name AS raised_by_name,
                                EXTRACT(DAY FROM now() - q.opened_at)::int AS age_days
                         FROM queries q LEFT JOIN participants p ON p.id = q.participant_id
                         LEFT JOIN users u ON u.id = q.raised_by
                         WHERE q.study_id = :s AND (CAST(:st AS query_status) IS NULL OR q.status = CAST(:st AS query_status))
                         ORDER BY q.opened_at""", {"s": sid, "st": status})


@router.post("/studies/{sid}/queries", status_code=201)
def raise_query(sid: int, body: QueryIn, user: User = Depends(require("query.create")), conn=Depends(db)):
    study_or_404(conn, sid)
    pid = body.participant_id
    if body.crf_entry_id:
        e = get_or_404(conn, "SELECT e.id, v.participant_id FROM crf_entries e JOIN visits v ON v.id = e.visit_id"
                             " WHERE e.id = :e", {"e": body.crf_entry_id}, "CRF entry")
        pid = e["participant_id"]
    if pid and participant_or_404(conn, pid)["study_id"] != sid:
        raise HTTPException(422, "Participant is not in this study")
    r = one(conn, "INSERT INTO queries (crf_entry_id, study_id, participant_id, raised_by, text) VALUES"
                  " (:e, :s, :p, :u, :t) RETURNING *", {"e": body.crf_entry_id, "s": sid, "p": pid, "u": user.id,
                                                       "t": body.text})
    audit.write(conn, user, "CREATE", "query", r["id"], after=r)
    return r


@router.post("/queries/{qid}/answer")
def answer_query(qid: int, body: AnswerIn, user: User = Depends(require("query.answer")), conn=Depends(db)):
    q = get_or_404(conn, "SELECT * FROM queries WHERE id = :id", {"id": qid}, "Query")
    if q["status"] == "CLOSED":
        raise HTTPException(409, "Query is closed")
    r = one(conn, "UPDATE queries SET answer = :a, answered_by = :u, status = 'ANSWERED' WHERE id = :id RETURNING *",
            {"a": body.answer, "u": user.id, "id": qid})
    audit.write(conn, user, "ANSWER", "query", qid, q, r)
    return r


@router.post("/queries/{qid}/close")
def close_query(qid: int, user: User = Depends(require("query.close")), conn=Depends(db)):
    q = get_or_404(conn, "SELECT * FROM queries WHERE id = :id", {"id": qid}, "Query")
    if q["status"] == "CLOSED":
        raise HTTPException(409, "Query already closed")
    r = one(conn, "UPDATE queries SET status = 'CLOSED', closed_at = now() WHERE id = :id RETURNING *", {"id": qid})
    audit.write(conn, user, "CLOSE", "query", qid, q, r)
    return r
