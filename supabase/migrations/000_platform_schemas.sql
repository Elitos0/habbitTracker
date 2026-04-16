-- ============================================================
-- Supabase platform schemas bootstrap
-- Creates internal schemas required by Auth and Realtime
-- during first database initialization.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS _realtime;
CREATE SCHEMA IF NOT EXISTS realtime;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    ALTER SCHEMA auth OWNER TO supabase_auth_admin;
    GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
    ALTER ROLE supabase_auth_admin IN DATABASE postgres SET search_path = auth;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN
    ALTER SCHEMA _realtime OWNER TO supabase_admin;
    ALTER SCHEMA realtime OWNER TO supabase_admin;
    GRANT ALL ON SCHEMA _realtime TO supabase_admin;
    GRANT ALL ON SCHEMA realtime TO supabase_admin;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
    GRANT USAGE ON SCHEMA auth TO postgres;
    GRANT USAGE ON SCHEMA _realtime TO postgres;
    GRANT USAGE ON SCHEMA realtime TO postgres;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    GRANT USAGE ON SCHEMA auth TO anon;
    GRANT USAGE ON SCHEMA realtime TO anon;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT USAGE ON SCHEMA auth TO authenticated;
    GRANT USAGE ON SCHEMA realtime TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT USAGE ON SCHEMA auth TO service_role;
    GRANT USAGE ON SCHEMA realtime TO service_role;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;
