-- AyuCTMS PostgreSQL 16 schema. Run once on an empty database.
-- No extensions required: hashing uses built-in sha256(); PII is encrypted by the API.
-- All data must be synthetic for the demo.

SET timezone = 'GMT';

-- ---------- Enums ----------
CREATE TYPE user_role AS ENUM ('PI','COORDINATOR','MONITOR','IEC','PV','ADMIN','REGULATOR');
CREATE TYPE study_state AS ENUM ('DRAFT','PROTOCOL_APPROVED','EC_APPROVED','CTRI_REGISTERED','SITE_ACTIVE','ENROLLING','FOLLOW_UP','CLOSED');
CREATE TYPE study_type AS ENUM ('INTERVENTIONAL','OBSERVATIONAL');
CREATE TYPE participant_status AS ENUM ('SCREENED','ENROLLED','RANDOMIZED','COMPLETED','WITHDRAWN','SCREEN_FAILED');
CREATE TYPE severity_t AS ENUM ('MILD','MODERATE','SEVERE');
CREATE TYPE causality_t AS ENUM ('CERTAIN','PROBABLE','POSSIBLE','UNLIKELY','CONDITIONAL','UNASSESSABLE','UNRELATED');
CREATE TYPE outcome_t AS ENUM ('RECOVERED','RECOVERING','NOT_RECOVERED','RECOVERED_WITH_SEQUELAE','FATAL','UNKNOWN');
CREATE TYPE query_status AS ENUM ('OPEN','ANSWERED','CLOSED');
CREATE TYPE clock_status AS ENUM ('RUNNING','COMPLETED','OVERDUE');
CREATE TYPE alert_level AS ENUM ('INFO','WARN','CRITICAL');

