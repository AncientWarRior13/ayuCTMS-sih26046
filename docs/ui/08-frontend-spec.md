# AyuCTMS Functional Specification (`08-frontend-spec.md`)

*Derived directly from `frontend/src/**`, `backend/app/core/permissions.py`, `backend/app/routers/*.py`, and `docs/04-api-spec.yaml`.*

---

## 1. Route Specifications

### `/` & `/landing`
- **Purpose**: Public showcase & entry portal. Demonstrates AyuCTMS capabilities, compliance, botanical clinical trial governance, cryptographic auditability, and live pharmacovigilance telemetry.
- **Roles**: All / Public (unauthenticated).
- **Permissions**: None.
- **Components/Widgets**: Canvas particle field, interactive 3D elements, live SAE regulatory clock simulation, mouse-tilt feature cards, animated statistical counters, 7-role breakdown orbit, interactive audit hash chain verifier, CTA to `/login`.
- **API calls**: None (must work fully with backend offline).

---

### `/login`
- **Purpose**: Authenticate trial participants, staff, monitors, ethics committee members, and regulators.
- **Roles**: All / Public.
- **Permissions**: None.
- **Components**:
  - Email & Password input with show/hide password toggle.
  - TOTP sliding code input (triggered on `400/401` containing `"TOTP"`).
  - Quick-login demo accounts picker (7 roles: `pi@demo.test`, `coord@demo.test`, `monitor@demo.test`, `iec@demo.test`, `pv@demo.test`, `admin@demo.test`, `regulator@demo.test`; default pass `Demo@12345`).
- **API calls**:
  - `POST /api/v1/auth/login` (body: `{ email, password, totp? }`, returns `{ access_token, refresh_token, role }`).
  - `GET /api/v1/auth/me` (populates auth context with `{ id, email, name, role, permissions, site_ids }`).
- **States**: Error banner for bad credentials, rate limit warnings, loading spinner/skeleton on submit.

---

### Workspace Shell (`/app/*` or current layout)
- **Purpose**: High-efficiency, keyboard-first clinical operations environment ("Instrument register").
- **Components**:
  - Collapsible navigation rail filtered strictly by user permissions.
  - Permanent synthetic data notice: `"Synthetic demo data only · Ministry of Ayush / AIIA · SIH26046"`.
  - Top navigation bar: breadcrumbs, Command Palette trigger (`Ctrl/Cmd+K`), live WebSocket alert bell with critical badge, theme toggle, density toggle, user menu & logout.
  - WebSocket connection: `/api/v1/ws/alerts?token={access_token}` with auto-reconnect, alert sound/toast on `CRITICAL`.

---

### `/app/pi`, `/app/coordinator`, `/app/monitor`, `/app/iec`, `/app/pv`, `/app/admin`, `/app/regulator` (`Home.tsx`)
- **Purpose**: Personalized role command center.
- **Roles & Gates**:
  - Each role route is gated by `<RoleGuard roles={[ROLE]}>`.
  - Common data permission: `dashboard.read`.
- **Sections & Widgets**:
  - KPI metric cards: Active Studies, Total Participants, Open Queries, Serious Adverse Events (SAE), Pending Ethics Approvals, Chain Integrity status.
  - Role-specific bento widgets:
    - **PI**: My Studies list, Pending Sign-offs, Active SAEs with live countdown clocks.
    - **COORDINATOR**: Visit schedules due today, participant enrolment counters, open CRF entry tasks.
    - **MONITOR**: Site deviation heatmap, query aging table, SDV (Source Data Verification) completion rates.
    - **IEC**: Ethics approvals pending, expiring protocols (<30 days), protocol amendment requests.
    - **PV (Pharmacovigilance)**: Live SAE regulatory clocks triage board, PRR/ROR signal alerts, herb-drug warnings.
    - **ADMIN**: Merkle checkpoint status, system user counts, audit volume, site sync indicators.
    - **REGULATOR**: National trial overview, cross-site safety signals, read-only compliance indicator with no mutate actions.
