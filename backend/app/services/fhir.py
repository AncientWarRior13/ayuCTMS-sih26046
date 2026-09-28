"""FHIR export/import. Resources are validated with the fhir.resources R4B models (FHIR 4.3,
backward compatible with R4 for ResearchStudy, ResearchSubject, Patient and AdverseEvent)."""
import uuid
from datetime import date, datetime, timezone

from fastapi import HTTPException
from fhir.resources.R4B.adverseevent import AdverseEvent
from fhir.resources.R4B.patient import Patient
from fhir.resources.R4B.researchstudy import ResearchStudy
from fhir.resources.R4B.researchsubject import ResearchSubject
from sqlalchemy.engine import Connection

from .common import rows, study_or_404

NS = "https://aiia.gov.in/fhir/ayuctms"
EXT = f"{NS}/StructureDefinition"

STUDY_STATUS = {
    "DRAFT": "in-review", "PROTOCOL_APPROVED": "in-review", "EC_APPROVED": "approved",
    "CTRI_REGISTERED": "approved", "SITE_ACTIVE": "approved", "ENROLLING": "active",
    "FOLLOW_UP": "closed-to-accrual", "CLOSED": "completed",
}
SUBJECT_STATUS = {
    "SCREENED": "screening", "ENROLLED": "on-study", "RANDOMIZED": "on-study-intervention",
    "COMPLETED": "off-study", "WITHDRAWN": "withdrawn", "SCREEN_FAILED": "ineligible",
}
GENDER = {"M": "male", "F": "female", "U": "unknown"}
SEVERITY = {"MILD": "mild", "MODERATE": "moderate", "SEVERE": "severe"}
OUTCOME = {
    "RECOVERED": "resolved", "RECOVERING": "recovering", "NOT_RECOVERED": "ongoing",
    "RECOVERED_WITH_SEQUELAE": "resolvedWithSequelae", "FATAL": "fatal", "UNKNOWN": "unknown",
}
CAUSALITY_SYS = "http://terminology.hl7.org/CodeSystem/adverse-event-causality-assess"


def _validated(model, data: dict) -> dict:
    return model.model_validate(data).model_dump(mode="json", exclude_none=True)


def _entry(resource: dict) -> dict:
    return {"fullUrl": f"urn:uuid:{uuid.uuid4()}", "resource": resource}


def patient_resource(pid: str, sex: str | None, age: int | None) -> dict:
    data = {"resourceType": "Patient", "id": pid,
            "identifier": [{"system": f"{NS}/subject", "value": pid}],
            "gender": GENDER.get(sex or "U", "unknown")}
    if age is not None:
        data["extension"] = [{"url": f"{EXT}/age-at-enrolment",
                              "valueQuantity": {"value": age, "unit": "a", "system": "http://unitsofmeasure.org", "code": "a"}}]
    return _validated(Patient, data)


def _safe_id(s: str) -> str:
    return "".join(ch if ch.isalnum() or ch in "-." else "-" for ch in s)[:64]


