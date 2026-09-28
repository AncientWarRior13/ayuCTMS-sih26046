from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text

from ..core.deps import User, db, require
from ..core.permissions import ROLES
from ..core.security import hash_password
from ..services import audit
from ..services.common import get_or_404, one, rows

router = APIRouter(tags=["administration"])


class UserCreate(BaseModel):
    email: str = Field(pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$", max_length=254)
    full_name: str = Field(min_length=2)
    role: str
    password: str = Field(min_length=10)
    site_ids: list[int] = []


class UserPatch(BaseModel):
    role: str | None = None
    is_active: bool | None = None
    site_ids: list[int] | None = None
    unlock: bool = False
    reason: str = Field(min_length=3)


class SiteIn(BaseModel):
    code: str = Field(min_length=2)
    name: str
    city: str | None = None


class RuleIn(BaseModel):
    rule_key: str
    hours_allowed: int = Field(gt=0, le=24 * 90)
    source_note: str = Field(min_length=5, description="Citation of the regulation clause")
    description: str | None = None


class KpiIn(BaseModel):
    key: str
    value_num: float


def _check_role(role: str) -> None:
    if role not in ROLES:
        raise HTTPException(422, f"role must be one of {ROLES}")


def _set_sites(conn, uid: int, site_ids: list[int]) -> None:
    conn.execute(text("DELETE FROM user_sites WHERE user_id = :u"), {"u": uid})
    for s in site_ids:
        conn.execute(text("INSERT INTO user_sites (user_id, site_id) VALUES (:u, :s)"), {"u": uid, "s": s})


USER_COLS = """u.id, u.email, u.full_name, u.role, u.is_active, u.failed_logins, u.locked_until, u.created_at,
               (u.totp_secret IS NOT NULL) AS totp_enabled,
               COALESCE((SELECT array_agg(site_id ORDER BY site_id) FROM user_sites WHERE user_id = u.id), '{}') AS site_ids"""


@router.get("/admin/users")
def list_users(user: User = Depends(require("admin.users")), conn=Depends(db)):
    return rows(conn, f"SELECT {USER_COLS} FROM users u ORDER BY u.role, u.id")


@router.post("/admin/users", status_code=201)
def create_user(body: UserCreate, user: User = Depends(require("admin.users")), conn=Depends(db)):
    _check_role(body.role)
    if one(conn, "SELECT 1 FROM users WHERE lower(email) = lower(:e)", {"e": body.email}):
        raise HTTPException(409, "Email already registered")
    r = one(conn, "INSERT INTO users (email, full_name, role, password_hash) VALUES (:e, :n, :r, :h) RETURNING id",
            {"e": body.email, "n": body.full_name, "r": body.role, "h": hash_password(body.password)})
    _set_sites(conn, r["id"], body.site_ids)
    audit.write(conn, user, "CREATE", "user", r["id"],
                after={"email": body.email, "role": body.role, "site_ids": body.site_ids})
    return one(conn, f"SELECT {USER_COLS} FROM users u WHERE u.id = :id", {"id": r["id"]})


@router.patch("/admin/users/{uid}")
def patch_user(uid: int, body: UserPatch, user: User = Depends(require("admin.users")), conn=Depends(db)):
    before = get_or_404(conn, f"SELECT {USER_COLS} FROM users u WHERE u.id = :id", {"id": uid}, "User")
    if uid == user.id and (body.role not in (None, "ADMIN") or body.is_active is False):
        raise HTTPException(409, "Administrators cannot demote or deactivate themselves")
    if body.role is not None:
        _check_role(body.role)
        conn.execute(text("UPDATE users SET role = :r WHERE id = :id"), {"r": body.role, "id": uid})
    if body.is_active is not None:
        conn.execute(text("UPDATE users SET is_active = :a WHERE id = :id"), {"a": body.is_active, "id": uid})
    if body.unlock:
        conn.execute(text("UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = :id"), {"id": uid})
    if body.site_ids is not None:
        _set_sites(conn, uid, body.site_ids)
    after = one(conn, f"SELECT {USER_COLS} FROM users u WHERE u.id = :id", {"id": uid})
    audit.write(conn, user, "PERMISSION_CHANGE", "user", uid, before, after, body.reason)
    return after


@router.get("/admin/sites")
def list_sites(user: User = Depends(require("sites.read")), conn=Depends(db)):
    return rows(conn, "SELECT * FROM sites ORDER BY id")


@router.post("/admin/sites", status_code=201)
def create_site(body: SiteIn, user: User = Depends(require("admin.sites")), conn=Depends(db)):
    if one(conn, "SELECT 1 FROM sites WHERE code = :c", {"c": body.code}):
        raise HTTPException(409, "Site code already exists")
    r = one(conn, "INSERT INTO sites (code, name, city) VALUES (:code, :name, :city) RETURNING *", body.model_dump())
    audit.write(conn, user, "CREATE", "site", r["id"], after=r)
    return r


@router.get("/admin/rules")
def list_rules(user: User = Depends(require("rules.read")), conn=Depends(db)):
    return rows(conn, "SELECT * FROM regulatory_rules ORDER BY hours_allowed, rule_key")


@router.put("/admin/rules")
def update_rule(body: RuleIn, user: User = Depends(require("rules.write")), conn=Depends(db)):
    before = get_or_404(conn, "SELECT * FROM regulatory_rules WHERE rule_key = :k", {"k": body.rule_key}, "Rule")
    r = one(conn, "UPDATE regulatory_rules SET hours_allowed = :h, source_note = :s, description = COALESCE(:d, description)"
                  " WHERE rule_key = :k RETURNING *",
            {"h": body.hours_allowed, "s": body.source_note, "d": body.description, "k": body.rule_key})
    audit.write(conn, user, "UPDATE", "regulatory_rule", r["id"], before, r, body.source_note)
    return r


@router.get("/admin/kpi-config")
def get_kpi(user: User = Depends(require("kpi.read")), conn=Depends(db)):
    return rows(conn, "SELECT * FROM kpi_config ORDER BY key")


@router.put("/admin/kpi-config")
def put_kpi(body: list[KpiIn], user: User = Depends(require("kpi.write")), conn=Depends(db)):
    out = []
    for k in body:
        before = get_or_404(conn, "SELECT * FROM kpi_config WHERE key = :k", {"k": k.key}, f"KPI {k.key}")
        if k.value_num < 0:
            raise HTTPException(422, f"{k.key} must be non-negative")
        r = one(conn, "UPDATE kpi_config SET value_num = :v WHERE key = :k RETURNING *", {"v": k.value_num, "k": k.key})
        audit.write(conn, user, "UPDATE", "kpi_config", k.key, before, r)
        out.append(r)
    return out


@router.get("/lookups/{name}")
def lookups(name: str, user: User = Depends(require("lookup.read")), conn=Depends(db)):
    tables = {"meddra": "SELECT * FROM lookup_meddra_stub ORDER BY pt_name",
              "ayush-morbidity": "SELECT * FROM lookup_ayush_morbidity ORDER BY code",
              "cdisc-ct": "SELECT * FROM lookup_cdisc_ct ORDER BY codelist, submission_value",
              "provenance": "SELECT * FROM data_provenance ORDER BY id"}
    if name not in tables:
        raise HTTPException(404, f"Unknown lookup; available: {sorted(tables)}")
    return rows(conn, tables[name])