- **API calls**:
  - `GET /api/v1/dashboard/summary` (TanStack Query key: `['dashboard', 'summary']`).
  - `GET /api/v1/studies` (Query key: `['studies']`).
  - `GET /api/v1/safety/adverse-events?serious=true` (Query key: `['safety', 'ae', 'serious']`).
  - `GET /api/v1/alerts` (Query key: `['alerts']`).

---

### `/app/studies` (`Studies.tsx`)
- **Purpose**: Protocol portfolio explorer and study launcher.
- **Roles**: All (Read). Creation restricted to `study.create` (`PI`, `ADMIN`).
- **Sections**:
  - Lifecycle state filter tabs (`DRAFT`, `PROTOCOL_APPROVED`, `EC_APPROVED`, `CTRI_REGISTERED`, `SITE_ACTIVE`, `ENROLLING`, `FOLLOW_UP`, `CLOSED`).
  - Study table / cards: Protocol No, Title, Type (Interventional vs Observational), Phase/Design, Enrolment Progress bar, Active Sites, Action buttons.
  - "New Study" modal (Gated by `study.create`): Form for `protocol_no`, `title`, `type`, `intervention`, `target_sample`, `site_ids`.
- **API calls**:
  - `GET /api/v1/studies` (Query key: `['studies']`).
  - `POST /api/v1/studies` (Mutation, invalidates `['studies']`).

---

### `/app/studies/:id` (`StudyDetail.tsx`)
- **Purpose**: Deep-dive clinical trial protocol management, lifecycle progression, CRF data, deviations, queries, and standards export.
- **URL Sync**: Tab state synced to `?tab=overview|participants|deviations|queries|safety|consent|exports`.
- **Sections**:
  1. **Sticky Header**: Protocol Number, Status Badge, CTRI Reg ID, Transition button with state guard validation.
  2. **Overview Tab**:
     - `LifecycleVine` (8 states with block reasons tooltips).
     - Study metadata grid (PI, Sponsor, Sample size, Intervention).
     - Site allocations & Milestone tracking table.
     - CTRI registration card (`ctri.set`: PI/Admin can set CTRI code).
     - Ethics approval list (`ethics.create`: IEC/Admin).
  3. **Participants Tab**:
     - Enrolled participant table (`participant.read`).
     - "Enrol Participant" modal (`participant.create`: Coordinator only). Form includes age, sex, site, subject code, guardian consent for <18, and 3-question mandatory consent quiz.
     - Click participant opens `ParticipantDrawer`. PII reveal (`participant.pii`: PI/Coordinator only) requires typed reason.
  4. **Deviations & Queries Tab**:
     - Protocol deviations table (`deviation.read`, create: `deviation.create`, signoff: `deviation.signoff` by Monitor).
     - Queries thread (`query.read`, create: `query.create`, answer: `query.answer`, close: `query.close`).
  5. **Safety Tab**:
     - Filtered view of study adverse events and active regulatory clocks.
  6. **Consent & Amendments Tab**:
     - Protocol versions, SHA-256 consent fingerprint with copy button.
     - Devanagari / English bilingual consent preview.
     - Consent comprehension quiz editor (IEC/Admin).
  7. **Exports Tab**:
     - Real file download triggers (no prefetching!):
       - `GET /api/v1/interop/export/fhir/r4/study/{id}` (`export.study`)
       - `GET /api/v1/interop/export/cdisc/sdtm/dm/{id}` (`export.study`)
       - `GET /api/v1/interop/export/cdisc/sdtm/ae/{id}` (`export.safety`)
- **API calls**:
  - `GET /api/v1/studies/{id}`
  - `POST /api/v1/studies/{id}/transition` (gated by `study.transition`)
  - `POST /api/v1/studies/{id}/ctri` (`ctri.set`)
  - `GET /api/v1/participants?study_id={id}`
  - `POST /api/v1/participants`
  - `GET /api/v1/deviations?study_id={id}`
  - `POST /api/v1/deviations`
  - `POST /api/v1/deviations/{dev_id}/signoff`
  - `GET /api/v1/queries?study_id={id}`
  - `POST /api/v1/queries`
  - `POST /api/v1/queries/{q_id}/answer`
  - `POST /api/v1/queries/{q_id}/close`

---

