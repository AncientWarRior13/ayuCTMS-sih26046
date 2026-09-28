"""SAE report drafts for regulator/ethics submission (JSON and printable PDF)."""
import io
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy.engine import Connection

from .alerts import clock_pct
from .common import get_or_404, rows


def sae_report(conn: Connection, aid: int) -> dict:
    a = get_or_404(conn, """
        SELECT a.*, p.subject_code, p.sex, p.age_years, p.arm, s.protocol_no, s.title, si.code AS site_code,
               c.ctri_number, u.full_name AS reporter
        FROM adverse_events a JOIN participants p ON p.id = a.participant_id JOIN studies s ON s.id = a.study_id
        JOIN sites si ON si.id = p.site_id LEFT JOIN ctri_registrations c ON c.study_id = s.id
        LEFT JOIN users u ON u.id = a.reported_by WHERE a.id = :id""", {"id": aid}, "Adverse event")
    clocks = rows(conn, "SELECT c.*, r.rule_key, r.description, r.source_note FROM ae_clocks c"
                        " JOIN regulatory_rules r ON r.id = c.rule_id WHERE c.adverse_event_id = :id ORDER BY c.due_at",
                  {"id": aid})
    for c in clocks:
        c["pct_elapsed"] = 100.0 if c["status"] == "COMPLETED" else clock_pct(c["started_at"], c["due_at"])
    return {
        "report_type": "SAE" if a["is_serious"] else "AE",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "draft": True,
        "study": {"protocol_no": a["protocol_no"], "title": a["title"], "ctri_number": a["ctri_number"]},
        "subject": {"subject_code": a["subject_code"], "sex": a["sex"], "age_years": a["age_years"],
                    "arm": a["arm"], "site": a["site_code"]},
        "event": {k: a[k] for k in ["id", "description", "onset_date", "awareness_at", "severity", "is_serious",
                                    "seriousness_criteria", "outcome", "action_taken", "suspect_intervention",
                                    "concomitant_meds", "meddra_pt", "who_drug_code", "ayush_morbidity_code",
                                    "icd11_code", "causality", "naranjo_score"]},
        "reporter": a["reporter"],
        "clocks": [{k: c[k] for k in ["rule_key", "description", "started_at", "due_at", "status", "completed_at",
                                      "pct_elapsed", "source_note"]} for c in clocks],
    }


def _fmt(v) -> str:
    if v is None:
        return "-"
    if isinstance(v, list):
        return ", ".join(map(str, v)) or "-"
    if isinstance(v, datetime):
        return v.strftime("%Y-%m-%d %H:%M UTC")
    return str(v)


def sae_pdf(report: dict) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=16 * mm,
                            bottomMargin=16 * mm, title=f"{report['report_type']} report draft")
    st = getSampleStyleSheet()
    body = st["BodyText"]

    def table(pairs):
        t = Table([[Paragraph(f"<b>{k}</b>", body), Paragraph(_fmt(v), body)] for k, v in pairs],
                  colWidths=[55 * mm, 119 * mm])
        t.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
                               ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#eef6f3")),
                               ("VALIGN", (0, 0), (-1, -1), "TOP")]))
        return t

    ev, sj, sd = report["event"], report["subject"], report["study"]
    story = [
        Paragraph(f"{report['report_type']} Report - DRAFT for submission", st["Title"]),
        Paragraph(f"Generated {report['generated_at'][:19]} UTC. Subject identity is pseudonymised.", body),
        Spacer(1, 6 * mm), Paragraph("Study", st["Heading2"]),
        table([("Protocol", sd["protocol_no"]), ("Title", sd["title"]), ("CTRI number", sd["ctri_number"])]),
        Spacer(1, 4 * mm), Paragraph("Subject", st["Heading2"]),
        table([("Subject code", sj["subject_code"]), ("Sex / Age", f"{sj['sex']} / {sj['age_years']}"),
               ("Arm", sj["arm"]), ("Site", sj["site"])]),
        Spacer(1, 4 * mm), Paragraph("Event", st["Heading2"]),
        table([("Event ID", ev["id"]), ("Description", ev["description"]), ("Onset date", ev["onset_date"]),
               ("Awareness", ev["awareness_at"]), ("Severity", ev["severity"]), ("Serious", ev["is_serious"]),
               ("Seriousness criteria", ev["seriousness_criteria"]), ("Outcome", ev["outcome"]),
               ("Action taken", ev["action_taken"]), ("Suspect intervention", ev["suspect_intervention"]),
               ("Concomitant medicines", ev["concomitant_meds"]), ("MedDRA PT (stub)", ev["meddra_pt"]),
               ("Ayush morbidity code", ev["ayush_morbidity_code"]), ("ICD-11", ev["icd11_code"]),
               ("Causality (WHO-UMC)", ev["causality"]), ("Naranjo score", ev["naranjo_score"])]),
        Spacer(1, 4 * mm), Paragraph("Regulatory clocks", st["Heading2"]),
    ]
    if report["clocks"]:
        data = [["Rule", "Due", "Status", "% elapsed"]] + [
            [c["rule_key"], _fmt(c["due_at"]), c["status"], f"{c['pct_elapsed']}"] for c in report["clocks"]]
        t = Table(data, colWidths=[70 * mm, 50 * mm, 28 * mm, 26 * mm])
        t.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
                               ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f766e")),
                               ("TEXTCOLOR", (0, 0), (-1, 0), colors.white)]))
        story.append(t)
    else:
        story.append(Paragraph("Non-serious event: no regulatory clock.", body))
    story += [Spacer(1, 6 * mm), Paragraph(f"Reported by: {_fmt(report['reporter'])}", body)]
    doc.build(story)
    return buf.getvalue()
