import hmac
import hashlib
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import text

from ..core.config import get_settings
from ..core.deps import User, db, require
from ..core.security import sha256_hex, verify_password
from ..services import audit
from ..services.common import one, rows, study_or_404

router = APIRouter(tags=["electronic signatures"])

MEANINGS = ("AUTHORSHIP", "APPROVAL", "REVIEW", "VERIFICATION")


class VerifySignRequest(BaseModel):
    study_id: int
    entity_type: str = Field(min_length=2, max_length=64, description="e.g. CRF_SUBMISSION, SAE_REPORT, PROTOCOL_AMENDMENT")
    entity_id: int
    password: str = Field(min_length=1)
    totp: str | None = None
    meaning: str = Field(pattern="^(AUTHORSHIP|APPROVAL|REVIEW|VERIFICATION)$")
    reason: str = Field(min_length=3)


def _compute_entity_hash(conn, entity_type: str, entity_id: int) -> str:
    """Computes a canonical SHA-256 hash of the target entity payload to bind the signature."""
    table_map = {
        "CRF_SUBMISSION": "crf_entries",
        "CRF_ENTRY": "crf_entries",
        "SAE_REPORT": "adverse_events",
        "ADVERSE_EVENT": "adverse_events",
        "CONSENT_RECORD": "consents",
        "PROTOCOL_AMENDMENT": "protocol_amendments",
        "DEVIATION": "deviations",
        "PHENOTYPE": "ayurvedic_phenotypes",
    }
    table = table_map.get(entity_type.upper())
    if not table:
        payload = f"{entity_type}:{entity_id}"
        return sha256_hex(payload)

    row = one(conn, f"SELECT * FROM {table} WHERE id = :id", {"id": entity_id})
    if not row:
        raise HTTPException(404, f"{entity_type} #{entity_id} not found")

    # Serialize canonical JSON representation
    serialized = json.dumps(row, sort_keys=True, default=str)
    return sha256_hex(serialized)


def _generate_signature_token(data_hash: str, signer_id: int, meaning: str, timestamp_str: str) -> str:
    """HMAC-SHA256 token signed with the server-held secret key."""
    secret = get_settings().jwt_secret.encode("utf-8")
    msg = f"{data_hash}:{signer_id}:{meaning}:{timestamp_str}".encode("utf-8")
    return hmac.new(secret, msg, hashlib.sha256).hexdigest()


@router.post("/signatures/verify-sign", status_code=201)
def verify_and_sign(body: VerifySignRequest, request: Request, user: User = Depends(require("signature.sign")), conn=Depends(db)):
    """21 CFR Part 11 / GCP Re-authentication & Electronic Signature.
    Re-authenticates user with password (+ TOTP if enabled), calculates record canonical hash,
    and seals the signature with an HMAC token."""
    study_or_404(conn, body.study_id)
    u = one(conn, "SELECT password_hash, totp_secret, full_name, role FROM users WHERE id = :id", {"id": user.id})
    if not u or not verify_password(body.password, u["password_hash"]):
        audit.write(conn, user, "ESIGN_FAILED", body.entity_type, body.entity_id, reason="Invalid credentials for e-sign")
        raise HTTPException(401, "Invalid password for electronic signature re-authentication")

    if u["totp_secret"]:
        if not body.totp:
            raise HTTPException(401, "TOTP 2FA code required for electronic signature")
        import pyotp
        if not pyotp.TOTP(u["totp_secret"]).verify(body.totp, valid_window=1):
            audit.write(conn, user, "ESIGN_FAILED", body.entity_type, body.entity_id, reason="Invalid TOTP for e-sign")
            raise HTTPException(401, "Invalid TOTP code for electronic signature")

    data_hash = _compute_entity_hash(conn, body.entity_type, body.entity_id)
    client_ip = request.client.host if request.client else None
    now_iso = datetime.utcnow().isoformat()
    sig_token = _generate_signature_token(data_hash, user.id, body.meaning, now_iso)

    # Insert signature record
    sig = one(conn, """
        INSERT INTO electronic_signatures (study_id, entity_type, entity_id, signer_id, signer_name,
                                          signer_role, signature_meaning, reason, data_hash,
                                          signature_token, client_ip)
        VALUES (:s, :et, :eid, :uid, :name, :role, CAST(:meaning AS signature_meaning), :reason,
                :hash, :token, :ip) RETURNING *
    """, {
        "s": body.study_id, "et": body.entity_type.upper(), "eid": body.entity_id,
        "uid": user.id, "name": u["full_name"], "role": u["role"], "meaning": body.meaning,
        "reason": body.reason, "hash": data_hash, "token": sig_token, "ip": client_ip
    })

    # Log to tamper-evident audit trail
    ab = audit.write(conn, user, "ESIGN", body.entity_type, body.entity_id,
                     after={"signature_id": sig["id"], "meaning": body.meaning, "data_hash": data_hash},
                     reason=body.reason, ip=client_ip)
    
    conn.execute(text("UPDATE electronic_signatures SET audit_id = :aid WHERE id = :id"),
                 {"aid": ab.get("id"), "id": sig["id"]})

    return {
        "id": sig["id"],
        "entity_type": sig["entity_type"],
        "entity_id": sig["entity_id"],
        "signer_name": sig["signer_name"],
        "signer_role": sig["signer_role"],
        "signature_meaning": sig["signature_meaning"],
        "data_hash": sig["data_hash"],
        "signed_at": sig["signed_at"],
        "status": "VALID"
    }


@router.get("/signatures/entity/{entity_type}/{entity_id}")
def get_signatures_for_entity(entity_type: str, entity_id: int, user: User = Depends(require("signature.read")), conn=Depends(db)):
    """Retrieves all electronic signatures for an entity and verifies data integrity (tamper detection)."""
    current_hash = _compute_entity_hash(conn, entity_type, entity_id)
    sigs = rows(conn, """
        SELECT id, study_id, entity_type, entity_id, signer_id, signer_name, signer_role,
               signature_meaning, reason, data_hash, client_ip, signed_at, audit_id
        FROM electronic_signatures
        WHERE entity_type = :et AND entity_id = :eid
        ORDER BY signed_at DESC
    """, {"et": entity_type.upper(), "eid": entity_id})

    results = []
    for s in sigs:
        # Check if record has been altered since it was signed
        is_intact = (s["data_hash"] == current_hash)
        results.append({
            **s,
            "is_valid": is_intact,
            "integrity_status": "VERIFIED_INTACT" if is_intact else "RECORD_ALTERED_HASH_MISMATCH"
        })

    return {
        "entity_type": entity_type.upper(),
        "entity_id": entity_id,
        "current_hash": current_hash,
        "signatures": results,
        "total_signatures": len(results)
    }
