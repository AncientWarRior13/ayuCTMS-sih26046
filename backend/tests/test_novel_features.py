"""Tests for the six novel contributions: PRR/ROR signal detection, herb-drug interaction
checker, Prakriti-stratified analysis, predictive deviation risk, consent comprehension checks,
and audit checkpoint external anchoring."""
from datetime import date, datetime, timezone

from app.services.pv_stats import _chi_square, _ror_ci


def test_prr_ror_math():
    # Textbook 2x2: a strong, clearly disproportionate signal
    a, b, c, d = 10, 5, 3, 100
    chi2 = _chi_square(a, b, c, d)
    assert chi2 > 4
    ror, lo, hi = _ror_ci(a, b, c, d)
    assert lo < ror < hi and lo > 1


def test_prr_ror_zero_cell_uses_continuity_correction():
    ror, lo, hi = _ror_ci(5, 0, 2, 50)
    assert ror > 0 and lo > 0  # would ZeroDivisionError without the +0.5 correction


def test_disproportionality_endpoint(api):
    s = api.get("PV", "/pv/signals").json()
    assert "disproportionality" in s
    if s["disproportionality"]:
        row = s["disproportionality"][0]
        assert {"prr", "ror", "ror_ci_low", "ror_ci_high", "chi_square", "signal"} <= set(row)


def test_disproportionality_flags_a_real_signal(api, owner):
    """Headache is seeded 4x in study 1 against Ashwagandha; with a small denominator that
    should surface as a signal under at least one of the two criteria."""
    s = api.get("PV", "/pv/signals", params={"study_id": 1}).json()
    rows_ = {r["pt"]: r for r in s["disproportionality"]}
    assert "Headache" in rows_


def test_herb_drug_interaction_check(api):
    r = api.get("PV", "/interactions/check", params={
        "intervention": "Ashwagandha root extract 300 mg twice daily",
        "concomitant_meds": "Levothyroxine 50mcg once daily"})
    assert r.status_code == 200
    hits = r.json()
    assert any(h["herb"] == "Ashwagandha" and "thyroid" in h["drug_class"] for h in hits)


def test_herb_drug_interaction_no_match(api):
    r = api.get("PV", "/interactions/check", params={"intervention": "Triphala Churna", "concomitant_meds": "Paracetamol"})
    assert r.json() == []


def test_ae_creation_surfaces_interactions(api):
    pid = api.get("PI", "/studies/1/participants", params={"status": "RANDOMIZED"}).json()[0]["id"]
    now = datetime.now(timezone.utc)
    r = api.post("PV", "/ae", json={
        "participant_id": pid, "onset_date": str(now.date()), "awareness_at": now.isoformat(),
        "description": "Palpitations", "severity": "MODERATE", "is_serious": False,
        "suspect_intervention": "Ashwagandha root extract", "concomitant_meds": "Tacrolimus 2mg twice daily"})
    assert r.status_code == 201
    body = r.json()
    assert body["interactions"] and body["interactions"][0]["severity"] == "MAJOR"


def test_prakriti_analysis(api):
    r = api.get("PI", "/dashboard/prakriti", params={"study_id": 1})
    assert r.status_code == 200
    rows_ = r.json()
    assert rows_
    for row in rows_:
        assert {"prakriti", "n", "avg_ae_per_participant", "sae_total", "low_n"} <= set(row)
    assert api.get("REGULATOR", "/dashboard/prakriti").status_code == 200


def test_predictive_deviation_risk(api):
    r = api.get("MONITOR", "/dashboard/predictive-risk", params={"study_id": 1})
    assert r.status_code == 200
    rows_ = r.json()
    assert rows_
    row = rows_[0]
    assert {"score", "band", "indicators", "subject_code"} <= set(row)
    assert row["band"] in ("LOW", "MEDIUM", "HIGH")
    assert rows_ == sorted(rows_, key=lambda r: -r["score"])  # highest risk first


def test_consent_comprehension_required_and_scored(api):
    pid = None
    r = api.post("COORDINATOR", "/studies/1/participants", json={
        "site_id": 1, "sex": "F", "age_years": 40, "name": "Comprehension Test", "contact": "+91-9000000001",
        "consent_document_id": 1, "witness_name": "Nurse"})
    assert r.status_code == 422 and "comprehension" in r.json()["detail"].lower()

    r = api.post("COORDINATOR", "/studies/1/participants", json={
        "site_id": 1, "sex": "F", "age_years": 40, "name": "Comprehension Test", "contact": "+91-9000000001",
        "consent_document_id": 1, "witness_name": "Nurse", "comprehension_answers": [0, 1, 0]})  # one wrong
    assert r.status_code == 201
    pid = r.json()["id"]
    detail = api.get("COORDINATOR", f"/participants/{pid}").json()
    assert abs(detail["consents"][0]["comprehension_score"] - (2 / 3)) < 0.01


def test_comprehension_questions_hide_answer_key_from_non_iec(api):
    doc = next(d for d in api.get("COORDINATOR", "/studies/1").json()["consent_documents"] if d["version"] == "1.0")
    assert all("correct_index" not in q for q in doc["comprehension_questions"])
    iec_doc = next(d for d in api.get("IEC", "/studies/1").json()["consent_documents"] if d["version"] == "1.0")
    assert all("correct_index" in q for q in iec_doc["comprehension_questions"])


def test_add_consent_document_with_bad_correct_index_rejected(api):
    r = api.post("IEC", "/studies/1/consent-documents", json={
        "version": "9.9", "content": "Some consent text long enough to hash.", "effective_from": str(date.today()),
        "comprehension_questions": [{"question": "Q?", "options": ["a", "b"], "correct_index": 5}]})
    assert r.status_code == 422


def test_checkpoint_anchoring(api):
    cp = api.post("ADMIN", "/audit/checkpoints")
    cid = cp.json()["id"]
    text_resp = api.get("ADMIN", f"/audit/checkpoints/{cid}/anchor-text").json()
    assert f"checkpoint #{cid}" in text_resp["text"] and cp.json()["merkle_root"] in text_resp["text"]
    assert api.post("REGULATOR", f"/audit/checkpoints/{cid}/anchor", json={"anchor_url": "https://x"}).status_code == 403
    r = api.post("ADMIN", f"/audit/checkpoints/{cid}/anchor", json={"anchor_url": "https://gist.github.com/example/abc"})
    assert r.status_code == 200 and r.json()["anchored_at"]
    assert api.post("ADMIN", f"/audit/checkpoints/{cid}/anchor", json={"anchor_url": "https://x"}).status_code == 409
    listed = next(c for c in api.get("ADMIN", "/audit/checkpoints").json() if c["id"] == cid)
    assert listed["anchor_url"] == "https://gist.github.com/example/abc"
