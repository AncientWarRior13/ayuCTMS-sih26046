# AyuCTMS Frontend — v2 Change Documentation

> **Branch:** `feature/sih-compliance-build`  
> **Status:** Local build only — not pushed to remote  
> **Frontend stack:** React 19 · Vite 7 · TypeScript 5.9 · TailwindCSS 4 · React Query 5 · React Router 7

---

## Table of Contents

1. [New Components](#1-new-components)
2. [Modified Routes](#2-modified-routes)
3. [Favicon System](#3-favicon-system)
4. [API Client Changes](#4-api-client-changes)
5. [Permissions & Role Guards](#5-permissions--role-guards)
6. [Running Locally](#6-running-locally)
7. [Compliance Map (UI → Backend)](#7-compliance-map-ui--backend)

---

## 1. New Components

### 1.1 `ScenePoster` — Static SVG Lotus Fallback

**File:** `frontend/src/components/landing/three/ScenePoster.tsx`

**Purpose:** Renders a pure SVG Ayurvedic lotus mandala as a fullscreen background on devices where the animated 3D `ChainScene` cannot run (no WebGL, mobile, `prefers-reduced-motion`).

**Structure:**
```
ScenePoster
├── Background radial teal glow   — CSS radial-gradient (#2FB39A @ 12%)
├── SVG viewBox 0 0 400 400
│   ├── 3 concentric guide circles  (dashed gold, subtle grey)
│   ├── Outer ring: 24 diamond petals (#C8A45C gold, teal tip dots)
│   ├── Middle ring: 18 petals (offset +10°, gold accent dots at tips)
│   ├── Inner ring: 12 petals (teal #2FB39A outlines, offset +15°)
│   ├── Core: 6 teal seed dots (hexagonal arrangement)
│   └── Central anchor: dark circle + gold ring + teal core dot
└── Colour system matches ChainScene exactly
    ├── Background   #0A0F0D
    ├── Gold accent  #C8A45C
    └── Teal accent  #2FB39A
```

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `className` | `string` | `""` | Passed to the outer wrapper `<div>` |

**Usage:**
```tsx
// Only used internally by ChainScene as a fallback
<ScenePoster className="w-full h-full" />
```

> [!NOTE]
> This component is **only** rendered by `ChainScene` when WebGL is unavailable. It is never imported directly in page-level routes.

---

### 1.2 `ChainScene` — WebGL Probe & Graceful Degradation

**File:** `frontend/src/components/landing/three/ChainScene.tsx`

**What changed in v2:**

| Before | After |
|---|---|
| Always rendered 3D Canvas unconditionally | Probes WebGL on mount before rendering |
| Blank canvas on unsupported hardware | Falls back to `ScenePoster` SVG poster |
| No React error boundary | `WebGLErrorBoundary` catches runtime crashes |
| Tab visibility pause only | Tab pause + DPR scaling on performance drop |

**WebGL probe logic (lines 62–73):**
```ts
useEffect(() => {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl2")
           || canvas.getContext("webgl")
           || canvas.getContext("experimental-webgl");
  if (!gl) setWebglSupported(false);
}, []);
```

**Decision tree:**
```
Mount
  ├─ isMobileOrReduced?  ──YES──→  <ScenePoster />   (no 3D on mobile / reduced-motion)
  ├─ !webglSupported?    ──YES──→  <ScenePoster />   (older laptops / HW accel off)
  └─ otherwise           ──────→  <WebGLErrorBoundary fallback={<ScenePoster/>}>
                                      <Canvas> … 3D blockchain scene … </Canvas>
                                   </WebGLErrorBoundary>
```

**New class — `WebGLErrorBoundary`:**  
A React Error Boundary wrapping `<Canvas>`. Catches WebGL context loss at runtime (e.g. driver crash mid-session) and swaps in `ScenePoster` without a page reload.

**Performance throttle — `PerformanceMonitor.onDecline`:**
```ts
const handlePerformanceDrop = () => {
  setDpr(1.0);             // drop device pixel ratio 1.25 → 1.0
  setEnableEffects(false); // disable Bloom + Vignette postprocessing
};
```
> On mid-tier hardware the 3D scene continues to run — only DPR and post-effects are scaled back.

---

## 2. Modified Routes

### 2.1 `StudyDetail` — Exports Tab (CDISC / FHIR)

**File:** `frontend/src/routes/StudyDetail.tsx` — function `Exports` (line 513)  
**New tab:** `"exports"` — shown to any role with `export.safety`

A dedicated **Exports** tab was added to the study detail page presenting all submission-ready datasets as one-click downloads. Every download is audited server-side.

**Export cards rendered:**

| Card Title | Downloaded File | API Endpoint | Min Permission |
|---|---|---|---|
| FHIR R4 Bundle | `fhir.json` | `GET /export/fhir/study/{id}` | `export.safety` |
| SDTM DM — Demographics | `dm.csv` | `GET /export/sdtm/study/{id}/DM` | `export.study` |
| SDTM AE — Adverse Events | `ae.csv` | `GET /export/sdtm/study/{id}/AE` | `export.safety` |
| ADaM ADSL — Subject-Level | `adsl.csv` | `GET /export/adam/study/{id}/ADSL` | `export.study` |
| ADaM ADAE — AE Analysis | `adae.csv` | `GET /export/adam/study/{id}/ADAE` | `export.safety` |
| CDISC Define-XML 2.0 | `define.xml` | `GET /export/cdisc/define-xml/study/{id}` | `export.study` |

> [!IMPORTANT]
> Every download triggers a server-side audit block (`action = EXPORT`, `entity = study`, `actor_id`, `client_ip`) — satisfying ALCOA+ traceability for all data extracts.

**Ayush extensions in ADaM ADSL:**  
Two Ayurvedic columns are appended to the standard CDISC ADSL dataset:
- `PRAKRITI` — dominant dosha (`VATA`, `PITTA`, `KAPHA`, mixed, `SAMADOSHA`)
- `AGNITYPE` — digestive fire type (`MANDA`, `TIKSHNA`, `VISHAMA`, `SAMA`)

---

### 2.2 `ParticipantDrawer` — Ayurvedic Phenotype CRF

**File:** `frontend/src/routes/ParticipantDrawer.tsx`

Structured Ayurvedic phenotype data is now displayed and submitted via the participant drawer, backed by the new `ayurvedic_phenotypes` table (Phase 4).

**New fields:**

| Field | Type | Backend Column |
|---|---|---|
| Prakriti dominant | Enum chip | `prakriti_dominant` |
| Prakriti % breakdown | Vata/Pitta/Kapha progress bars | `prakriti_vata_pct/pitta/kapha` |
| Vikriti assessment | Text | `vikriti_assessment` |
| Agni type | Enum badge | `agni_type` |
| Koshtha type | Enum badge | `koshtha_type` |
| Dhatu sara | JSONB display — 7 dhatus | `dhatu_sarata` |
| NAMASTE code | Code pill | `namaste_morbidity_code` |
| ICD-11 TM-2 | Code pill | `icd11_tm2_code` |
| Assessed by / at | Auditor chip | `assessed_by`, `assessed_at` |

The dosha percentages are validated client-side to sum to 100 before submission (mirroring the DB-level `CHECK` constraint).

---

## 3. Favicon System

### The Problem (v1)
The old `favicon.ico` (Vite default) overrides `favicon.svg` in Chromium on Windows because browsers request `/favicon.ico` at the root before honouring `<link>` tags. All PNG slots held 1×1 placeholder pixels.

### The Fix (v2)

All favicon assets are now **generated from `public/favicon.svg`** using `@resvg/resvg-js` (Rust-based SVG renderer), producing pixel-perfect PNGs at every required size.

**Regenerate at any time:**
```bash
npm run favicon
```

**Script:** `scripts/generate-favicon.mjs`

**Assets produced:**

| File | Size | Used by |
|---|---|---|
| `public/favicon.svg` | Vector | Chrome 80+, Firefox 41+, Edge 79+, Safari 17+ — **primary** |
| `public/favicon.ico` | 16+32 multi-size | All browsers — absolute fallback |
| `public/favicon-32x32.png` | 32×32 | Legacy Chrome / desktop shortcuts |
| `public/favicon-16x16.png` | 16×16 | Tab bar on older browsers |
| `public/apple-touch-icon.png` | 180×180 | iOS home screen / Safari pinned |
| `public/icon-192.png` | 192×192 | Android PWA splash / Chrome install |
| `public/icon-512.png` | 512×512 | Android PWA launch screen |

**`index.html` link order — SVG first (browser priority):**
```html
<link rel="icon" type="image/svg+xml"  href="/favicon.svg" />       <!-- primary  -->
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
```

**Lotus mandala design tokens (identical to `ScenePoster`):**

| Token | Hex | Usage |
|---|---|---|
| Background | `#0A0F0D` | Rounded rect fill |
| Radial glow | `rgba(47,179,154,0.28)` | Centre teal glow |
| Gold | `#C8A45C` | Outer/middle petal strokes, central ring |
| Teal | `#2FB39A` | Tip dots, inner petal strokes, core dot |

> [!TIP]
> If the brand colours ever change, edit only `public/favicon.svg` and run `npm run favicon`. All downstream PNG/ICO assets regenerate automatically.

---

## 4. API Client Changes

**File:** `frontend/src/api/client.ts`

The `download(path, filename)` function handles binary file downloads with `Content-Disposition` support:

```ts
// Pseudocode for the download helper
async function download(path: string, filename: string) {
  const res = await fetch(API_BASE + path, { headers: authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
```

All Exports tab cards call `download()`. Toast confirmation: *"Export downloaded (logged in audit trail)"*.

---

## 5. Permissions & Role Guards

**Files:** `frontend/src/auth/AuthContext.tsx` · `frontend/src/auth/RoleGuard.tsx`

New permission keys added to the frontend permission matrix (mirrors `backend/app/core/permissions.py`):

| Permission key | PI | Coord | Monitor | IEC | PV | Regulator | Admin |
|---|---|---|---|---|---|---|---|
| `phenotype.read` | ✅ | ✅ | ✅ | — | — | — | ✅ |
| `phenotype.write` | ✅ | ✅ | — | — | — | — | ✅ |
| `signature.read` | ✅ | — | ✅ | ✅ | ✅ | — | ✅ |
| `signature.sign` | ✅ | ✅ | — | ✅ | ✅ | — | ✅ |
| `export.study` | ✅* | — | ✅ | — | — | — | ✅ |
| `export.safety` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

\* PI only for studies where `s.pi_user_id === me.id`

> [!WARNING]
> `REGULATOR` has `export.safety` read-only but **zero write permissions**. Enforced at both `<Can perm="...">` guard level and server-side PostgreSQL RLS. Never elevate Regulator to `export.study`.

---

## 6. Running Locally

### Frontend
```bash
cd frontend
npm install
npm run dev          # → http://localhost:5173/
npm run favicon      # regenerate all favicon assets (only needed after brand change)
npm run typecheck    # TypeScript check without build
npm run build        # production bundle
```

### Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
# Swagger UI → http://localhost:8000/docs
```

### Node version note
Vite 7 requires Node 20.19+ or 22.12+. Node 20.18 shows a warning but works. Update with `nvm use 22` if available.

---

## 7. Compliance Map (UI → Backend)

| PS 26046 Requirement | Frontend Surface | Backend Endpoint |
|---|---|---|
| Real-time portfolio view | `Home.tsx` — KPI cards, active studies grid | `GET /dashboard` |
| Per-study drill-down | `StudyDetail.tsx` — 7-tab layout | `GET /studies/{id}` |
| Lifecycle state machine | `LifecycleStepper` widget + Advance button | `POST /studies/{id}/transition` |
| Protocol deviations | `StudyDetail` → Deviations tab | `GET /studies/{id}/deviations` |
| Data queries | `StudyDetail` → Queries tab | `GET /studies/{id}/queries` |
| AE / SAE capture | `Safety.tsx` + `ParticipantDrawer` AE form | `POST /pv/ae` |
| Regulatory clocks (24h/7d/15d) | `SaeClockChip` widget — 1Hz WebSocket | `WS /ws/alerts/{study_id}` |
| MedDRA signal detection (PRR/ROR) | `Signals.tsx` — disproportionality charts | `GET /pv/signals` |
| DSMB safety pack | `Safety.tsx` — DSMB export button | `GET /pv/dsmb-pack/{study_id}` |
| Ayurvedic phenotype CRF | `ParticipantDrawer` — phenotype section | `POST /participants/{id}/phenotype` |
| GCP e-signatures | Sign-off buttons on CRF / SAE records | `POST /signatures/verify-sign` |
| SDTM DM + AE export | **Exports tab** in `StudyDetail` | `GET /export/sdtm/study/{id}/DM\|AE` |
| ADaM ADSL + ADAE export | **Exports tab** in `StudyDetail` | `GET /export/adam/study/{id}/ADSL\|ADAE` |
| CDISC Define-XML 2.0 | **Exports tab** in `StudyDetail` | `GET /export/cdisc/define-xml/study/{id}` |
| FHIR R4 Bundle export | **Exports tab** — FHIR card | `GET /export/fhir/study/{id}` |
| Digital consent + DPDP | `ParticipantDrawer` — consent flow | `POST /participants/{id}/consent` |
| 7-role RBAC | `<Can perm="…">` guards on all actions | All endpoints — `require()` dep |
| Immutable audit trail | `Audit.tsx` — chain verification view | `GET /audit/chain/verify` |
| 5 persona dashboards | `Home`, `Safety`, `Compliance`, `Signals`, `StudyDetail` | Role-scoped via RLS |
| WebGL fallback (older laptops) | `ChainScene.tsx` → `ScenePoster.tsx` | — (pure frontend) |
| Lotus favicon | `public/favicon.svg` + all PNG/ICO slots | — (pure frontend) |

---

*Generated: 2026-10-01 · AyuCTMS v2 · PS SIH 26046 (Ministry of Ayush / AIIA)*
