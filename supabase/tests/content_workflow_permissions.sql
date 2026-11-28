-- Rollback-only regression for 20261203090000_content_workflow: the municipal conformity circuit
-- (draft → submitted → conformity recorded → published), its validations and refusals, the direct
-- writes it closes, Groundwork's internal settings that still save at once and the operations log.
-- Real roles; no fixture survives.
BEGIN;
SELECT set_config('test.cw_admin', (SELECT user_id::text FROM public.user_roles WHERE role = 'admin' LIMIT 1), true);
DO $$ BEGIN
 IF coalesce(current_setting('test.cw_admin', true), '') = '' THEN
  RAISE EXCEPTION 'This test needs an existing admin in public.user_roles';
 END IF;
END $$;

-- No column-level write privilege survives on the published identity or page headers, for any
-- browser role: neither INSERT nor UPDATE on any column (a table-level REVOKE is not relied upon).
DO $$
DECLARE v_bad text;
BEGIN
 SELECT string_agg(format('%s.%s (%s, %s)', c.table_name, c.column_name, r.role, p.priv), ', ') INTO v_bad
 FROM information_schema.columns AS c
 CROSS JOIN unnest(ARRAY['authenticated', 'anon']) AS r(role)
 CROSS JOIN unnest(ARRAY['INSERT', 'UPDATE']) AS p(priv)
 WHERE c.table_schema = 'public' AND c.table_name IN ('site_identity', 'page_headers')
   AND has_column_privilege(r.role, format('public.%I', c.table_name), c.column_name, p.priv);
 IF v_bad IS NOT NULL THEN RAISE EXCEPTION 'Column write privileges remain: %', v_bad; END IF;
 IF EXISTS (SELECT 1 FROM information_schema.column_privileges
   WHERE table_schema = 'public' AND table_name IN ('site_identity', 'page_headers')
     AND grantee IN ('authenticated', 'anon') AND privilege_type IN ('INSERT', 'UPDATE')) THEN
  RAISE EXCEPTION 'Column write grants remain in the catalog for site_identity or page_headers';
 END IF;
END $$;

-- Visitors and ordinary users can neither move drafts through the circuit nor read the log.
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM public.submit_content_draft('portada', now()); RAISE EXCEPTION 'Visitors must not submit drafts';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.record_content_conformity('portada', now(), 'Alcaldía', current_date, 'correo');
  RAISE EXCEPTION 'Visitors must not record conformity';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.return_content_draft('portada', now()); RAISE EXCEPTION 'Visitors must not return drafts';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM public.admin_audit_log; RAISE EXCEPTION 'Visitors must not read the operations log';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM public.user_roles; RAISE EXCEPTION 'Visitors must not read roles';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.categories SET name = name; RAISE EXCEPTION 'Visitors must not write categories';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', 'ad000000-0000-4000-8000-000000000094', true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.submit_content_draft('portada', now()); RAISE EXCEPTION 'Ordinary users must not submit drafts';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.record_content_conformity('portada', now(), 'Alcaldía', current_date, 'correo');
  RAISE EXCEPTION 'Ordinary users must not record conformity';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.return_content_draft('portada', now()); RAISE EXCEPTION 'Ordinary users must not return drafts';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF EXISTS (SELECT 1 FROM public.admin_audit_log) THEN RAISE EXCEPTION 'Ordinary users must not read the operations log'; END IF;
 BEGIN UPDATE public.site_settings SET admin_whatsapp = 'x' WHERE id;
  IF FOUND THEN RAISE EXCEPTION 'Ordinary users must not change internal settings'; END IF;
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