### `/app/safety` (`Safety.tsx`)
- **Purpose**: Pharmacovigilance command hub, SAE intake, live regulatory clock management, causality adjudication.
- **Gates**: `ae.read` (`PI`, `COORD`, `MONITOR`, `IEC`, `PV`, `ADMIN`, `REGULATOR`).
- **Sections**:
  - Master-Detail two-pane layout (`?ae={id}` deep linked).
  - Left pane: AE list, Serious filter toggle, severity chips, clock countdown pill.
  - Right pane:
    - Detailed Adverse Event Card (Suspect herbal intervention, MedDRA PT code, Ayush morbidity code, onset date, awareness timestamp).
    - **Herb-Drug Interaction Check**: botanical alert if suspect herb interacts with standard drugs.
    - **Regulatory Clocks Panel**: 24h preliminary report clock, 7-day expedited report clock, 14-day comprehensive report clock. Clocks tick live via 1 Hz shared ticker, tone changes at 50% (amber), 80% (red), 100%+ (pulsing overdue).
    - "Mark Submitted" action per clock (`ae.submit`: PI, PV).
    - Causality assessment with **Naranjo Algorithm 10-question wizard** & WHO-UMC category selector (`ae.causality`: PI, PV).
    - Export CIOMS I / CDSCO Form 11 report download (`ae.report`).
  - "Report Adverse Event" modal (`ae.create`: PI, COORD, PV). Serious checkbox toggles criteria chips and starts regulatory clocks.
- **API calls**:
  - `GET /api/v1/safety/adverse-events`
  - `POST /api/v1/safety/adverse-events`
  - `POST /api/v1/safety/adverse-events/{id}/causality`
  - `POST /api/v1/safety/clocks/{clock_id}/submit`
  - `GET /api/v1/safety/adverse-events/{id}/report`

---

### `/app/signals` (`Signals.tsx`)
- **Purpose**: Disproportionality analysis, pharmacovigilance statistical signals, and Prakriti phenotypic safety profiles.
- **Gates**: `pv.signals` (`PI`, `IEC`, `PV`, `ADMIN`, `REGULATOR`).
- **Sections**:
  - Study selector filter.
  - Disproportionality statistical analysis: Proportional Reporting Ratio (PRR) & Reporting Odds Ratio (ROR) with 95% Confidence Intervals.
  - `SignalForest`: Visual forest plot against baseline $ROR = 1.0$. Evans criteria badge ($PRR \ge 2, \chi^2 \ge 4, N \ge 3$).
  - System Organ Class (SOC) distribution horizontal bar chart.
  - Prakriti (Vata/Pitta/Kapha) phenotypic safety correlation table with `small-n` tag when $n < 5$.
- **API calls**:
  - `GET /api/v1/safety/signals?study_id={id}`
  - `GET /api/v1/safety/prakriti-distribution`

---

### `/app/risk` (`Risk.tsx`)
- **Purpose**: Risk-Based Monitoring (RBM) under ICH E6(R2).
- **Gates**: `monitoring.read` (`PI`, `MONITOR`, `ADMIN`, `REGULATOR`).
- **Sections**:
  - Tab 1: `RiskHeatmap` (Study $\times$ Site grid). Color-ramped score 0-100 with explicit text `LOW` / `MEDIUM` / `HIGH`. Tile click opens weighted metric breakdown drawer (AE rate, deviation velocity, query response lag, consent turnaround).
  - Tab 2: Participant Risk rank table with leading-indicator bars.
- **API calls**:
  - `GET /api/v1/monitoring/risk-matrix`
  - `GET /api/v1/monitoring/site-kpis`

---

### `/app/audit` (`Audit.tsx`)
- **Purpose**: ALCOA+ cryptographic trail verification, SHA-256 hash-chain inspection, and Merkle checkpoints.
- **Gates**: `audit.read` (`ADMIN`, `REGULATOR`).
- **Sections**:
  - `ChainViz` interactive hero: Verifies block hashes `prev_hash > row_hash`.
  - "Verify Entire Chain" button (`audit.verify`): calls `/api/v1/audit/verify`, animates link verification in sequence, warns of tampering if hash sequence breaks.
  - Merkle Checkpoint anchor modal (`audit.checkpoint`: Admin only): creates a cryptographically signed batch checkpoint.
  - Audit log table: 50 records/page, explicit UTC timestamps, Actor, Action, Entity Type, Record ID, and expandable before/after JSON diff.
