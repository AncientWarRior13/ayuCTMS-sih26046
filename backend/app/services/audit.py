import ipaddress
import json
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import text
from sqlalchemy.engine import Connection

from ..core.deps import User


def _default(o: Any):
    if isinstance(o, (datetime, date)):
        return o.isoformat()
    if isinstance(o, Decimal):
        return float(o)
    if isinstance(o, (bytes, memoryview)):
        return "<binary>"
    return str(o)


def to_json(data: Any) -> str | None:
    return None if data is None else json.dumps(data, default=_default, sort_keys=True)


def _ip(value: str | None) -> str | None:
    try:
        return str(ipaddress.ip_address(value)) if value else None
    except ValueError:
        return None


def write(conn: Connection, actor: User | None, action: str, entity_type: str, entity_id: Any = None,
          before: Any = None, after: Any = None, reason: str | None = None, ip: str | None = None) -> None:
    """Append an audit row in the caller's transaction. Hashing happens in the DB trigger."""
    conn.execute(
        text(
            "INSERT INTO audit_log (actor_id, actor_role, action, entity_type, entity_id, before_data, after_data,"
            " reason, ip_address, prev_hash, row_hash) VALUES (:a, :r, :act, :et, :eid, CAST(:b AS jsonb),"
            " CAST(:af AS jsonb), :reason, CAST(:ip AS inet), '', '')"
        ),
        {
            "a": actor.id if actor else None,
            "r": actor.role if actor else "SYSTEM",
            "act": action,
            "et": entity_type,
            "eid": None if entity_id is None else str(entity_id),
            "b": to_json(before),
            "af": to_json(after),
            "reason": reason,
            "ip": _ip(ip or (actor.ip if actor else None)),
        },
    )


def verify(conn: Connection) -> dict:
    broken = conn.execute(text("SELECT audit_verify()")).scalar()
    count = conn.execute(text("SELECT count(*) FROM audit_log")).scalar()
    return {"intact": broken is None, "first_broken_id": broken, "rows_checked": count}


def merkle_root(hashes: list[str]) -> str:
    """Merkle root over row hashes; published as a checkpoint for external anchoring."""
    import hashlib

    if not hashes:
        return hashlib.sha256(b"").hexdigest()
    level = hashes
    while len(level) > 1:
        if len(level) % 2:
            level = level + [level[-1]]
        level = [hashlib.sha256((level[i] + level[i + 1]).encode()).hexdigest() for i in range(0, len(level), 2)]
    return level[0]
