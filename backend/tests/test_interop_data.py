"""T13-T19: FHIR, SDTM, PII protection, performance, provenance, CT conformance, FHIR import."""
import csv
import io
import json
import time

from fhir.resources.R4B.adverseevent import AdverseEvent
from fhir.resources.R4B.patient import Patient
from fhir.resources.R4B.researchstudy import ResearchStudy
from fhir.resources.R4B.researchsubject import ResearchSubject
from sqlalchemy import text

from app.core.security import decrypt_pii

MODELS = {"Patient": Patient, "ResearchStudy": ResearchStudy, "ResearchSubject": ResearchSubject,
          "AdverseEvent": AdverseEvent}


def _names(owner) -> list[str]:
    with owner.connect() as c:
        return [decrypt_pii(r[0]) for r in c.execute(text("SELECT name_enc FROM participant_pii LIMIT 200"))]


def test_t13_fhir_bundle_valid_and_pseudonymised(api, owner):
    r = api.get("ADMIN", "/export/fhir/study/1")
    assert r.status_code == 200 and r.headers["content-type"].startswith("application/fhir+json")
    b = r.json()
    assert b["resourceType"] == "Bundle" and b["type"] == "collection"
    kinds = {}
    for e in b["entry"]:
        res = e["resource"]
        MODELS[res["resourceType"]].model_validate(res)
        kinds[res["resourceType"]] = kinds.get(res["resourceType"], 0) + 1
        if res["resourceType"] == "Patient":
            assert not {"name", "telecom", "address", "birthDate"} & set(res)
    assert set(kinds) == set(MODELS)
    body = r.text
    assert not any(n in body for n in _names(owner))


def test_t13_pv_gets_safety_only_bundle(api):
    b = api.get("PV", "/export/fhir/study/1").json()
    assert {e["resource"]["resourceType"] for e in b["entry"]} == {"ResearchStudy", "AdverseEvent"}
    assert api.get("COORDINATOR", "/export/fhir/study/1").status_code == 403
    assert api.get("PI2", "/export/fhir/study/1").status_code == 403


def test_t14_sdtm_dm_and_ae(api):
    dm = list(csv.DictReader(io.StringIO(api.get("REGULATOR", "/export/sdtm/study/1/DM").text)))
    assert list(dm[0]) == ["STUDYID", "DOMAIN", "USUBJID", "SUBJID", "SITEID", "AGE", "AGEU", "SEX", "ARM", "RFSTDTC"]
    assert len({r["USUBJID"] for r in dm}) == len(dm) >= 150
    ae = list(csv.DictReader(io.StringIO(api.get("PV", "/export/sdtm/study/1/AE").text)))
    assert list(ae[0])[:5] == ["STUDYID", "DOMAIN", "USUBJID", "AESEQ", "AETERM"]
    assert all(r["DOMAIN"] == "AE" and r["AESER"] in "YN" for r in ae)
    assert api.get("PV", "/export/sdtm/study/1/DM").status_code == 403  # PV: safety data only


def test_t15_pii_encrypted_and_absent_from_exports(api, owner):
    names = _names(owner)
    with owner.connect() as c:
        raw = c.execute(text("SELECT name_enc FROM participant_pii LIMIT 20")).all()
    assert all(names[i].encode() not in bytes(r[0]) for i, r in enumerate(raw))
    exports = api.get("ADMIN", "/export/sdtm/study/1/DM").text + api.get("ADMIN", "/export/sdtm/study/1/AE").text
    assert not any(n in exports for n in names)
    listing = json.dumps(api.get("PI", "/studies/1/participants").json())
    assert not any(n in listing for n in names)


def test_t16_portfolio_under_two_seconds(api):
    t = time.perf_counter()
    assert api.get("ADMIN", "/dashboard/portfolio").status_code == 200
    assert time.perf_counter() - t < 2.0


def test_t17_provenance_and_synthetic(owner):
    with owner.connect() as c:
        tables = {r[0] for r in c.execute(text("SELECT table_name FROM data_provenance"))}
        assert c.execute(text("SELECT count(*) FROM participants WHERE NOT is_synthetic")).scalar() == 0
    seeded = {"studies", "users", "participants", "visits", "crf_entries", "deviations", "queries", "adverse_events",
              "ae_clocks", "lookup_cdisc_ct", "lookup_meddra_stub", "lookup_ayush_morbidity", "consents"}
    assert seeded <= tables


def test_t18_cdisc_ct_conformance(api, owner):
    with owner.connect() as c:
        ct = {(a, b) for a, b in c.execute(text("SELECT codelist, submission_value FROM lookup_cdisc_ct"))}
    dm = csv.DictReader(io.StringIO(api.get("ADMIN", "/export/sdtm/study/1/DM").text))
    for r in dm:
        assert ("SEX", r["SEX"]) in ct and ("AGEU", r["AGEU"]) in ct
    for r in csv.DictReader(io.StringIO(api.get("ADMIN", "/export/sdtm/study/1/AE").text)):
        assert ("AESEV", r["AESEV"]) in ct and ("NY", r["AESER"]) in ct and ("OUT", r["AEOUT"]) in ct
        assert r["AEREL"] == "" or ("REL", r["AEREL"]) in ct


def test_t19_fhir_import_round_trip(api):
    synthea_like = {"resourceType": "Bundle", "type": "transaction", "entry": [
        {"resource": {"resourceType": "Patient", "id": "abc", "gender": "female", "birthDate": "1980-05-17",
                      "name": [{"family": "Smith", "given": ["Jane"]}], "telecom": [{"system": "phone", "value": "555-1234"}],
                      "address": [{"line": ["1 Main St"], "city": "Boston"}],
                      "identifier": [{"system": "http://hospital.smarthealthit.org", "value": "MRN-99"}]}},
        {"resource": {"resourceType": "Condition", "id": "c1", "subject": {"reference": "Patient/abc"}}}]}
    r = api.post("COORDINATOR", "/import/fhir", json=synthea_like)
    assert r.status_code == 202 and r.json()["accepted"] == 1 and r.json()["skipped_non_patient"] == 1
    out = r.json()["bundle"]
    p = out["entry"][0]["resource"]
    Patient.model_validate(p)
    text_out = json.dumps(out)
    for leaked in ["Smith", "Jane", "555-1234", "Main St", "MRN-99", "1980-05-17"]:
        assert leaked not in text_out
    assert p["gender"] == "female" and p["extension"][0]["valueQuantity"]["value"] >= 40
    assert api.post("COORDINATOR", "/import/fhir", json={"resourceType": "Patient"}).status_code == 422
