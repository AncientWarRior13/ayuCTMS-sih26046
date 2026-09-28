"""Load CDISC controlled terminology subset and the stub coding dictionaries."""
from sqlalchemy import text

from _common import owner_engine, provenance, read_csv, seed_audit


def run(conn) -> None:
    ct = read_csv("cdisc_ct_subset.csv")
    for r in ct:
        conn.execute(text("INSERT INTO lookup_cdisc_ct (codelist, submission_value, preferred_term, cdisc_version)"
                          " VALUES (:codelist, :submission_value, :preferred_term, 'subset') ON CONFLICT DO NOTHING"), r)
    provenance(conn, "lookup_cdisc_ct", "CDISC Controlled Terminology (subset)", "https://library.cdisc.org",
               "CDISC CT is published by CDISC; confirm version against CDISC Library before submission use",
               "Only the code lists used by the DM/AE export")
    seed_audit(conn, "lookup_cdisc_ct", len(ct), "CDISC CT subset")

    meddra = read_csv("meddra_stub.csv")
    for r in meddra:
        conn.execute(text("INSERT INTO lookup_meddra_stub VALUES (:pt_code, :pt_name, :soc) ON CONFLICT DO NOTHING"), r)
    provenance(conn, "lookup_meddra_stub", "Stub preferred-term list", None,
               "MedDRA is licensed; codes here are placeholders (STUB-xxxx), not MedDRA codes",
               "Replace with licensed MedDRA via the institute")
    seed_audit(conn, "lookup_meddra_stub", len(meddra), "stub")

    ayush = read_csv("ayush_morbidity_stub.csv")
    for r in ayush:
        conn.execute(text("INSERT INTO lookup_ayush_morbidity VALUES (:code, :term, :system) ON CONFLICT DO NOTHING"), r)
    provenance(conn, "lookup_ayush_morbidity", "Stub Ayurveda morbidity terms", "https://namstp.ayush.gov.in",
               "Placeholder codes (AYU-DEMO-xxx); map to official National AYUSH Morbidity Codes",
               "Terms only; codes are not official")
    seed_audit(conn, "lookup_ayush_morbidity", len(ayush), "stub")

    interactions = read_csv("herb_drug_interactions.csv")
    for r in interactions:
        conn.execute(text("""INSERT INTO lookup_herb_drug_interaction
                     (herb, drug_class, drug_synonyms, severity, mechanism, recommendation, source_note)
                     VALUES (:herb, :drug_class, :synonyms, :severity, :mechanism, :recommendation, :source_note)"""),
                     {**r, "synonyms": r["drug_synonyms"].split("|")})
    provenance(conn, "lookup_herb_drug_interaction", "Curated herb-drug interaction reference (project addition)",
               None, "Not a licensed drug-interaction database; each row is marked [Verify] and must be"
                     " confirmed against current product literature before clinical use",
               "Curated for the herbs used in the seeded studies; decision-support aid, not a medical device")
    seed_audit(conn, "lookup_herb_drug_interaction", len(interactions), "curated, unverified [Verify]")


if __name__ == "__main__":
    with owner_engine().begin() as c:
        run(c)
