"""T1-T4: authentication, RBAC matrix, regulator read-only, site isolation."""
import re

import pytest
from sqlalchemy import create_engine, text

from app.core.permissions import PERMISSIONS, ROLES
from app.main import app
from conftest import APP_URL, PASSWORD, ROLE_EMAIL


@pytest.mark.parametrize("role", ROLES)
def test_t1_login_each_role(client, role):
    r = client.post("/api/v1/auth/login", json={"email": ROLE_EMAIL[role], "password": PASSWORD})
    assert r.status_code == 200 and r.json()["role"] == role
    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {r.json()['access_token']}"})
    assert me.json()["role"] == role and me.json()["permissions"]


def test_t1_wrong_password_and_lockout(client, api):
    r = api.post("ADMIN", "/admin/users", json={"email": "lockme@demo.test", "full_name": "Lock Test", "role": "MONITOR",
                                                 "password": "Correct-horse-1"})
    assert r.status_code == 201, r.text
    bad = {"email": "lockme@demo.test", "password": "wrong-password"}
    for _ in range(5):
        assert client.post("/api/v1/auth/login", json=bad).status_code == 401
    r = client.post("/api/v1/auth/login", json={"email": "lockme@demo.test", "password": "Correct-horse-1"})
    assert r.status_code == 423
    uid = next(u["id"] for u in api.get("ADMIN", "/admin/users").json() if u["email"] == "lockme@demo.test")
    assert api("PATCH", "ADMIN", f"/admin/users/{uid}", json={"unlock": True, "reason": "Verified identity"}).status_code == 200
    assert client.post("/api/v1/auth/login", json={"email": "lockme@demo.test", "password": "Correct-horse-1"}).status_code == 200


def test_t1_refresh_and_bad_token(client):
    r = client.post("/api/v1/auth/login", json={"email": "iec@demo.test", "password": PASSWORD}).json()
    assert client.post("/api/v1/auth/refresh", json={"refresh_token": r["refresh_token"]}).status_code == 200
    assert client.post("/api/v1/auth/refresh", json={"refresh_token": r["access_token"]}).status_code == 401
    assert client.get("/api/v1/studies", headers={"Authorization": "Bearer nope"}).status_code == 401
    assert client.get("/api/v1/studies").status_code == 401


def _flat_routes():
    """Yield (full_path, route); handles routers that FastAPI keeps nested after include_router."""
    for route in app.routes:
        nested = getattr(route, "original_router", None)
        if nested is not None:
            for r in nested.routes:
                yield "/api/v1" + r.path, r
        else:
            yield getattr(route, "path", ""), route


def test_totp_setup_confirm_login_and_disable(client, api):
    import pyotp

    r = api.post("MONITOR", "/auth/totp/setup")
    assert r.status_code == 200
    secret = r.json()["secret"]
    assert "otpauth://totp/" in r.json()["otpauth_uri"]

    bad = api.post("MONITOR", "/auth/totp/confirm", json={"code": "000000"})
    assert bad.status_code == 401

    code = pyotp.TOTP(secret).now()
    ok = api.post("MONITOR", "/auth/totp/confirm", json={"code": code})
    assert ok.status_code == 200 and ok.json()["totp_enabled"] is True
    assert api.get("MONITOR", "/auth/me").json()["totp_enabled"] is True

    r = client.post("/api/v1/auth/login", json={"email": "monitor@demo.test", "password": PASSWORD})
    assert r.status_code == 401 and "TOTP" in r.json()["detail"]
    r = client.post("/api/v1/auth/login", json={"email": "monitor@demo.test", "password": PASSWORD,
                                                "totp": pyotp.TOTP(secret).now()})
    assert r.status_code == 200

    bad_disable = api.post("MONITOR", "/auth/totp/disable", json={"password": "wrong"})
    assert bad_disable.status_code == 401
    r = api.post("MONITOR", "/auth/totp/disable", json={"password": PASSWORD})
    assert r.status_code == 200 and r.json()["totp_enabled"] is False
    r = client.post("/api/v1/auth/login", json={"email": "monitor@demo.test", "password": PASSWORD})
    assert r.status_code == 200  # no longer requires a code


def _routes():
    for full_path, route in _flat_routes():
        methods = getattr(route, "methods", None)
        dependant = getattr(route, "dependant", None)
        if not methods or dependant is None:
            continue
        perm = next((getattr(d.call, "permission", None) for d in dependant.dependencies
                     if getattr(d.call, "permission", None)), None)
        if perm:
            path = re.sub(r"\{domain\}", "AE", full_path)
            path = re.sub(r"\{[^}]+\}", "1", path)
            for m in methods - {"HEAD", "OPTIONS"}:
                yield m, path, perm


ROUTES = list(_routes())


def test_every_protected_route_has_known_permission():
    assert len(ROUTES) > 40
    assert all(p in PERMISSIONS for _, _, p in ROUTES)


@pytest.mark.parametrize("role", ROLES)
def test_t2_rbac_matrix(client, tokens, role):
    """Every endpoint denies (403) each role the permission map does not grant."""
    denied = [(m, p) for m, p, perm in ROUTES if role not in PERMISSIONS[perm]]
    for method, path in denied:
        r = client.request(method, path, headers=tokens[role], json={})
        assert r.status_code == 403, f"{role} {method} {path} -> {r.status_code}"


def test_t3_regulator_cannot_write(client, tokens):
    writes = [(m, p) for m, p, _ in ROUTES if m in {"POST", "PUT", "PATCH", "DELETE"}]
    assert writes
    for method, path in writes:
        r = client.request(method, path, headers=tokens["REGULATOR"], json={})
        assert r.status_code == 403, f"REGULATOR {method} {path} -> {r.status_code}"


def test_t4_site_isolation_api(api, owner):
    with owner.connect() as c:
        other = c.execute(text("SELECT p.id FROM participants p JOIN sites s ON s.id = p.site_id"
                               " WHERE s.code = 'SITE-02' AND p.study_id = 1 LIMIT 1")).scalar()
    listing = api.get("COORDINATOR", "/studies/1/participants").json()
    assert listing and {p["site_code"] for p in listing} == {"SITE-01"}
    assert api.get("COORDINATOR", f"/participants/{other}").status_code == 404
    assert api.get("COORDINATOR2", f"/participants/{other}").status_code == 200


def test_t4_site_isolation_rls_direct():
    """RLS enforced in the database itself, for the non-superuser application role."""
    eng = create_engine(APP_URL, connect_args={"options": "-c timezone=GMT"})
    with eng.begin() as c:
        c.execute(text("SELECT set_config('app.role', 'COORDINATOR', true), set_config('app.site_ids', '1', true)"))
        sites = {r[0] for r in c.execute(text("SELECT DISTINCT site_id FROM participants"))}
        pii = c.execute(text("SELECT count(*) FROM participant_pii pp JOIN participants p ON p.id = pp.participant_id"
                             " WHERE p.site_id <> 1")).scalar()
    with eng.begin() as c:
        none = c.execute(text("SELECT count(*) FROM participants")).scalar()  # no context -> nothing visible
    eng.dispose()
    assert sites == {1} and pii == 0 and none == 0
