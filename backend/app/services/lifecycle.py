from datetime import date

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.engine import Connection

from ..core.deps import User
from . import audit
from .common import ensure_own_study, one, study_or_404

STATES = ["DRAFT", "PROTOCOL_APPROVED", "EC_APPROVED", "CTRI_REGISTERED", "SITE_ACTIVE", "ENROLLING", "FOLLOW_UP", "CLOSED"]


def valid_ec(conn: Connection, study_id: int) -> dict | None:
    return one(conn, "SELECT * FROM ethics_approvals WHERE study_id = :s AND valid_to >= current_date"
                     " ORDER BY valid_to DESC LIMIT 1", {"s": study_id})


def ctri(conn: Connection, study_id: int) -> dict | None:
    return one(conn, "SELECT * FROM ctri_registrations WHERE study_id = :s", {"s": study_id})


def check_preconditions(conn: Connection, study: dict, target: str) -> list[str]:
    """Returns the list of unmet preconditions for entering `target`."""
    sid = study["id"]
    problems: list[str] = []
    if target == "EC_APPROVED" and not valid_ec(conn, sid):
        problems.append("A valid ethics committee approval is required")
    if target == "CTRI_REGISTERED" and not ctri(conn, sid):
        problems.append("CTRI registration number must be recorded")
    if target == "SITE_ACTIVE":
        n = conn.execute(text("SELECT count(*) FROM study_sites WHERE study_id = :s"), {"s": sid}).scalar()
        if not n:
            problems.append("At least one site must be linked to the study")
    if target == "ENROLLING":
        if not valid_ec(conn, sid):
            problems.append("Ethics approval is missing or has expired")
        if not ctri(conn, sid):
            problems.append("Study is not registered with CTRI (prospective registration is mandatory)")
    return problems


def transition(conn: Connection, user: User, study_id: int, target: str, reason: str | None) -> dict:
    study = study_or_404(conn, study_id)
    if target not in STATES:
        raise HTTPException(422, f"Unknown state {target}")
    cur = study["state"]
    if STATES.index(target) != STATES.index(cur) + 1:
        raise HTTPException(409, f"Transition {cur} -> {target} is not allowed; next state is "
                                 f"{STATES[STATES.index(cur) + 1] if cur != 'CLOSED' else 'none'}")
    if user.role == "IEC" and target != "EC_APPROVED":
        raise HTTPException(403, "Ethics Committee may only grant EC_APPROVED")
    if user.role == "PI":
        ensure_own_study(user, study)
        if target == "EC_APPROVED":
            raise HTTPException(403, "EC approval must be granted by the Ethics Committee or an administrator")
    problems = check_preconditions(conn, study, target)
    if problems:
        raise HTTPException(409, "; ".join(problems))
    conn.execute(text("UPDATE studies SET state = :t WHERE id = :id"), {"t": target, "id": study_id})
    if target == "SITE_ACTIVE":
        conn.execute(text("UPDATE study_sites SET activated_on = COALESCE(activated_on, :d) WHERE study_id = :s"),
                     {"d": date.today(), "s": study_id})
    audit.write(conn, user, "TRANSITION", "study", study_id, {"state": cur}, {"state": target}, reason)
    return {"id": study_id, "from": cur, "state": target}
