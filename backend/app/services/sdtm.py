"""SDTM DM and AE domain export (CSV), per the mapping in docs/05."""
import csv
import io
from collections import defaultdict

from fastapi import HTTPException
from sqlalchemy.engine import Connection

from .common import rows, study_or_404

DM_COLS = ["STUDYID", "DOMAIN", "USUBJID", "SUBJID", "SITEID", "AGE", "AGEU", "SEX", "ARM", "RFSTDTC"]
AE_COLS = ["STUDYID", "DOMAIN", "USUBJID", "AESEQ", "AETERM", "AEDECOD", "AESEV", "AESER", "AEREL", "AEOUT",
           "AESTDTC", "AEACN"]

# WHO-UMC causality -> CDISC AEREL-style terms
AEREL = {"CERTAIN": "RELATED", "PROBABLE": "RELATED", "POSSIBLE": "POSSIBLY RELATED",
         "UNLIKELY": "UNLIKELY RELATED", "CONDITIONAL": "POSSIBLY RELATED", "UNASSESSABLE": "",
         "UNRELATED": "NOT RELATED", None: ""}
AEOUT = {"RECOVERED": "RECOVERED/RESOLVED", "RECOVERING": "RECOVERING/RESOLVING",
         "NOT_RECOVERED": "NOT RECOVERED/NOT RESOLVED", "RECOVERED_WITH_SEQUELAE": "RECOVERED/RESOLVED WITH SEQUELAE",
         "FATAL": "FATAL", "UNKNOWN": "UNKNOWN", None: "UNKNOWN"}


def dm_rows(conn: Connection, study_id: int) -> list[dict]:
    s = study_or_404(conn, study_id)
    out = []
    for p in rows(conn, "SELECT p.*, si.code AS site_code FROM participants p JOIN sites si ON si.id = p.site_id"
                        " WHERE p.study_id = :s AND p.enrolled_on IS NOT NULL ORDER BY p.subject_code", {"s": study_id}):
        out.append({"STUDYID": s["protocol_no"], "DOMAIN": "DM", "USUBJID": f"{s['protocol_no']}-{p['subject_code']}",
                    "SUBJID": p["subject_code"], "SITEID": p["site_code"], "AGE": p["age_years"], "AGEU": "YEARS",
                    "SEX": p["sex"] or "U", "ARM": p["arm"] or "",
                    "RFSTDTC": p["enrolled_on"].isoformat() if p["enrolled_on"] else ""})
    return out


def ae_rows(conn: Connection, study_id: int) -> list[dict]:
    s = study_or_404(conn, study_id)
    seq: dict[str, int] = defaultdict(int)
    out = []
    for a in rows(conn, "SELECT a.*, p.subject_code FROM adverse_events a JOIN participants p ON p.id = a.participant_id"
                        " WHERE a.study_id = :s ORDER BY p.subject_code, a.onset_date, a.id", {"s": study_id}):
        seq[a["subject_code"]] += 1
        out.append({"STUDYID": s["protocol_no"], "DOMAIN": "AE", "USUBJID": f"{s['protocol_no']}-{a['subject_code']}",
                    "AESEQ": seq[a["subject_code"]], "AETERM": a["description"], "AEDECOD": a["meddra_pt"] or "",
                    "AESEV": a["severity"], "AESER": "Y" if a["is_serious"] else "N",
                    "AEREL": AEREL.get(a["causality"], ""), "AEOUT": AEOUT.get(a["outcome"], "UNKNOWN"),
                    "AESTDTC": a["onset_date"].isoformat(), "AEACN": a["action_taken"] or ""})
    return out


def to_csv(domain: str, conn: Connection, study_id: int) -> str:
    if domain == "DM":
        data, cols = dm_rows(conn, study_id), DM_COLS
    elif domain == "AE":
        data, cols = ae_rows(conn, study_id), AE_COLS
    else:
        raise HTTPException(422, "Domain must be DM or AE")
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=cols, lineterminator="\n")
    w.writeheader()
    w.writerows(data)
    return buf.getvalue()
