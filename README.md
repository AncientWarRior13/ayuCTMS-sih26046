# AyuCTMS (आयुसीटीएमएस) — AI & Standards-Driven Clinical Trial Management System for Ayurveda Research

> **Next-Generation Multi-Site Protocol Management, Cryptographic Audit Provenance, Real-Time Pharmacovigilance & Interoperable Clinical Data Platform for the Ministry of Ayush & All India Institute of Ayurveda (AIIA)**

[Live Web Application](https://ayuctms.vercel.app/) • [API Documentation (Swagger)](https://ayuctms-backend.onrender.com/api/v1/docs) • [Architectural Specifications](https://github.com/AncientWarRior13/sih-46/blob/main/docs/02_ARCHITECTURE.md) • [Demonstration Video](https://github.com/AncientWarRior13/sih-46)

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
| **Ayurvedic Phenotyping in EDC** | Generic text fields; zero standardized scoring for Prakriti, Agni, or Dhatu. | Native JSON-schema CRF with standardized 16-attribute Prakriti/Vikriti models and longitudinal score tracking. |
| **Herb-Drug Interaction Engine** | Non-existent; relies on external paper manuals or separate toxicology consultations. | Real-time curated Ayurvedic herb × allopathic drug matrix matching CYPs, P-gp, and pharmacodynamics on prescription. |
| **Pharmacovigilance (PV) Clocks** | Manual calendar reminders; frequent missed 24h/7d/15d regulatory deadlines. | Autonomous real-time countdown engines with 50%/80%/100% threshold escalation rings and statutory telemetry. |
| **Signal Detection (PRR / ROR)** | Bare incident counts; lack statistical power to identify genuine disproportionality. | WHO-UMC VigiBase disproportionality modeling: PRR, χ² Yates correction, and ROR with 95% Confidence Intervals. |
| **Cryptographic Provenance** | Central database logs vulnerable to database admin tampering or retroactive edits. | Append-only SHA-256 hash-chained transaction ledger with verifiable Merkle tree checkpoint roots. |
| **Global Interoperability** | Proprietary vendor lock-in databases requiring custom ETL scripts. | 1-Click HL7 FHIR R4 Bundle export and CDISC SDTM (DM, AE, VS, QS) datasets compliant with US FDA / CDSCO guidelines. |
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
  • NAMASTE Ayush Morbidity Code  • WHO-UMC Causality Algorithm     • Append-Only Audit Table
  • CTRI Prospective Sync         • Statutory Reporting Clocks      • Merkle Root Checkpoints
```

### 1. Ingestion & Cryptographic Provenance
- Ingests structured e-CRFs, laboratory parameters, study amendments, informed consents, and adverse reactions.
- Every mutating SQL operation triggers an internal PostgreSQL function computing `SHA256(prev_hash || row_data || timestamp || user_id)` creating an unbroken, tamper-evident forensic ledger.

### 2. Ayurvedic Phenotyping & Clinical EDC
- Standardized e-CRF captures constitutional baseline archetypes: **Vata**, **Pitta**, **Kapha**, and dvandvaja / sannipataja combinations.
- Real-time phenotypic cross-tabulation: correlate primary efficacy deltas and adverse incident rates against constitutional phenotypes to evaluate targeted Ayurvedic efficacy.

### 3. Safety Command & Autonomous Reporting Clocks
- Statutory clocks track multi-tiered deadlines under Schedule Y and ASU Pharmacovigilance guidelines:
  - **Initial 24-Hour Notification**: Expedited alert for fatal or life-threatening adverse reactions.
  - **7-Day Initial Report**: Mandatory clinical narrative submission to the Ethics Committee and Licensing Authority.
  - **15-Day Complete Dossier**: Comprehensive causality, dechallenge/rechallenge records, and medical records.
- Built-in live SVG `ClockRing` components display remaining/overdue hours with non-jittering 1Hz updates.

### 4. Advanced Pharmacovigilance & Herb-Drug Matrix
- Curated pharmacological database mapping classical formulations (*Ashwagandha*, *Guggulu*, *Guduchi*, *Brahmi*, *Triphala*) against allopathic drug classes (Anticoagulants, Antidiabetics, Antihypertensives, Statins).
- Live evaluation of pharmacokinetic mechanisms (CYP3A4 induction/inhibition, platelet aggregation modulation) flagging high-risk co-prescriptions before adverse events manifest.

### 5. Standards Interoperability & Export Engine
- **HL7 FHIR R4**: Generates complete `ResearchStudy`, `ResearchSubject`, `Condition`, `Observation`, and `AdverseEvent` resource bundles.
- **CDISC SDTM v3.3**: Exports submission-ready Demographics (`DM.csv`) and Adverse Events (`AE.csv`) mapped to CDISC controlled terminology.

---

## 📂 Repository Structure

```
sih-46/
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

- **Production Web Application (Vercel)**: [https://ayuctms.vercel.app](https://ayuctms.vercel.app/)
- **Production Backend API (Render)**: [https://ayuctms-backend.onrender.com](https://ayuctms-backend.onrender.com/)
- **Interactive Swagger Documentation**: [https://ayuctms-backend.onrender.com/api/v1/docs](https://ayuctms-backend.onrender.com/api/v1/docs)
- **API Health Check**: [https://ayuctms-backend.onrender.com/api/v1/health](https://ayuctms-backend.onrender.com/api/v1/health)

---

## 🛠️ Local Installation & Development

### 1. Prerequisites
- **Python**: 3.11 or higher
- **Node.js**: 20.x or higher
- **PostgreSQL**: 15+ (with pgcrypto extension enabled)
- **Git**

### 2. Backend Setup
```bash
# Clone the repository
git clone https://github.com/AncientWarRior13/sih-46.git
cd sih-46/backend

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

# Initialize database schema and synthetic dataset
python scripts/seed.py --reset

# Start the FastAPI backend server (Port 8000)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Frontend Setup
```bash
# Open a new terminal
cd sih-46/frontend

# Install dependencies
npm install

# Start Vite dev server (Port 5173)
npm run dev
```
Open **`http://localhost:5173`** in your browser.

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
| **Ayurvedic Phenotyping CRF** | Full Prakriti, Vikriti, Agni, and Koshtha capture with longitudinal efficacy tracking. | [`backend/app/routers/participants.py`](https://github.com/AncientWarRior13/sih-46/blob/main/backend/app/routers/participants.py) |
| **Herb-Drug Interaction Check** | Live Ayurvedic herb × allopathic drug matrix matching CYPs and P-gp mechanisms. | [`backend/app/routers/pv.py`](https://github.com/AncientWarRior13/sih-46/blob/main/backend/app/routers/pv.py) |
| **Pharmacovigilance Clocks** | Real-time Schedule Y / ASU 24h, 7d, and 15d countdown escalation timers. | [`frontend/src/components/widgets.tsx`](https://github.com/AncientWarRior13/sih-46/blob/main/frontend/src/components/widgets.tsx) |
| **Signal Detection (PRR / ROR)** | Disproportionality statistics (PRR, Yates-corrected χ², ROR 95% CI) mirror WHO-UMC. | [`backend/app/routers/pv.py`](https://github.com/AncientWarRior13/sih-46/blob/main/backend/app/routers/pv.py) |
| **Cryptographic Audit Trail** | Immutable SHA-256 hash-chained transaction ledger with Merkle root anchoring. | [`backend/app/routers/audit_log.py`](https://github.com/AncientWarRior13/sih-46/blob/main/backend/app/routers/audit_log.py) |
| **Global Interoperability** | 1-Click HL7 FHIR R4 Bundle exporter and CDISC SDTM (DM, AE, VS, QS) generation. | [`backend/app/routers/interop.py`](https://github.com/AncientWarRior13/sih-46/blob/main/backend/app/routers/interop.py) |
| **Predictive Monitoring** | Leading-indicator risk score identifying visit slippage and query pileups. | [`backend/app/routers/quality.py`](https://github.com/AncientWarRior13/sih-46/blob/main/backend/app/routers/quality.py) |

---

*Developed with clinical precision and engineering rigor for the Smart India Hackathon 2026.*  
*Built by Team **JSON 0xFF**.*
