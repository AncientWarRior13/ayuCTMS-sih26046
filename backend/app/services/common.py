from typing import Any

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.engine import Connection

from ..core.deps import User


def rows(conn: Connection, sql: str, params: dict | None = None) -> list[dict[str, Any]]:
    return [dict(r._mapping) for r in conn.execute(text(sql), params or {})]


def one(conn: Connection, sql: str, params: dict | None = None) -> dict[str, Any] | None:
    r = conn.execute(text(sql), params or {}).first()
    return dict(r._mapping) if r else None


def get_or_404(conn: Connection, sql: str, params: dict, what: str = "Resource") -> dict[str, Any]:
    r = one(conn, sql, params)
    if r is None:
        raise HTTPException(404, f"{what} not found")
    return r


def study_or_404(conn: Connection, study_id: int) -> dict[str, Any]:
    return get_or_404(conn, "SELECT * FROM studies WHERE id = :id", {"id": study_id}, "Study")


def ensure_own_study(user: User, study: dict) -> None:
    """PIs may only act on studies where they are the principal investigator."""
    if user.role == "PI" and study["pi_user_id"] != user.id:
        raise HTTPException(403, "PI can only act on own studies")


def participant_or_404(conn: Connection, pid: int) -> dict[str, Any]:
    # RLS hides participants at other sites, which surfaces as 404
    return get_or_404(conn, "SELECT * FROM participants WHERE id = :id", {"id": pid}, "Participant")


def kpi(conn: Connection) -> dict[str, float]:
    return {r["key"]: float(r["value_num"]) for r in rows(conn, "SELECT key, value_num FROM kpi_config")}