def study_bundle(conn: Connection, study_id: int, safety_only: bool = False) -> dict:
    s = study_or_404(conn, study_id)
    ctri = rows(conn, "SELECT ctri_number FROM ctri_registrations WHERE study_id = :s", {"s": study_id})
    pi = rows(conn, "SELECT full_name FROM users WHERE id = :u", {"u": s["pi_user_id"]})
    sites = rows(conn, "SELECT si.code, si.name FROM study_sites ss JOIN sites si ON si.id = ss.site_id WHERE ss.study_id = :s",
                 {"s": study_id})
    rs_id = _safe_id(f"study-{s['protocol_no']}")
    identifiers = [{"system": f"{NS}/protocol", "value": s["protocol_no"]}]
    if ctri:
        identifiers.append({"system": "https://ctri.nic.in", "value": ctri[0]["ctri_number"]})
    rs = {
        "resourceType": "ResearchStudy", "id": rs_id, "identifier": identifiers, "title": s["title"],
        "status": STUDY_STATUS[s["state"]],
        "primaryPurposeType": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/research-study-prim-purp-type",
                                           "code": "treatment"}]},
        "category": [{"text": s["type"].title()}],
        "enrollment": [{"display": f"Target sample {s['target_sample']}"}],
        "site": [{"display": f"{x['code']} {x['name']}"} for x in sites],
    }
    if s.get("phase"):
        rs["phase"] = {"text": s["phase"]}
    if s.get("intervention"):
        rs["arm"] = [{"name": a, "description": s["intervention"] if i == 0 else "Comparator"}
                     for i, a in enumerate(s["arms"] or [])]
    if pi:
        rs["principalInvestigator"] = {"display": pi[0]["full_name"]}
    entries = [_entry(_validated(ResearchStudy, rs))]

    parts = rows(conn, "SELECT * FROM participants WHERE study_id = :s ORDER BY id", {"s": study_id})
    for p in parts:
        pid = _safe_id(p["subject_code"])
        if not safety_only:
            entries.append(_entry(patient_resource(pid, p["sex"], p["age_years"])))
            subj = {"resourceType": "ResearchSubject", "id": f"rsub-{pid}",
                    "identifier": [{"system": f"{NS}/subject", "value": p["subject_code"]}],
                    "status": SUBJECT_STATUS[p["status"]],
                    "study": {"reference": f"ResearchStudy/{rs_id}"},
                    "individual": {"reference": f"Patient/{pid}"}}
            if p["arm"]:
                subj["assignedArm"] = p["arm"]
                subj["actualArm"] = p["arm"]
            entries.append(_entry(_validated(ResearchSubject, subj)))

    for a in rows(conn, "SELECT a.*, p.subject_code FROM adverse_events a JOIN participants p ON p.id = a.participant_id"
                        " WHERE a.study_id = :s ORDER BY a.id", {"s": study_id}):
        ae = {
            "resourceType": "AdverseEvent", "id": f"ae-{a['id']}", "actuality": "actual",
            "subject": {"reference": f"Patient/{_safe_id(a['subject_code'])}"},
            "study": [{"reference": f"ResearchStudy/{rs_id}"}],
            "event": {"text": a["description"],
                      **({"coding": [{"system": "https://www.meddra.org", "display": a["meddra_pt"]}]} if a["meddra_pt"] else {})},
            "date": a["onset_date"].isoformat(),
            "recordedDate": a["created_at"].isoformat(),
            "seriousness": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/adverse-event-seriousness",
                                        "code": "serious" if a["is_serious"] else "non-serious"}]},
            "severity": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/adverse-event-severity",
                                     "code": SEVERITY[a["severity"]]}]},
            "outcome": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/adverse-event-outcome",
                                    "code": OUTCOME[a["outcome"] or "UNKNOWN"]}]},
        }
        if a["suspect_intervention"]:
            se = {"instance": {"display": a["suspect_intervention"]}}
            if a["causality"]:
                se["causality"] = [{"assessment": {"text": f"WHO-UMC: {a['causality']}"},
                                    "method": {"coding": [{"system": CAUSALITY_SYS, "code": "Bayesian"}],
                                               "text": f"WHO-UMC; Naranjo score {a['naranjo_score']}"
                                               if a["naranjo_score"] is not None else "WHO-UMC"}}]
            ae["suspectEntity"] = [se]
        ext = []
        if a["ayush_morbidity_code"]:
            ext.append({"url": f"{EXT}/ayush-morbidity-code", "valueString": a["ayush_morbidity_code"]})
        if a["icd11_code"]:
            ext.append({"url": f"{EXT}/icd11-code", "valueString": a["icd11_code"]})
        if ext:
            ae["extension"] = ext
        entries.append(_entry(_validated(AdverseEvent, ae)))

    return {"resourceType": "Bundle", "id": str(uuid.uuid4()), "type": "collection",
            "timestamp": datetime.now(timezone.utc).isoformat(), "entry": entries}


def deidentify_import(bundle: dict) -> dict:
    """Accept a Patient bundle (e.g. Synthea), strip direct identifiers and return a pseudonymised
    R4 bundle. Nothing identifying is stored."""
    if bundle.get("resourceType") != "Bundle":
        raise HTTPException(422, "Expected a FHIR Bundle")
    out, skipped = [], 0
    today = date.today()
    for e in bundle.get("entry") or []:
        res = e.get("resource") or {}
        if res.get("resourceType") != "Patient":
            skipped += 1
            continue
        try:
            Patient.model_validate(res)
        except Exception as ex:
            raise HTTPException(422, f"Invalid Patient resource: {str(ex)[:300]}")
        age = None
        if res.get("birthDate"):
            b = date.fromisoformat(res["birthDate"][:10])
            age = today.year - b.year - ((today.month, today.day) < (b.month, b.day))
        sex = {"male": "M", "female": "F"}.get(res.get("gender", ""), "U")
        pseudo = f"IMP-{uuid.uuid4().hex[:10].upper()}"
        out.append(_entry(patient_resource(pseudo, sex, age)))
    return {"accepted": len(out), "skipped_non_patient": skipped,
            "bundle": {"resourceType": "Bundle", "type": "collection", "entry": out}}
