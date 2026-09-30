"""CDISC Analysis Data Model (ADaM) dataset generation.
Produces standard submission-ready ADSL (Subject-Level Analysis) and ADAE (Adverse Event Analysis) datasets
with CDISC-conforming controlled terminology and Ayush domain extensions (PRAKRITI, AGNITYPE)."""

import csv
import io
from collections import defaultdict
from sqlalchemy.engine import Connection
from .common import rows, study_or_404

ADSL_COLS = [
    "STUDYID", "USUBJID", "SUBJID", "SITEID", "AGE", "AGEU", "SEX", "RACE", "ETHNIC",
    "ARM", "ACTARM", "TRTSDT", "TRTEDT", "SAFFL", "ITTFL", "PPROTFL",
    "PRAKRITI", "AGNITYPE", "KOSHTHA"
]

ADAE_COLS = [
    "STUDYID", "USUBJID", "AESEQ", "AETERM", "AEDECOD", "AEBODSYS", "AESTDTC", "AEENDTC",
    "ASTDT", "AENDT", "AESEV", "AETOXGR", "AESER", "AEREL", "AEOUT", "TRTEMFL"
]

AEREL_MAP = {
    "CERTAIN": "RELATED", "PROBABLE": "RELATED", "POSSIBLE": "POSSIBLY RELATED",
    "UNLIKELY": "UNLIKELY RELATED", "CONDITIONAL": "POSSIBLY RELATED",
    "UNASSESSABLE": "NOT ASSESSABLE", "UNRELATED": "NOT RELATED", None: "NOT RELATED"
}

SEV_TO_TOXGR = {
    "MILD": 1,
    "MODERATE": 2,
    "SEVERE": 3,
}


def adsl_rows(conn: Connection, study_id: int) -> list[dict]:
    s = study_or_404(conn, study_id)
    out = []
    q = """
        SELECT p.*, si.code AS site_code,
               ap.prakriti, ap.agni, ap.koshtha
        FROM participants p
        JOIN sites si ON si.id = p.site_id
        LEFT JOIN (
            SELECT DISTINCT ON (participant_id) participant_id, prakriti, agni, koshtha
            FROM ayurvedic_phenotypes
            ORDER BY participant_id, version DESC
        ) ap ON ap.participant_id = p.id
        WHERE p.study_id = :s AND p.enrolled_on IS NOT NULL
        ORDER BY p.subject_code
    """
    for p in rows(conn, q, {"s": study_id}):
        usubjid = f"{s['protocol_no']}-{p['subject_code']}"
        arm = p["arm"] or "UNASSIGNED"
        saffl = "Y" if p["status"] in ("ENROLLED", "RANDOMIZED", "COMPLETED") else "N"
        ittfl = "Y" if p["status"] in ("RANDOMIZED", "COMPLETED") else "N"
        pprotfl = "Y" if p["status"] == "COMPLETED" else "N"

        trtsdt = p["enrolled_on"].isoformat() if p["enrolled_on"] else ""
        trtedt = ""  # Could be derived from completed visits if needed

        out.append({
            "STUDYID": s["protocol_no"],
            "USUBJID": usubjid,
            "SUBJID": p["subject_code"],
            "SITEID": p["site_code"],
            "AGE": p["age_years"],
            "AGEU": "YEARS",
            "SEX": p["sex"] or "U",
            "RACE": "ASIAN",
            "ETHNIC": "NOT HISPANIC OR LATINO",
            "ARM": arm,
            "ACTARM": arm,
            "TRTSDT": trtsdt,
            "TRTEDT": trtedt,
            "SAFFL": saffl,
            "ITTFL": ittfl,
            "PPROTFL": pprotfl,
            "PRAKRITI": p["prakriti"] or "UNKNOWN",
            "AGNITYPE": p["agni"] or "UNKNOWN",
            "KOSHTHA": p["koshtha"] or "UNKNOWN",
        })
    return out


def adae_rows(conn: Connection, study_id: int) -> list[dict]:
    s = study_or_404(conn, study_id)
    seq: dict[str, int] = defaultdict(int)
    out = []
    q = """
        SELECT a.*, p.subject_code, p.enrolled_on, m.soc
        FROM adverse_events a
        JOIN participants p ON p.id = a.participant_id
        LEFT JOIN lookup_meddra_stub m ON m.pt_name = a.meddra_pt
        WHERE a.study_id = :s
        ORDER BY p.subject_code, a.onset_date, a.id
    """
    for a in rows(conn, q, {"s": study_id}):
        seq[a["subject_code"]] += 1
        usubjid = f"{s['protocol_no']}-{a['subject_code']}"
        onset_iso = a["onset_date"].isoformat()
        
        # Treatment-emergent flag: onset after or on enrolment date
        trtemfl = "Y" if (a["enrolled_on"] and a["onset_date"] >= a["enrolled_on"]) else "N"

        out.append({
            "STUDYID": s["protocol_no"],
            "USUBJID": usubjid,
            "AESEQ": seq[a["subject_code"]],
            "AETERM": a["description"],
            "AEDECOD": a["meddra_pt"] or "UNCODED",
            "AEBODSYS": a["soc"] or "INVESTIGATIONS",
            "AESTDTC": onset_iso,
            "AEENDTC": "",
            "ASTDT": onset_iso,
            "AENDT": "",
            "AESEV": a["severity"],
            "AETOXGR": SEV_TO_TOXGR.get(a["severity"], 1),
            "AESER": "Y" if a["is_serious"] else "N",
            "AEREL": AEREL_MAP.get(a["causality"], "NOT RELATED"),
            "AEOUT": a["outcome"] or "UNKNOWN",
            "TRTEMFL": trtemfl
        })
    return out


def to_csv(dataset: str, conn: Connection, study_id: int) -> str:
    ds = dataset.upper()
    if ds == "ADSL":
        data, cols = adsl_rows(conn, study_id), ADSL_COLS
    elif ds == "ADAE":
        data, cols = adae_rows(conn, study_id), ADAE_COLS
    else:
        raise ValueError(f"Unknown ADaM dataset: {dataset}. Expected ADSL or ADAE.")

    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=cols, lineterminator="\n")
    w.writeheader()
    w.writerows(data)
    return buf.getvalue()