- **API calls**:
  - `GET /api/v1/audit/logs?page=1&limit=50`
  - `POST /api/v1/audit/verify`
  - `POST /api/v1/audit/checkpoint`

---

### `/app/compliance` (`Compliance.tsx`)
- **Purpose**: Regulatory standards alignment dashboard (GCP, CDISC, FHIR, CTRI, Ayush GCP, 21 CFR Part 11).
- **Gates**: Accessible to all authenticated users.
- **Sections**:
  - Standards checklist matrix with implementation badges: `IMPLEMENTED`, `PARTIAL-ROADMAP`, `VERIFY-CITATION`.
  - Data provenance lookup inspector (`GET /api/v1/lookups/provenance`).
  - Print-friendly layout (hides sidebar/header when printing).

---

### `/app/alerts` (`Alerts.tsx`)
- **Purpose**: Full alert inbox with acknowledgment history.
- **Gates**: `alert.read` (All). Ack button gated by `alert.ack` (All except `REGULATOR`).
- **API calls**:
  - `GET /api/v1/alerts`
  - `POST /api/v1/alerts/{id}/ack`

---

### `/app/settings` / Admin (`Admin.tsx`)
- **Purpose**: System governance, user management, site directory, regulatory rules, and KPI thresholds.
- **Gates**: `rules.read` (`PI`, `IEC`, `PV`, `ADMIN`, `REGULATOR`). Mutations gated by `rules.write`, `kpi.write`, `admin.users`, `admin.sites` (ADMIN only).
- **Sections**:
  - Tab 1: User & Site Directory (`admin.users`, `admin.sites`).
  - Tab 2: Regulatory Clocks & Rules configuration.
  - Tab 3: KPI Thresholds configuration.
  - Reason prompt for all changes (noting "recorded in audit trail").
- **API calls**:
  - `GET /api/v1/admin/users`
  - `GET /api/v1/admin/sites`
  - `GET /api/v1/admin/rules`
  - `PUT /api/v1/admin/rules`
  - `GET /api/v1/admin/kpis`
  - `PUT /api/v1/admin/kpis`

---

### `/app/account` (`Account.tsx`)
- **Purpose**: User profile, active session permissions inspect, 2FA/TOTP setup.
- **API calls**:
  - `GET /api/v1/auth/me`
  - `POST /api/v1/auth/totp/setup`
  - `POST /api/v1/auth/totp/verify`

---

## 2. Role $\times$ Page $\times$ Action Matrix

| Role | Default Home | Can Read | Can Write / Mutate | Disallowed / Hidden Controls |
|---|---|---|---|---|
| **PI** | `/app/pi` | Studies, Participants, Deviations, Queries, Safety, Signals, Risk, Alerts, Rules | Create Study, Update own Study, Set CTRI, Create Deviation, Answer Query, Report AE, Causality, Submit AE, Export Study & Safety, Ack Alert | Cannot verify/checkpoint Audit; cannot manage Users/Sites/Rules; cannot enrol participants directly (Coordinator duty); cannot sign off deviations |
| **COORDINATOR** | `/app/coordinator` | Studies, Participants, Visits, CRFs, Deviations, Queries, Safety, Alerts | Enrol Participant, Write Consent, Fill CRF, Log Visit, Create Deviation, Answer Query, Report AE, Import FHIR, Ack Alert | Cannot approve studies, cannot assess causality, cannot submit regulatory clocks, cannot view audit/signals/risk |
| **MONITOR** | `/app/monitor` | Studies, Participants, Deviations, Queries, Safety, Risk, Alerts | Sign off Deviations, Create Query, Close Query, Monitoring Notes, Ack Alert | Cannot create studies, cannot report AEs, cannot enter CRF data |
| **IEC** | `/app/iec` | Studies, Deviations, Queries, Safety, Signals, Rules, Alerts | Approve Protocol Transition (`EC_APPROVED`), Create Ethics Decision, Ack Alert | Cannot create or edit studies, cannot see PII, cannot enter clinical data, cannot submit SAE clocks |
| **PV** | `/app/pv` | Studies, Participants, Safety, Signals, Rules, Alerts | Report AE, Perform Causality, Submit Regulatory Clocks, Export Safety, Ack Alert | Cannot create studies, cannot edit CRFs, cannot modify users/rules |
| **ADMIN** | `/app/admin` | All pages | Create/Update Study, Transition, CTRI, Users, Sites, Rules, KPI thresholds, Audit Checkpoint, Audit Verify, Ack Alert | Full access |
| **REGULATOR** | `/app/regulator` | Studies, Deviations, Queries, Safety, Signals, Risk, Audit, Rules, Compliance | **ZERO WRITE PERMISSIONS** (Strictly Read-Only) | All action buttons, forms, edit triggers, transition buttons, ack buttons, and modals are **HIDDEN** |