-- ---------- Identity ----------
CREATE TABLE sites (
  id            SERIAL PRIMARY KEY,
  code          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  city          TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          user_role NOT NULL,
  password_hash TEXT NOT NULL,
  totp_secret   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  failed_logins INT NOT NULL DEFAULT 0,
  locked_until  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_users_email ON users (lower(email));

CREATE TABLE user_sites (
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  site_id INT REFERENCES sites(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, site_id)
);

-- ---------- Studies ----------
CREATE TABLE studies (
  id              SERIAL PRIMARY KEY,
  protocol_no     TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  type            study_type NOT NULL,
  phase           TEXT,
  intervention    TEXT,
  arms            TEXT[] NOT NULL DEFAULT ARRAY['Intervention','Control'],
  state           study_state NOT NULL DEFAULT 'DRAFT',
  pi_user_id      INT REFERENCES users(id),
  target_sample   INT NOT NULL CHECK (target_sample > 0),
  planned_start   DATE,
  planned_end     DATE,
  retention_years INT NOT NULL DEFAULT 15,
  source_ctri_ref TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE study_sites (
  study_id INT REFERENCES studies(id) ON DELETE CASCADE,
  site_id  INT REFERENCES sites(id),
  activated_on DATE,
  site_target INT,
  PRIMARY KEY (study_id, site_id)
);

CREATE TABLE study_milestones (
  id SERIAL PRIMARY KEY,
  study_id INT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  planned_date DATE NOT NULL,
  actual_date DATE
);

CREATE TABLE ethics_approvals (
  id SERIAL PRIMARY KEY,
  study_id INT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  committee_name TEXT NOT NULL,
  approval_ref TEXT,
  approved_on DATE NOT NULL,
  valid_to DATE NOT NULL,
  continuing_review_due DATE,
  CHECK (valid_to >= approved_on)
);

CREATE TABLE ctri_registrations (
  id SERIAL PRIMARY KEY,
  study_id INT NOT NULL UNIQUE REFERENCES studies(id) ON DELETE CASCADE,
  ctri_number TEXT NOT NULL,
  registered_on DATE NOT NULL,
  last_updated_on DATE
);

CREATE TABLE monitoring_visits (
  id SERIAL PRIMARY KEY,
  study_id INT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  site_id INT NOT NULL REFERENCES sites(id),
  visit_date DATE NOT NULL,
  monitor_id INT REFERENCES users(id),
  findings TEXT
);

CREATE TABLE audit_checkpoints (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_audit_id BIGINT NOT NULL,
  row_count BIGINT NOT NULL,
  merkle_root TEXT NOT NULL,
  created_by INT REFERENCES users(id)
);

-- ---------- Participants ----------
CREATE TABLE participants (
  id SERIAL PRIMARY KEY,
  study_id INT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  site_id INT NOT NULL REFERENCES sites(id),
  subject_code TEXT NOT NULL,
  status participant_status NOT NULL DEFAULT 'SCREENED',
  arm TEXT,
  enrolled_on DATE,
  sex CHAR(1) CHECK (sex IN ('M','F','U')),
  age_years INT CHECK (age_years BETWEEN 0 AND 120),
  is_synthetic BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (study_id, subject_code)
);

-- Direct identifiers kept apart; values are encrypted by the API (Fernet, key from PII_KEY)
CREATE TABLE participant_pii (
  participant_id INT PRIMARY KEY REFERENCES participants(id) ON DELETE CASCADE,
  name_enc BYTEA NOT NULL,
  contact_enc BYTEA
);

CREATE TABLE consent_documents (
  id SERIAL PRIMARY KEY,
  study_id INT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  content_hash TEXT NOT NULL,
  effective_from DATE NOT NULL,
  UNIQUE (study_id, version, language)
);

-- Protocol amendments; an amendment can mandate re-consent against a new consent document
CREATE TABLE protocol_amendments (
  id SERIAL PRIMARY KEY,
  study_id INT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  summary TEXT NOT NULL,
  approved_on DATE NOT NULL,
  requires_reconsent BOOLEAN NOT NULL DEFAULT FALSE,
  consent_document_id INT REFERENCES consent_documents(id),
  created_by INT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (study_id, version)
);

CREATE TABLE consents (
  id SERIAL PRIMARY KEY,
  participant_id INT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  consent_document_id INT NOT NULL REFERENCES consent_documents(id),
  consented_at TIMESTAMPTZ NOT NULL,
  witness_name TEXT,
  guardian_consent BOOLEAN NOT NULL DEFAULT FALSE,
  withdrawn_at TIMESTAMPTZ,
  withdrawal_reason TEXT
);

CREATE TABLE visits (
  id SERIAL PRIMARY KEY,
  participant_id INT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  visit_name TEXT NOT NULL,
  planned_date DATE NOT NULL,
  window_days INT NOT NULL DEFAULT 3,
  actual_date DATE,
  status TEXT NOT NULL DEFAULT 'PLANNED' CHECK (status IN ('PLANNED','DONE','MISSED','OUT_OF_WINDOW'))
);

CREATE TABLE crf_templates (
  id SERIAL PRIMARY KEY,
  study_id INT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  form_name TEXT NOT NULL,
  json_schema JSONB NOT NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE TABLE crf_entries (
  id SERIAL PRIMARY KEY,
  visit_id INT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  template_id INT NOT NULL REFERENCES crf_templates(id),
  data JSONB NOT NULL,
  entered_by INT REFERENCES users(id),
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason_for_change TEXT,
  supersedes_id INT REFERENCES crf_entries(id)
);

CREATE TABLE deviations (
  id SERIAL PRIMARY KEY,
  study_id INT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  participant_id INT REFERENCES participants(id),
  category TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('MINOR','MAJOR','CRITICAL')),
  description TEXT NOT NULL,
  capa TEXT,
  reported_by INT REFERENCES users(id),
  monitor_signoff_by INT REFERENCES users(id),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE queries (
  id SERIAL PRIMARY KEY,
  crf_entry_id INT REFERENCES crf_entries(id) ON DELETE CASCADE,
  study_id INT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  participant_id INT REFERENCES participants(id),
  raised_by INT REFERENCES users(id),
  text TEXT NOT NULL,
  answer TEXT,
  answered_by INT REFERENCES users(id),
  status query_status NOT NULL DEFAULT 'OPEN',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- ---------- Pharmacovigilance ----------
CREATE TABLE adverse_events (
  id SERIAL PRIMARY KEY,
  study_id INT NOT NULL REFERENCES studies(id) ON DELETE CASCADE,
  participant_id INT NOT NULL REFERENCES participants(id),
  onset_date DATE NOT NULL,
  awareness_at TIMESTAMPTZ NOT NULL,
  description TEXT NOT NULL,
  severity severity_t NOT NULL,
  is_serious BOOLEAN NOT NULL DEFAULT FALSE,
  seriousness_criteria TEXT[],
  causality causality_t,
  naranjo_score INT,
  outcome outcome_t DEFAULT 'UNKNOWN',
  action_taken TEXT,
  suspect_intervention TEXT,
  concomitant_meds TEXT,
  meddra_pt TEXT,
  who_drug_code TEXT,
  ayush_morbidity_code TEXT,
  icd11_code TEXT,
  reported_by INT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE regulatory_rules (
  id SERIAL PRIMARY KEY,
  rule_key TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  hours_allowed INT NOT NULL CHECK (hours_allowed > 0),
  applies_to TEXT NOT NULL DEFAULT 'SAE',
  source_note TEXT NOT NULL
);

CREATE TABLE ae_clocks (
  id SERIAL PRIMARY KEY,
  adverse_event_id INT NOT NULL REFERENCES adverse_events(id) ON DELETE CASCADE,
  rule_id INT NOT NULL REFERENCES regulatory_rules(id),
  started_at TIMESTAMPTZ NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  status clock_status NOT NULL DEFAULT 'RUNNING',
  completed_at TIMESTAMPTZ,
  last_alert_pct INT NOT NULL DEFAULT 0
);

-- ---------- Alerts & config ----------
CREATE TABLE kpi_config (
  key TEXT PRIMARY KEY,
  value_num NUMERIC NOT NULL,
  description TEXT
);

CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  rule_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INT NOT NULL,
  study_id INT,
  level alert_level NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_by INT REFERENCES users(id),
  acknowledged_at TIMESTAMPTZ,
  dedup_key TEXT UNIQUE NOT NULL
);

-- Stub lookups (replace with licensed dictionaries in production)
CREATE TABLE lookup_meddra_stub (pt_code TEXT PRIMARY KEY, pt_name TEXT NOT NULL, soc TEXT);
CREATE TABLE lookup_ayush_morbidity (code TEXT PRIMARY KEY, term TEXT NOT NULL, system TEXT);

CREATE TABLE lookup_cdisc_ct (
  codelist TEXT NOT NULL,
  submission_value TEXT NOT NULL,
  preferred_term TEXT,
  cdisc_version TEXT,
  PRIMARY KEY (codelist, submission_value)
);

CREATE TABLE data_provenance (
  id SERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT,
  accessed_on DATE,
  licence_note TEXT,
  is_synthetic BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT
);

-- ---------- Audit log (append-only, hash-chained) ----------
CREATE TABLE audit_log (
  id           BIGSERIAL PRIMARY KEY,
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id     INT,
  actor_role   TEXT,
  action       TEXT NOT NULL,
  entity_type  TEXT NOT NULL,
  entity_id    TEXT,
  before_data  JSONB,
  after_data   JSONB,
  reason       TEXT,
  ip_address   INET,
  prev_hash    TEXT NOT NULL,
  row_hash     TEXT NOT NULL
);

CREATE OR REPLACE FUNCTION audit_row_hash(r audit_log) RETURNS TEXT AS $$
  SELECT encode(sha256(convert_to(
      r.prev_hash || '|' || extract(epoch FROM r.occurred_at)::text || '|' ||
      COALESCE(r.actor_id::text,'') || '|' || COALESCE(r.actor_role,'') || '|' || r.action || '|' ||
      r.entity_type || '|' || COALESCE(r.entity_id,'') || '|' ||
      COALESCE(r.before_data::text,'') || '|' || COALESCE(r.after_data::text,'') || '|' ||
      COALESCE(r.reason,''), 'UTF8')), 'hex');
$$ LANGUAGE sql IMMUTABLE;

-- The chain is computed in the database so the application cannot skip it
CREATE OR REPLACE FUNCTION audit_chain() RETURNS trigger AS $$
DECLARE last_hash TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(424242);
  SELECT row_hash INTO last_hash FROM audit_log ORDER BY id DESC LIMIT 1;
  NEW.prev_hash := COALESCE(last_hash, 'GENESIS');
  NEW.occurred_at := clock_timestamp();
  NEW.row_hash := audit_row_hash(NEW);
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_chain BEFORE INSERT ON audit_log
FOR EACH ROW EXECUTE FUNCTION audit_chain();

CREATE OR REPLACE FUNCTION audit_block_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_no_update BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION audit_block_mutation();

CREATE TRIGGER trg_audit_no_truncate BEFORE TRUNCATE ON audit_log
FOR EACH STATEMENT EXECUTE FUNCTION audit_block_mutation();

-- Returns the first broken row id, or NULL when the chain is intact
CREATE OR REPLACE FUNCTION audit_verify() RETURNS BIGINT AS $$
DECLARE r audit_log; prev TEXT := 'GENESIS';
BEGIN
  FOR r IN SELECT * FROM audit_log ORDER BY id LOOP
    IF r.prev_hash <> prev OR audit_row_hash(r) <> r.row_hash THEN RETURN r.id; END IF;
    prev := r.row_hash;
  END LOOP;
  RETURN NULL;
END $$ LANGUAGE plpgsql SECURITY DEFINER;

-- Demo tamper test (superuser only):
--   ALTER TABLE audit_log DISABLE TRIGGER trg_audit_no_update;
--   UPDATE audit_log SET after_data = '{"tampered":true}' WHERE id = 5;
--   ALTER TABLE audit_log ENABLE TRIGGER trg_audit_no_update;
--   SELECT audit_verify();  -- returns 5

-- ---------- Row-Level Security (site isolation) ----------
-- The API sets per transaction: app.role, app.site_ids ('1,2'), app.user_id
CREATE OR REPLACE FUNCTION app_site_ids() RETURNS INT[] AS $$
  SELECT COALESCE(string_to_array(NULLIF(current_setting('app.site_ids', true), ''), ',')::INT[], ARRAY[]::INT[]);
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION app_is_global() RETURNS BOOLEAN AS $$
  SELECT COALESCE(current_setting('app.role', true), '') IN ('ADMIN','REGULATOR','PV','IEC','PI');
$$ LANGUAGE sql STABLE;

ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_site_isolation ON participants
  USING (app_is_global() OR site_id = ANY (app_site_ids()))
  WITH CHECK (app_is_global() OR site_id = ANY (app_site_ids()));

-- Subject numbering must see every site, so it runs with owner rights and serialises per study
CREATE OR REPLACE FUNCTION next_subject_seq(p_study INT) RETURNS INT AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(9000000 + p_study);
  RETURN (SELECT COALESCE(max(split_part(subject_code, '-', 3)::int), 0) + 1
          FROM participants WHERE study_id = p_study);
END $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

ALTER TABLE participant_pii ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_pii_isolation ON participant_pii
  USING (EXISTS (SELECT 1 FROM participants p WHERE p.id = participant_id))
  WITH CHECK (EXISTS (SELECT 1 FROM participants p WHERE p.id = participant_id));

-- ---------- Indexes ----------
CREATE INDEX idx_participants_study ON participants(study_id);
CREATE INDEX idx_visits_participant ON visits(participant_id);
CREATE INDEX idx_ae_study ON adverse_events(study_id);
CREATE INDEX idx_clock_status_due ON ae_clocks(status, due_at);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);
CREATE INDEX idx_queries_study ON queries(study_id, status);
CREATE INDEX idx_deviations_study ON deviations(study_id);

-- ---------- Config seed (PLACEHOLDER durations; verify against NDCT Rules 2019 before use) ----------
INSERT INTO regulatory_rules (rule_key, description, hours_allowed, source_note) VALUES
 ('SAE_TO_LICENSING_AUTHORITY','Initial SAE report to licensing authority',24,'VERIFY: NDCT Rules 2019 - clause to be cited'),
 ('SAE_TO_ETHICS_COMMITTEE','Initial SAE report to Ethics Committee',24,'VERIFY: NDCT Rules 2019 - clause to be cited'),
 ('SAE_DETAILED_REPORT','Detailed SAE analysis report',336,'VERIFY: placeholder 14 days - confirm from rules text');

INSERT INTO kpi_config (key,value_num,description) VALUES
 ('enrolment_lag_tolerance_pct',15,'Alert if enrolment behind expected by more than this %'),
 ('ec_expiry_warn_days',30,'Warn when ethics approval expires within N days'),
 ('ctri_update_warn_days',180,'Warn when CTRI record not updated for N days'),
 ('monitoring_overdue_days',90,'Warn when no monitoring visit for N days'),
 ('query_ageing_days',14,'Warn when queries open longer than N days'),
 ('signal_pt_threshold',3,'Flag a safety signal when a preferred term reaches N reports in a study');
