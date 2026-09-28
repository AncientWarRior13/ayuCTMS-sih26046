"""Generate reproducible synthetic trial activity: participants, consent, visits, CRFs, deviations,
queries, adverse events with regulatory clocks, monitoring visits and a re-consent amendment."""
import json
import random
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import text

from _common import SEED, provenance, seed_audit
from app.core.security import encrypt_pii, sha256_hex
from app.routers.participants import DEFAULT_SCHEDULE, block_arm
from seed_from_synthea import profiles

FIRST = ["Aarav", "Vivaan", "Aditya", "Ishaan", "Rohan", "Kabir", "Arnav", "Dev", "Rahul", "Karan", "Ananya", "Diya",
         "Saanvi", "Aadhya", "Kiara", "Meera", "Riya", "Pooja", "Sneha", "Lakshmi", "Fatima", "Zoya", "Harpreet",
         "Gurleen", "Joseph", "Maria", "Suresh", "Ramesh", "Deepa", "Nandini"]
LAST = ["Sharma", "Verma", "Gupta", "Reddy", "Nair", "Iyer", "Patel", "Shah", "Singh", "Khan", "Das", "Bose",
        "Joshi", "Kulkarni", "Menon", "Pillai", "Rao", "Mishra", "Chauhan", "Fernandes"]
PRAKRITI = ["Vata", "Pitta", "Kapha", "Vata-Pitta", "Pitta-Kapha", "Vata-Kapha"]
AE_TERMS = [("Headache", "AYU-DEMO-002"), ("Nausea", "AYU-DEMO-004"), ("Dyspepsia", "AYU-DEMO-009"),
            ("Somnolence", None), ("Dizziness", "AYU-DEMO-003"), ("Rash", "AYU-DEMO-016"), ("Diarrhoea", "AYU-DEMO-006"),
            ("Fatigue", "AYU-DEMO-018"), ("Pruritus", "AYU-DEMO-014"), ("Abdominal pain upper", None)]


def _ins(conn, sql, **p):
    return conn.execute(text(sql + " RETURNING id"), p).scalar()


