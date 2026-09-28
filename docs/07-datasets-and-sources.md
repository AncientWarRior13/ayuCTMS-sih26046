# 07 — Datasets, Public Sources & Ingestion Plan

**Rule from the PS:** clinical-trial data is sensitive personal data, so development must use **synthetic or de-identified** data only. Every record in AyuCTMS is flagged `is_synthetic = TRUE` and traced in `data_provenance` (see schema).

**Status of this list:** the PS text you pasted was cut off mid-list (it ends at "HL7 FHIR R4 specification & ABDM building..."). Sources 1–3 below are the ones named in that text. Source 4 (Synthea) and the reference items in section 6 are my additions, marked as such. If the official PS has more datasets after that cut-off, paste the rest and I will add them.

## 1. Source registry
| # | Source | URL | Named in PS? | What we use it for | Licence / access note |
|---|---|---|---|---|---|
| 1 | Clinical Trials Registry – India (CTRI), public trial records | ctri.nic.in | Yes | Realistic study metadata for seed studies: Ayurveda-type titles, design, sample size, phase, sponsor type, registration-field structure (drives `ctri_registrations` and the lifecycle guard) | Public register run by ICMR. Check the site's terms before any bulk download or scraping; prefer manual curation of 10–20 records [Verify] |
| 2 | CDISC standards and controlled terminology (CDASH, SDTM, ADaM, Define-XML) | cdisc.org; CDISC Library at library.cdisc.org | Yes | Variable names, code lists for SDTM DM/AE (SEX, AESEV, AESER, AEOUT, AEREL), CDASH field labels for CRF templates | Terminology is downloadable from the CDISC Library; an account may be needed [Verify] |
| 3 | HL7 FHIR R4 specification; ABDM building blocks | hl7.org/fhir/R4; ABDM developer/sandbox portal | Yes (text cut off after "ABDM building") | Resource structure for ResearchStudy, ResearchSubject, Patient, AdverseEvent, Consent; ABHA/HIP/HIU concepts for the mapping doc | FHIR spec is open. ABDM sandbox needs registration; treat as mapping-only unless mentors give access |
| 4 | Synthea synthetic patients (**my addition, not confirmed in the PS**) | synthea.mitre.org/downloads | No | Realistic synthetic Patient records (FHIR R4 sample of 100 patients is offered for download) to seed `participants` and to test FHIR import | Open-source synthetic generator; sample downloads are published on its downloads page |

## 2. What each source feeds in AyuCTMS
| Source | Feeds table / feature | Field-level use |
|---|---|---|
| CTRI records | `studies`, `ctri_registrations`, `study_milestones` | title, study type, intervention type, target sample, registration date pattern, CTRI-number format (CTRI/YYYY/MM/NNNNNN) |
| CDISC CT | `lookup_cdisc_ct` (new), SDTM export, CRF dropdowns | code lists for sex, severity, seriousness, outcome, relationship |
| CDASH | `crf_templates.json_schema` | field names/labels for AE, DM, VS, CM forms |
| FHIR R4 | `services/fhir.py`, `/import/fhir` | resource shape, required elements, Bundle type `collection` |
| ABDM | `docs/05` mapping section, optional consent/ABHA-pseudonym fields | ABHA-linked pseudonym idea, HIP/HIU roles (mapping only) |
| Synthea | `scripts/seed_from_synthea.py` | age, sex, conditions, medications -> participant baseline, concomitant meds |

## 3. Ingestion pipeline (to build)
```
data/
  raw/
    ctri_curated.csv          # hand-curated public CTRI metadata (10-20 rows)
    cdisc_ct_subset.csv       # exported code lists actually used
    synthea_fhir_r4/          # unzipped 100-patient sample
  processed/
  README.md                   # provenance + licence notes per file
backend/scripts/
  build_cdisc_ct.py           # loads cdisc_ct_subset.csv -> lookup_cdisc_ct
  seed_studies_from_ctri.py   # curated CTRI rows -> studies + ctri_registrations (fictional PI/sites)
  seed_from_synthea.py        # Synthea Patient bundles -> participants (see rules below)
  gen_trial_events.py         # synthetic visits, deviations, queries, AEs with fixed random seed
```

### Synthea -> participants rules (de-identification by construction)
| Synthea FHIR element | Action |
|---|---|
| Patient.gender | copy to `sex` (M/F) |
| Patient.birthDate | convert to `age_years` at enrolment; **drop birthDate** |
| Patient.name, address, telecom, identifiers | **discard**; participant name in `participant_pii` is a generated fake name |
| Condition / MedicationRequest | optional: comorbidity/concomitant text for AE form |
| everything else | ignore |
Set `subject_code` as `AIIA-<study>-<seq>`; set `is_synthetic = TRUE`.

### CTRI -> studies rules
- Copy only public, non-personal fields (title, design, sample size, intervention type, registration date).
- Replace PI, sponsor contacts, sites with fictional values.
- Never store real CTRI investigator personal data.
- Record `source_url` and access date in `data_provenance`.

### Event generator rules (`gen_trial_events.py`)
- Fixed seed (e.g. 26046) so demo data is reproducible.
- Target mix: ~150 participants in the main study, ~8 deviations, ~10 queries, ~20 AEs with 3 serious (one clock ~85% elapsed, one overdue).
- Use CDISC CT terms for sex/severity/outcome so SDTM export is clean.
- Ayurveda CRF fields (Prakriti, Vikriti, Agni, Koshtha) drawn from small fixed vocabularies.

## 4. Dataset-related validation
| Check | Pass condition |
|---|---|
| No direct identifiers | grep of processed data finds no real names/addresses; only fake names in `participant_pii` |
| Provenance complete | every seeded table has a `data_provenance` row |
| CT conformance | SDTM DM/AE values all exist in `lookup_cdisc_ct` |
| FHIR round trip | Synthea Patient imports via `/import/fhir` and re-exports as valid R4 |
| Reproducible | running seed twice with same seed yields identical row counts |

## 5. Dictionaries that are NOT in this list
The PS asks for MedDRA and WHODrug coding, but they are licensed and are not among the listed public sources. Keep the stub tables (`lookup_meddra_stub`, WHODrug free-text/stub) and say so in the deck.

## 6. Additional reference material (my additions, not from the PS)
| Item | Why it helps | URL |
|---|---|---|
| CDISC knowledge-base articles on mapping FHIR data to SDTM and ADaM using Synthea data | Worked examples of FHIR -> SDTM/ADaM mapping; note they use an older FHIR version and say CDISC and FHIR terminologies are not harmonised | cdisc.org/kb/articles |
| Ayush Suraksha portal | Real ADR reporting flow for ASU&H; uses ICD-11 and National AYUSH Morbidity Codes | suraksha.ayush.gov.in |
| AIIA pharmacovigilance page | NPvCC context | aiia.gov.in/#/pharmacovigilance |

## 7. Access-date log (fill in when you download)
| File | Source URL | Date accessed | Licence checked by |
|---|---|---|---|
| ctri_curated.csv | ctri.nic.in | | |
| cdisc_ct_subset.csv | library.cdisc.org | | |
| synthea_fhir_r4/ | synthea.mitre.org/downloads | | |
