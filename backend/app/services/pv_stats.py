"""Disproportionality analysis for signal detection: PRR (Proportional Reporting Ratio) and
ROR (Reporting Odds Ratio) with 95% confidence intervals, computed per (intervention, preferred
term) pair against the rest of the AE database as background comparator - the standard approach
used by real pharmacovigilance systems (e.g. VigiBase), rather than a bare report-count threshold.

For a 2x2 table of intervention (drug) x event (PT):
    a = reports of this event with this intervention
    b = reports of other events with this intervention
    c = reports of this event with other interventions
    d = reports of other events with other interventions

PRR = (a / (a+b)) / (c / (c+d))
ROR = (a*d) / (b*c)

Evans criteria (a common threshold in practice): flag a signal when a >= 3, PRR >= 2 and the
chi-square statistic >= 4 (roughly p < 0.05). We also report the ROR 95% CI and flag when its
lower bound exceeds 1, a second, complementary signal criterion.
"""
import math

from sqlalchemy.engine import Connection

from .common import rows


def _chi_square(a: int, b: int, c: int, d: int) -> float:
    n = a + b + c + d
    if n == 0 or (a + b) == 0 or (c + d) == 0 or (a + c) == 0 or (b + d) == 0:
        return 0.0
    num = n * (a * d - b * c) ** 2
    den = (a + b) * (c + d) * (a + c) * (b + d)
    return num / den if den else 0.0


def _ror_ci(a: int, b: int, c: int, d: int) -> tuple[float, float, float]:
    """Reporting Odds Ratio with a Haldane-Anscombe continuity correction (+0.5 to every cell)
    when any cell is zero, and a 95% CI via the standard log-ROR normal approximation."""
    if min(a, b, c, d) == 0:
        a, b, c, d = a + 0.5, b + 0.5, c + 0.5, d + 0.5
    ror = (a * d) / (b * c)
    se = math.sqrt(1 / a + 1 / b + 1 / c + 1 / d)
    lo = math.exp(math.log(ror) - 1.96 * se)
    hi = math.exp(math.log(ror) + 1.96 * se)
    return round(ror, 2), round(lo, 2), round(hi, 2)


def disproportionality(conn: Connection, study_id: int | None = None) -> list[dict]:
    scope = "a.study_id = :s AND " if study_id else ""
    params = {"s": study_id} if study_id else {}
    pairs = rows(conn, f"""
        SELECT COALESCE(a.suspect_intervention, 'Unspecified') AS intervention, a.meddra_pt AS pt, count(*) AS n
        FROM adverse_events a WHERE {scope} a.meddra_pt IS NOT NULL GROUP BY 1, 2""", params)
    if not pairs:
        return []
    drug_totals: dict[str, int] = {}
    pt_totals: dict[str, int] = {}
    grand = 0
    for r in pairs:
        drug_totals[r["intervention"]] = drug_totals.get(r["intervention"], 0) + r["n"]
        pt_totals[r["pt"]] = pt_totals.get(r["pt"], 0) + r["n"]
        grand += r["n"]

    out = []
    for r in pairs:
        a, drug_n, pt_n = r["n"], drug_totals[r["intervention"]], pt_totals[r["pt"]]
        b, c, d = drug_n - a, pt_n - a, grand - drug_n - pt_n + a
        if a < 2 or b < 0 or c < 0 or d < 0:
            continue
        prr = round((a / (a + b)) / (c / (c + d)), 2) if (a + b) and c and (c + d) else None
        chi2 = round(_chi_square(a, b, c, d), 2)
        ror, ror_lo, ror_hi = _ror_ci(a, b, c, d)
        signal_prr = bool(prr and prr >= 2 and chi2 >= 4 and a >= 3)
        signal_ror = ror_lo > 1 and a >= 3
        out.append({
            "intervention": r["intervention"], "pt": r["pt"], "a": a, "b": b, "c": c, "d": d,
            "prr": prr, "chi_square": chi2, "ror": ror, "ror_ci_low": ror_lo, "ror_ci_high": ror_hi,
            "signal": signal_prr or signal_ror, "criteria": {"prr_evans": signal_prr, "ror_ci": signal_ror},
        })
    out.sort(key=lambda x: (-x["signal"], -(x["prr"] or 0)))
    return out
