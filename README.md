# AyuCTMS — AIIA Clinical Trials Dashboard

A real-time, role-based Clinical Trial Management System for Ayurveda research, built for the
All India Institute of Ayurveda (Ministry of Ayush). It unifies trial operations — ethics
approval, CTRI registration, enrolment, protocol deviations — with National Pharmacovigilance
Coordination Centre (NPvCC) safety reporting, and exports standards-aligned data (HL7 FHIR R4,
CDISC SDTM).

All data shipped with this repository is **synthetic**. No real patient, trial or personnel data
is included anywhere in the codebase.

## What it does

- **Study lifecycle** — protocol, ethics approval, CTRI registration, site activation, enrolment,
  follow-up and close-out, with guarded transitions (e.g. a study cannot open enrolment without a
  valid ethics approval and a prospective CTRI registration).
- **Participants and visits** — pseudonymised subject IDs, block randomisation, a JSON-schema-driven
  CRF including Ayurveda-specific fields (Prakriti, Vikriti, Agni, Koshtha), protocol deviations,
  and data queries.
- **Pharmacovigilance** — AE/SAE capture with WHO-UMC causality and a Naranjo score helper,
  configurable regulatory reporting clocks with live countdowns and 50/80/100% escalation alerts,
  a signal-detection view, and printable SAE report drafts.
- **Audit trail** — every mutating action writes an append-only, SHA-256 hash-chained record.
  A verify endpoint recomputes the chain and reports the first broken row; Merkle checkpoints let
  the chain be anchored outside the database.
- **Interoperability** — FHIR R4 bundle export (validated against the HL7 FHIR resource models),
  a de-identifying FHIR import stub for HIS integration, and CDISC SDTM DM/AE CSV export against
  a loaded controlled-terminology table.
- **Access control** — seven roles (PI, Coordinator, Monitor, Ethics Committee, Pharmacovigilance
  Officer, Administrator, Regulator) with a single deny-by-default permission map, enforced both
  in the API and as PostgreSQL row-level security for site isolation. The Regulator role is
  read-only everywhere, by test.
- **Risk-based monitoring** — a study x site heatmap scored from deviation, query, visit and
  safety indicators, plus a **predictive per-participant risk score** from leading indicators
  (visit-window slippage, query pile-up, site workload) so monitoring can act before a deviation
  is logged, not just after.

### Differentiators beyond a standard CTMS

- **Disproportionality signal detection (PRR/ROR)** — the safety signals view compares each
  intervention x event pair against the rest of the database using the Proportional Reporting
  Ratio and Reporting Odds Ratio with a 95% CI and Evans-criteria thresholds, the same statistical
  approach real pharmacovigilance databases use — not a bare report-count trigger.
- **Herb-drug interaction checker** — a curated Ayurveda herb x allopathic drug-class reference
  table is matched live against the study intervention and a participant's concomitant
  medicines, surfacing severity, mechanism and a recommendation as the PV officer types, and
  again on the AE detail page. Standard pharmacovigilance tooling has no model of Ayurveda
  formulations at all.
- **Prakriti-stratified outcomes** — the Ayurveda-specific CRF fields (Prakriti, Vikriti, Agni)
  are cross-tabulated against adverse-event rate and primary-outcome change, connecting data the
  CRF already collects to the analytics layer, which off-the-shelf CTMS products have no way to do.
- **Consent comprehension checks** — a consent document can carry an optional short quiz
  administered alongside signing (ICH-GCP informed-consent practice), scored server-side against
  an answer key that is never sent to whoever administers it.
- **Audit checkpoint anchoring** — a Merkle checkpoint can be marked as published externally (a
  public gist, a timestamping service, an email to the Ethics Committee), so a later rewrite of
  history becomes detectable by anyone who kept a copy — including against a database
  administrator, which an unanchored checkpoint cannot protect against.

See [docs/](docs/) for the original requirements, architecture and standards-mapping notes, and
`docs/05-standards-compliance-mapping.md` for what is fully implemented versus what still needs a
citation against the primary regulatory text before it is relied on.

## Stack

React 19 + Vite + TypeScript + Tailwind + TanStack Query + Recharts · FastAPI (Python) +
SQLAlchemy + PostgreSQL 16 with row-level security · WebSocket for live alerts.

## Running it

```
cp .env.example .env        # edit the secrets
docker compose up -d --build
docker compose exec api python scripts/seed.py --reset
```

Open http://localhost:5173. Demo accounts (synthetic, all password `Demo@12345`):
`pi@demo.test`, `coord@demo.test`, `monitor@demo.test`, `iec@demo.test`, `pv@demo.test`,
`admin@demo.test`, `regulator@demo.test`.

### Running without Docker

```
# 1. PostgreSQL 16 reachable at $ADMIN_DATABASE_URL (superuser/owner) and $DATABASE_URL
#    (non-superuser ayuctms_app role — created by scripts/seed.py --reset)
cd backend
pip install -r requirements.txt
python scripts/seed.py --reset
uvicorn app.main:app --reload

cd ../frontend
npm install
npm run dev
```

### Tests

```
cd backend
TEST_ADMIN_DATABASE_URL=postgresql+psycopg://owner@localhost/ayuctms_test \
TEST_DATABASE_URL=postgresql+psycopg://ayuctms_app:...@localhost/ayuctms_test \
python -m pytest
```

The suite (`tests/`) covers the full test plan in `docs/06-setup-tests-demo.md`: RBAC across
every endpoint and role, site isolation via row-level security, the study lifecycle guards,
consent and re-consent, the audit hash chain including a simulated tamper, SAE clock creation and
escalation, FHIR/SDTM export correctness and PII protection, and dataset provenance.

## Repository layout

```
backend/    FastAPI app, PostgreSQL schema, seed/ingestion scripts, pytest suite
frontend/   React + Vite single-page app
data/raw/   Curated seed inputs (CDISC terminology subset, CTRI-style study metadata, stub
            coding dictionaries) — see docs/07-datasets-and-sources.md for provenance
docs/       Requirements, architecture, API spec, standards mapping, setup/test/demo notes
deploy/     Standalone nginx config for a non-Docker deployment
```

## Known gaps (see docs/05 and docs/06)

Regulatory clock durations are configuration with a placeholder source citation; MedDRA/WHODrug
are licensed and represented here by small stub tables; ABDM and Ayush Suraksha portal
integration are mapping notes, not live connections. These are flagged in the Compliance page
inside the app as well.
