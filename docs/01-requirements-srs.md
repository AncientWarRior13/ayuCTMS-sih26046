# 01 — Requirements (SRS)

## 1. Purpose
Define what AyuCTMS must do. Source: SIH26046 problem statement (community mirror of sih.gov.in; verify against official portal).

## 2. Personas
| Persona | Goal | Key screens |
|---|---|---|
| Principal Investigator (PI) | Run own trials, sign off deviations, report SAEs | My studies, lifecycle stepper, enrolment vs target, SAE form |
| Study Coordinator | Daily participant/visit entry | Participant list, visit schedule, visit-window alerts, CRF forms |
| Clinical Monitor | Verify data, flag deviations | Query queue, deviation log, monitoring visit tracker |
| Ethics Committee (IEC) | Approvals, continuing review | Approval queue, expiring approvals, SAE review |
| Pharmacovigilance Officer | Safety surveillance | AE/SAE inbox, clocks, causality, signal dashboard |
| Administrator | Users, sites, config | User admin, site admin, KPI/alert config, audit verify |
| Regulator (read-only) | Oversight | All studies, safety, approvals; no writes |

## 3. Functional requirements

### 3.1 Identity & access
- FR-A1 Email+password login with argon2 hashing; JWT access (15 min) + refresh (7 d).
- FR-A2 Seven roles, permissions per matrix (section 5). Deny by default.
- FR-A3 Optional TOTP 2FA for Admin/PI.
- FR-A4 Account lockout after 5 failed attempts; all auth events audited.
- FR-A5 Site-scoped access: coordinators/monitors see only assigned sites (Postgres RLS).

### 3.2 Study management
- FR-S1 Create study: title, protocol no., phase/type (interventional/observational), Ayurveda intervention details, target sample size, sites, PI.
- FR-S2 Lifecycle states: `DRAFT -> PROTOCOL_APPROVED -> EC_APPROVED -> CTRI_REGISTERED -> SITE_ACTIVE -> ENROLLING -> FOLLOW_UP -> CLOSED` with guarded transitions (e.g. cannot enrol before CTRI_REGISTERED).
- FR-S3 Ethics approval records: EC name, approval date, validity, continuing-review due date.
- FR-S4 CTRI registration record: CTRI number, date; enforce "prospective" rule (registration date <= first enrolment date).
- FR-S5 Milestones with planned vs actual dates.

### 3.3 Participants & visits (light EDC)
- FR-P1 Screening, enrolment, randomization (arm assignment via seeded block randomization).
- FR-P2 Pseudonymised subject ID; PII kept in a separate table with restricted role access.
- FR-P3 Visit schedule with windows; missed/out-of-window flags.
- FR-P4 Configurable CRF forms (JSON schema) incl. Ayurveda fields: Prakriti, Vikriti, Agni, Koshtha (extension fields).
- FR-P5 Protocol deviations: category, severity, CAPA, monitor sign-off.
- FR-P6 Data queries: raise, answer, close, with audit.

### 3.4 Consent & privacy
- FR-C1 Versioned consent documents; subject consent records with timestamp, version, witness.
- FR-C2 Withdrawal recorded; downstream views mask withdrawn subject data where required.
- FR-C3 Data minimisation: role-based field masking; export defaults to pseudonymised.

### 3.5 Pharmacovigilance
- FR-V1 AE/SAE/ADR report capture: onset, description, seriousness criteria, severity, causality, outcome, action taken, concomitant medicines.
- FR-V2 Seriousness flags start regulatory clocks defined in `regulatory_rules` table (config, not code).
- FR-V3 Countdown display; alerts at 50%/80%/100% and overdue state; escalation to PV Officer and Admin.
- FR-V4 Coding fields: MedDRA (LLT/PT stub subset), WHODrug (stub), Ayush morbidity code / ICD-11 (free text + lookup seed).
- FR-V5 Causality assessment: WHO-UMC categories plus Naranjo score helper.
- FR-V6 Signal view: counts by PT/system organ, by study, by drug; rolling trend; flag when threshold exceeded.
- FR-V7 Report generation (JSON + printable PDF) for regulator submission drafts.

### 3.6 Dashboards, KPIs, alerts
- FR-D1 Portfolio dashboard: studies by state, enrolment vs target, overdue items, safety summary.
- FR-D2 Per-study drill-down: timeline, sites, enrolment curve, deviations, queries, SAEs.
- FR-D3 Configurable KPI thresholds (admin): enrolment lag %, approval expiry days, monitoring visit overdue days, query ageing days.
- FR-D4 Alert engine: evaluates rules on schedule + on event; delivers in-app (WebSocket) and email stub.
- FR-D5 Role-tailored home pages (PI, IEC, PV, leadership).

