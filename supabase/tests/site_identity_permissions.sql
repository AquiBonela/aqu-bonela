-- Rollback-only authorization regression for public.site_identity and public.site_config().
-- Run in SQL Editor after the migration; no fixture or identity change survives.
BEGIN;
SELECT set_config('test.identity_admin', (SELECT user_id::text FROM public.user_roles WHERE role='admin' LIMIT 1), true);
DO $$ BEGIN
 IF current_setting('test.identity_admin', true) IS NULL OR current_setting('test.identity_admin', true) = '' THEN
  RAISE EXCEPTION 'This test needs an existing admin in public.user_roles';
 END IF;
 IF (SELECT count(*) FROM public.site_identity) <> 1 THEN RAISE EXCEPTION 'site_identity must have exactly one row'; END IF;
END $$;

-- Visitors: read through site_config(), never write, never see the author.
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF jsonb_typeof(public.site_config() -> 'identity') <> 'object' THEN RAISE EXCEPTION 'Anon must read site_config'; END IF;
 IF public.site_config() -> 'identity' ? 'updated_by' THEN RAISE EXCEPTION 'site_config must not expose updated_by'; END IF;
 BEGIN
  PERFORM updated_by FROM public.site_identity;
  RAISE EXCEPTION 'Anon must not read updated_by';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  UPDATE public.site_identity SET app_name = 'Anon' WHERE id;
  RAISE EXCEPTION 'Anon must not update identity';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO public.site_identity (id) VALUES (true);
  RAISE EXCEPTION 'Anon must not insert identity';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.can_manage_identity();
  RAISE EXCEPTION 'Anon must not execute can_manage_identity';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

-- Signed-in users without a role: RLS filters the update, no insert or delete.
SELECT set_config('request.jwt.claim.sub','ad000000-0000-4000-8000-000000000098',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF public.can_manage_identity() THEN RAISE EXCEPTION 'Ordinary users must not manage identity'; END IF;
 UPDATE public.site_identity SET app_name = 'Usuario' WHERE id;
 IF FOUND THEN RAISE EXCEPTION 'Ordinary users must not update identity'; END IF;
 BEGIN
  DELETE FROM public.site_identity;
  RAISE EXCEPTION 'Ordinary users must not delete identity';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  UPDATE public.site_identity SET updated_by = NULL WHERE id;
  RAISE EXCEPTION 'Nobody may set updated_by directly';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

-- Admin: updates valid values, constraints reject unsafe ones, the trigger records the author.
SELECT set_config('request.jwt.claim.sub',current_setting('test.identity_admin'),true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF NOT public.can_manage_identity() THEN RAISE EXCEPTION 'Admin must manage identity'; END IF;
 UPDATE public.site_identity SET app_name = 'Regresión', site_url = 'https://regresion.example.org',
   latitude = 40.41680, longitude = -3.70380, timezone = 'Europe/Madrid' WHERE id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Admin must update identity'; END IF;
 IF public.site_config() #>> '{identity,app_name}' <> 'Regresión' THEN RAISE EXCEPTION 'site_config must read back the change'; END IF;
 BEGIN
  UPDATE public.site_identity SET site_url = 'https://regresion.example.org/ruta' WHERE id;
  RAISE EXCEPTION 'site_url with a path must be rejected';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  UPDATE public.site_identity SET municipality_name = 'Pueblo {app}' WHERE id;
  RAISE EXCEPTION 'Braces must be rejected';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  UPDATE public.site_identity SET short_name = '<script>' WHERE id;
  RAISE EXCEPTION 'HTML must be rejected';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  UPDATE public.site_identity SET timezone = 'Marte/Olimpo' WHERE id;
  RAISE EXCEPTION 'Unknown timezone must be rejected';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  UPDATE public.site_identity SET longitude = NULL WHERE id;
  RAISE EXCEPTION 'Half coordinates must be rejected';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  INSERT INTO public.site_identity (id) VALUES (true);
  RAISE EXCEPTION 'Admin must not insert a second identity row';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT updated_by::text FROM public.site_identity) IS DISTINCT FROM current_setting('test.identity_admin') THEN
  RAISE EXCEPTION 'updated_by must record the admin';
 END IF;
END $$;
ROLLBACK;
