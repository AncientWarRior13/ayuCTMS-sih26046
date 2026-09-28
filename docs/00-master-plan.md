# SIH26046 — AIIA Clinical Trials Dashboard (CTMS)
## Master Plan & Build Guide

Working name: **AyuCTMS** (rename freely).
Ministry of Ayush / All India Institute of Ayurveda (AIIA). Category: Software. Theme: MedTech/HealthTech.

## 1. One-line pitch
A real-time, role-based, tamper-evident Clinical Trial Management System for Ayurveda research that unifies trial operations (ethics, CTRI, enrolment, deviations) with NPvCC pharmacovigilance (AE/SAE clocks), and exports standards-aligned data (FHIR R4, SDTM).

## 2. Differentiators (what wins)
1. **NPvCC-native PV module**: SAE regulatory clock, causality, signal feed to DSMB.
2. **Ayurveda-native data**: Prakriti/Vikriti/Agni fields as first-class CDASH-style extensions; Ayush morbidity/ICD-11 code fields alongside MedDRA slot.
3. **Provable integrity**: hash-chained audit log with a live "tamper test" in the demo.
4. **Standards you can show**: FHIR R4 bundle validated live; SDTM DM and AE domain CSV export.
5. **Config-driven regulatory clocks** (no hard-coded timelines).

## 3. Scope

### MVP (must ship in the 36h)
- Auth + 7-role RBAC (PI, Coordinator, Monitor, Ethics Committee, PV Officer, Admin, Regulator read-only)
- Study lifecycle tracker (protocol -> EC approval -> CTRI -> site activation -> screening -> enrolment -> close-out)
- Portfolio dashboard + per-study drill-down, KPI cards, configurable alerts
- Participants + visits + protocol deviations + data queries (light EDC forms)
- AE/SAE capture with regulatory countdown clock and escalation alerts
- Immutable hash-chained audit log + verify endpoint
- Consent record (versioned) + data-minimised participant view
- FHIR R4 export (ResearchStudy, ResearchSubject, Patient, AdverseEvent) and SDTM DM/AE CSV export

### Roadmap (show as slides only)
Full EDC with edit checks, ADaM + Define-XML, ABDM sandbox linkage, Ayush Suraksha API sync, e-signature with DSC/eSign, AI narrative triage, MedDRA/WHODrug licensed coding.

## 4. Tech stack (decided)
| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite + TypeScript, Tailwind, Recharts, TanStack Query | fast dashboards |
| Backend | FastAPI (Python 3.11) + SQLAlchemy 2 + Alembic | fast to build, easy SDTM/FHIR libs |
| DB | PostgreSQL 16 with Row-Level Security | site isolation, audit |
| Realtime | FastAPI WebSocket (or SSE) | SAE clocks, alerts |
| Auth | JWT (access+refresh), argon2 password hashing, optional TOTP | RBAC |
| FHIR | `fhir.resources` (Pydantic models) | validate R4 |
| Export | pandas -> CSV (SDTM) | simple |
| Infra | Docker Compose; deploy Render/Railway/AWS ap-south-1 | data-resident story |
| CI | GitHub Actions: lint + pytest | hygiene |

## 5. Team split (6 people)
| Role | Owns |
|---|---|
| A. Backend/Audit | schema, RBAC, audit chain, auth |
| B. Frontend | dashboards, role views, forms |
| C. PV module | AE/SAE, clocks, alerts, causality |
| D. Standards | FHIR + SDTM export, mapping tables |
| E. Domain/Compliance | regulatory config, NDCT/GCP-ASU/DPDP notes, seed data, mentor Qs |
| F. Demo/Deck | demo script, slide-ready text, screenshots, README |

## 6. Timeline
### Phase 0 — Now until idea submission (deadline 30 Sep 2026, verify on sih.gov.in)
Finish the 6-slide idea PDF (AICTE template). Content only needs: problem, solution, architecture, novelty, feasibility, impact.

### Phase 1 — Pre-finale prototype
| Week | Deliverable |
|---|---|
| 1 | Repo, Docker Compose, schema + migrations, auth + RBAC, seed data |
| 2 | Study lifecycle, participants, visits, deviations, audit chain |
| 3 | AE/SAE + clocks + alerts, dashboards |
| 4 | FHIR/SDTM export, tests, demo polish |

### Phase 2 — Finale 36h plan
| Hours | Focus |
|---|---|
| 0–4 | Environment up, seed data loaded, smoke test |
| 4–14 | Fix mentor feedback gaps, finish dashboards |
| 14–24 | Exports, tamper demo, compliance page |
| 24–30 | Bug bash, test on projector resolution, offline fallback video |
| 30–34 | Rehearse demo x3, Q&A drills |
| 34–36 | Freeze, backup deploy, submit |

## 7. Definition of done (demo-ready)
- [ ] Login as each of 7 roles shows a different dashboard and blocked actions
- [ ] Create study, advance lifecycle, CTRI number captured
- [ ] Enrol participant, log deviation, raise query
- [ ] Report SAE: countdown starts, escalates, generates report PDF/JSON
- [ ] Edit an audit row directly in DB -> verify endpoint flags break
- [ ] Export FHIR bundle passes validator; SDTM DM/AE CSV downloads
- [ ] Regulator role cannot write anything

## 8. Document index
1. `01-requirements-srs.md` — functional/non-functional requirements, personas, RBAC matrix
2. `02-architecture-design.md` — components, flows, security, deployment
3. `03-database-schema.sql` — PostgreSQL DDL
4. `04-api-spec.yaml` — OpenAPI
5. `05-standards-compliance-mapping.md` — CDASH/SDTM/FHIR, NDCT, DPDP, ALCOA+
6. `06-setup-tests-demo.md` — repo layout, setup, seed data, tests, demo script, mentor questions
7. `07-datasets-and-sources.md` — PS-listed public datasets/standards, synthetic data rules, ingestion scripts, provenance
