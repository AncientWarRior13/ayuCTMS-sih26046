# AyuCTMS Security Architecture — Role-Based Access Control (RBAC) Specification & Audit Report

> **Standard Compliance:** 21 CFR Part 11 · ICH-GCP E6(R2) · Indian IT Act 2000 · Digital Personal Data Protection (DPDP) Act 2023 · Ayush Good Clinical Practice  
> **Source of Truth:** `backend/app/core/permissions.py` · `backend/db/schema.sql` · `frontend/src/auth/RoleGuard.tsx`  
> **Date:** October 1, 2026  
> **System:** AyuCTMS v2 (Ministry of Ayush / AIIA — PS 26046)

---

## 1. Executive Summary & Security Assessment

A complete security and privilege review was conducted across the backend REST endpoints, database Row-Level Security (RLS) policies, and frontend navigation guards.

### Key Audit Findings
1. **Deny-by-Default Posture:** All API endpoints are protected by statutory dependency checks (`require(perm)`). Unauthenticated requests immediately return `401 Unauthorized`; unauthorized requests return `403 Forbidden`.
2. **Statutory Auditor (Regulator) Protection:** Under statutory guidelines (CDSCO, DCGI, FDA), regulatory observers must be strictly passive. A hard server-side assertion (`assert all(...)` in `permissions.py:83`) enforces that `REGULATOR` holds **zero** write/mutating permissions (`POST`, `PUT`, `PATCH`, `DELETE`).
3. **Data Protection & PII Isolation (DPDP Act 2023):** Only the Principal Investigator and Clinical Coordinator can access direct Patient Identifiable Information (`participant.pii`). All PII is encrypted at rest using AES-128 Fernet, and access requires an explicit clinical reason logged into the immutable SHA-256 chain.
4. **Multi-Centric Site Isolation (RLS):** Clinical coordinators and site nurses are restricted via PostgreSQL Row-Level Security (`set_config('app.site_ids', ...)`) to their assigned hospital sites. Data from foreign trial sites is invisible at the SQL engine level.
5. **PI Trial Boundary:** Principal Investigators have full authority only over trials where `study.pi_user_id == user.id`. Foreign study records cannot be transitioned or exported.

**Vulnerability Status:** **No illegal privilege escalation or unauthorized data access detected.**

---

## 2. 7-Persona Role Definitions

* **`PI` (Principal Investigator):** Medical doctor / clinical scientist leading the trial. Direct oversight over protocol design, safety, causality, and medical approvals.
* **`COORDINATOR` (Clinical Study Coordinator):** On-site clinical staff handling participant recruitment, digital informed consent, and visit-by-visit e-CRF data entry.
* **`MONITOR` (Clinical Research Associate / CRA):** Independent quality monitor performing Source Data Verification (SDV), logging deviations, and raising clinical queries.
* **`IEC` (Institutional Ethics Committee):** Ethical review board approving initial protocols, assessing amendments, and monitoring participant safety.
* **`PV` (Pharmacovigilance Officer):** Dedicated safety scientist tracking adverse events (AE/SAE), running MedDRA disproportionality algorithms (PRR/ROR), and dispatching regulatory safety dossiers.
* **`ADMIN` (System Administrator):** IT administrator managing users, cryptographic checkpoints, system rules, and technical health.
* **`REGULATOR` (Statutory Auditor / DCGI / Ministry of Ayush):** Independent inspector with read-only access to clinical records, datasets, and the SHA-256 Merkle audit trail.

---

## 3. Comprehensive RBAC Access Matrix ("Who Can Access What")

