# 06 — Setup, Seed Data, Tests, Demo Script

## 1. Repository layout
```
ayuctms/
  docker-compose.yml
  .env.example
  README.md
  docs/                 (this doc pack)
  data/                 raw/ and processed/ datasets (see 07-datasets-and-sources.md)
  backend/
    requirements.txt
    alembic.ini
    app/ (see 02-architecture-design.md)
    db/schema.sql       (03-database-schema.sql)
    scripts/seed.py
    tests/
  frontend/
    package.json
    src/
      api/ (client, hooks)
      routes/ (pi, coordinator, monitor, iec, pv, admin, regulator, study)
      components/ (KpiCard, LifecycleStepper, SaeClockChip, AuditTable, EnrolmentChart, AlertBell)
      auth/ (RoleGuard)
  deploy/
    nginx.conf
```

## 2. Environment
`.env.example`
```
POSTGRES_USER=ayuctms
POSTGRES_PASSWORD=change_me
POSTGRES_DB=ayuctms
DATABASE_URL=postgresql+psycopg://ayuctms_app:change_me@db:5432/ayuctms
JWT_SECRET=change_me_long_random
PII_KEY=change_me_32_chars_min
ACCESS_TTL_MIN=15
REFRESH_TTL_DAYS=7
ALERT_TICK_SECONDS=30
CORS_ORIGINS=http://localhost:5173
```

`backend/requirements.txt`
```
fastapi
uvicorn[standard]
sqlalchemy>=2
psycopg[binary]
alembic
pydantic>=2
pydantic-settings
python-jose[cryptography]
argon2-cffi
pyotp
apscheduler
fhir.resources
pandas
reportlab
pytest
httpx
```

`docker-compose.yml` (skeleton)
```yaml
services:
  db:
    image: postgres:16
    env_file: .env
    volumes: [pgdata:/var/lib/postgresql/data, ./backend/db/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql]
    ports: ["5432:5432"]
  api:
    build: ./backend
    env_file: .env
    depends_on: [db]
    ports: ["8000:8000"]
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000
  web:
    build: ./frontend
    ports: ["5173:5173"]
volumes: { pgdata: {} }
```
Important: the API must connect as a **non-superuser** DB role (`ayuctms_app`) or RLS will be bypassed. Create it in an init script and grant table privileges (but not UPDATE/DELETE on `audit_log`).

Run:
```
cp .env.example .env
docker compose up -d --build
docker compose exec api python scripts/seed.py
open http://localhost:5173
```

## 3. Seed data plan (all synthetic)
Data sources and de-identification rules are in `07-datasets-and-sources.md`: public CTRI records (curated metadata only) -> studies; CDISC controlled terminology -> code lists; Synthea synthetic patients -> participants. Run order after the schema loads: `build_cdisc_ct.py`, `seed_studies_from_ctri.py`, `seed_from_synthea.py`, `gen_trial_events.py`. The table below is the target shape of the result.

| Item | Quantity | Notes |
|---|---|---|
| Sites | 3 | e.g. SITE-01 New Delhi, SITE-02 Jamnagar, SITE-03 Goa (fictional codes ok) |
| Users | 1 per role + 2 coordinators | passwords printed in README for demo only |
| Studies | 3 | one ENROLLING, one at EC_APPROVED (blocked from enrolment demo), one CLOSED |
| Participants | ~150 in main study | subject codes AIIA-001-0001... |
| Visits | schedule per participant | some missed/out-of-window |
| Deviations | ~8 | mixed severity |
| Queries | ~10 | mixed ageing |
| AEs | ~20, of which 3 serious | one SAE with a clock at ~85% elapsed, one overdue |
| Ethics approval | one expiring within 20 days | triggers alert |
| Lookups | 50 MedDRA stub terms, 30 Ayush morbidity terms | replace with licensed sets in production |

Demo accounts (synthetic): `pi@demo.test`, `coord@demo.test`, `monitor@demo.test`, `iec@demo.test`, `pv@demo.test`, `admin@demo.test`, `regulator@demo.test`.

