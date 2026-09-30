"""Single source of truth for role permissions. Deny by default."""

PI, COORD, MONITOR, IEC, PV, ADMIN, REG = "PI", "COORDINATOR", "MONITOR", "IEC", "PV", "ADMIN", "REGULATOR"
ALL = {PI, COORD, MONITOR, IEC, PV, ADMIN, REG}
ROLES = [PI, COORD, MONITOR, IEC, PV, ADMIN, REG]

PERMISSIONS: dict[str, set[str]] = {
    # studies
    "study.read": ALL,
    "study.create": {PI, ADMIN},
    "study.update": {PI, ADMIN},  # PI: own studies only
    "study.transition": {PI, IEC, ADMIN},  # IEC: EC_APPROVED only; PI: own
    "ethics.create": {IEC, ADMIN},
    "ctri.set": {PI, ADMIN},
    "milestone.read": ALL,
    "milestone.write": {PI, ADMIN},
    "monitoring.read": {PI, MONITOR, ADMIN, REG},
    "monitoring.write": {MONITOR},
    # participants
    "participant.read": {PI, COORD, MONITOR, PV, ADMIN, REG},
    "participant.create": {COORD},
    "participant.pii": {PI, COORD},
    "consent.write": {COORD},
    "visit.read": {PI, COORD, MONITOR, PV, ADMIN, REG},
    "visit.write": {COORD},
    "crf.write": {COORD},
    # deviations and queries
    "deviation.read": ALL,
    "deviation.create": {PI, COORD, MONITOR},
    "deviation.signoff": {MONITOR},
    "query.read": {PI, COORD, MONITOR, ADMIN, REG},
    "query.create": {MONITOR},
    "query.answer": {PI, COORD},
    "query.close": {MONITOR},
    # pharmacovigilance
    "ae.read": {PI, COORD, MONITOR, IEC, PV, ADMIN, REG},
    "ae.create": {PI, COORD, PV},
    "ae.causality": {PI, PV},
    "ae.submit": {PI, PV},
    "ae.report": {PI, IEC, PV, ADMIN, REG},
    "pv.signals": {PI, IEC, PV, ADMIN, REG},
    # dashboards and alerts
    "dashboard.read": ALL,
    "alert.read": ALL,
    "alert.ack": {PI, COORD, MONITOR, IEC, PV, ADMIN},
    # audit
    "audit.read": {ADMIN, REG},
    "audit.verify": {ADMIN, REG},
    "audit.checkpoint": {ADMIN},
    # ayurvedic phenotyping
    "phenotype.read": ALL,
    "phenotype.write": {PI, COORD, PV, ADMIN},
    # electronic signatures
    "signature.sign": {PI, COORD, MONITOR, IEC, PV, ADMIN},
    "signature.read": ALL,
    # interoperability
    "export.study": {PI, ADMIN, REG},  # PI: own studies
    "export.safety": {PI, PV, ADMIN, REG},
    "import.fhir": {COORD, ADMIN},
    # administration
    "admin.users": {ADMIN},
    "admin.sites": {ADMIN},
    "sites.read": ALL,
    "rules.read": {PI, IEC, PV, ADMIN, REG},
    "rules.write": {ADMIN},
    "kpi.read": ALL,
    "kpi.write": {ADMIN},
    "lookup.read": ALL,
}

# Roles that see every site; others are limited to their assigned sites.
GLOBAL_ROLES = {PI, IEC, PV, ADMIN, REG}


def allowed(role: str, perm: str) -> bool:
    return role in PERMISSIONS.get(perm, set())


def permissions_for(role: str) -> list[str]:
    return sorted(p for p, roles in PERMISSIONS.items() if role in roles)


assert all(REG not in roles for p, roles in PERMISSIONS.items() if not p.endswith((".read", ".verify", ".report", ".signals", ".study", ".safety"))), \
    "REGULATOR must never hold a write permission"
