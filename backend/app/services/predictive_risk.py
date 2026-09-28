"""Predictive protocol-deviation risk, per participant.

The existing risk heatmap (services used by /dashboard/risk) scores a study x site cell from
indicators that are mostly already-occurred events (deviations logged, SAEs reported). This
module scores individual participants from *leading* indicators - visit-window slippage
trending, query pile-up, and site/coordinator workload - so a monitor can act before a deviation
happens rather than after, which is the actual purpose of risk-based monitoring (ICH E6(R2)).

The score is a transparent weighted sum with documented, adjustable weights - not a trained
model - so it can be explained and defended to an auditor or judge, unlike a black-box classifier.
"""
from sqlalchemy.engine import Connection

from .common import rows

WEIGHTS = {"visit_slippage": 35, "query_burden": 30, "site_workload": 20, "recent_deviation": 15}


def participant_risk(conn: Connection, study_id: int | None = None) -> list[dict]:
    scope = "AND p.study_id = :s" if study_id else ""
    params = {"s": study_id} if study_id else {}
    data = rows(conn, f"""
        SELECT p.id, p.subject_code, p.study_id, s.protocol_no, p.site_id, si.code AS site_code,
          (SELECT count(*) FROM visits v WHERE v.participant_id = p.id AND v.status <> 'PLANNED') AS visits_due,
          (SELECT count(*) FROM visits v WHERE v.participant_id = p.id AND v.status IN ('MISSED', 'OUT_OF_WINDOW')) AS visits_bad,
          (SELECT count(*) FROM queries q WHERE q.participant_id = p.id AND q.status <> 'CLOSED') AS open_queries,
          (SELECT count(*) FROM queries q WHERE q.participant_id = p.id AND q.status <> 'CLOSED'
             AND q.opened_at < now() - interval '14 days') AS aged_queries,
          (SELECT count(*) FROM deviations d WHERE d.participant_id = p.id
             AND d.opened_at > now() - interval '30 days') AS recent_deviations,
          (SELECT count(*) FROM participants p2 WHERE p2.site_id = p.site_id AND p2.study_id = p.study_id
             AND p2.status IN ('ENROLLED', 'RANDOMIZED')) AS site_active_count
        FROM participants p JOIN studies s ON s.id = p.study_id JOIN sites si ON si.id = p.site_id
        WHERE p.status IN ('ENROLLED', 'RANDOMIZED') {scope}
        ORDER BY p.subject_code""", params)

    for r in data:
        slippage = (r["visits_bad"] / r["visits_due"]) if r["visits_due"] else 0.0
        query_burden = min(r["open_queries"] / 3, 1.0) * 0.6 + min(r["aged_queries"] / 2, 1.0) * 0.4
        workload = min(r["site_active_count"] / 40, 1.0)  # heuristic: >40 active participants/site is heavy load
        recent_dev = min(r["recent_deviations"] / 2, 1.0)
        indicators = {
            "visit_slippage": round(slippage * WEIGHTS["visit_slippage"], 1),
            "query_burden": round(query_burden * WEIGHTS["query_burden"], 1),
            "site_workload": round(workload * WEIGHTS["site_workload"], 1),
            "recent_deviation": round(recent_dev * WEIGHTS["recent_deviation"], 1),
        }
        r["indicators"] = indicators
        r["score"] = round(sum(indicators.values()))
        r["band"] = "HIGH" if r["score"] >= 50 else "MEDIUM" if r["score"] >= 25 else "LOW"
    data.sort(key=lambda r: -r["score"])
    return data