def run(conn, ctx: dict) -> None:
    rnd = random.Random(SEED)
    today = date.today()
    now = datetime.now(timezone.utc)
    users = ctx["users"]
    synth = profiles()
    counts = dict(participants=0, visits=0, crf=0, deviations=0, queries=0, aes=0)

    for s in ctx["studies"]:
        n = int(s["participants"])
        if n == 0:
            continue
        closed = s["state"] == "CLOSED"
        span = 150 if not closed else 200
        pids = []
        for i in range(1, n + 1):
            prof = synth[(i - 1) % len(synth)] if synth else {"age": rnd.randint(22, 68), "sex": rnd.choice("MF")}
            site = s["sites"][(i - 1) % len(s["sites"])]
            enrolled = s["start"] + timedelta(days=int(span * (i / n) ** 1.1)) if not closed else \
                s["start"] + timedelta(days=rnd.randint(0, span))
            enrolled = min(enrolled, today)
            arms = [a for a in (s["arms"].split("|") if s["arms"] else []) if a]
            arm = block_arm(arms, s["id"], i) if arms else None
            status = "COMPLETED" if closed else ("RANDOMIZED" if arm else "ENROLLED")
            pid = _ins(conn, """INSERT INTO participants (study_id, site_id, subject_code, status, arm, enrolled_on, sex, age_years)
                       VALUES (:s, :si, :c, :st, :a, :e, :sex, :age)""",
                       s=s["id"], si=site, c=f"AIIA-{s['id']:03d}-{i:04d}", st=status, a=arm, e=enrolled,
                       sex=prof["sex"], age=prof["age"])
            conn.execute(text("INSERT INTO participant_pii VALUES (:p, :n, :c)"),
                         {"p": pid, "n": encrypt_pii(f"{rnd.choice(FIRST)} {rnd.choice(LAST)}"),
                          "c": encrypt_pii(f"+91-9{rnd.randint(100000000, 999999999)}")})
            conn.execute(text("INSERT INTO consents (participant_id, consent_document_id, consented_at, witness_name)"
                              " VALUES (:p, :d, :t, :w)"),
                         {"p": pid, "d": s["consent_doc"], "t": datetime.combine(enrolled, time(10, 0), timezone.utc),
                          "w": f"{rnd.choice(FIRST)} {rnd.choice(LAST)}"})
            for vname, off in DEFAULT_SCHEDULE:
                planned = enrolled + timedelta(days=off)
                status_v, actual = "PLANNED", None
                if planned < today - timedelta(days=3) or closed:
                    roll = rnd.random()
                    if roll < 0.06 and not closed:
                        status_v = "MISSED"
                    elif roll < 0.12:
                        status_v, actual = "OUT_OF_WINDOW", planned + timedelta(days=rnd.randint(5, 9))
                    else:
                        status_v, actual = "DONE", planned + timedelta(days=rnd.randint(-2, 2))
                vid = _ins(conn, "INSERT INTO visits (participant_id, visit_name, planned_date, actual_date, status)"
                                 " VALUES (:p, :n, :d, :a, :s)", p=pid, n=vname, d=planned, a=actual, s=status_v)
                counts["visits"] += 1
                if actual and vname in ("Baseline", "Week 12"):
                    base = 40 + rnd.randint(0, 25)
                    data = {"weight_kg": round(rnd.uniform(48, 92), 1), "bp_systolic": rnd.randint(106, 148),
                            "bp_diastolic": rnd.randint(68, 94), "prakriti": rnd.choice(PRAKRITI),
                            "vikriti": rnd.choice(["Vata", "Pitta", "Kapha"]),
                            "agni": rnd.choice(["Sama", "Vishama", "Tikshna", "Manda"]),
                            "koshtha": rnd.choice(["Mridu", "Madhyama", "Krura"]),
                            "primary_score": base if vname == "Baseline" else max(0, base - rnd.randint(-3, 18))}
                    _ins(conn, "INSERT INTO crf_entries (visit_id, template_id, data, entered_by, entered_at) VALUES"
                               " (:v, :t, CAST(:d AS jsonb), :u, :at)", v=vid, t=s["template"], d=json.dumps(data),
                         u=users["coord@demo.test"], at=datetime.combine(actual, time(11, 0), timezone.utc))
                    counts["crf"] += 1
            pids.append((pid, site, enrolled))
        counts["participants"] += n

        if closed:
            for _ in range(3):
                pid, _site, enr = rnd.choice(pids)
                term, ayu = rnd.choice(AE_TERMS)
                onset = enr + timedelta(days=rnd.randint(5, 60))
                _ins(conn, """INSERT INTO adverse_events (study_id, participant_id, onset_date, awareness_at, description,
                           severity, is_serious, causality, outcome, suspect_intervention, meddra_pt, ayush_morbidity_code,
                           reported_by, created_at) VALUES (:s, :p, :o, :aw, :d, 'MILD', FALSE, 'UNLIKELY', 'RECOVERED',
                           :si, :pt, :ayu, :u, :aw)""", s=s["id"], p=pid, o=onset,
                     aw=datetime.combine(onset, time(9, 0), timezone.utc), d=term, si=s["intervention"], pt=term, ayu=ayu,
                     u=users["pi@demo.test"])
                counts["aes"] += 1
            continue

        # withdrawals
        for pid, _site, _enr in rnd.sample(pids, 3):
            conn.execute(text("UPDATE participants SET status = 'WITHDRAWN' WHERE id = :p"), {"p": pid})
            conn.execute(text("UPDATE consents SET withdrawn_at = now() - interval '10 days', withdrawal_reason ="
                              " 'Personal reasons' WHERE participant_id = :p"), {"p": pid})
            conn.execute(text("UPDATE visits SET status = 'MISSED' WHERE participant_id = :p AND status = 'PLANNED'"
                              " AND planned_date < current_date"), {"p": pid})

        # deviations
        dev_specs = [("Visit window", "MINOR"), ("Visit window", "MINOR"), ("Dosing error", "MAJOR"),
                     ("Eligibility", "MAJOR"), ("Consent process", "CRITICAL"), ("Lab sample handling", "MINOR"),
                     ("Concomitant medication", "MAJOR"), ("Data recording", "MINOR")]
        for k, (cat, sev) in enumerate(dev_specs):
            pid, site, enr = rnd.choice(pids)
            opened = now - timedelta(days=rnd.randint(3, 90))
            closed_at = opened + timedelta(days=rnd.randint(2, 10)) if k % 3 == 0 else None
            _ins(conn, """INSERT INTO deviations (study_id, participant_id, category, severity, description, capa, reported_by,
                       monitor_signoff_by, opened_at, closed_at) VALUES (:s, :p, :c, :sev, :d, :capa, :u, :m, :o, :cl)""",
                 s=s["id"], p=pid, c=cat, sev=sev, d=f"{cat} deviation observed during routine review",
                 capa="Site retraining completed" if closed_at else None, u=users["coord@demo.test"],
                 m=users["monitor@demo.test"] if closed_at else None, o=opened, cl=closed_at)
            counts["deviations"] += 1

        # queries
        crfs = conn.execute(text("""SELECT e.id, v.participant_id FROM crf_entries e JOIN visits v ON v.id = e.visit_id
                                    JOIN participants p ON p.id = v.participant_id WHERE p.study_id = :s ORDER BY e.id"""),
                            {"s": s["id"]}).all()
        q_texts = ["Weight differs >10% from screening; please confirm", "Prakriti assessment missing assessor initials",
                   "BP recorded outside plausible range for this subject", "Primary score not consistent with source notes",
                   "Agni assessment date precedes consent time", "Please confirm concomitant medication start date"]
        for k in range(10):
            e = rnd.choice(crfs)
            opened = now - timedelta(days=[2, 5, 9, 16, 21, 30, 4, 18, 1, 26][k])
            st = ["OPEN", "OPEN", "ANSWERED", "OPEN", "CLOSED", "OPEN", "ANSWERED", "OPEN", "OPEN", "CLOSED"][k]
            _ins(conn, """INSERT INTO queries (crf_entry_id, study_id, participant_id, raised_by, text, answer, answered_by,
                       status, opened_at, closed_at) VALUES (:e, :s, :p, :u, :t, :a, :ab, :st, :o, :c)""",
                 e=e.id, s=s["id"], p=e.participant_id, u=users["monitor@demo.test"], t=q_texts[k % len(q_texts)],
                 a="Verified against source document" if st != "OPEN" else None,
                 ab=users["coord@demo.test"] if st != "OPEN" else None, st=st, o=opened,
                 c=opened + timedelta(days=3) if st == "CLOSED" else None)
            counts["queries"] += 1

        # adverse events: 17 non-serious (Headache x4 to surface a signal) + 3 serious
        rules = conn.execute(text("SELECT id, hours_allowed FROM regulatory_rules WHERE applies_to = 'SAE'")).all()
        terms = ["Headache"] * 4 + [t for t, _ in AE_TERMS[1:]] + ["Nausea", "Dyspepsia", "Somnolence", "Rash"]
        for term in terms[:17]:
            pid, site, enr = rnd.choice(pids)
            onset = min(enr + timedelta(days=rnd.randint(2, 60)), today - timedelta(days=1))
            aw = datetime.combine(onset, time(rnd.randint(8, 18), 0), timezone.utc)
            ayu = dict(AE_TERMS).get(term)
            _ins(conn, """INSERT INTO adverse_events (study_id, participant_id, onset_date, awareness_at, description, severity,
                       is_serious, causality, naranjo_score, outcome, action_taken, suspect_intervention, meddra_pt,
                       ayush_morbidity_code, reported_by, created_at) VALUES (:s, :p, :o, :aw, :d, :sev, FALSE, :c, :n, :out,
                       'DOSE NOT CHANGED', :si, :pt, :ayu, :u, :aw)""",
                 s=s["id"], p=pid, o=onset, aw=aw, d=term, sev=rnd.choice(["MILD", "MILD", "MODERATE"]),
                 c=rnd.choice(["POSSIBLE", "UNLIKELY", "PROBABLE", None]), n=rnd.choice([2, 3, 4, None]),
                 out=rnd.choice(["RECOVERED", "RECOVERING"]), si=s["intervention"], pt=term, ayu=ayu,
                 u=users["coord@demo.test"])
            counts["aes"] += 1

        sae_specs = [  # (description, meddra, hours since awareness, completed?)
            ("Raised liver enzymes with jaundice requiring hospitalisation", "Hepatic enzyme increased", 20.4, False),
            ("Syncope with fall; admitted for observation", "Syncope", 30.0, False),
            ("Severe allergic reaction with urticaria; ER visit and admission", "Hypersensitivity", 72.0, True),
        ]
        for desc, pt, hours, done in sae_specs:
            pid, site, enr = rnd.choice(pids)
            aw = now - timedelta(hours=hours)
            aid = _ins(conn, """INSERT INTO adverse_events (study_id, participant_id, onset_date, awareness_at, description,
                       severity, is_serious, seriousness_criteria, causality, outcome, action_taken, suspect_intervention,
                       concomitant_meds, meddra_pt, reported_by, created_at) VALUES (:s, :p, :o, :aw, :d, 'SEVERE', TRUE,
                       ARRAY['hospitalisation'], :c, :out, 'DRUG INTERRUPTED', :si, 'Paracetamol 500 mg SOS', :pt,
                       :u, :aw)""", s=s["id"], p=pid, o=aw.date(), aw=aw, d=desc,
                       c="PROBABLE" if done else None, out="RECOVERING" if done else "NOT_RECOVERED",
                       si=s["intervention"], pt=pt, u=users["pi@demo.test"])
            for rid, hrs in rules:
                due = aw + timedelta(hours=hrs)
                if done and hrs <= 24:
                    conn.execute(text("""INSERT INTO ae_clocks (adverse_event_id, rule_id, started_at, due_at, status,
                                 completed_at, last_alert_pct) VALUES (:a, :r, :s, :d, 'COMPLETED', :c, 80)"""),
                                 {"a": aid, "r": rid, "s": aw, "d": due, "c": aw + timedelta(hours=18)})
                else:
                    conn.execute(text("INSERT INTO ae_clocks (adverse_event_id, rule_id, started_at, due_at) VALUES"
                                      " (:a, :r, :s, :d)"), {"a": aid, "r": rid, "s": aw, "d": due})
            counts["aes"] += 1

        # monitoring visits: SITE-03 deliberately overdue
        for k, site in enumerate(s["sites"]):
            conn.execute(text("INSERT INTO monitoring_visits (study_id, site_id, visit_date, monitor_id, findings)"
                              " VALUES (:s, :si, :d, :m, :f)"),
                         {"s": s["id"], "si": site, "d": today - timedelta(days=[21, 45, 120][k % 3]),
                          "m": users["monitor@demo.test"], "f": "Source data verification on 20% sample"})

        # protocol amendment requiring re-consent; most participants already re-consented
        doc2 = _ins(conn, "INSERT INTO consent_documents (study_id, version, language, content_hash, effective_from)"
                          " VALUES (:s, '1.1', 'en', :h, :e)", s=s["id"],
                    h=sha256_hex(f"Informed consent v1.1 for {s['protocol_no']} (added liver function monitoring)"),
                    e=today - timedelta(days=20))
        _ins(conn, """INSERT INTO protocol_amendments (study_id, version, summary, approved_on, requires_reconsent,
                   consent_document_id, created_by) VALUES (:s, 'Amendment 1', :sm, :a, TRUE, :d, :u)""",
             s=s["id"], sm="Added liver function tests at Week 4 and Week 8 following hepatic safety review",
             a=today - timedelta(days=20), d=doc2, u=users["iec@demo.test"])
        active = [p for p in pids if p[2] < today - timedelta(days=2)]
        for pid, _site, _enr in active[:-4]:
            conn.execute(text("""INSERT INTO consents (participant_id, consent_document_id, consented_at, witness_name)
                         SELECT :p, :d, now() - interval '5 days', 'Site nurse' FROM participants
                         WHERE id = :p AND status <> 'WITHDRAWN'"""), {"p": pid, "d": doc2})

    for table, n in counts.items():
        seed_audit(conn, table, n, "generated (seed 26046)" + (" + Synthea baselines" if synth and table == "participants" else ""))
    provenance(conn, "participants", "Synthea synthetic patients" if synth else "Generated",
               "https://synthea.mitre.org/downloads" if synth else None,
               "Synthetic data only", "Age/sex only; all direct identifiers discarded. Names are fake and encrypted.")
    for table in ["visits", "crf_entries", "deviations", "queries", "adverse_events", "ae_clocks", "monitoring_visits",
                  "consents", "protocol_amendments"]:
        provenance(conn, table, "Generated", None, "n/a", f"gen_trial_events.py, random seed {SEED}")
    print("Generated:", counts)
