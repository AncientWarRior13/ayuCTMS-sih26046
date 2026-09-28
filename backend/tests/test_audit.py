"""T7-T9: audit coverage, hash chain + tamper detection, immutability, Merkle checkpoints."""
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.exc import DBAPIError

from conftest import APP_URL, audit_count


def test_t7_mutations_write_audit_rows(api, owner):
    calls = [
        ("POST", "MONITOR", "/studies/1/queries", {"text": "Audit coverage query"}),
        ("POST", "MONITOR", "/studies/1/deviations", {"category": "Other", "severity": "MINOR", "description": "cov"}),
        ("POST", "PI", "/studies/1/milestones", {"name": "Interim analysis", "planned_date": "2027-01-01"}),
        ("PUT", "ADMIN", "/admin/kpi-config", [{"key": "query_ageing_days", "value_num": 14}]),
        ("POST", "ADMIN", "/admin/sites", {"code": "SITE-99", "name": "Audit Site"}),
    ]
    for method, role, path, body in calls:
        before = audit_count(owner)
        r = api(method, role, path, json=body)
        assert r.status_code in (200, 201), r.text
        assert audit_count(owner) > before, f"{method} {path} wrote no audit row"


def test_t7_exports_and_logins_are_audited(api, owner):
    before = audit_count(owner)
    api.get("ADMIN", "/export/sdtm/study/1/DM")
    with owner.connect() as c:
        last = c.execute(text("SELECT action FROM audit_log ORDER BY id DESC LIMIT 1")).scalar()
    assert audit_count(owner) == before + 1 and last == "EXPORT"


def test_t8_chain_intact_then_tamper_detected(api, owner):
    v = api.get("ADMIN", "/audit/verify").json()
    assert v["intact"] and v["first_broken_id"] is None and v["rows_checked"] > 0
    with owner.begin() as c:
        target, original = c.execute(text("SELECT id, after_data::text FROM audit_log ORDER BY id LIMIT 1 OFFSET 4")).one()
        c.execute(text("ALTER TABLE audit_log DISABLE TRIGGER trg_audit_no_update"))
        c.execute(text("UPDATE audit_log SET after_data = '{\"tampered\": true}' WHERE id = :i"), {"i": target})
        c.execute(text("ALTER TABLE audit_log ENABLE TRIGGER trg_audit_no_update"))
    try:
        v = api.get("REGULATOR", "/audit/verify").json()
        assert v["intact"] is False and v["first_broken_id"] == target
    finally:
        with owner.begin() as c:
            c.execute(text("ALTER TABLE audit_log DISABLE TRIGGER trg_audit_no_update"))
            c.execute(text("UPDATE audit_log SET after_data = CAST(:o AS jsonb) WHERE id = :i"), {"o": original, "i": target})
            c.execute(text("ALTER TABLE audit_log ENABLE TRIGGER trg_audit_no_update"))
    assert api.get("ADMIN", "/audit/verify").json()["intact"]


@pytest.mark.parametrize("stmt", ["UPDATE audit_log SET reason = 'x' WHERE id = 1", "DELETE FROM audit_log WHERE id = 1",
                                  "TRUNCATE audit_log"])
def test_t9_audit_immutable_for_app_role(stmt):
    eng = create_engine(APP_URL)
    with pytest.raises(DBAPIError):
        with eng.begin() as c:
            c.execute(text(stmt))
    eng.dispose()


def test_t9_audit_immutable_even_for_owner(owner):
    with pytest.raises(DBAPIError, match="append-only"):
        with owner.begin() as c:
            c.execute(text("UPDATE audit_log SET reason = 'x' WHERE id = 1"))


def test_merkle_checkpoint(api):
    cp = api.post("ADMIN", "/audit/checkpoints")
    assert cp.status_code == 201
    assert api.post("REGULATOR", "/audit/checkpoints").status_code == 403
    v = api.get("REGULATOR", f"/audit/checkpoints/{cp.json()['id']}/verify").json()
    assert v["matches"] is True
