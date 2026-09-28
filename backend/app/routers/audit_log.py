from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse

from ..core.deps import User, db, require
from ..services import audit
from ..services.common import one, rows

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("")
def list_audit(entity_type: str | None = None, entity_id: str | None = None, action: str | None = None,
               page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200),
               user: User = Depends(require("audit.read")), conn=Depends(db)):
    where = """(CAST(:et AS text) IS NULL OR entity_type = :et) AND (CAST(:eid AS text) IS NULL OR entity_id = :eid)
               AND (CAST(:act AS text) IS NULL OR action = :act)"""
    p = {"et": entity_type, "eid": entity_id, "act": action}
    total = one(conn, f"SELECT count(*) AS n FROM audit_log WHERE {where}", p)["n"]
    items = rows(conn, f"""SELECT a.id, a.occurred_at, a.actor_id, a.actor_role, u.full_name AS actor_name, a.action,
                          a.entity_type, a.entity_id, a.before_data, a.after_data, a.reason, host(a.ip_address) AS ip,
                          a.prev_hash, a.row_hash FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id
                          WHERE {where} ORDER BY a.id DESC LIMIT :lim OFFSET :off""",
                 {**p, "lim": page_size, "off": (page - 1) * page_size})
    return {"total": total, "page": page, "page_size": page_size, "items": items}


@router.get("/verify")
def verify(user: User = Depends(require("audit.verify")), conn=Depends(db)):
    result = audit.verify(conn)
    audit.write(conn, user, "VERIFY", "audit_log", None, after=result)
    return result


@router.get("/checkpoints")
def checkpoints(user: User = Depends(require("audit.read")), conn=Depends(db)):
    return rows(conn, "SELECT * FROM audit_checkpoints ORDER BY id DESC LIMIT 50")


@router.post("/checkpoints", status_code=201)
def create_checkpoint(user: User = Depends(require("audit.checkpoint")), conn=Depends(db)):
    """Compute a Merkle root over the whole chain. Publishing the root externally (email, notary,
    public timestamping) makes any later rewrite of history detectable even by a DB superuser."""
    hashes = [r["row_hash"] for r in rows(conn, "SELECT row_hash FROM audit_log ORDER BY id")]
    last = one(conn, "SELECT max(id) AS m FROM audit_log")["m"] or 0
    root = audit.merkle_root(hashes)
    r = one(conn, "INSERT INTO audit_checkpoints (last_audit_id, row_count, merkle_root, created_by)"
                  " VALUES (:l, :n, :m, :u) RETURNING *", {"l": last, "n": len(hashes), "m": root, "u": user.id})
    audit.write(conn, user, "CHECKPOINT", "audit_log", last, after={"merkle_root": root, "rows": len(hashes)})
    return r


@router.get("/checkpoints/{cid}/verify")
def verify_checkpoint(cid: int, user: User = Depends(require("audit.verify")), conn=Depends(db)):
    c = one(conn, "SELECT * FROM audit_checkpoints WHERE id = :id", {"id": cid})
    if not c:
        return JSONResponse({"detail": "Checkpoint not found"}, status_code=404)
    hashes = [r["row_hash"] for r in rows(conn, "SELECT row_hash FROM audit_log WHERE id <= :l ORDER BY id",
                                          {"l": c["last_audit_id"]})]
    root = audit.merkle_root(hashes)
    return {"checkpoint_id": cid, "expected_root": c["merkle_root"], "recomputed_root": root,
            "matches": root == c["merkle_root"] and len(hashes) == c["row_count"]}
