from datetime import datetime, timedelta, timezone

import pyotp
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import text

from ..core.db import engine, set_context
from ..core.deps import User, current_user
from ..core.permissions import permissions_for
from ..core.security import access_token, decode, refresh_token, verify_password
from ..services import audit
from ..services.common import one, rows

router = APIRouter(prefix="/auth", tags=["auth"])

MAX_FAILS = 5
LOCK_MINUTES = 15


class LoginRequest(BaseModel):
    email: str
    password: str
    totp: str | None = None


class RefreshRequest(BaseModel):
    refresh_token: str


class TotpConfirm(BaseModel):
    code: str


class TotpDisable(BaseModel):
    password: str


def _site_ids(conn, uid: int) -> list[int]:
    return [r["site_id"] for r in rows(conn, "SELECT site_id FROM user_sites WHERE user_id = :u ORDER BY site_id", {"u": uid})]


def _tokens(u: dict, site_ids: list[int]) -> dict:
    return {"access_token": access_token(u["id"], u["role"], site_ids),
            "refresh_token": refresh_token(u["id"], u["role"], site_ids),
            "token_type": "bearer", "role": u["role"]}


@router.post("/login")
def login(body: LoginRequest, request: Request):
    ip = request.client.host if request.client else None
    with engine().begin() as conn:
        set_context(conn, "ADMIN", [], None)
        u = one(conn, "SELECT * FROM users WHERE lower(email) = lower(:e)", {"e": body.email.strip()})
        now = datetime.now(timezone.utc)
        if u and u["locked_until"] and u["locked_until"] > now:
            audit.write(conn, None, "LOGIN_LOCKED", "user", u["id"], ip=ip)
            locked = True
        else:
            locked = False
    if locked:
        raise HTTPException(423, "Account locked after repeated failed logins. Try again later.")

    ok = bool(u and u["is_active"] and verify_password(body.password, u["password_hash"]))
    if ok and u["totp_secret"]:
        if not body.totp:
            raise HTTPException(401, "TOTP code required")
        ok = pyotp.TOTP(u["totp_secret"]).verify(body.totp, valid_window=1)

    with engine().begin() as conn:
        set_context(conn, "ADMIN", [], None)
        if not ok:
            if u:
                fails = u["failed_logins"] + 1
                lock = now + timedelta(minutes=LOCK_MINUTES) if fails >= MAX_FAILS else None
                conn.execute(text("UPDATE users SET failed_logins = :f, locked_until = :l WHERE id = :id"),
                             {"f": 0 if lock else fails, "l": lock, "id": u["id"]})
            audit.write(conn, None, "LOGIN_FAILED", "user", u["id"] if u else None,
                        after={"email": body.email.strip().lower()}, ip=ip)
        else:
            conn.execute(text("UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = :id"), {"id": u["id"]})
            sites = _site_ids(conn, u["id"])
            audit.write(conn, User(u["id"], u["role"], sites, ip), "LOGIN", "user", u["id"])
    if not ok:
        raise HTTPException(401, "Invalid email or password")
    return _tokens(u, sites)


@router.post("/refresh")
def refresh(body: RefreshRequest):
    data = decode(body.refresh_token, "refresh")
    if not data:
        raise HTTPException(401, "Invalid refresh token")
    with engine().begin() as conn:
        set_context(conn, "ADMIN", [], None)
        u = one(conn, "SELECT id, role, is_active FROM users WHERE id = :id", {"id": int(data["sub"])})
        if not u or not u["is_active"]:
            raise HTTPException(401, "User inactive")
        sites = _site_ids(conn, u["id"])
    return _tokens(u, sites)


@router.get("/me")
def me(user: User = Depends(current_user)):
    with engine().begin() as conn:
        set_context(conn, user.role, user.site_ids, user.id)
        u = one(conn, "SELECT id, email, full_name, role, (totp_secret IS NOT NULL) AS totp_enabled FROM users"
                      " WHERE id = :id", {"id": user.id})
        sites = rows(conn, "SELECT s.id, s.code, s.name FROM sites s JOIN user_sites us ON us.site_id = s.id"
                           " WHERE us.user_id = :u ORDER BY s.id", {"u": user.id})
    if not u:
        raise HTTPException(401, "User not found")
    return {**u, "sites": sites, "permissions": permissions_for(user.role)}


@router.post("/totp/setup")
def totp_setup(user: User = Depends(current_user)):
    """Generates a pending TOTP secret. It only takes effect on /auth/totp/confirm, so a user
    cannot lock themselves out by misconfiguring their authenticator app."""
    secret = pyotp.random_base32()
    with engine().begin() as conn:
        set_context(conn, user.role, user.site_ids, user.id)
        u = one(conn, "SELECT email FROM users WHERE id = :id", {"id": user.id})
        conn.execute(text("UPDATE users SET totp_pending_secret = :s WHERE id = :id"), {"s": secret, "id": user.id})
        audit.write(conn, user, "TOTP_SETUP_STARTED", "user", user.id)
    uri = pyotp.totp.TOTP(secret).provisioning_uri(name=u["email"], issuer_name="AyuCTMS")
    return {"secret": secret, "otpauth_uri": uri}


@router.post("/totp/confirm")
def totp_confirm(body: TotpConfirm, user: User = Depends(current_user)):
    with engine().begin() as conn:
        set_context(conn, user.role, user.site_ids, user.id)
        u = one(conn, "SELECT totp_pending_secret FROM users WHERE id = :id", {"id": user.id})
        if not u or not u["totp_pending_secret"]:
            raise HTTPException(409, "No pending TOTP setup; call /auth/totp/setup first")
        if not pyotp.TOTP(u["totp_pending_secret"]).verify(body.code, valid_window=1):
            raise HTTPException(401, "Incorrect code")
        conn.execute(text("UPDATE users SET totp_secret = totp_pending_secret, totp_pending_secret = NULL"
                          " WHERE id = :id"), {"id": user.id})
        audit.write(conn, user, "TOTP_ENABLED", "user", user.id)
    return {"totp_enabled": True}


@router.post("/totp/disable")
def totp_disable(body: TotpDisable, user: User = Depends(current_user)):
    with engine().begin() as conn:
        set_context(conn, user.role, user.site_ids, user.id)
        u = one(conn, "SELECT password_hash FROM users WHERE id = :id", {"id": user.id})
        if not u or not verify_password(body.password, u["password_hash"]):
            raise HTTPException(401, "Incorrect password")
        conn.execute(text("UPDATE users SET totp_secret = NULL, totp_pending_secret = NULL WHERE id = :id"),
                     {"id": user.id})
        audit.write(conn, user, "TOTP_DISABLED", "user", user.id)
    return {"totp_enabled": False}
