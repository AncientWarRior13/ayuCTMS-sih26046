# AyuCTMS (आयुसीटीएमएस) — AI & Standards-Driven Clinical Trial Management System for Ayurveda Research

> **Next-Generation Multi-Site Protocol Management, Cryptographic Audit Provenance, Real-Time Pharmacovigilance & Interoperable Clinical Data Platform for the Ministry of Ayush & All India Institute of Ayurveda (AIIA)**

[Live Web Application](https://ayu-ctms-sih26046.vercel.app/) • [API Documentation (Swagger)](https://ayuctms-backend.onrender.com/api/v1/docs) • [Architectural Specifications](https://github.com/AncientWarRior13/ayuCTMS-sih26046/blob/main/docs/02-architecture-design.md) • [Demonstration Video](https://github.com/AncientWarRior13/ayuCTMS-sih26046)

---

## 🎯 Problem Statement (SIH 2026 — PS 26046)

**Ministry of Ayush / All India Institute of Ayurveda (AIIA)**: Clinical research in traditional medicine (Ayurveda, Siddha, Unani) faces severe methodological scrutiny, regulatory bottlenecks, and interoperability voids. Standard commercial CTMS solutions are engineered exclusively for Western allopathic pharmacology, failing to capture holistic Ayurvedic phenotypic concepts while remaining closed, exorbitantly priced, and unintegrated with national statutory repositories.

Key operational and regulatory bottlenecks include:
1. **Absence of Ayurvedic Clinical Ontologies**: Conventional Electronic Data Capture (EDC) solutions lack structured data primitives for **Prakriti** (constitutional phenotype), **Vikriti** (current pathological deviation), **Agni** (digestive/metabolic state), and **Koshtha** (bowel habit), leading to unstandardized paper questionnaires.
2. **Herb-Drug Interaction & Safety Blindspots**: Traditional pharmacovigilance tools do not model multi-herb compound polyherbal formulations or cross-reference concomitant allopathic medications for cytochrome P450 interactions, leading to unflagged adverse events.
3. **Regulatory Clock Non-Compliance**: The National Pharmacovigilance Programme for ASU drugs mandates strict reporting windows (24-hour initial alert, 7-day expedited report, 15-day complete dossier). Research institutes frequently miss statutory SLAs due to disconnected email chains.
4. **Data Integrity & Regulatory Auditing Deficits**: Trial records are susceptible to retroactive modification. Lack of tamper-evident SHA-256 hash chains prevents foolproof validation under **New Drugs and Clinical Trials Rules (2019)**, **Schedule Y**, and **ALCOA+** principles.

---

## 💡 Solution Overview: AyuCTMS (आयुसीटीएमएस)

**AyuCTMS** is an enterprise-grade, microservices-ready, role-governed clinical trial management and pharmacovigilance platform built explicitly for the Ministry of Ayush and affiliated research hospitals.

AyuCTMS captures multi-site clinical trials from prospective CTRI registry synchronization and Institutional Ethics Committee (IEC) governance to participant randomization, e-CRF collection, dynamic herb-drug interaction screening, and WHO-UMC / Naranjo adverse event causality assessment. Every transaction is immutably anchored in an append-only cryptographic ledger with Merkle-checkpoint verification, guaranteeing courtroom-grade auditability and direct export into **HL7 FHIR R4** and **CDISC SDTM v3.3** datasets.

---

## 📱 Platform Showcase & Core UI Screens

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              AYUCTMS UNIFIED COMMAND DECK                               │
│  [Institutional Dashboard]    [Protocol Lifecycle]    [Safety PV Center]    [Auditing]  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  ⚡ Active Regulatory Clocks   ⚡ Pharmacovigilance Signals  ⚡ Herb-Drug Interactions    │
│  • -9h 22m OVERDUE (Red)      • Disproportionality (PRR/ROR) • Live CYP450 Mechanism    │
│  • 14h 10m RUNNING (Teal)     • MedDRA SOC Clustering      • Real-Time Guidance Popup  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  📊 Prakriti Stratified Outcomes        🔐 SHA-256 Merkle Chain Audit Ledger           │
│  • Vata / Pitta / Kapha Delta Scores    • Zero-Tamper Transaction Validation          │
│  • Dose-Response Phenotype Correlation  • Cryptographic Checkpoint Anchoring            │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Key Unique Selling Propositions (USPs)

| Feature | Legacy CTMS / Manual Spreadsheets | AyuCTMS (PS 26046) |
| :--- | :--- | :--- |
| **Ayurvedic Phenotyping in EDC** | Generic text fields; zero standardized scoring for Prakriti, Agni, or Dhatu. | Native JSON-schema CRF with standardized 16-attribute Prakriti/Vikriti models, longitudinal score tracking, 7-Dhatu Sarata analysis, and dual **NAMASTE & WHO ICD-11 TM-2** coding. |
| **21 CFR Part 11 Electronic Signatures** | Weak unverified checkboxes or external unsecured PDF signoffs. | Cryptographic dual-credential signing (**Password + TOTP MFA**) with statutory intent semantics (`AUTHORSHIP`, `APPROVAL`, `REVIEW`, `VERIFICATION`), HMAC SHA-256 seal generation, and immutable audit anchoring. |
| **Herb-Drug Interaction Engine** | Non-existent; relies on external paper manuals or separate toxicology consultations. | Real-time curated Ayurvedic herb × allopathic drug matrix matching CYPs, P-gp, and pharmacodynamics on prescription with instant warning popups. |
| **Pharmacovigilance (PV) Clocks** | Manual calendar reminders; frequent missed 24h/7d/15d regulatory deadlines. | Autonomous real-time countdown engines with 50%/80%/100% threshold escalation rings and statutory telemetry. |
| **Signal Detection (PRR / ROR)** | Bare incident counts; lack statistical power to identify genuine disproportionality. | WHO-UMC VigiBase disproportionality modeling: PRR, χ² Yates correction, and ROR with 95% Confidence Intervals. |
| **Cryptographic Provenance & Tamper Shockwave** | Central database logs vulnerable to database admin tampering or retroactive edits. | Append-only SHA-256 hash-chained transaction ledger with verifiable Merkle tree checkpoint roots and interactive real-time tamper-evident verification. |
| **Full Regulatory CDISC & FHIR Interoperability** | Proprietary vendor lock-in databases requiring custom ETL scripts. | 1-Click export of **CDISC SDTM v3.3** (DM, AE), **CDISC ADaM v1.1** (ADSL, ADAE with Ayush dosha extensions), **CDISC Define-XML 2.0**, and complete **HL7 FHIR R4** bundles. |
| **Interactive 3D Cryptographic Landing Experience** | Static marketing landing pages with generic corporate templates. | High-performance Three.js/R3F WebGL visualizer featuring a 60-node hexagonal cryptographic lotus bloom, silk-smooth Lenis scroll interpolation, interactive tamper simulation, and automatic vector SVG fallback (`ScenePoster`). |
| **Ethics & Consent Comprehension** | Paper consent signatures with no objective comprehension validation. | Digital Informed Consent with integrated ICH-GCP comprehension quiz scored server-side prior to signature. |

---

## 🔬 Architectural Deep-Dive

```
                       AYUCTMS COMPREHENSIVE SYSTEM TOPOLOGY

 [ Clinical Research Sites ] ──► [ Vite + React 19 Client ] ──► [ FastAPI Async Engine ]
  • AIIMS / AIIA New Delhi        • Dark Glass Editorial Design   • Python 3.11+ REST Core
  • Multi-Centric Trial PIs       • Fluid Type Scale & HSL Tokens • Stateless JWT + TOTP MFA
  • Ethics Review Boards (IEC)    • WebGL / Canvas Visualizations • Row-Level Security (RLS)
                                                 │
                                                 ▼
 [ Standards & Interop Layer ] ◄─── [ Domain Engines & Safety ] ───► [ Persistent Storage ]
  • HL7 FHIR R4 Bundle Models     • Herb-Drug Interaction Matrix    • PostgreSQL 16 + RLS
  • CDISC SDTM v3.3 Controlled    • PRR / ROR Disproportionality    • SHA-256 Hash Chain
  • CDISC ADaM v1.1 (ADSL/ADAE)   • WHO-UMC Causality Algorithm     • Append-Only Audit Table
  • CDISC Define-XML 2.0 Engine   • Statutory Reporting Clocks      • Merkle Root Checkpoints
  • NAMASTE & ICD-11 TM-2 Coding  • 21 CFR Part 11 Digital Signoff  • 7-Role Granular RBAC
```

### 1. Ingestion & Cryptographic Provenance
- Ingests structured e-CRFs, laboratory parameters, study amendments, informed consents, electronic signatures, and adverse reactions.
- Every mutating SQL operation triggers an internal PostgreSQL function computing `SHA256(prev_hash || row_data || timestamp || user_id)` creating an unbroken, courtroom-grade tamper-evident forensic ledger.

### 2. Ayurvedic Phenotyping & Dual Ontologies (NAMASTE + ICD-11 TM-2)
- Comprehensive baseline & visit-level e-CRF capturing constitutional archetypes (**Vata**, **Pitta**, **Kapha** percentages summing to 100%), pathological deviations (**Vikriti**), digestive fire (**Agni**: Sama, Tikshna, Manda, Vishama), and bowel motility (**Koshtha**: Mridu, Madhyama, Krura).
- Multi-dimensional **Dhatu Sarata** tissue integrity evaluation (Rasa, Rakta, Mamsa, Meda, Asthi, Majja, Shukra).
- Dual standard diagnostic coding binding traditional terminology with **Ayush NAMASTE morbidity codes** and the **WHO ICD-11 Traditional Medicine Module 2 (TM-2)**.

### 3. 21 CFR Part 11 Compliant Electronic Signatures
- Strict regulatory sign-off system requiring dual re-authentication (**User Password + RFC 6238 TOTP**) before committing approvals.
- Enforces statutory signing intentions:
  - `AUTHORSHIP`: Primary clinical investigator or study coordinator entering original observation.
  - `APPROVAL`: PI or Ethics Committee head approving protocols or safety releases.
  - `REVIEW`: Clinical Monitor or PV Officer verifying quality adherence.
  - `VERIFICATION`: Source Data Verification (SDV) against hospital records.
- Computes SHA-256 verification seals stored immutably with client IP, timestamp, and audit trail link.

### 4. Advanced Pharmacovigilance & Herb-Drug Matrix
- Curated pharmacological database mapping classical formulations (*Ashwagandha*, *Guggulu*, *Guduchi*, *Brahmi*, *Triphala*) against allopathic drug classes (Anticoagulants, Antidiabetics, Antihypertensives, Statins).
- Live evaluation of pharmacokinetic mechanisms (CYP3A4 induction/inhibition, P-glycoprotein efflux modulation, platelet aggregation modulation) flagging high-risk co-prescriptions before adverse events manifest.
- Statutory PV clocks with 24h expedited, 7-day initial narrative, and 15-day complete dossier countdowns.

### 5. Regulatory CDISC & Interoperability Suite
- **CDISC SDTM v3.3**: Submission-ready Demographics (`DM.csv`) and Adverse Events (`AE.csv`) mapped to CDISC controlled terminology.
- **CDISC ADaM v1.1**: Ready-to-analyze Subject-Level Analysis (`ADSL.csv`) with Ayush extensions (`PRAKRITI`, `AGNITYPE`, `KOSHTHA`) and Adverse Event Analysis (`ADAE.csv`).
- **CDISC Define-XML 2.0**: Validated machine-readable XML schema defining dataset metadata, standard OIDs, codelists, and variable definitions.
- **HL7 FHIR R4**: 1-Click generation of comprehensive trial bundles (`ResearchStudy`, `ResearchSubject`, `Condition`, `Observation`, `AdverseEvent`).

### 6. Interactive 3D WebGL Architectural Visualizer
- Hardware-accelerated Three.js canvas depicting a 60-node hexagonal prism cryptographic lotus flower unfolding into a forward-secure audit corridor.
- 5th-degree smootherstep scroll interpolation with Lenis smooth scrolling.
- Real-time interactive tamper propagation: clicking any block dynamically calculates downstream hash breaks, propagating a deep crimson fracture wave across the chain.
- Automatic zero-overhead fallback to vector `ScenePoster` SVG mandala for older laptops, mobile devices, and reduced-motion preferences.

---

## 📂 Repository Structure

```
ayuCTMS-sih26046/
├── backend/                        # High-Performance FastAPI Python Backend
│   ├── app/
│   │   ├── core/                   # App Configuration, JWT Auth, Database Engine
│   │   ├── routers/                # 9 Modular REST & WebSocket API Routers
│   │   │   ├── auth.py             # RBAC Authentication, Refresh Tokens, TOTP MFA
│   │   │   ├── studies.py          # Study Lifecycle, CTRI Tracking, Ethics Approvals
│   │   │   ├── participants.py     # Patient Randomization, Visits, Prakriti CRF
│   │   │   ├── pv.py               # AE/SAE, Herb-Drug Checker, PV Clocks, WHO-UMC
│   │   │   ├── quality.py          # Protocol Deviations & Electronic Data Queries
│   │   │   ├── dashboard.py        # Portfolio KPIs, Prakriti Stratification Analytics
│   │   │   ├── audit_log.py        # SHA-256 Ledger Validation, Merkle Checkpoints
│   │   │   ├── interop.py          # HL7 FHIR R4 Bundles & CDISC SDTM Exporters
│   │   │   └── admin.py            # Site Isolation, User Provisioning, System Config
│   │   ├── services/               # Background Alert Hub, Telemetry, Signal Detection
│   │   └── main.py                 # FastAPI Application Entrypoint & Middleware
│   ├── db/                         # PostgreSQL DDL Schemas & Row-Level Security Rules
│   │   ├── schema.sql              # Core Relational Tables & Cryptographic Functions
│   │   └── app_role.sql            # Postgres RLS Policies & Least-Privilege Grants
│   ├── scripts/                    # Automated CTRI Seeding & Synthetic Trial Generators
│   ├── requirements.txt            # Production Python Dependencies
│   └── Dockerfile                  # Containerized Backend Specification
├── frontend/                       # React 19 + TypeScript + Vite + Tailwind CSS Station
│   ├── src/
│   │   ├── api/                    # Type-Safe Fetch Client & Single-Flight Token Refresh
│   │   ├── auth/                   # RBAC Hooks & Role Permission Matrix
│   │   ├── components/             # Reusable UI Tokens, Cards, Tables, Badges, Modals
│   │   │   ├── ChartTheme.tsx      # Dark Glass Recharts Theme, Palettes & Tooltips
│   │   │   ├── widgets.tsx         # KpiCards, ClockRings, Enrolment Progress Bars
│   │   │   └── landing/            # Editorial Asymmetric Landing Page Components
│   │   ├── routes/                 # Protected Dashboard Views
│   │   │   ├── Home.tsx            # Executive Portfolio Dashboard & Active Clocks
│   │   │   ├── Studies.tsx         # Clinical Trial Protocol Cohort Management
│   │   │   ├── Participants.tsx    # Subject EDC & Ayurvedic Phenotypic Entry
│   │   │   ├── Safety.tsx          # PV Center, Herb-Drug Checker, SAE Reports
│   │   │   ├── Signals.tsx         # PRR / ROR Disproportionality & Phenotype Stratification
│   │   │   ├── Risk.tsx            # Study x Site Heatmaps & Predictive Participant Risk
│   │   │   ├── Audit.tsx           # Cryptographic Chain Explorer & Merkle Proofs
│   │   │   ├── Interop.tsx         # FHIR R4 Bundle Viewer & CDISC SDTM Downloader
│   │   │   └── Login.tsx           # 1-Click Role Switcher & MFA Gateway
│   │   └── index.css               # Fluid Typography, HSL Design Tokens, Micro-Animations
│   ├── package.json                # Frontend Package Manifest
│   └── vite.config.ts              # Vite Build Configuration with Manual Code Chunking
├── docs/                           # Architecture, Requirements, and Standards Mapping
├── render.yaml                     # Infrastructure as Code for Render Cloud Deployment
└── vercel.json                     # Vercel SPA Routing & Build Configuration
```

---

## 🚀 Live Deployment & Environments

- **Production Web Application (Vercel)**: [https://ayu-ctms-sih26046.vercel.app](https://ayu-ctms-sih26046.vercel.app/)
- **Production Backend API (Render)**: [https://ayuctms-backend.onrender.com](https://ayuctms-backend.onrender.com/)
- **Interactive Swagger Documentation**: [https://ayuctms-backend.onrender.com/api/v1/docs](https://ayuctms-backend.onrender.com/api/v1/docs)
- **API Health Check**: [https://ayuctms-backend.onrender.com/api/v1/health](https://ayuctms-backend.onrender.com/api/v1/health)

---

## 🛠️ Local Installation & Development

### 1. Prerequisites
- **Python**: 3.11 or higher
- **Node.js**: 20.x or higher
- **PostgreSQL**: 15+ (with `pgcrypto` extension enabled)
- **Git**

### 2. Backend Setup
```bash
# Clone the repository
git clone https://github.com/AncientWarRior13/ayuCTMS-sih26046.git
cd ayuCTMS-sih26046

# Create and activate virtual environment
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp ../.env.example .env

# Initialize database schema and complete synthetic trial dataset
python scripts/seed.py --reset

# Start the FastAPI backend server (Port 8000)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup
```bash
# Open a new terminal
cd ayuCTMS-sih26046/frontend

# Install dependencies
npm install

# Start Vite dev server (Port 5173)
npm run dev
```
Open **`http://localhost:5173`** in your browser.

### 4. Demo Login Credentials

The synthetic dataset includes pre-configured role-based test accounts with single-click login cards on the Access Gateway:

| Role | Account Email | Password | Access Scope |
| :--- | :--- | :--- | :--- |
| **Principal Investigator (PI)** | `pi@demo.test` | `Demo@12345` | Protocol cohorts, patient randomization, e-CRF entry |
| **Study Coordinator** | `coord@demo.test` | `Demo@12345` | Subject screening, visit scheduling, data queries |
| **Clinical Monitor** | `monitor@demo.test` | `Demo@12345` | Source data verification (SDV), protocol deviations |
| **Ethics Committee (IEC)** | `iec@demo.test` | `Demo@12345` | Ethical clearances, informed consent review |
| **Pharmacovigilance (PV)** | `pv@demo.test` | `Demo@12345` | SAE reporting, herb-drug checker, regulatory clocks |
| **Regulator (Sovereign)** | `regulator@demo.test` | `Demo@12345` | Read-only sovereign oversight & audit verification |
| **Administrator** | `admin@demo.test` | `Demo@12345` | Multi-site isolation, system telemetry, user management |

---

## 🔐 Security, Compliance & Legal Guardrails

- **Digital Personal Data Protection (DPDP) Act, 2023**: Enforces patient pseudonymization at collection, encrypted PII columns using Fernet cryptographic primitives, and strict role segregation.
- **21 CFR Part 11 & GCP Schedule Y Compliance**: SHA-256 forward-linked audit logs capturing timestamp, user ID, client IP, old value, and new value for every record creation, mutation, or deletion.
- **PostgreSQL Row-Level Security (RLS)**: Enforces physical multi-site isolation so that investigators from Site A cannot query or enumerate records from Site B.
- **Sovereign Regulatory Oversight**: Dedicated read-only **Regulator** role guaranteeing total transparency without permitting write tampering.

---

## 🏆 SIH 2026 Evaluation Reference (PS 26046 Match)

| SIH PS 26046 Benchmark | AyuCTMS Implementation & Compliance | Verified File Reference |
| :--- | :--- | :--- |
| **Ayurvedic Phenotyping CRF** | Full Prakriti, Vikriti, Agni, and Koshtha capture with longitudinal efficacy tracking and dual NAMASTE/ICD-11 TM-2 coding. | [`AyurvedicPhenotypeCard.tsx`](https://github.com/AncientWarRior13/ayuCTMS-sih26046/blob/main/frontend/src/components/clinical/AyurvedicPhenotypeCard.tsx) |
| **21 CFR Part 11 Electronic Signatures** | Password + TOTP dual-factor re-authentication with statutory intent semantics and SHA-256 seals. | [`ElectronicSignatureModal.tsx`](https://github.com/AncientWarRior13/ayuCTMS-sih26046/blob/main/frontend/src/components/signatures/ElectronicSignatureModal.tsx) |
| **Herb-Drug Interaction Check** | Live Ayurvedic herb × allopathic drug matrix matching CYPs and P-gp mechanisms. | [`pv.py`](https://github.com/AncientWarRior13/ayuCTMS-sih26046/blob/main/backend/app/routers/pv.py) |
| **Pharmacovigilance Clocks** | Real-time Schedule Y / ASU 24h, 7d, and 15d countdown escalation timers. | [`widgets.tsx`](https://github.com/AncientWarRior13/ayuCTMS-sih26046/blob/main/frontend/src/components/widgets.tsx) |
| **Signal Detection (PRR / ROR)** | Disproportionality statistics (PRR, Yates-corrected χ², ROR 95% CI) mirror WHO-UMC. | [`pv.py`](https://github.com/AncientWarRior13/ayuCTMS-sih26046/blob/main/backend/app/routers/pv.py) |
| **Cryptographic Audit Trail** | Immutable SHA-256 hash-chained transaction ledger with Merkle root anchoring & interactive tamper shockwave. | [`ChainMesh.tsx`](https://github.com/AncientWarRior13/ayuCTMS-sih26046/blob/main/frontend/src/components/landing/three/ChainMesh.tsx) |
| **CDISC & FHIR Interoperability** | 1-Click export of HL7 FHIR R4 Bundles, CDISC SDTM (DM, AE), CDISC ADaM (ADSL, ADAE), and CDISC Define-XML 2.0. | [`StudyDetail.tsx`](https://github.com/AncientWarRior13/ayuCTMS-sih26046/blob/main/frontend/src/routes/StudyDetail.tsx) |
| **Predictive Monitoring** | Leading-indicator risk score identifying visit slippage and query pileups. | [`quality.py`](https://github.com/AncientWarRior13/ayuCTMS-sih26046/blob/main/backend/app/routers/quality.py) |

---

*Developed with clinical precision and engineering rigor for the Smart India Hackathon 2026.*  
*Built by Team **JSON 0xFF**.*