## 4. Test plan
| ID | Test | Expected |
|---|---|---|
| T1 | Login each role | correct role in token; wrong password -> 401; 5 failures -> lock |
| T2 | RBAC matrix | Table-driven test over every endpoint x role; all denials return 403 |
| T3 | Regulator writes | every POST/PUT/PATCH/DELETE returns 403 |
| T4 | Site isolation | coordinator at SITE-01 cannot read SITE-02 participants (RLS, run as non-superuser) |
| T5 | Lifecycle guard | transition to ENROLLING without CTRI -> 409 |
| T6 | Prospective CTRI rule | enrol before CTRI date -> 409 |
| T7 | Audit coverage | each mutating endpoint adds >= 1 audit row |
| T8 | Audit chain | `audit_verify()` NULL on clean DB; after simulated tamper returns row id |
| T9 | Audit immutability | UPDATE/DELETE on audit_log raises |
| T10 | SAE clock | create serious AE -> clocks created with correct due_at from rules; alert levels at 50/80/100% |
| T11 | Clock completion | submit-report marks clock COMPLETED and stops alerts |
| T12 | Consent | enrol without consent -> 409; withdrawal blocks new CRF |
| T13 | FHIR | bundle validates with fhir.resources; no direct identifiers present |
| T14 | SDTM | DM/AE CSV headers match mapping; USUBJID unique |
| T15 | PII | `participant_pii` unreadable without key; exports contain no names |
| T16 | Performance | portfolio endpoint < 2 s on seed data |
| T17 | Dataset provenance | every seeded table has a `data_provenance` row; all participants `is_synthetic = TRUE` |
| T18 | CDISC CT conformance | all SDTM DM/AE code values exist in `lookup_cdisc_ct` |
| T19 | Synthea FHIR round trip | a Synthea Patient imported via `/import/fhir` re-exports as a valid R4 Bundle with no direct identifiers |

Run: `docker compose exec api pytest -q`

## 5. Demo script (about 6 minutes)
1. **Problem (30 s):** scattered spreadsheets, missed SAE deadlines, no single auditable view.
2. **Admin login (30 s):** show 7 roles, KPI thresholds, regulatory rules with source notes.
3. **PI login (60 s):** portfolio, open ENROLLING study, lifecycle stepper; try to enrol a participant in the EC_APPROVED study -> blocked with clear reason.
4. **Coordinator (45 s):** enrol participant with consent, schedule visit, fill CRF including Ayurveda fields.
5. **Monitor (30 s):** raise query, log deviation, sign off.
6. **Safety moment (90 s):** PI reports an SAE; PV officer's dashboard shows a countdown; alert bell fires at 80%; PV assigns causality; submit report; clock completes.
7. **IEC (20 s):** expiring approval alert.
8. **Integrity (45 s):** Admin runs verify -> intact; superuser edits a row in DB; verify -> reports broken row.
9. **Standards (30 s):** download FHIR bundle, show validator pass; download SDTM AE CSV.
10. **Regulator (15 s):** read-only; every write button absent, API returns 403.
11. **Close (15 s):** roadmap: EDC checks, ADaM/Define-XML, ABDM, Ayush Suraksha sync, licensed dictionaries.

Fallback: record a full screen capture of steps 3–9 beforehand and keep the DB dump for a 2-minute reset.

## 6. Q&A prep (likely judge questions)
- Why not use REDCap/OpenClinica? (No NPvCC/Ayurveda context, data residency, integrated PV clocks; and we export standards to interoperate.)
- Is the audit chain real immutability? (Tamper-evident, DB-enforced; note anchoring to external timestamping as roadmap.)
- How do you handle MedDRA licensing? (Stub for demo; licence via institute in production.)
- How do you scale to many institutes? (Multi-tenant site model + RLS; split services later.)
- DPDP readiness? (Consent versioning, PII split, minimisation; phase dates confirmed from Rules text.)

## 7. Ten questions for PS-owner mentors
1. Which exact SAE/ADR timelines must the clock enforce, and for which recipients?
2. Are MedDRA/WHODrug licences available to AIIA, and can a sample be used for the demo?
3. Should Ayush morbidity codes or ICD-11 be the primary coding for Ayurveda events?
4. Should the system ingest from or push to the Ayush Suraksha portal?
5. Which EDC and HIS at AIIA must we interoperate with?
6. Is a real ABDM sandbox expected, or is a mapping document sufficient?
7. Target scale: number of concurrent trials, sites and users?
8. Should Prakriti/Vikriti/Agni fields be mandatory CRF elements?
9. Which cloud/hosting is acceptable for data residency?
10. What does "submission-ready dataset" mean in practice for AYUSH trials?

## 8. Team checklist (first 24 hours after idea acceptance)
- [ ] Repo + branch rules + CI
- [ ] Compose stack boots on every laptop
- [ ] Schema loaded; non-superuser DB role created
- [ ] Auth + RBAC skeleton with the permission map file
- [ ] Seed script v1
- [ ] Figma-lite wireframes for 7 role homes
- [ ] Regulatory placeholders replaced with cited durations (Team E)
- [ ] Mentor questions sent
