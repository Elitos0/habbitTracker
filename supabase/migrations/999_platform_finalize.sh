#!/bin/sh
set -eu

PASSWORD_ESCAPED=$(printf "%s" "${POSTGRES_PASSWORD}" | sed "s/'/''/g")

psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER:-postgres}" --dbname "${POSTGRES_DB:-postgres}" <<EOSQL
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS _realtime;
CREATE SCHEMA IF NOT EXISTS realtime;
CREATE SCHEMA IF NOT EXISTS storage;

DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator LOGIN NOINHERIT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    CREATE ROLE supabase_auth_admin LOGIN NOINHERIT CREATEROLE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN
    CREATE ROLE supabase_admin LOGIN NOINHERIT CREATEDB CREATEROLE REPLICATION BYPASSRLS;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    EXECUTE format('ALTER ROLE supabase_auth_admin WITH LOGIN PASSWORD %L', '${PASSWORD_ESCAPED}');
    ALTER SCHEMA auth OWNER TO supabase_auth_admin;
    GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
    ALTER ROLE supabase_auth_admin IN DATABASE postgres SET search_path = auth;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    EXECUTE format('ALTER ROLE authenticator WITH LOGIN PASSWORD %L', '${PASSWORD_ESCAPED}');
    GRANT anon TO authenticator;
    GRANT authenticated TO authenticator;
    GRANT service_role TO authenticator;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN
    EXECUTE format('ALTER ROLE supabase_admin WITH LOGIN PASSWORD %L', '${PASSWORD_ESCAPED}');
    ALTER SCHEMA _realtime OWNER TO supabase_admin;
    ALTER SCHEMA realtime OWNER TO supabase_admin;
    GRANT ALL ON SCHEMA _realtime TO supabase_admin;
    GRANT ALL ON SCHEMA realtime TO supabase_admin;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    GRANT USAGE ON SCHEMA auth TO postgres;
    GRANT USAGE ON SCHEMA _realtime TO postgres;
    GRANT USAGE ON SCHEMA realtime TO postgres;
    GRANT USAGE ON SCHEMA storage TO postgres;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    GRANT USAGE ON SCHEMA auth TO anon;
    GRANT USAGE ON SCHEMA realtime TO anon;
    GRANT USAGE ON SCHEMA storage TO anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT USAGE ON SCHEMA auth TO authenticated;
    GRANT USAGE ON SCHEMA realtime TO authenticated;
    GRANT USAGE ON SCHEMA storage TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT USAGE ON SCHEMA auth TO service_role;
    GRANT USAGE ON SCHEMA realtime TO service_role;
    GRANT USAGE ON SCHEMA storage TO service_role;
  END IF;
END \$\$;

DO \$\$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END \$\$;
EOSQL
