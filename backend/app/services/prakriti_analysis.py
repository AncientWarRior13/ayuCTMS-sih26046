"""Prakriti-stratified outcome analysis.

The CRF already captures Prakriti (constitutional type) as a first-class field, but nothing in a
standard CTMS ever looks at it again after data entry. This cross-tabulates adverse-event rate
and primary-outcome change by Prakriti group - exactly the question Ayurveda research actually
wants answered ("does a Vata-predominant participant have a different safety/efficacy profile on
this formulation?") and a genuine link between the Ayurveda-specific CRF fields and the
analytics layer that off-the-shelf CTMS products have no way to make.

Small-n strata (fewer than 5 participants) are still returned but flagged, since disproportionate
weight on a tiny group is misleading rather than informative.
"""
from sqlalchemy.engine import Connection

from .common import rows


def by_prakriti(conn: Connection, study_id: int | None = None) -> list[dict]:
    scope = "AND p.study_id = :s" if study_id else ""
    params = {"s": study_id} if study_id else {}
    data = rows(conn, f"""
        WITH baseline AS (
          SELECT DISTINCT ON (v.participant_id) v.participant_id,
                 e.data->>'prakriti' AS prakriti, (e.data->>'primary_score')::numeric AS baseline_score
          FROM crf_entries e JOIN visits v ON v.id = e.visit_id
          WHERE v.visit_name = 'Baseline' AND e.data ? 'prakriti'
          ORDER BY v.participant_id, e.entered_at DESC
        ),
        latest AS (
          SELECT DISTINCT ON (v.participant_id) v.participant_id,
                 (e.data->>'primary_score')::numeric AS latest_score
          FROM crf_entries e JOIN visits v ON v.id = e.visit_id
          WHERE v.visit_name <> 'Baseline' AND e.data ? 'primary_score'
          ORDER BY v.participant_id, e.entered_at DESC
        ),
        ae AS (
          SELECT participant_id, count(*) AS ae_count, count(*) FILTER (WHERE is_serious) AS sae_count
          FROM adverse_events GROUP BY participant_id
        )
        SELECT b.prakriti, count(DISTINCT b.participant_id) AS n,
               round(avg(l.latest_score - b.baseline_score), 2) AS avg_score_change,
               round(avg(COALESCE(a.ae_count, 0)), 2) AS avg_ae_per_participant,
               sum(COALESCE(a.sae_count, 0)) AS sae_total,
               sum(COALESCE(a.ae_count, 0)) AS ae_total
        FROM baseline b
        JOIN participants p ON p.id = b.participant_id
        LEFT JOIN latest l ON l.participant_id = b.participant_id
        LEFT JOIN ae a ON a.participant_id = b.participant_id
        WHERE b.prakriti IS NOT NULL {scope}
        GROUP BY b.prakriti ORDER BY b.prakriti""", params)
    for r in data:
        r["low_n"] = r["n"] < 5
    return data
