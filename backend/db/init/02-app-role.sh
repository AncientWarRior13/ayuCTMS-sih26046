#!/bin/sh
set -e
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v app_password="'${APP_DB_PASSWORD}'" \
  -f /docker-entrypoint-initdb.d/sql/app_role.sql
