from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from ..core.deps import User, db, require
from ..services import audit
from ..services.common import get_or_404, one, rows

router = APIRouter(prefix="/audit", tags=["audit"])


class AnchorIn(BaseModel):
    anchor_url: str = Field(min_length=8, description="Where the root was published externally: a public"
                            " gist, an OpenTimestamps proof, an email to the IEC, etc.")


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


@router.get("/checkpoints/{cid}/anchor-text")
def anchor_text(cid: int, user: User = Depends(require("audit.checkpoint")), conn=Depends(db)):
    """Canonical text to publish externally (paste into a public gist, email to the IEC, submit
    to an OpenTimestamps-style service) so the checkpoint's root has a witness outside this DB."""
    c = get_or_404(conn, "SELECT * FROM audit_checkpoints WHERE id = :id", {"id": cid}, "Checkpoint")
    text = (f"AyuCTMS audit checkpoint #{c['id']}\n"
            f"created_at: {c['created_at'].isoformat()}\n"
            f"last_audit_id: {c['last_audit_id']}\n"
            f"row_count: {c['row_count']}\n"
            f"merkle_root: {c['merkle_root']}\n")
    return {"text": text}


@router.post("/checkpoints/{cid}/anchor")
def anchor_checkpoint(cid: int, body: AnchorIn, user: User = Depends(require("audit.checkpoint")), conn=Depends(db)):
    """Record where a checkpoint's Merkle root was published outside the system. Until anchored,
    a checkpoint only proves integrity to someone who trusts this database's own record of it;
    once anchored somewhere the DB owner doesn't control, a later rewrite of history becomes
    detectable by anyone who kept a copy of the published root - including a superuser rewrite."""
    before = get_or_404(conn, "SELECT * FROM audit_checkpoints WHERE id = :id", {"id": cid}, "Checkpoint")
    if before["anchored_at"]:
        raise HTTPException(409, "Checkpoint is already anchored")
    r = one(conn, "UPDATE audit_checkpoints SET anchor_url = :u, anchored_at = now(), anchored_by = :a"
                  " WHERE id = :id RETURNING *", {"u": body.anchor_url, "a": user.id, "id": cid})
    audit.write(conn, user, "ANCHOR", "audit_checkpoint", cid, before, r)
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


@router.get("/merkle/public-proof")
def public_merkle_proof(conn=Depends(db)):
    """Publicly verifiable Merkle checkpoint proof for independent audit verification.
    Provides sovereign regulators and third parties mathematical certainty of ledger integrity."""
    cp = one(conn, "SELECT * FROM audit_checkpoints ORDER BY id DESC LIMIT 1")
    if not cp:
        # Generate on-the-fly root if no checkpoint recorded yet
        hashes = [r["row_hash"] for r in rows(conn, "SELECT row_hash FROM audit_log ORDER BY id")]
        last_id = one(conn, "SELECT max(id) AS m FROM audit_log")["m"] or 0
        root = audit.merkle_root(hashes) if hashes else "GENESIS"
        return {
            "status": "LIVE_UNCHECKPOINTED",
            "root_hash": root,
            "total_blocks": len(hashes),
            "last_block_id": last_id,
            "epoch_timestamp": None,
            "is_externally_anchored": False
        }

    return {
        "status": "ANCHORED" if cp["anchored_at"] else "VERIFIED_INTERNAL",
        "checkpoint_id": cp["id"],
        "root_hash": cp["merkle_root"],
        "total_blocks": cp["row_count"],
        "last_block_id": cp["last_audit_id"],
        "created_at": cp["created_at"].isoformat() if cp["created_at"] else None,
        "anchor_url": cp["anchor_url"],
        "anchored_at": cp["anchored_at"].isoformat() if cp["anchored_at"] else None,
        "is_externally_anchored": bool(cp["anchored_at"]),
        "verification_guide": "Compute Merkle tree over all SHA-256 row_hash elements up to last_block_id. Root must match root_hash."
    }

