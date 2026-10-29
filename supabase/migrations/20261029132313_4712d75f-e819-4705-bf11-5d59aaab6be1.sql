CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(_user_id = auth.uid(), false)
    AND EXISTS (
      SELECT 1 FROM public.user_roles AS ur
      WHERE ur.user_id = auth.uid() AND ur.role = _role
    );
$$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.has_role(_user_id, _role);
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Regression tests run as actual database roles. The inner exception rolls
-- back all fixtures and session changes; failed assertions abort the migration.
DO $tests$
DECLARE
  admin_id uuid := gen_random_uuid();
  member_id uuid := gen_random_uuid();
  listing_id uuid := gen_random_uuid();
  suggestion_id uuid := gen_random_uuid();
  report_id uuid := gen_random_uuid();
  affected integer;
BEGIN
  IF has_function_privilege('anon', 'public.has_role(uuid,public.app_role)', 'EXECUTE')
     OR has_function_privilege('anon', 'private.has_role(uuid,public.app_role)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Visitors must not execute role checks';
  END IF;
  IF (SELECT prosecdef FROM pg_proc WHERE oid = 'public.has_role(uuid,public.app_role)'::regprocedure) THEN
    RAISE EXCEPTION 'The exposed role function must not be security definer';
  END IF;
  BEGIN
    INSERT INTO auth.users(id) VALUES (admin_id), (member_id);
    INSERT INTO public.user_roles(user_id, role) VALUES (admin_id, 'admin');
    INSERT INTO public.listings(id, slug, type, name, status)
      VALUES (listing_id, 'security-test-' || listing_id::text, 'comercio', 'Security test', 'publicada');
    INSERT INTO public.listing_contacts(listing_id, owner_contact)
      VALUES (listing_id, 'private-test');
    INSERT INTO public.suggestions(id, name, message) VALUES (suggestion_id, 'Security test', 'Security test message');
    INSERT INTO public.listing_reports(id, listing_id, message) VALUES (report_id, listing_id, 'Security test message');

    PERFORM set_config('request.jwt.claims', json_build_object('sub', member_id, 'role', 'authenticated')::text, true);
    PERFORM set_config('request.jwt.claim.sub', member_id::text, true);
    PERFORM set_config('role', 'authenticated', true);
    IF public.has_role(member_id, 'admin') THEN
      RAISE EXCEPTION 'Ordinary users must not be administrators';
    END IF;
    IF public.has_role(admin_id, 'admin') OR private.has_role(admin_id, 'admin') THEN
      RAISE EXCEPTION 'Ordinary users must not probe another user''s role';
    END IF;
    IF EXISTS(SELECT 1 FROM public.suggestions) OR EXISTS(SELECT 1 FROM public.listing_reports)
       OR EXISTS(SELECT 1 FROM public.listing_contacts) THEN
      RAISE EXCEPTION 'Ordinary users must not read administrative inboxes or private contacts';
    END IF;
    UPDATE public.suggestions SET handled=true WHERE id=suggestion_id;
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 0 THEN RAISE EXCEPTION 'Ordinary users must not handle suggestions'; END IF;
    DELETE FROM public.suggestions WHERE id=suggestion_id;
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 0 THEN RAISE EXCEPTION 'Ordinary users must not delete suggestions'; END IF;
    UPDATE public.listing_reports SET resolved=true WHERE id=report_id;
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 0 THEN RAISE EXCEPTION 'Ordinary users must not resolve reports'; END IF;
    DELETE FROM public.listing_reports WHERE id=report_id;
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 0 THEN RAISE EXCEPTION 'Ordinary users must not delete reports'; END IF;
    UPDATE public.listings SET name='Forbidden' WHERE id=listing_id;
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 0 THEN RAISE EXCEPTION 'Ordinary users must not edit listings'; END IF;
    BEGIN
      INSERT INTO public.user_roles(user_id,role) VALUES(member_id,'admin');
      RAISE EXCEPTION 'Ordinary users must not grant themselves administrator rights';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    PERFORM set_config('role', 'anon', true);
    PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
    PERFORM set_config('request.jwt.claim.sub', '', true);
    BEGIN
      IF EXISTS(SELECT 1 FROM public.suggestions) THEN
        RAISE EXCEPTION 'Visitors must not read suggestions';
      END IF;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
      IF EXISTS(SELECT 1 FROM public.listing_reports) THEN
        RAISE EXCEPTION 'Visitors must not read reports';
      END IF;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
    PERFORM set_config('request.jwt.claim.sub', admin_id::text, true);
    IF NOT public.has_role(admin_id, 'admin') OR public.has_role(member_id, 'admin') THEN
      RAISE EXCEPTION 'Administrators must have own-role access only';
    END IF;
    IF NOT EXISTS(SELECT 1 FROM public.listing_contacts AS c JOIN public.listings AS l ON l.id=c.listing_id WHERE l.slug='security-test-' || l.id::text AND c.owner_contact='private-test') THEN
      RAISE EXCEPTION 'Administrators must read private contacts';
    END IF;
    UPDATE public.suggestions SET handled=true WHERE id=suggestion_id;
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 1 THEN RAISE EXCEPTION 'Administrators must handle suggestions'; END IF;
    DELETE FROM public.suggestions WHERE id=suggestion_id;
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 1 THEN RAISE EXCEPTION 'Administrators must delete suggestions'; END IF;
    UPDATE public.listing_reports SET resolved=true WHERE id=report_id;
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 1 THEN RAISE EXCEPTION 'Administrators must resolve reports'; END IF;
    DELETE FROM public.listing_reports WHERE id=report_id;
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 1 THEN RAISE EXCEPTION 'Administrators must delete reports'; END IF;
    UPDATE public.listings SET name='Administrator allowed' WHERE id=listing_id;
    GET DIAGNOSTICS affected = ROW_COUNT;
    IF affected <> 1 THEN RAISE EXCEPTION 'Administrators must edit listings'; END IF;

    RAISE EXCEPTION USING ERRCODE='PZ001', MESSAGE='Rollback successful security test fixtures';
  EXCEPTION WHEN SQLSTATE 'PZ001' THEN
    RAISE NOTICE 'Security regression tests passed; all fixtures rolled back';
  END;
END;
$tests$;