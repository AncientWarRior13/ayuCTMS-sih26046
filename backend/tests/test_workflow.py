"""T5, T6, T12 and study/participant workflow rules."""
from datetime import date, timedelta

from sqlalchemy import text


def _enrol_body(site_id=1, **kw):
    return {"site_id": site_id, "sex": "F", "age_years": 34, "name": "Test Person", "contact": "+91-9000000000",
            "consent_document_id": 1, "witness_name": "Nurse", "comprehension_answers": [0, 1, 1], **kw}


def test_t5_lifecycle_guard(api):
    s = api.get("PI", "/studies/2").json()
    assert s["state"] == "EC_APPROVED" and s["next_state"] == "CTRI_REGISTERED"
    assert s["next_state_blockers"]
    r = api.post("PI", "/studies/2/transition", json={"target_state": "CTRI_REGISTERED"})
    assert r.status_code == 409 and "CTRI" in r.json()["detail"]
    r = api.post("PI", "/studies/2/transition", json={"target_state": "ENROLLING"})
    assert r.status_code == 409  # cannot skip states


def test_t5_enrol_blocked_outside_enrolling(api):
    r = api.post("COORDINATOR", "/studies/2/participants", json=_enrol_body())
    assert r.status_code == 409 and "ENROLLING" in r.json()["detail"]


def test_t5_full_lifecycle_new_study(api):
    body = {"protocol_no": "AIIA/TEST/100", "title": "Lifecycle test study", "type": "INTERVENTIONAL",
            "target_sample": 10, "site_ids": [1], "planned_start": str(date.today()),
            "planned_end": str(date.today() + timedelta(days=100))}
    s = api.post("PI", "/studies", json=body)
    assert s.status_code == 201
    sid = s.json()["id"]
    assert api.post("PI", f"/studies/{sid}/transition", json={"target_state": "PROTOCOL_APPROVED"}).status_code == 200
    assert api.post("PI", f"/studies/{sid}/transition", json={"target_state": "EC_APPROVED"}).status_code == 403
    assert api.post("IEC", f"/studies/{sid}/transition", json={"target_state": "EC_APPROVED"}).status_code == 409
    api.post("IEC", f"/studies/{sid}/ethics-approvals", json={
        "committee_name": "IEC", "approved_on": str(date.today()), "valid_to": str(date.today() + timedelta(days=365))})
    assert api.post("IEC", f"/studies/{sid}/transition", json={"target_state": "EC_APPROVED"}).status_code == 200
    assert api("PUT", "PI", f"/studies/{sid}/ctri", json={"ctri_number": "bad", "registered_on": str(date.today())}
               ).status_code == 422
    assert api("PUT", "PI", f"/studies/{sid}/ctri", json={"ctri_number": "CTRI/2026/09/000001",
                                                        "registered_on": str(date.today())}).status_code == 200
    for st in ["CTRI_REGISTERED", "SITE_ACTIVE", "ENROLLING"]:
        r = api.post("PI", f"/studies/{sid}/transition", json={"target_state": st})
        assert r.status_code == 200, r.text
    # another PI cannot act on this study
    assert api.post("PI2", f"/studies/{sid}/transition", json={"target_state": "FOLLOW_UP"}).status_code == 403


def test_t6_prospective_ctri_rule(api):
    first = api.get("PI", "/studies/1/participants").json()
    earliest = min(p["enrolled_on"] for p in first)
    late = str(date.fromisoformat(earliest) + timedelta(days=5))
    r = api("PUT", "PI", "/studies/1/ctri", json={"ctri_number": "CTRI/2025/04/067321", "registered_on": late})
    assert r.status_code == 409 and "prospective" in r.json()["detail"]


