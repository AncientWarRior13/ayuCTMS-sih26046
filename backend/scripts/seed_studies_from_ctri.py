"""Create sites, demo users and studies from curated CTRI-style metadata.
Only non-personal study fields are used; PIs, sites and contacts are fictional."""
import json
from datetime import date, timedelta

from sqlalchemy import text

from _common import owner_engine, provenance, read_csv, seed_audit
from app.core.security import hash_password, sha256_hex

DEMO_PASSWORD = "Demo@12345"

SITES = [("SITE-01", "AIIA Sarita Vihar Hospital", "New Delhi"),
         ("SITE-02", "Ayurveda Research Centre Jamnagar", "Jamnagar"),
         ("SITE-03", "AIIA Satellite Centre Goa", "Goa")]

USERS = [("pi@demo.test", "Dr. Meera Iyer", "PI", ["SITE-01", "SITE-02", "SITE-03"]),
         ("pi2@demo.test", "Dr. Arjun Menon", "PI", ["SITE-01"]),
         ("coord@demo.test", "Kavya Nair", "COORDINATOR", ["SITE-01"]),
         ("coord2@demo.test", "Rohit Patel", "COORDINATOR", ["SITE-02"]),
         ("monitor@demo.test", "Sanjay Kulkarni", "MONITOR", ["SITE-01", "SITE-02", "SITE-03"]),
         ("iec@demo.test", "Dr. Farah Siddiqui", "IEC", []),
         ("pv@demo.test", "Dr. Nikhil Rao", "PV", []),
         ("admin@demo.test", "Priya Sharma", "ADMIN", []),
         ("regulator@demo.test", "Inspector Anil Verma", "REGULATOR", [])]

COMPREHENSION_QUESTIONS = [
    {"question": "Can you stop taking part in the study at any time without giving a reason?",
     "options": ["Yes, at any time", "Only with the PI's written permission", "No, once enrolled you must complete it"],
     "correct_index": 0},
    {"question": "Will you be paid to take part in this study?",
     "options": ["Yes, a large payment is guaranteed", "No, this is not a paid study", "Only if you complete all visits"],
     "correct_index": 1},
    {"question": "If you have a side effect, who should you contact first?",
     "options": ["Wait until the next scheduled visit", "The study doctor or coordinator listed in the consent form",
                 "No one; side effects are expected and not reported"],
     "correct_index": 1},
]

CRF_SCHEMA = {
    "title": "Baseline and Ayurveda assessment",
    "type": "object",
    "required": ["weight_kg", "prakriti", "agni"],
    "properties": {
        "weight_kg": {"type": "number", "title": "Weight (kg)", "minimum": 20, "maximum": 250},
        "bp_systolic": {"type": "number", "title": "Systolic BP (mmHg)", "minimum": 60, "maximum": 250},
        "bp_diastolic": {"type": "number", "title": "Diastolic BP (mmHg)", "minimum": 30, "maximum": 150},
        "prakriti": {"type": "string", "title": "Prakriti (constitution)",
                     "enum": ["Vata", "Pitta", "Kapha", "Vata-Pitta", "Pitta-Kapha", "Vata-Kapha", "Sama"]},
        "vikriti": {"type": "string", "title": "Vikriti (current imbalance)", "enum": ["Vata", "Pitta", "Kapha"]},
        "agni": {"type": "string", "title": "Agni (digestive fire)", "enum": ["Sama", "Vishama", "Tikshna", "Manda"]},
        "koshtha": {"type": "string", "title": "Koshtha (bowel nature)", "enum": ["Mridu", "Madhyama", "Krura"]},
        "primary_score": {"type": "number", "title": "Primary outcome score", "minimum": 0, "maximum": 100},
        "notes": {"type": "string", "title": "Clinical notes"},
    },
}