| Functional Domain | Action / Permission Key | PI | Coordinator | Monitor | Ethics (IEC) | PV Officer | System Admin | Regulator |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Studies & Protocols** | View Studies (`study.read`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ *(Read-only)* |
| | Create New Protocol (`study.create`) | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| | Edit Protocol Specifications (`study.update`) | ✅ *(Own only)* | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| | Advance Lifecycle Stage (`study.transition`) | ✅ *(Own only)* | ❌ | ❌ | ✅ *(EC approval)* | ❌ | ✅ | ❌ |
| | Record Ethics Approval (`ethics.create`) | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| | Set CTRI Registration No. (`ctri.set`) | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| | Milestone Tracking (`milestone.write`) | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| | Site Monitoring Reports (`monitoring.write`) | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Subject & Clinical CRFs** | View Participants & Visits (`participant.read`) | ✅ | ✅ *(Assigned site)*| ✅ | ❌ | ✅ | ✅ | ✅ *(Read-only)* |
| | Enrol Subject (`participant.create`) | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Decrypt Direct PII (`participant.pii`) | ✅ *(Audited)* | ✅ *(Audited)* | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Record Informed Consent (`consent.write`) | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Log / Reschedule Visits (`visit.write`) | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Submit / Edit Visit e-CRF (`crf.write`) | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Ayurvedic Phenotyping** | View Phenotype Records (`phenotype.read`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ *(Read-only)* |
| | Record / Update Prakriti (`phenotype.write`)| ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ❌ |
| **Quality & Deviations** | View Protocol Deviations (`deviation.read`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ *(Read-only)* |
| | Log Protocol Deviation (`deviation.create`) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| | Sign Off Deviation (`deviation.signoff`) | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| | Open Clinical Query (`query.create`) | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| | Answer Clinical Query (`query.answer`) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Close Resolved Query (`query.close`) | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Pharmacovigilance (PV)** | View Adverse Events (`ae.read`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ *(Read-only)* |
| | Report Initial AE / SAE (`ae.create`) | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| | Medical Causality / Naranjo (`ae.causality`)| ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| | Submit Expedited Regulatory Dossier (`ae.submit`)| ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| | Generate Safety Summaries (`ae.report`) | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ *(Read-only)* |
| | MedDRA PRR/ROR Signals (`pv.signals`) | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ *(Read-only)* |
| **Audit & Forensic Chain** | View Central Audit Ledger (`audit.read`) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ *(Auditor)* |
| | Cryptographic Verification (`audit.verify`) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ *(Auditor)* |
| | Create Merkle Checkpoint (`audit.checkpoint`)| ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **21 CFR Part 11 Signatures** | Electronically Sign Records (`signature.sign`)| ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ *(Observer)* |
| | View Signature Seals (`signature.read`) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Interoperability & Exports** | Full CDISC SDTM / Define-XML (`export.study`)| ✅ *(Own only)* | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ *(Read-only)* |
| | Safety Extracts & FHIR R4 (`export.safety`)| ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ *(Read-only)* |
| | Ingest Hospital EHR (`import.fhir`) | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **System Administration** | User Management & MFA Reset (`admin.users`) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| | Multi-Centric Site Config (`admin.sites`) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| | Clinical Business Rules (`rules.write`) | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |

---

## 4. Architectural Safeguards

### 4.1 Row-Level Security (PostgreSQL 16)
```sql
-- Coordinator isolation policy (excerpt from schema.sql)
CREATE POLICY coordinator_site_isolation ON participants
FOR ALL TO ayuctms_app
USING (
  current_setting('app.role') IN ('PI', 'ADMIN', 'PV', 'IEC', 'REGULATOR')
  OR site_id = ANY(string_to_array(current_setting('app.site_ids'), ',')::int[])
);
```

### 4.2 Electronic Signature Regulatory Semantics
* **`AUTHORSHIP`**: Primary clinical investigator / coordinator entering original clinical observation.
* **`APPROVAL`**: Medical lead (PI) or Ethics Committee approving protocols or critical safety releases.
* **`REVIEW`**: Clinical Monitor / PV Officer confirming quality adherence and adverse event causality.
* **`VERIFICATION`**: Source Data Verification against physical hospital medical records.