---

## 3. Component Inventory & Migration Map

| Existing Component (`ui.tsx` / `widgets.tsx`) | Current Purpose | Redesign Target (`components/ui/*` or `signature/*`) |
|---|---|---|
| `Button` | Standard button with basic variants | `src/components/ui/Button.tsx` (cva variants, loading state, focus rings, tactile press) |
| `Card` | Basic container with title header | `src/components/ui/Card.tsx` (layered surface elevation, 1px inner highlight) |
| `Badge` | Colored text tag | `src/components/ui/Badge.tsx` (semantic tones + icon slot, strict token mapping) |
| `Modal` | Centered modal dialog | `src/components/ui/Modal.tsx` (Radix Dialog with accessible focus trap & backdrop blur) |
| `Input` / `Select` / `Textarea` | Native inputs with border styling | `src/components/ui/Input.tsx`, `Field.tsx` (with label, hint, error message) |
| `KpiCard` | Metric number with left accent bar | `src/components/signature/KpiTile.tsx` (display font, ticker on data change, delta badge) |
| `LifecycleStepper` | Study progression node list | `src/components/signature/LifecycleVine.tsx` (animated SVG path with transition blocker tooltips) |
| `ClockBadge` / `ClockCard` | Regulatory clock countdown | `src/components/signature/ClockRing.tsx` (SVG radial elapsed dial, 1 Hz shared ticker, tone change at 50/80/100%) |
| `AuditTable` / Diff | Basic table with JSON view | `src/components/signature/ChainViz.tsx` + `src/components/ui/Table.tsx` |
| `RiskMatrix` | Static 2D grid | `src/components/signature/RiskHeatmap.tsx` (color ramp + score + text, arrow-navigable) |
| `SignalTable` | Basic table with numbers | `src/components/signature/SignalForest.tsx` (forest plot with 95% CI vs ROR=1) |
| `RoleGuard` / `Can` | Permission hiding helper | `src/components/ui/RoleGate.tsx` |

---

## 4. Discovered Bugs & Technical Debt

1. **Light-Theme Token Typo**: `frontend/src/index.css` line 58 defines `--surface-3: #E6DFCEx;` (trailing invalid `x` character corrupts CSS parsing in light mode).
2. **HTML Class Inconsistency**: `frontend/index.html` hardcodes `<html lang="en" class="dark">`, while light mode expects `html.light` class toggle; needs a tiny flash-prevention script.
3. **Routing Bug (`/` vs `/landing`)**: `RootRedirect` was wrapped in `<RequireAuth>`, preventing anonymous visitors from viewing the Landing page when browsing to `/`.
4. **Login Redirect Omission**: `Login.tsx` navigates directly to `ROLE_HOME[me.role]` and ignores `location.state.from` or `?next=` query parameters.
5. **CDN Font Dependency**: Google Fonts loaded via `<link>` in `index.html`. Need self-hosted Fontsource packages to comply with offline/air-gapped and high-performance requirements.
6. **Multiple Clock Tickers**: Multiple countdown intervals running concurrently instead of a single centralized 1 Hz master clock provider.
7. **Audit Diff Viewer**: Raw JSON string dump instead of styled structured key-value delta visualizer.