-- Admin.
SELECT set_config('request.jwt.claim.sub', current_setting('test.cw_admin'), true);
SELECT set_config('request.jwt.claims', json_build_object('sub', current_setting('test.cw_admin'), 'role', 'authenticated')::text, true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
 v_at timestamptz;
 v_state jsonb;
 v_log bigint := (SELECT count(*) FROM public.admin_audit_log);
 v_hint text;
BEGIN
 v_at := (public.save_content_draft('portada', '{"hero_title":"Circuito","hero_subtitle":"Prueba"}'::jsonb) ->> 'updated_at')::timestamptz;
 v_state := public.content_draft_state('portada');
 IF v_state ->> 'status' <> 'borrador' OR v_state -> 'content' ->> 'hero_title' <> 'Circuito' OR v_state -> 'conformity' <> 'null'::jsonb THEN
  RAISE EXCEPTION 'A new draft must be a «borrador» with its content and no conformity: %', v_state;
 END IF;

 -- Wrong order and outdated copies are refused.
 BEGIN PERFORM public.record_content_conformity('portada', v_at, 'Alcaldía', current_date, 'correo');
  RAISE EXCEPTION 'Conformity of a draft that was not submitted must be refused';
 EXCEPTION WHEN SQLSTATE 'PT422' THEN GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
  IF v_hint <> 'invalid_state' THEN RAISE EXCEPTION 'Wrong hint %', v_hint; END IF; END;
 BEGIN PERFORM public.return_content_draft('portada', v_at); RAISE EXCEPTION 'A «borrador» cannot be returned';
 EXCEPTION WHEN SQLSTATE 'PT422' THEN NULL; END;
 BEGIN PERFORM public.submit_content_draft('portada', v_at - interval '1 second');
  RAISE EXCEPTION 'Submitting an outdated copy must be refused';
 EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL; END;

 v_at := (public.submit_content_draft('portada', v_at) ->> 'updated_at')::timestamptz;
 IF (SELECT status FROM public.content_drafts WHERE draft_key = 'portada') <> 'presentado'
 OR (SELECT submitted_by::text FROM public.content_drafts WHERE draft_key = 'portada') <> current_setting('test.cw_admin') THEN
  RAISE EXCEPTION 'Submitting must record the status and who submitted';
 END IF;
 BEGIN PERFORM public.submit_content_draft('portada', v_at); RAISE EXCEPTION 'A submitted draft cannot be submitted again';
 EXCEPTION WHEN SQLSTATE 'PT422' THEN NULL; END;

 -- Conformity data is validated before anything changes.
 FOR v_hint IN SELECT unnest(ARRAY['by', 'channel', 'future', 'before', 'reference', 'html']) LOOP
  BEGIN
   CASE v_hint
    WHEN 'by' THEN PERFORM public.record_content_conformity('portada', v_at, ' x ', current_date, 'correo');
    WHEN 'channel' THEN PERFORM public.record_content_conformity('portada', v_at, 'Alcaldía', current_date, 'paloma');
    WHEN 'future' THEN PERFORM public.record_content_conformity('portada', v_at, 'Alcaldía', current_date + 2, 'correo');
    WHEN 'before' THEN PERFORM public.record_content_conformity('portada', v_at, 'Alcaldía', current_date - 5, 'correo');
    WHEN 'reference' THEN PERFORM public.record_content_conformity('portada', v_at, 'Alcaldía', current_date, 'correo', repeat('r', 201));
    WHEN 'html' THEN PERFORM public.record_content_conformity('portada', v_at, '<b>Alcaldía</b>', current_date, 'correo');
   END CASE;
   RAISE EXCEPTION 'Invalid conformity accepted: %', v_hint;
  EXCEPTION WHEN SQLSTATE 'PT422' THEN NULL; END;
 END LOOP;
 IF (SELECT status FROM public.content_drafts WHERE draft_key = 'portada') <> 'presentado' THEN
  RAISE EXCEPTION 'A refused conformity must leave the draft submitted';
 END IF;

 -- The Town Hall asks for changes: back to «borrador», content kept.
 v_at := (public.return_content_draft('portada', v_at) ->> 'updated_at')::timestamptz;
 IF (SELECT status FROM public.content_drafts WHERE draft_key = 'portada') <> 'borrador'
 OR (SELECT submitted_at FROM public.content_drafts WHERE draft_key = 'portada') IS NOT NULL
 OR (SELECT content ->> 'hero_title' FROM public.content_drafts WHERE draft_key = 'portada') <> 'Circuito' THEN
  RAISE EXCEPTION 'Returning must clear the submission and keep the content';
 END IF;

 -- Conformity on a submitted draft; editing it afterwards voids the conformity.
 v_at := (public.submit_content_draft('portada', v_at) ->> 'updated_at')::timestamptz;
 v_at := (public.record_content_conformity('portada', v_at, E'  Concejalía\nde Cultura ', current_date, 'reunion', 'Acta 12')
   ->> 'updated_at')::timestamptz;
 v_state := public.content_draft_state('portada');
 IF v_state ->> 'status' <> 'conforme' OR v_state -> 'conformity' ->> 'by' <> 'Concejalía de Cultura'
 OR v_state -> 'conformity' ->> 'channel' <> 'reunion' OR v_state -> 'conformity' ->> 'reference' <> 'Acta 12' THEN
  RAISE EXCEPTION 'The recorded conformity must be normalised and reported: %', v_state;
 END IF;
 v_at := (public.save_content_draft('portada', '{"hero_title":"Circuito cambiado","hero_subtitle":"Prueba"}'::jsonb, v_at)
   ->> 'updated_at')::timestamptz;
 IF (SELECT status FROM public.content_drafts WHERE draft_key = 'portada') <> 'borrador'
 OR (SELECT conformity_by FROM public.content_drafts WHERE draft_key = 'portada') IS NOT NULL THEN
  RAISE EXCEPTION 'Changing the content must void the conformity';
 END IF;
 -- Saving the same content keeps the status.
 v_at := (public.submit_content_draft('portada', v_at) ->> 'updated_at')::timestamptz;
 v_at := (public.save_content_draft('portada', '{"hero_title":"Circuito cambiado","hero_subtitle":"Prueba"}'::jsonb, v_at)
   ->> 'updated_at')::timestamptz;
 IF (SELECT status FROM public.content_drafts WHERE draft_key = 'portada') <> 'presentado' THEN
  RAISE EXCEPTION 'Saving unchanged content must keep the submission';
 END IF;
 v_at := (public.record_content_conformity('portada', v_at, 'Alcaldía', current_date, 'correo') ->> 'updated_at')::timestamptz;
 PERFORM public.publish_content_draft('portada', v_at, true, 'Publicación de prueba');
 IF (SELECT hero_title FROM public.site_settings WHERE id) <> 'Circuito cambiado' THEN
  RAISE EXCEPTION 'The conforming draft must be published';
 END IF;

 -- Public texts are validated by the database: HTML or a malformed email is refused when submitting.
 v_at := (public.save_content_draft('aviso-cabecera', '{"banner_enabled":true,"banner_text":"<script>x</script>"}'::jsonb)
   ->> 'updated_at')::timestamptz;
 BEGIN PERFORM public.submit_content_draft('aviso-cabecera', v_at); RAISE EXCEPTION 'HTML in the banner must be refused';
 EXCEPTION WHEN SQLSTATE 'PT422' THEN NULL; END;
 PERFORM public.discard_content_draft('aviso-cabecera', v_at);
 v_at := (public.save_content_draft('datos-legales', '{"legal_name":"Titular","legal_nif":"","legal_address":"",
   "legal_email":"no es un correo"}'::jsonb) ->> 'updated_at')::timestamptz;
 BEGIN PERFORM public.submit_content_draft('datos-legales', v_at); RAISE EXCEPTION 'A malformed legal email must be refused';
 EXCEPTION WHEN SQLSTATE 'PT422' THEN NULL; END;
 PERFORM public.discard_content_draft('datos-legales', v_at);

 -- Internal settings save at once, only their columns; public columns only by publishing.
 UPDATE public.site_settings SET admin_whatsapp = '+34 600 000 001', common_labels = ARRAY['Prueba'] WHERE id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Admin must save internal settings'; END IF;
 BEGIN UPDATE public.site_settings SET legal_name = 'Directo' WHERE id; RAISE EXCEPTION 'Legal data must not be written directly';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.site_settings SET banner_enabled = true WHERE id; RAISE EXCEPTION 'The banner must not be written directly';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;

 -- Operations log: who, what and which columns, never the values; nobody edits it.
 IF NOT EXISTS (SELECT 1 FROM public.admin_audit_log WHERE table_name = 'content_drafts' AND record_key = 'portada'
   AND state = 'conforme' AND actor::text = current_setting('test.cw_admin') AND actor_role = 'authenticated') THEN
  RAISE EXCEPTION 'The conformity must appear in the operations log';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.admin_audit_log WHERE table_name = 'content_publications' AND operation = 'insert'
   AND state = 'portada') THEN
  RAISE EXCEPTION 'The publication must appear in the operations log';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.admin_audit_log WHERE table_name = 'site_settings' AND operation = 'update'
   AND changed_columns = ARRAY['admin_whatsapp', 'common_labels']) THEN
  RAISE EXCEPTION 'Internal settings changes must list the changed columns';
 END IF;
 IF EXISTS (SELECT 1 FROM public.admin_audit_log WHERE array_to_string(changed_columns, ',') LIKE '%600 000%'
   OR coalesce(state, '') LIKE '%600 000%' OR record_key LIKE '%600 000%') THEN
  RAISE EXCEPTION 'The operations log must never store values';
 END IF;
 IF (SELECT count(*) FROM public.admin_audit_log) <= v_log THEN RAISE EXCEPTION 'Operations must be logged'; END IF;
 BEGIN UPDATE public.admin_audit_log SET actor = NULL; RAISE EXCEPTION 'Nobody may edit the operations log';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN DELETE FROM public.admin_audit_log; RAISE EXCEPTION 'Nobody may delete the operations log';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;

 -- A refused submission (dry run) applies nothing and logs nothing on the published tables.
 v_log := (SELECT count(*) FROM public.admin_audit_log WHERE table_name = 'site_menu');
 v_at := (public.save_content_draft('menu', '{"entries":[{"key":"directorio","enabled":false,"sort_order":0}]}'::jsonb)
   ->> 'updated_at')::timestamptz;
 BEGIN PERFORM public.submit_content_draft('menu', v_at); RAISE EXCEPTION 'Disabling the Directory must be refused';
 EXCEPTION WHEN SQLSTATE 'PT422' THEN NULL; END;
 IF EXISTS (SELECT 1 FROM public.site_menu WHERE entry_key = 'directorio')
 OR (SELECT count(*) FROM public.admin_audit_log WHERE table_name = 'site_menu') <> v_log THEN
  RAISE EXCEPTION 'A refused submission must leave no trace in the published tables';
 END IF;
 -- A valid dry run applies nothing either: the menu is unchanged after submitting.
 v_at := (public.save_content_draft('menu', '{"entries":[{"key":"guia-tramites","enabled":false,"sort_order":1}]}'::jsonb, v_at)
   ->> 'updated_at')::timestamptz;
 v_at := (public.submit_content_draft('menu', v_at) ->> 'updated_at')::timestamptz;
 IF EXISTS (SELECT 1 FROM public.site_menu WHERE entry_key = 'guia-tramites' AND NOT enabled) THEN
  RAISE EXCEPTION 'Submitting must not publish';
 END IF;
 PERFORM public.discard_content_draft('menu', v_at);
 IF EXISTS (SELECT 1 FROM public.content_drafts WHERE draft_key = 'menu') THEN
  RAISE EXCEPTION 'A submitted draft must be discardable';
 END IF;
END $$;
RESET ROLE;
ROLLBACK;
