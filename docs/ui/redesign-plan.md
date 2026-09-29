# AyuCTMS UI/UX Redesign Plan & Architecture

## 1. Information Architecture & Navigation

The AyuCTMS application serves 7 roles (PI, COORDINATOR, MONITOR, IEC, PV, ADMIN, REGULATOR). The shell features:
- **Left Rail**: Collapsible navigation with stylized Botanical Chain logo mark, role indicator, live alert status, and permanent synthetic data disclaimer.
- **Top Bar**: Breadcrumbs, Quick Action / Command Palette trigger (`Ctrl+K`), live alert bell with counter, theme toggle (Ink Dark / Parchment Light), density toggle, and user menu.
- **Role Identity Ribbon**: Persistent role bar showing active scope (and read-only badge for REGULATOR).

### Route Inventory & Functional Matrix
- `/login`: Cinematic entrance with particle mandala, instant fallback, quick 1-click role logins with preview.
- `/`: Role-specific Home Dashboard (KPI tiles with delta, SAE clock urgent card, enrolment breakdown, approval timeline, audit snapshot).
- `/studies`: Studies list with segmented status filters, progress rings, protocol wizard modal.
- `/studies/:id`: Study detail with `LifecycleVine`, KPIs, Milestones, Enrolment curve, and tabbed subviews:
  - Overview
  - Participants & Visits + `ParticipantDrawer`
  - Deviations & Data Queries (sign-off, inline answers)
  - Safety & AE list
  - Consent & Amendments (comprehension quiz builder, multilingual Hindi/English preview)
  - Standards Export (FHIR R4 Bundle, CDISC SDTM DM/AE)
- `/safety`: Two-pane Safety Inbox (`ClockRing`, `HerbDrugCard`, Naranjo causality assessment calculator, SAE submission with clock trigger).
- `/signals`: Disproportionality Signal Detection (PRR / ROR table, `SignalForest` dot-and-whisker plot, Prakriti Triad stratification).
- `/risk`: Study × Site Risk Heatmap (color + text band, leading indicators, participant risk breakdown).
- `/audit`: Hash-chain verification hero (`ChainViz`), Merkle checkpoints anchoring, tamper detection, and JSON diff inspector.
- `/alerts`: System alerts with level badges, acknowledgment, real-time push.
- `/compliance`: Standards matrix (CTRI, ICH-GCP, CDISC, FHIR, DPDP, ALCOA+), data provenance, regulatory citation review.
- `/admin`: User & Site management, regulatory clock rules, audit thresholds.
- `/account`: User profile, TOTP 2FA setup with QR and manual key.
- `/__kit`: Development component kit showing all tokens, buttons, inputs, modals, clocks, and widgets in both themes.

## 2. Reused vs Rebuilt

- **Reused**:
  - API Client (`frontend/src/api/client.ts`)
  - TanStack Query hooks & query keys
  - Auth context and permissions checking logic (`frontend/src/auth/`)
  - WebSocket connection handling
- **Rebuilt**:
  - Entire Design System (`tokens`, `index.css`, Tailwind v4 variables)
  - App Shell (`Layout.tsx`)
  - Design system primitives (`ui.tsx`)
  - Specialized widgets (`widgets.tsx`: `ClockRing`, `LifecycleVine`, `ChainViz`, `RiskHeatmap`, `SignalForest`, `HerbDrugCard`)
  - All 13 application screens and drawer modals with authentic botanical-ledger aesthetic.
