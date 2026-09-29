# AyuCTMS UI/UX Redesign Plan & Architecture

## 1. Information Architecture & Entry Flow

AyuCTMS serves 7 roles (PI, COORDINATOR, MONITOR, IEC, PV, ADMIN, REGULATOR). The updated architecture cleanly separates public marketing from the authenticated workspace.

### Public Routes
- `/`: **Awwards-grade Marketing Landing page** (always first page seen by visitors; no auth required).
  - High-impact R3F/Three.js + GSAP WebGL hero scene, smooth scroll (Lenis), interactive hash-chain tamper demo, live SAE clock simulation, 7-role orbit, and CTRI / FHIR / CDISC standards strip.
  - Nav CTA dynamically shows "Sign in" (logged out) or "Open workspace" (logged in).
- `/login`: **Cinematic Login Scene**.
  - Crisp auth card, password reveal, TOTP step-up field, and 1-click quick-login cards for all 7 demo accounts.
  - Respects `?next=/app/...` parameter. Redirects already-logged-in users directly to their role home.
- `/landing`: Permanent redirect to `/` (keeps legacy links intact).

### Workspace Routes (`/app/*`)
Mounted under `<RequireAuth>` + `<Layout>` ("Instrument register" — calm, high-density, keyboard-first):
- `/app`: Index route redirects to `ROLE_HOME[role]` (`/app/pi`, `/app/coordinator`, `/app/monitor`, `/app/iec`, `/app/pv`, `/app/admin`, `/app/regulator`).
- `/app/studies`: Studies portfolio list with segmented lifecycle filters, enrolment progress, and new study wizard.
- `/app/studies/:id`: Full protocol console with `LifecycleVine`, Milestones, and URL-synced tabs (`?tab=overview|participants|deviations|queries|safety|consent|exports`).
- `/app/safety`: Two-pane pharmacovigilance workspace with `ClockRing`, `HerbDrugCard`, Naranjo causality wizard, and regulatory report triggers (`?ae=id`).
- `/app/signals`: Disproportionality signal detection with PRR/ROR analysis, `SignalForest` forest-plot, and Prakriti triad stratification.
- `/app/risk`: Study $\times$ Site `RiskHeatmap` and participant leading indicators.
- `/app/audit`: Cryptographic hash chain verification (`ChainViz`), Merkle checkpoint anchoring, and structured diffs.
- `/app/compliance`: Regulatory standards alignment matrix and data provenance inspector.
- `/app/alerts`: Alert inbox with live WebSocket streaming and single-click acknowledgment.
- `/app/settings`: Administration portal (Users, Sites, Rules, KPI thresholds).
- `/app/account`: User profile, permission inspect, and TOTP 2FA configuration.
- `/__kit`: Dev-only living design system styleguide.

---

## 2. Reused vs Rebuilt

- **Strictly Preserved**:
  - API Client (`frontend/src/api/client.ts`)
  - TanStack Query hooks, caching policies & query keys
  - Auth context and permission verification logic (`frontend/src/auth/`)
  - WebSocket alert streaming
  - Backend FastAPI contracts and database schemas
- **Rebuilt**:
  - Entry routing flow (Landing at `/`, Login at `/login`, workspace under `/app/*`)
  - Design system tokens (`tokens.css`, Tailwind v4 theme, AA contrast in both Ink Dark & Parchment Light)
  - Self-hosted Fontsource typefaces (Display Serif, UI Sans, Tabular Mono, Noto Sans Devanagari)
  - App Shell (`Layout.tsx`) with collapsible rail, Command Palette (`cmdk`), and live status bell
  - Component primitives (`src/components/ui/*`)
  - Signature domain components (`src/components/signature/*`: `ClockRing`, `LifecycleVine`, `ChainViz`, `RiskHeatmap`, `SignalForest`, `HerbDrugCard`, `ParticipantDrawer`)
  - All workspace screens with role-specific views and zero write affordances for REGULATOR.
