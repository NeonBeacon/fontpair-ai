-- FontPair AI — 2026-10-14 security lock-down + licence-info repair
-- Run once in: Supabase Dashboard -> project cpzipyymluofqsvirxxs -> SQL Editor -> New query -> paste -> Run
--
-- WHY
--   1. The licences table was readable by anyone holding the public (anon) key, which ships
--      inside the app bundle: every licence key and purchase email was exposed.
--   2. get_license_info() referenced a column "key" that does not exist, so the Settings
--      "License Management" panel failed for every customer.
--
-- WHAT KEEPS WORKING
--   The app only ever calls three functions (validate_license_key, deactivate_device,
--   get_license_info). They are switched to SECURITY DEFINER (run with the owner's rights),
--   so they still read the tables after public access is removed. The Stripe webhook uses
--   the service-role key, which bypasses RLS, so new purchases still insert licences.

BEGIN;

-- 1. App functions run with owner rights, pinned search_path, callable by the app.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN ('validate_license_key', 'deactivate_device')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SECURITY DEFINER', r.sig);
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', r.sig);
  END LOOP;
END $$;

-- 2. Replace get_license_info (drop every overload first so the app's one-argument call is unambiguous).
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_license_info'
  LOOP
    EXECUTE format('DROP FUNCTION %s', r.sig);
  END LOOP;
END $$;

CREATE FUNCTION public.get_license_info(p_license_key TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_license public.licenses%ROWTYPE;
  v_active  INTEGER;
BEGIN
  SELECT * INTO v_license FROM public.licenses WHERE license_key = upper(trim(p_license_key));
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'License not found');
  END IF;

  SELECT count(*) INTO v_active
  FROM public.activations
  WHERE license_key = v_license.license_key AND is_active = true;

  RETURN json_build_object(
    'success',         true,
    'license_key',     v_license.license_key,
    'is_active',       v_license.is_active,
    'max_devices',     v_license.max_devices,
    'current_devices', v_active,
    'expires_at',      v_license.expires_at,
    'tier',            v_license.tier
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', 'An error occurred: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_license_info(TEXT) TO anon, authenticated;

-- 3. Remove every public policy and table privilege on the two tables. RLS stays on, so with no
--    policies the public key can read/write nothing directly.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('licenses', 'activations')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

ALTER TABLE public.licenses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.licenses    FROM anon, authenticated;
REVOKE ALL ON public.activations FROM anon, authenticated;

COMMIT;

-- 4. Quick self-check (should show: two tables with rls_on = true and zero policies;
--    three functions with security_definer = true).
SELECT c.relname AS table_name, c.relrowsecurity AS rls_on,
       (SELECT count(*) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS policies
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname IN ('licenses', 'activations');

SELECT p.proname AS function_name, p.prosecdef AS security_definer
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN ('validate_license_key', 'deactivate_device', 'get_license_info');

-- ROLLBACK (only if activation breaks after running this — restores the old public read access):
--   GRANT SELECT ON public.licenses TO anon, authenticated;
--   CREATE POLICY "Allow public read access to licenses" ON public.licenses FOR SELECT USING (true);
--   GRANT SELECT, INSERT, UPDATE ON public.activations TO anon, authenticated;
--   CREATE POLICY "activations_open" ON public.activations FOR ALL USING (true) WITH CHECK (true);
