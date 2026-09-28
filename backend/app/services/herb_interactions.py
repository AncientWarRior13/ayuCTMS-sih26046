"""Curated herb-drug interaction checker.

Standard pharmacovigilance tooling has no concept of Ayurveda formulations, so interactions
between the study intervention and a participant's concomitant allopathic medicines are
invisible to it. This matches free-text concomitant medicines against a curated reference table
whenever an adverse event is logged, surfacing a warning the PV officer would otherwise have to
know from memory.

This is a decision-support aid over a small curated table, not a medical device; every match
carries its source note and must be read as an interaction to review, not an automated diagnosis.
"""
import re

from sqlalchemy.engine import Connection

from .common import rows


def _mentions(text: str, terms: list[str]) -> str | None:
    low = text.lower()
    for t in terms:
        if re.search(r"\b" + re.escape(t.lower()) + r"\b", low):
            return t
    return None


def check(conn: Connection, intervention: str | None, concomitant_meds: str | None) -> list[dict]:
    if not intervention or not concomitant_meds:
        return []
    candidates = rows(conn, "SELECT * FROM lookup_herb_drug_interaction")
    hits = []
    for r in candidates:
        if r["herb"].lower() not in intervention.lower():
            continue
        terms = [r["drug_class"], *r["drug_synonyms"]]
        matched = _mentions(concomitant_meds, terms)
        if matched:
            hits.append({
                "herb": r["herb"], "drug_class": r["drug_class"], "matched_term": matched,
                "severity": r["severity"], "mechanism": r["mechanism"],
                "recommendation": r["recommendation"], "source_note": r["source_note"],
            })
    hits.sort(key=lambda h: {"MAJOR": 0, "MODERATE": 1, "MINOR": 2}[h["severity"]])
    return hits