def run(conn) -> dict:
    today = date.today()
    site_ids = {}
    for code, name, city in SITES:
        site_ids[code] = conn.execute(text("INSERT INTO sites (code, name, city) VALUES (:c, :n, :ci) RETURNING id"),
                                      {"c": code, "n": name, "ci": city}).scalar()
    pw = hash_password(DEMO_PASSWORD)
    user_ids = {}
    for email, name, role, sites in USERS:
        uid = conn.execute(text("INSERT INTO users (email, full_name, role, password_hash) VALUES (:e, :n, :r, :p)"
                                " RETURNING id"), {"e": email, "n": name, "r": role, "p": pw}).scalar()
        user_ids[email] = uid
        for s in sites:
            conn.execute(text("INSERT INTO user_sites VALUES (:u, :s)"), {"u": uid, "s": site_ids[s]})
    seed_audit(conn, "sites", len(SITES), "fictional")
    seed_audit(conn, "users", len(USERS), "fictional demo accounts")

    studies = []
    for r in read_csv("ctri_curated.csv"):
        start = today + timedelta(days=int(r["start_offset_days"]))
        sid = conn.execute(text("""INSERT INTO studies (protocol_no, title, type, phase, intervention, arms, state,
                   pi_user_id, target_sample, planned_start, planned_end, source_ctri_ref)
                   VALUES (:p, :t, :ty, :ph, :i, :arms, :st, :pi, :ts, :ps, :pe, NULL) RETURNING id"""),
                           {"p": r["protocol_no"], "t": r["title"], "ty": r["type"], "ph": r["phase"],
                            "i": r["intervention"], "arms": [a for a in r["arms"].split("|") if a] or [],
                            "st": r["state"], "pi": user_ids["pi@demo.test"], "ts": int(r["target_sample"]),
                            "ps": start, "pe": start + timedelta(days=int(r["duration_days"]))}).scalar()
        codes = r["site_codes"].split("|")
        for code in codes:
            conn.execute(text("INSERT INTO study_sites (study_id, site_id, activated_on, site_target) VALUES (:s, :si, :a, :t)"),
                         {"s": sid, "si": site_ids[code],
                          "a": start if r["state"] in ("ENROLLING", "FOLLOW_UP", "CLOSED") else None,
                          "t": int(r["target_sample"]) // len(codes)})
        approved = start - timedelta(days=60)
        valid_to = today + timedelta(days=int(r["ec_valid_days_from_today"]))
        conn.execute(text("""INSERT INTO ethics_approvals (study_id, committee_name, approval_ref, approved_on, valid_to,
                   continuing_review_due) VALUES (:s, :c, :ref, :a, :v, :cr)"""),
                     {"s": sid, "c": r["ec_committee"], "ref": f"IEC-{r['protocol_no'].replace('/', '-')}",
                      "a": min(approved, valid_to - timedelta(days=30)), "v": valid_to, "cr": valid_to - timedelta(days=30)})
        if r["ctri_number"]:
            reg = today + timedelta(days=int(r["ctri_offset_days"]))
            conn.execute(text("INSERT INTO ctri_registrations (study_id, ctri_number, registered_on, last_updated_on)"
                              " VALUES (:s, :n, :r, :u)"), {"s": sid, "n": r["ctri_number"], "r": reg, "u": reg})
        doc = conn.execute(text("""INSERT INTO consent_documents (study_id, version, language, content_hash,
                                effective_from, comprehension_questions)
                                VALUES (:s, '1.0', 'en', :h, :e, CAST(:q AS jsonb)) RETURNING id"""),
                           {"s": sid, "h": sha256_hex(f"Informed consent v1.0 for {r['protocol_no']}"),
                            "e": approved, "q": json.dumps(COMPREHENSION_QUESTIONS)}).scalar()
        conn.execute(text("INSERT INTO consent_documents (study_id, version, language, content_hash, effective_from)"
                          " VALUES (:s, '1.0', 'hi', :h, :e)"),
                     {"s": sid, "h": sha256_hex(f"Suchit sahmati v1.0 {r['protocol_no']}"), "e": approved})
        tpl = conn.execute(text("INSERT INTO crf_templates (study_id, form_name, json_schema) VALUES (:s, :n, CAST(:j AS jsonb))"
                                " RETURNING id"), {"s": sid, "n": CRF_SCHEMA["title"], "j": json.dumps(CRF_SCHEMA)}).scalar()
        for name, off in [("Protocol finalised", -90), ("EC approval", -60), ("CTRI registration", -10),
                          ("First participant in", 0), ("Last participant in", int(r["duration_days"]) - 90),
                          ("Database lock", int(r["duration_days"]) + 30)]:
            planned = start + timedelta(days=off)
            conn.execute(text("INSERT INTO study_milestones (study_id, name, planned_date, actual_date) VALUES (:s, :n, :p, :a)"),
                         {"s": sid, "n": name, "p": planned,
                          "a": planned if planned < today and r["state"] in ("ENROLLING", "CLOSED") else None})
        studies.append({**r, "id": sid, "start": start, "sites": [site_ids[c] for c in codes], "consent_doc": doc,
                        "template": tpl})
    seed_audit(conn, "studies", len(studies), "curated CTRI-style metadata (fictional)")
    provenance(conn, "studies", "Curated CTRI-style study metadata", "https://ctri.nic.in",
               "Public register; only non-personal design fields modelled, all values fictional",
               "Titles/designs typical of Ayurveda trials; CTRI numbers are fictional and do not refer to real records")
    provenance(conn, "users", "Generated", None, "n/a", "Fictional demo accounts")
    return {"sites": site_ids, "users": user_ids, "studies": studies}


if __name__ == "__main__":
    with owner_engine().begin() as c:
        print(run(c))