### 3.7 Audit & integrity (ALCOA+)
- FR-U1 Every create/update/delete/login/export/permission change writes an audit row.
- FR-U2 Audit rows are append-only; each stores `prev_hash` and `row_hash` (SHA-256) forming a chain.
- FR-U3 `GET /audit/verify` recomputes the chain and reports first break.
- FR-U4 DB-level: UPDATE/DELETE on audit table revoked; trigger blocks changes.
- FR-U5 Record versioning for clinical entities (old values retained in audit `before`/`after` JSON).
- FR-U6 Reason-for-change required on edits to clinical data.

### 3.8 Interoperability & export
- FR-X1 FHIR R4 export per study: `ResearchStudy`, `ResearchSubject`, `Patient` (pseudonymised), `AdverseEvent` in a Bundle.
- FR-X2 FHIR import stub endpoint accepting a `Patient`/`Observation` bundle to demonstrate HIS integration.
- FR-X3 SDTM CSV export for DM and AE domains; DS optional.
- FR-X4 Mapping tables documented (see doc 05).

### 3.9 Administration
- FR-M1 User CRUD (Admin), site CRUD, role assignment.
- FR-M2 Regulatory rule config (clock durations by report type).
- FR-M3 Seed/demo-data loader command.

## 4. Non-functional requirements
| ID | Requirement | Target |
|---|---|---|
| NFR-1 | Dashboard load | < 2 s on seeded data (3 studies, 300 participants) |
| NFR-2 | Alert latency (event -> UI) | < 3 s |
| NFR-3 | Security | OWASP ASVS L1 basics: input validation, CSRF-safe token use, rate limit, secure headers |
| NFR-4 | Encryption | TLS in transit; DB volume encryption at rest; PII columns encrypted (pgcrypto) |
| NFR-5 | Data residency | Deploy region India; document in compliance page |
| NFR-6 | Availability (demo) | Docker Compose one-command start; offline-capable demo video fallback |
| NFR-7 | Accessibility | Keyboard navigable; WCAG AA contrast |
| NFR-8 | Localisation | English UI; Hindi labels for key screens (stretch) |
| NFR-9 | Testability | >= 60% backend coverage on auth, RBAC, audit, clocks |

## 5. RBAC matrix (C=create, R=read, U=update, D=delete, X=execute, —=none)
| Resource | PI | Coord | Monitor | IEC | PV | Admin | Regulator |
|---|---|---|---|---|---|---|---|
| Studies | CRU (own) | R | R | R | R | CRUD | R |
| Lifecycle transitions | X (own) | — | — | X (approval) | — | X | — |
| Participants (pseudonymised) | R | CRU | R | — | R | R | R |
| Participant PII | R (own) | CRU | — | — | — | — | — |
| Visits/CRF | R | CRU | R | — | R | R | R |
| Deviations | CRU | C | CRU | R | R | R | R |
| Queries | R/answer | answer | CRU | — | — | R | R |
| AE/SAE | CRU | C | R | R | CRUD | R | R |
| Regulatory clocks/rules | R | — | — | R | R | CRUD | R |
| Audit log | — | — | — | — | — | R + verify | R + verify |
| Users/sites | — | — | — | — | — | CRUD | — |
| Exports | own | — | — | — | own safety | all | all |

## 6. Business rules
1. Cannot move to `ENROLLING` unless EC approval valid and CTRI registered.
2. CTRI registration date must be <= first participant enrolment date.
3. SAE clock starts at `awareness_datetime` and uses rule from `regulatory_rules` (verify durations from NDCT Rules 2019 before demo).
4. Withdrawn consent stops new data entry for that subject.
5. Edits to clinical records require `reason_for_change`.
6. Regulator role must never receive write permissions (tested).

## 7. KPIs (measure in demo)
- SAE alert latency; % SAEs reported within clock
- Audit coverage = audited actions / total mutating actions (target 100%)
- Tamper detection: 1 of 1 injected breaks detected
- FHIR bundles validating vs R4: 100%
- Enrolment vs target per study
- Role-permission tests passed: 100%

## 8. Assumptions & open items
- Regulatory timelines are placeholders until verified against NDCT Rules 2019 Schedule III / Chapter VI text.
- MedDRA/WHODrug are licensed; demo uses stub subsets with a stated licence path.
- No real patient data; all synthetic.
- ABDM/EDC/HIS integrations are stubs or mapping documents unless mentors provide sandbox access.
