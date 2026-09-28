# 05 — Standards & Compliance Mapping

Status legend: **[PS]** stated in the problem statement; **[Verify]** must be confirmed against primary text before you claim it in the deck; **[Design]** our own decision.

## 1. Compliance matrix
| Requirement | Source | How AyuCTMS addresses it | Status |
|---|---|---|---|
| Prospective CTRI registration | PS; CTRI FAQ (registration before first enrolment) | Lifecycle guard: cannot reach ENROLLING without `ctri_registrations` row dated on/before first enrolment | [PS] |
| Ethics Committee approval | PS; ICMR guidelines | `ethics_approvals` with validity + continuing-review alerts; guard on lifecycle | [PS] |
| GCP-ASU | PS | Roles, deviations/CAPA, monitoring, audit, consent | [Verify exact clauses] |
| NDCT Rules 2019 (SAE reporting) | PS | Config-driven clocks in `regulatory_rules` with mandatory `source_note` | [Verify durations] |
| ALCOA+ | PS | Attributable (actor on every audit row), Legible, Contemporaneous (server timestamps), Original (versioned entries), Accurate (validation), + Complete/Consistent/Enduring/Available | [PS] |
| Immutable, time-stamped audit trail | PS | Hash chain + append-only trigger + verify endpoint | [PS] |
| Electronic signature controls | PS | Reason-for-change + re-authentication on sign-offs (MVP); DSC/eSign roadmap | [PS], partial |
| DPDP Act 2023 + 2025 Rules | PS | Consent versioning, data minimisation, PII split + encryption, breach-log hook, purpose-tagged access audit | [PS]; confirm phase dates on MeitY text |
| Data residency, ISO 27001, CERT-In | PS | India-region deployment; documented control mapping; audit by CERT-In empanelled auditor is roadmap | [PS] |
| Role-based access incl. read-only regulator | PS | RBAC matrix + RLS + tests | [PS] |

## 2. Regulatory clock configuration
Never hard-code durations. Store in `regulatory_rules`:
| rule_key | hours | source_note |
|---|---|---|
| SAE_TO_LICENSING_AUTHORITY | 24 (placeholder) | Cite NDCT Rules 2019 clause once verified |
| SAE_TO_ETHICS_COMMITTEE | 24 (placeholder) | Cite once verified |
| SAE_DETAILED_REPORT | 336 (placeholder) | Cite once verified |

**Action for Team E:** read NDCT Rules 2019 (Chapter on compensation/SAE reporting and the relevant Schedule) and replace placeholders. Student repos assert a 24h clock; treat that as unverified until you have the primary text.

## 3. FHIR R4 mapping
| AyuCTMS entity | FHIR resource | Key element mapping |
|---|---|---|
| studies | ResearchStudy | identifier = protocol_no (+ CTRI number as second identifier), title, status (map from state), phase/category, principalInvestigator, site |
| participants | ResearchSubject | identifier = subject_code, study -> ResearchStudy, individual -> Patient, status, assignedArm = arm |
| participants (minimal) | Patient | identifier = subject_code only, gender = sex, birthDate omitted (age in extension) — pseudonymised |
| adverse_events | AdverseEvent | subject -> Patient, event.text = description, seriousness (serious/non-serious), severity, actuality = actual, suspectEntity.causality, outcome, recordedDate, date = onset_date |
| consents | Consent (optional stretch) | patient, dateTime, policy, status (active/withdrawn) |

Extensions (define under `http://example.org/fhir/StructureDefinition/` or your namespace):
- `ayush-prakriti`, `ayush-vikriti`, `ayush-agni` on Observation for CRF Ayurveda fields.
- `ayush-morbidity-code` on AdverseEvent.

Implementation: build with `fhir.resources` (R4 models), assemble a `Bundle` type `collection`, run model validation, and validate once with the public HL7 validator for the demo screenshot.

ABDM alignment: describe as mapping/roadmap (ABHA linkage, HIP/HIU roles) unless mentors provide sandbox access [Verify].

## 4. CDISC SDTM mapping (MVP domains)

### DM (Demographics)
| SDTM variable | Source |
|---|---|
| STUDYID | studies.protocol_no |
| DOMAIN | "DM" |
| USUBJID | STUDYID + "-" + participants.subject_code |
| SUBJID | participants.subject_code |
| SITEID | sites.code |
| AGE | participants.age_years |
| AGEU | "YEARS" |
| SEX | participants.sex |
| ARM | participants.arm |
| RFSTDTC | participants.enrolled_on (ISO 8601) |

### AE (Adverse Events)
| SDTM variable | Source |
|---|---|
| STUDYID, DOMAIN="AE", USUBJID | as above |
| AESEQ | row number per subject |
| AETERM | adverse_events.description |
| AEDECOD | meddra_pt (stub) |
| AESEV | severity (MILD/MODERATE/SEVERE) |
| AESER | "Y" if is_serious else "N" |
| AEREL | causality mapped to controlled terms |
| AEOUT | outcome |
| AESTDTC | onset_date |
| AEACN | action_taken |

CDASH alignment: field labels on CRF forms follow CDASH naming where possible (e.g. AETERM, AESTDAT). ADaM and Define-XML are roadmap; show a slide listing the planned datasets (ADSL, ADAE).

## 5. Dictionaries
| Dictionary | Plan |
|---|---|
| MedDRA | Licensed. Demo with ~50-term stub in `lookup_meddra_stub`; state licence path in deck [Verify licence terms] |
| WHODrug | Licensed. Free-text + stub code field |
| Ayush morbidity codes / ICD-11 | The Ayush Suraksha portal reports using these; include lookup seed and a dual-code field [Reported by portal documentation] |

## 6. DPDP-by-design checklist
- [ ] Notice + consent versioned and stored with hash of document text
- [ ] Purpose recorded for each PII access (audit `reason`)
- [ ] PII in separate encrypted table; exports pseudonymised by default
- [ ] Withdrawal supported and honoured in UI
- [ ] Retention setting per study (config placeholder)
- [ ] Breach-incident log table and admin workflow (stretch)
- [ ] Children's data flag (age < 18 needs verifiable guardian consent) — implement as a validation rule
Note: sources disagree on which obligations bind before May 2027; present the system as "compliant by design" rather than asserting current legal enforcement dates.

## 7. Security control mapping (ISO 27001 style, for slide)
| Control area | Implementation |
|---|---|
| Access control | RBAC, RLS, lockout, TOTP |
| Cryptography | TLS, pgcrypto, argon2id |
| Logging | Hash-chained audit, export logs |
| Change management | Reason-for-change, versioned CRFs |
| Backup | Nightly encrypted dump (production plan) |
| Supplier/hosting | India-region cloud (production plan) |

## 8. Datasets and public sources
The PS lists public sources for development data: CTRI public records (ctri.nic.in), CDISC standards and controlled terminology (cdisc.org), and the HL7 FHIR R4 specification with ABDM building blocks. How each is used, the de-identification rules and the ingestion scripts are in `07-datasets-and-sources.md`. Controlled terminology for SDTM values is loaded into `lookup_cdisc_ct`, and every seeded table is traced in `data_provenance`.

## 9. Claims you must NOT make without evidence
- "21 CFR Part 11 validated" or "CDSCO approved"
- "ABDM integrated" (unless sandbox actually used)
- "Real MedDRA coding"
- Exact SAE deadlines without citing the rule text
