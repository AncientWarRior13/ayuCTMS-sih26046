"""T10-T11: SAE clocks, alerts at 50/80/100%, report submission, signals."""
from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from app.services.alerts import evaluate


def _sae(api, hours_ago: float, role="PI"):
    pid = api.get("PI", "/studies/1/participants", params={"status": "RANDOMIZED"}).json()[0]["id"]
    aware = datetime.now(timezone.utc) - timedelta(hours=hours_ago)
    return api.post(role, "/ae", json={
        "participant_id": pid, "onset_date": str(aware.date()), "awareness_at": aware.isoformat(),
        "description": "Acute hepatitis requiring admission", "severity": "SEVERE", "is_serious": True,
        "seriousness_criteria": ["hospitalisation"], "meddra_pt": "Hepatitis"})


def test_t10_clock_created_from_rules(api, owner):
    r = _sae(api, 0)
    assert r.status_code == 201, r.text
    ae = r.json()
    with owner.connect() as c:
        rules = {k: h for k, h in c.execute(text("SELECT id, hours_allowed FROM regulatory_rules"))}
    assert len(ae["clocks"]) == len(rules)
    for clock in ae["clocks"]:
        start = datetime.fromisoformat(clock["started_at"])
        due = datetime.fromisoformat(clock["due_at"])
        assert due - start == timedelta(hours=rules[clock["rule_id"]])


def test_t10_alert_levels(api, owner):
    ae = _sae(api, 20).json()  # 24h rules at ~83%
    evaluate()
    with owner.connect() as c:
        levels = {r[0] for r in c.execute(text(
            "SELECT a.level FROM alerts a JOIN ae_clocks k ON k.id = a.entity_id WHERE a.rule_type = 'SAE_CLOCK'"
            " AND k.adverse_event_id = :a"), {"a": ae["id"]})}
    assert levels == {"INFO", "WARN"}
    ae2 = _sae(api, 30).json()  # overdue
    evaluate()
    clocks = api.get("PV", f"/ae/{ae2['id']}/clocks").json()
    assert any(c["status"] == "OVERDUE" for c in clocks)
    alerts = api.get("PV", "/alerts").json()
    assert any(a["level"] == "CRITICAL" and f"SAE #{ae2['id']}" in a["message"] for a in alerts)
    evaluate()  # idempotent: dedup prevents repeats
    with owner.connect() as c:
        n = c.execute(text("SELECT count(*) FROM alerts WHERE dedup_key LIKE 'SAE_CLOCK:%'")).scalar()
    evaluate()
    with owner.connect() as c:
        assert c.execute(text("SELECT count(*) FROM alerts WHERE dedup_key LIKE 'SAE_CLOCK:%'")).scalar() == n


def test_t11_submit_report_completes_clock(api, owner):
    ae = _sae(api, 2).json()
    first = ae["clocks"][0]["id"]
    r = api.post("PV", f"/ae/{ae['id']}/submit-report", json={"clock_id": first, "reference": "SUGAM-123"})
    assert r.status_code == 200 and r.json()[0]["status"] == "COMPLETED" and r.json()[0]["on_time"]
    with owner.begin() as c:  # move time forward: clock is completed so no alert should fire
        c.execute(text("UPDATE ae_clocks SET started_at = started_at - interval '30 hours',"
                       " due_at = due_at - interval '30 hours' WHERE id = :i"), {"i": first})
    evaluate()
    with owner.connect() as c:
        assert c.execute(text("SELECT count(*) FROM alerts WHERE dedup_key LIKE :k"), {"k": f"SAE_CLOCK:{first}:%"}).scalar() == 0
    r = api.post("PV", f"/ae/{ae['id']}/submit-report", json={})
    assert r.status_code == 200 and all(c["status"] == "COMPLETED" for c in r.json())
    assert api.post("PV", f"/ae/{ae['id']}/submit-report", json={}).status_code == 409


def test_causality_and_report(api):
    ae = _sae(api, 1).json()
    assert api.post("PV", f"/ae/{ae['id']}/causality", json={"causality": "MAYBE", "reason": "x" * 5}).status_code == 422
    r = api.post("PV", f"/ae/{ae['id']}/causality", json={"causality": "PROBABLE", "naranjo_score": 6,
                                                         "reason": "Temporal relationship, positive dechallenge"})
    assert r.status_code == 200 and r.json()["causality"] == "PROBABLE"
    rep = api.get("REGULATOR", f"/ae/{ae['id']}/report").json()
    assert rep["report_type"] == "SAE" and rep["clocks"]
    pdf = api.get("PV", f"/ae/{ae['id']}/report", params={"format": "pdf"})
    assert pdf.status_code == 200 and pdf.content.startswith(b"%PDF")


def test_serious_needs_criteria(api):
    pid = api.get("PI", "/studies/1/participants", params={"status": "RANDOMIZED"}).json()[0]["id"]
    now = datetime.now(timezone.utc)
    r = api.post("PV", "/ae", json={"participant_id": pid, "onset_date": str(now.date()), "awareness_at": now.isoformat(),
                                    "description": "x" * 5, "severity": "SEVERE", "is_serious": True})
    assert r.status_code == 422


def test_signals_and_kpi_alerts(api):
    evaluate()
    s = api.get("PV", "/pv/signals").json()
    assert any(r["pt"] == "Headache" and r["flag"] for r in s["by_pt"])
    types = {a["rule_type"] for a in api.get("ADMIN", "/alerts").json()}
    assert {"EC_EXPIRY", "MONITORING_OVERDUE", "QUERY_AGEING", "RECONSENT_DUE", "SIGNAL", "SAE_CLOCK"} <= types
    iec_types = {a["rule_type"] for a in api.get("IEC", "/alerts").json()}
    assert "QUERY_AGEING" not in iec_types and "EC_EXPIRY" in iec_types
    a = api.get("IEC", "/alerts").json()[0]
    assert api.post("IEC", f"/alerts/{a['id']}/ack").status_code == 200
    assert api.post("IEC", f"/alerts/{a['id']}/ack").status_code == 409
