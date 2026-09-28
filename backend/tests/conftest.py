"""Test setup. Requires a disposable PostgreSQL database:

    TEST_ADMIN_DATABASE_URL  owner/superuser URL of the test database (schema is dropped and rebuilt)
    TEST_DATABASE_URL        same database, connecting as ayuctms_app (non-superuser, so RLS applies)
"""
import os
import sys
from pathlib import Path

import pytest

ADMIN_URL = os.environ.get("TEST_ADMIN_DATABASE_URL")
APP_URL = os.environ.get("TEST_DATABASE_URL")
if not ADMIN_URL or not APP_URL:
    pytest.exit("Set TEST_ADMIN_DATABASE_URL and TEST_DATABASE_URL to a disposable database", returncode=2)

os.environ.update({"ADMIN_DATABASE_URL": ADMIN_URL, "DATABASE_URL": APP_URL, "ENABLE_SCHEDULER": "false",
                   "LOGIN_RATE_PER_MIN": "10000", "APP_DB_PASSWORD": os.environ.get("APP_DB_PASSWORD", "change_me")})

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
sys.path.insert(0, str(BACKEND / "scripts"))

from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

import build_cdisc_ct  # noqa: E402
import gen_trial_events  # noqa: E402
import seed  # noqa: E402
import seed_studies_from_ctri  # noqa: E402
from _common import owner_engine  # noqa: E402
from app.main import app  # noqa: E402

PASSWORD = seed_studies_from_ctri.DEMO_PASSWORD
ROLE_EMAIL = {"PI": "pi@demo.test", "COORDINATOR": "coord@demo.test", "MONITOR": "monitor@demo.test",
              "IEC": "iec@demo.test", "PV": "pv@demo.test", "ADMIN": "admin@demo.test", "REGULATOR": "regulator@demo.test"}


@pytest.fixture(scope="session")
def owner():
    eng = owner_engine()
    seed.reset(eng, os.environ["APP_DB_PASSWORD"])
    with eng.begin() as c:
        build_cdisc_ct.run(c)
        ctx = seed_studies_from_ctri.run(c)
        gen_trial_events.run(c, ctx)
    yield eng
    eng.dispose()


@pytest.fixture(scope="session")
def client(owner):
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def tokens(client):
    out = {}
    for role, email in {**ROLE_EMAIL, "COORDINATOR2": "coord2@demo.test", "PI2": "pi2@demo.test"}.items():
        r = client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
        assert r.status_code == 200, r.text
        out[role] = {"Authorization": f"Bearer {r.json()['access_token']}"}
    return out


@pytest.fixture
def api(client, tokens):
    class Api:
        def __call__(self, method: str, role: str, path: str, **kw):
            return client.request(method, "/api/v1" + path, headers=tokens[role], **kw)

        def get(self, role, path, **kw):
            return self("GET", role, path, **kw)

        def post(self, role, path, **kw):
            return self("POST", role, path, **kw)

    return Api()


def audit_count(owner) -> int:
    with owner.connect() as c:
        return c.execute(text("SELECT count(*) FROM audit_log")).scalar()
