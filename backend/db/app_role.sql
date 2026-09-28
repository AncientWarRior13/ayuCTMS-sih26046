-- Creates the non-superuser role the API connects as. Superusers bypass RLS,
-- so the API must never connect as the owner/superuser.
-- Usage: psql -v app_password="'secret'" -f app_role.sql

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ayuctms_app') THEN
    CREATE ROLE ayuctms_app LOGIN;
  END IF;
END $$;

ALTER ROLE ayuctms_app WITH LOGIN PASSWORD :app_password;

GRANT USAGE ON SCHEMA public TO ayuctms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ayuctms_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ayuctms_app;

-- Audit log: append and read only
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM ayuctms_app;