def test_t12_consent_required_and_withdrawal_blocks_crf(api, owner):
    r = api.post("COORDINATOR", "/studies/1/participants", json=_enrol_body(consent_document_id=None))
    assert r.status_code == 409 and "consent" in r.json()["detail"].lower()
    r = api.post("COORDINATOR", "/studies/1/participants", json=_enrol_body(age_years=16))
    assert r.status_code == 409 and "guardian" in r.json()["detail"]
    r = api.post("COORDINATOR", "/studies/1/participants", json=_enrol_body(site_id=2))
    assert r.status_code == 403
    r = api.post("COORDINATOR", "/studies/1/participants", json=_enrol_body())
    assert r.status_code == 201, r.text
    p = r.json()
    assert p["arm"] in ("Ashwagandha", "Placebo") and p["subject_code"].startswith("AIIA-001-")
    # new participants must also sign the amended consent before data entry
    with owner.connect() as c:
        doc2 = c.execute(text("SELECT consent_document_id FROM protocol_amendments WHERE study_id = 1")).scalar()
    visits = api.get("COORDINATOR", f"/participants/{p['id']}/visits").json()
    tpl = api.get("COORDINATOR", "/studies/1/crf-templates").json()[0]["id"]
    crf = {"template_id": tpl, "data": {"weight_kg": 60, "prakriti": "Vata", "agni": "Sama"}}
    r = api.post("COORDINATOR", f"/visits/{visits[0]['id']}/crf", json=crf)
    assert r.status_code == 409 and "Re-consent" in r.json()["detail"]
    assert api.post("COORDINATOR", f"/participants/{p['id']}/consent",
                    json={"consent_document_id": doc2}).status_code == 201
    assert api.post("COORDINATOR", f"/visits/{visits[0]['id']}/crf", json=crf).status_code == 201
    # edits require reason for change; invalid values rejected
    assert api.post("COORDINATOR", f"/visits/{visits[0]['id']}/crf", json=crf).status_code == 422
    bad = {**crf, "data": {**crf["data"], "agni": "Hot"}, "reason_for_change": "typo"}
    assert api.post("COORDINATOR", f"/visits/{visits[0]['id']}/crf", json=bad).status_code == 422
    assert api.post("COORDINATOR", f"/visits/{visits[0]['id']}/crf",
                    json={**crf, "reason_for_change": "Transcription error"}).status_code == 201
    # withdrawal blocks new data
    assert api.post("COORDINATOR", f"/participants/{p['id']}/withdraw", json={"reason": "Moved away"}).status_code == 200
    r = api.post("COORDINATOR", f"/visits/{visits[1]['id']}/crf", json=crf)
    assert r.status_code == 409 and "withdrawn" in r.json()["detail"].lower()


def test_deviation_and_query_workflow(api):
    d = api.post("MONITOR", "/studies/1/deviations", json={"category": "Visit window", "severity": "MINOR",
                                                           "description": "Visit 3 days late"})
    assert d.status_code == 201
    assert api.post("COORDINATOR", f"/deviations/{d.json()['id']}/signoff", json={"capa": "x"}).status_code == 403
    assert api.post("MONITOR", f"/deviations/{d.json()['id']}/signoff", json={"capa": "Retrained"}).status_code == 200
    q = api.post("MONITOR", "/studies/1/queries", json={"text": "Please confirm weight"})
    assert q.status_code == 201
    qid = q.json()["id"]
    assert api.post("COORDINATOR", f"/queries/{qid}/answer", json={"answer": "Confirmed"}).json()["status"] == "ANSWERED"
    assert api.post("MONITOR", f"/queries/{qid}/close").json()["status"] == "CLOSED"
    assert api.post("COORDINATOR", f"/queries/{qid}/answer", json={"answer": "late"}).status_code == 409


def test_pii_access_is_purpose_logged(api, owner):
    pid = api.get("COORDINATOR", "/studies/1/participants").json()[0]["id"]
    assert api.get("COORDINATOR", f"/participants/{pid}/pii").status_code == 422  # purpose required
    r = api.get("COORDINATOR", f"/participants/{pid}/pii", params={"purpose": "Visit reminder call"})
    assert r.status_code == 200 and r.json()["name"]
    assert api.get("MONITOR", f"/participants/{pid}/pii", params={"purpose": "x" * 5}).status_code == 403
    with owner.connect() as c:
        row = c.execute(text("SELECT reason FROM audit_log WHERE action = 'READ_PII' ORDER BY id DESC LIMIT 1")).scalar()
    assert row == "Visit reminder call"
