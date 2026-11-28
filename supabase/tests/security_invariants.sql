-- Permanent security invariants of the product (docs/seguridad.md). Every migration must keep them:
-- this test runs in CI over the clean template and over main + the new migrations.
-- 1. Every table has RLS enabled.
-- 2. Visitors (anon) cannot write any table or view, nor read the private tables.
-- 3. Nobody from the browser can empty tables (TRUNCATE bypasses RLS) or create triggers/references.
-- 4. Every SECURITY DEFINER function pins an empty search_path.
-- 5. Every SECURITY DEFINER function callable from the browser checks the admin role first, unless
--    it is listed here with its reason.
-- 6. Visitors cannot execute any SECURITY DEFINER function.
-- 7. Every Storage bucket is private and has a size limit.
-- Read-only: it creates nothing.
BEGIN;
DO $$
DECLARE
 v_bad text;
 -- Callable without the admin role, and why:
 --   (none today: owner review functions run only as service_role after token verification).
 v_role_exempt text[] := ARRAY[]::text[];
 -- Tables visitors must never read directly (public data goes through views or site_config()).
 v_private text[] := ARRAY['approval_tokens', 'consents', 'listing_contacts', 'listing_reports', 'listing_requests',
   'suggestions', 'translation_gateway_state', 'user_roles', 'listing_events', 'listings', 'content_drafts',
   'content_publications', 'admin_audit_log'];
BEGIN
 SELECT string_agg(format('%I.%I', s.nspname, c.relname), ', ') INTO v_bad
 FROM pg_class c JOIN pg_namespace s ON s.oid = c.relnamespace
 WHERE s.nspname IN ('public', 'private') AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity;
 IF v_bad IS NOT NULL THEN RAISE EXCEPTION 'Tables without RLS: %', v_bad; END IF;

 SELECT string_agg(format('%I.%I', s.nspname, c.relname), ', ') INTO v_bad
 FROM pg_class c JOIN pg_namespace s ON s.oid = c.relnamespace
 WHERE s.nspname IN ('public', 'private') AND c.relkind IN ('r', 'p', 'v', 'm') AND (
   has_table_privilege('anon', c.oid, 'INSERT') OR has_table_privilege('anon', c.oid, 'UPDATE')
   OR has_table_privilege('anon', c.oid, 'DELETE') OR has_any_column_privilege('anon', c.oid, 'INSERT')
   OR has_any_column_privilege('anon', c.oid, 'UPDATE'));
 IF v_bad IS NOT NULL THEN RAISE EXCEPTION 'Visitors can write: %', v_bad; END IF;

 SELECT string_agg(t, ', ') INTO v_bad FROM unnest(v_private) AS t
 WHERE to_regclass(format('public.%I', t)) IS NOT NULL
   AND has_any_column_privilege('anon', format('public.%I', t)::regclass, 'SELECT');
 IF v_bad IS NOT NULL THEN RAISE EXCEPTION 'Visitors can read private tables: %', v_bad; END IF;

 SELECT string_agg(format('%I.%I', s.nspname, c.relname), ', ') INTO v_bad
 FROM pg_class c JOIN pg_namespace s ON s.oid = c.relnamespace
 WHERE s.nspname IN ('public', 'private') AND c.relkind IN ('r', 'p') AND (
   has_table_privilege('anon', c.oid, 'TRUNCATE') OR has_table_privilege('authenticated', c.oid, 'TRUNCATE')
   OR has_table_privilege('anon', c.oid, 'TRIGGER') OR has_table_privilege('authenticated', c.oid, 'TRIGGER')
   OR has_table_privilege('anon', c.oid, 'REFERENCES') OR has_table_privilege('authenticated', c.oid, 'REFERENCES'));
 IF v_bad IS NOT NULL THEN RAISE EXCEPTION 'Browser roles can truncate, add triggers or references: %', v_bad; END IF;

 -- rls_auto_enable is Supabase's own event trigger (search_path pg_catalog), not product code.
 SELECT string_agg(format('%I.%I', s.nspname, p.proname), ', ') INTO v_bad
 FROM pg_proc p JOIN pg_namespace s ON s.oid = p.pronamespace
 WHERE s.nspname IN ('public', 'private') AND p.prosecdef AND p.proname <> 'rls_auto_enable'
   AND NOT coalesce(p.proconfig, '{}') && ARRAY['search_path=""', 'search_path='];
 IF v_bad IS NOT NULL THEN RAISE EXCEPTION 'SECURITY DEFINER functions without an empty search_path: %', v_bad; END IF;

 SELECT string_agg(format('%I.%I', s.nspname, p.proname), ', ') INTO v_bad
 FROM pg_proc p JOIN pg_namespace s ON s.oid = p.pronamespace
 WHERE s.nspname = 'public' AND p.prosecdef AND p.prorettype <> 'trigger'::regtype
   AND p.prorettype <> 'event_trigger'::regtype
   AND (has_function_privilege('anon', p.oid, 'EXECUTE') OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))
   AND p.prosrc NOT LIKE '%public.has_role(auth.uid(), ''admin'')%'
   AND NOT p.proname = ANY (v_role_exempt);
 IF v_bad IS NOT NULL THEN RAISE EXCEPTION 'Browser-callable SECURITY DEFINER functions without the admin check: %', v_bad; END IF;

 SELECT string_agg(format('%I.%I', s.nspname, p.proname), ', ') INTO v_bad
 FROM pg_proc p JOIN pg_namespace s ON s.oid = p.pronamespace
 WHERE s.nspname IN ('public', 'private') AND p.prosecdef AND p.prorettype <> 'trigger'::regtype
   AND p.prorettype <> 'event_trigger'::regtype AND has_function_privilege('anon', p.oid, 'EXECUTE');
 IF v_bad IS NOT NULL THEN RAISE EXCEPTION 'Visitors can execute SECURITY DEFINER functions: %', v_bad; END IF;

 SELECT string_agg(id, ', ') INTO v_bad FROM storage.buckets WHERE public OR file_size_limit IS NULL;
 IF v_bad IS NOT NULL THEN RAISE EXCEPTION 'Public buckets or buckets without a size limit: %', v_bad; END IF;
END $$;
ROLLBACK;
