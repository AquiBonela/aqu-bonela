-- Rollback-only regression for 20261202090000_site_structure and 20261203090000_content_workflow
-- (drafts): a draft never reaches the public web; publishing requires the admin role, the municipal
-- conformity recorded on a submitted draft and Groundwork's final review, applies the whole screen
-- at once, records who, when and the note, and refuses stale drafts, malformed content and missing
-- images (already when submitting). A refusal changes nothing and keeps the draft.
BEGIN;
-- Submits a draft and records a test conformity; returns the new version of the draft.
CREATE FUNCTION pg_temp.conform(p_key text, p_at timestamptz) RETURNS timestamptz LANGUAGE plpgsql AS $f$
DECLARE v timestamptz;
BEGIN
 v := (public.submit_content_draft(p_key, p_at) ->> 'updated_at')::timestamptz;
 RETURN (public.record_content_conformity(p_key, v, 'Alcaldía (prueba)', current_date, 'correo', 'Prueba')
   ->> 'updated_at')::timestamptz;
END $f$;
-- Changes the published banner the way another publication would (as the owner).
CREATE FUNCTION pg_temp.change_banner() RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $f$
 UPDATE public.site_settings SET banner_text = 'Cambio publicado por otra vía' WHERE id;
$f$;
SELECT set_config('test.cd_admin', (SELECT user_id::text FROM public.user_roles WHERE role = 'admin' LIMIT 1), true);
DO $$ BEGIN
 IF coalesce(current_setting('test.cd_admin', true), '') = '' THEN
  RAISE EXCEPTION 'This test needs an existing admin in public.user_roles';
 END IF;
END $$;

-- Files that exist in site-assets (written as the owner). bb…99 and cc…99 are never uploaded.
INSERT INTO storage.objects (bucket_id, name) VALUES
 ('site-assets', 'accesos/bb000000-0000-4000-8000-000000000001.webp'),
 ('site-assets', 'accesos/bb000000-0000-4000-8000-000000000002.webp'),
 ('site-assets', 'cabeceras/inicio/cc000000-0000-4000-8000-000000000001.webp'),
 ('site-assets', 'cabeceras/inicio/cc000000-0000-4000-8000-000000000001-movil.webp');

-- Visitors and ordinary users cannot use drafts at all.
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM public.save_content_draft('portada', '{"hero_title":"x","hero_subtitle":"y"}'::jsonb);
  RAISE EXCEPTION 'Visitors must not save drafts';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM public.content_drafts; RAISE EXCEPTION 'Visitors must not read drafts';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM public.content_publications; RAISE EXCEPTION 'Visitors must not read the publication log';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', 'ad000000-0000-4000-8000-000000000095', true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.save_content_draft('portada', '{"hero_title":"x","hero_subtitle":"y"}'::jsonb);
  RAISE EXCEPTION 'Ordinary users must not save drafts';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.content_draft_state('portada'); RAISE EXCEPTION 'Ordinary users must not read draft state';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.content_drafts (draft_key, content, base_version) VALUES ('portada', '{}', 'x');
  RAISE EXCEPTION 'Ordinary users must not write drafts directly';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

-- Admin.
SELECT set_config('request.jwt.claim.sub', current_setting('test.cd_admin'), true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
 v_at timestamptz;
 v_before text;
 v_objects bigint := (SELECT count(*) FROM storage.objects WHERE bucket_id = 'site-assets');
BEGIN
 SELECT hero_title INTO v_before FROM public.site_settings WHERE id;

 -- Saving a draft changes nothing published, and nobody writes drafts or the log directly.
 v_at := (public.save_content_draft('portada', '{"hero_title":"Nuevo título","hero_subtitle":"Nuevo subtítulo"}'::jsonb)
   ->> 'updated_at')::timestamptz;
 IF (SELECT hero_title FROM public.site_settings WHERE id) <> v_before THEN
  RAISE EXCEPTION 'A saved draft must not change the published content';
 END IF;
 BEGIN PERFORM public.save_content_draft('portada', '{"hero_title":"Otro","hero_subtitle":"Otro"}'::jsonb);
  RAISE EXCEPTION 'A second draft of the same screen must be rejected';
 EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL; END;
 BEGIN UPDATE public.content_drafts SET content = '{}'; RAISE EXCEPTION 'Admin must not write drafts directly';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN DELETE FROM public.content_publications; RAISE EXCEPTION 'Nobody may delete the publication log';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF (public.content_draft_state('portada') ->> 'exists')::boolean IS NOT TRUE
 OR (public.content_draft_state('portada') ->> 'stale')::boolean THEN
  RAISE EXCEPTION 'content_draft_state must report a fresh draft';
 END IF;

 -- Publishing needs the recorded conformity, the final review and the loaded version of the draft.
 BEGIN PERFORM public.publish_content_draft('portada', v_at, true);
  RAISE EXCEPTION 'Publishing a draft without recorded conformity must be rejected';
 EXCEPTION WHEN SQLSTATE 'PT422' THEN NULL; END;
 v_at := pg_temp.conform('portada', v_at);
 BEGIN PERFORM public.publish_content_draft('portada', v_at, false);
  RAISE EXCEPTION 'Publishing without the final review must be rejected';
 EXCEPTION WHEN SQLSTATE 'PT422' THEN NULL; END;
 BEGIN PERFORM public.publish_content_draft('portada', v_at, NULL);
  RAISE EXCEPTION 'Publishing with an unanswered conformity must be rejected';
 EXCEPTION WHEN SQLSTATE 'PT422' THEN NULL; END;
 BEGIN PERFORM public.publish_content_draft('portada', v_at - interval '1 second', true);
  RAISE EXCEPTION 'Publishing an outdated copy of the draft must be rejected';
 EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL; END;
 -- Line breaks and other control characters in the note become spaces.
 PERFORM public.publish_content_draft('portada', v_at, true, E'  Correo del Ayuntamiento\r\ndel 3 de diciembre\tconfirmado  ');
 IF (SELECT hero_title FROM public.site_settings WHERE id) <> 'Nuevo título' THEN
  RAISE EXCEPTION 'Publishing must apply the draft';
 END IF;
 IF EXISTS (SELECT 1 FROM public.content_drafts WHERE draft_key = 'portada') THEN
  RAISE EXCEPTION 'Publishing must remove the draft';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.content_publications WHERE draft_key = 'portada' AND conformity
   AND published_by::text = current_setting('test.cd_admin')
   AND note = 'Correo del Ayuntamiento del 3 de diciembre confirmado' AND published_at IS NOT NULL
   AND conformity_by = 'Alcaldía (prueba)' AND conformity_channel = 'correo' AND conformity_on = current_date
   AND submitted_at IS NOT NULL AND content ->> 'hero_title' = 'Nuevo título' AND previous_content ? 'hero_title') THEN
  RAISE EXCEPTION 'The publication must record user, date, the normalised note, the conformity and the content';
 END IF;

 -- A draft whose published base changed (another publication, SQL...) is neither submitted nor published.
 v_at := (public.save_content_draft('aviso-cabecera', '{"banner_enabled":true,"banner_text":"Corte de agua"}'::jsonb)
   ->> 'updated_at')::timestamptz;
 BEGIN UPDATE public.site_settings SET banner_text = 'Cambio directo' WHERE id;
  RAISE EXCEPTION 'Admin must not change the published banner directly';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM pg_temp.change_banner();
 IF (public.content_draft_state('aviso-cabecera') ->> 'stale')::boolean IS NOT TRUE THEN
  RAISE EXCEPTION 'content_draft_state must report a stale draft';
 END IF;
 BEGIN PERFORM public.submit_content_draft('aviso-cabecera', v_at);
  RAISE EXCEPTION 'A stale draft must not be submitted';
 EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL; END;
 IF NOT EXISTS (SELECT 1 FROM public.content_drafts WHERE draft_key = 'aviso-cabecera') THEN
  RAISE EXCEPTION 'A refused publication must keep the draft';
 END IF;
 PERFORM public.discard_content_draft('aviso-cabecera', v_at);
 IF (SELECT banner_text FROM public.site_settings WHERE id) <> 'Cambio publicado por otra vía' THEN
  RAISE EXCEPTION 'Discarding must not touch the published content';
 END IF;

 -- Menu, sections and shortcuts: the Directory stays permanent; a failed publish applies nothing.
 v_at := (public.save_content_draft('menu',
   '{"entries":[{"key":"actualidad","enabled":false,"sort_order":2},{"key":"directorio","enabled":false,"sort_order":0}]}'::jsonb)
   ->> 'updated_at')::timestamptz;
 BEGIN PERFORM public.submit_content_draft('menu', v_at);
  RAISE EXCEPTION 'A draft that disables the Directory must be rejected';
 EXCEPTION WHEN SQLSTATE 'PT422' THEN NULL; END;
 IF EXISTS (SELECT 1 FROM public.site_menu) THEN RAISE EXCEPTION 'A rejected publication must apply nothing'; END IF;
 v_at := (public.save_content_draft('menu',
   '{"entries":[{"key":"actualidad","enabled":false,"sort_order":2},{"key":"guia-tramites","enabled":false,"sort_order":1}]}'::jsonb,
   v_at) ->> 'updated_at')::timestamptz;
 v_at := pg_temp.conform('menu', v_at);
 PERFORM public.publish_content_draft('menu', v_at, true);
 IF (public.site_config() #>> '{menu,guia-tramites,enabled}')::boolean IS NOT FALSE
 OR (SELECT count(*) FROM public.site_menu) <> 2 THEN
  RAISE EXCEPTION 'The published menu must be the draft';
 END IF;

 v_at := (public.save_content_draft('secciones:descubre',
   '{"sections":[{"key":"entorno","enabled":false,"sort_order":0},{"key":"rutas-senderos","enabled":true,"sort_order":1}]}'::jsonb)
   ->> 'updated_at')::timestamptz;
 v_at := pg_temp.conform('secciones:descubre', v_at);
 PERFORM public.publish_content_draft('secciones:descubre', v_at, true);
 IF (public.site_config() #>> '{sections,descubre,entorno,enabled}')::boolean IS NOT FALSE THEN
  RAISE EXCEPTION 'The published sections must be the draft';
 END IF;
 BEGIN PERFORM public.save_content_draft('secciones:inicio', '{"sections":[]}'::jsonb);
  RAISE EXCEPTION 'The home shortcuts section has no draft: it is permanent';
 EXCEPTION WHEN check_violation THEN NULL; END;

 v_at := (public.save_content_draft('accesos', '{"shortcuts":[
   {"id":"bb000000-0000-4000-8000-000000000001","title":"Piscina","description":"Horario de verano",
    "image_path":"accesos/bb000000-0000-4000-8000-000000000001.webp","image_alt":"Piscina","href":"/servicios-publicos",
    "visible":true,"sort_order":1},
   {"title":"Feria","image_path":"accesos/bb000000-0000-4000-8000-000000000002.webp","href":"https://example.org/feria",
    "visible":false,"sort_order":2}]}'::jsonb) ->> 'updated_at')::timestamptz;
 v_at := pg_temp.conform('accesos', v_at);
 PERFORM public.publish_content_draft('accesos', v_at, true);
 IF (SELECT count(*) FROM public.home_shortcuts) <> 2
 OR jsonb_array_length(public.site_config() -> 'shortcuts') <> 1 THEN
  RAISE EXCEPTION 'Publishing shortcuts must create them and show only the visible ones';
 END IF;
 v_at := (public.save_content_draft('accesos', '{"shortcuts":[
   {"id":"bb000000-0000-4000-8000-000000000001","title":"Piscina municipal",
    "image_path":"accesos/bb000000-0000-4000-8000-000000000001.webp","href":"/servicios-publicos","sort_order":1}]}'::jsonb)
   ->> 'updated_at')::timestamptz;
 v_at := pg_temp.conform('accesos', v_at);
 PERFORM public.publish_content_draft('accesos', v_at, true);
 IF (SELECT string_agg(title, ',') FROM public.home_shortcuts) <> 'Piscina municipal' THEN
  RAISE EXCEPTION 'Publishing shortcuts must update kept ones and delete removed ones';
 END IF;

 -- Identity, legal data and headers.
 v_at := (public.save_content_draft('identidad', (public.content_draft_state('identidad') -> 'published')
   || '{"app_name":"Conecta Prueba","primary_color":"#1f4e79"}'::jsonb) ->> 'updated_at')::timestamptz;
 v_at := pg_temp.conform('identidad', v_at);
 PERFORM public.publish_content_draft('identidad', v_at, true);
 IF public.site_config() #>> '{identity,app_name}' <> 'Conecta Prueba'
 OR public.site_config() #>> '{identity,primary_color}' <> '#1f4e79' THEN
  RAISE EXCEPTION 'Publishing the identity must apply the draft';
 END IF;
 -- Right shape, value rejected by the table rules: refused when submitting, nothing applied, draft kept.
 v_at := (public.save_content_draft('identidad', (public.content_draft_state('identidad') -> 'published')
   || '{"primary_color":"red"}'::jsonb) ->> 'updated_at')::timestamptz;
 BEGIN PERFORM public.submit_content_draft('identidad', v_at);
  RAISE EXCEPTION 'An invalid identity value must be rejected';
 EXCEPTION WHEN SQLSTATE 'PT422' THEN NULL; END;
 IF NOT EXISTS (SELECT 1 FROM public.content_drafts WHERE draft_key = 'identidad')
 OR public.site_config() #>> '{identity,primary_color}' <> '#1f4e79' THEN
  RAISE EXCEPTION 'A rejected publication must keep the draft and the published identity';
 END IF;
 PERFORM public.discard_content_draft('identidad', v_at);

 v_at := (public.save_content_draft('datos-legales', '{"legal_name":"Titular de prueba","legal_nif":"",
   "legal_address":"","legal_email":"titular@example.org"}'::jsonb) ->> 'updated_at')::timestamptz;
 v_at := pg_temp.conform('datos-legales', v_at);
 PERFORM public.publish_content_draft('datos-legales', v_at, true);
 IF (SELECT legal_name FROM public.site_settings WHERE id) <> 'Titular de prueba' THEN
  RAISE EXCEPTION 'Publishing legal data must apply the draft';
 END IF;

 v_at := (public.save_content_draft('cabecera:inicio', '{"image_path":"cabeceras/inicio/cc000000-0000-4000-8000-000000000001.webp",
   "image_small_path":"cabeceras/inicio/cc000000-0000-4000-8000-000000000001-movil.webp","alt":"Plaza","focal_x":40,"focal_y":60}'::jsonb)
   ->> 'updated_at')::timestamptz;
 v_at := pg_temp.conform('cabecera:inicio', v_at);
 PERFORM public.publish_content_draft('cabecera:inicio', v_at, true);
 IF public.site_config() #>> '{page_headers,inicio,alt}' <> 'Plaza' THEN
  RAISE EXCEPTION 'Publishing a header must apply the draft';
 END IF;
 v_at := (public.save_content_draft('cabecera:inicio', '{"remove":true}'::jsonb) ->> 'updated_at')::timestamptz;
 v_at := pg_temp.conform('cabecera:inicio', v_at);
 PERFORM public.publish_content_draft('cabecera:inicio', v_at, true);
 IF public.site_config() -> 'page_headers' ? 'inicio' THEN
  RAISE EXCEPTION 'Publishing a header removal must delete it';
 END IF;

 -- portada, menú, secciones, dos de accesos, identidad, datos legales y dos de cabecera.
 IF (SELECT count(*) FROM public.content_publications) <> 9 THEN
  RAISE EXCEPTION 'Every publication must be recorded once';
 END IF;
 IF (SELECT count(*) FROM storage.objects WHERE bucket_id = 'site-assets') <> v_objects THEN
  RAISE EXCEPTION 'Publishing must never add or remove files';
 END IF;
END $$;

-- Malformed content: refused when submitting; nothing published changes and the draft is kept.
DO $$
DECLARE
 v_at timestamptz;
 v_case record;
 v_menu jsonb := (SELECT coalesce(jsonb_agg(jsonb_build_array(m.entry_key, m.enabled, m.sort_order) ORDER BY m.entry_key), '[]') FROM public.site_menu AS m);
 v_shortcuts jsonb := (SELECT coalesce(jsonb_agg(h.title ORDER BY h.id), '[]') FROM public.home_shortcuts AS h);
 v_settings jsonb := (SELECT to_jsonb(s) FROM public.site_settings AS s WHERE s.id);
 v_identity jsonb := (public.content_draft_state('identidad') -> 'published');
 v_headers jsonb := (SELECT coalesce(jsonb_agg(jsonb_build_array(h.page_key, h.image_path, h.image_small_path, h.alt, h.focal_x, h.focal_y)), '[]') FROM public.page_headers AS h);
 v_objects bigint := (SELECT count(*) FROM storage.objects WHERE bucket_id = 'site-assets');
 v_publications bigint := (SELECT count(*) FROM public.content_publications);
BEGIN
 FOR v_case IN SELECT * FROM (VALUES
   ('menu', '{"entrys":[{"key":"actualidad","enabled":true,"sort_order":0}]}', 'invalid_content'),
   ('menu', '{}', 'invalid_content'),
   ('menu', '{"entries":{"key":"actualidad"}}', 'invalid_content'),
   ('menu', '{"entries":[{"key":"actualidad","enabled":"sí","sort_order":0}]}', 'invalid_content'),
   ('menu', '{"entries":[{"key":"actualidad","enabled":true,"sort_order":0,"extra":1}]}', 'invalid_content'),
   ('menu', '{"entries":[{"key":"actualidad","enabled":true,"sort_order":0},{"key":"actualidad","enabled":false,"sort_order":1}]}', 'invalid_content'),
   ('menu', '{"entries":[],"otra":true}', 'invalid_content'),
   ('secciones:descubre', '{"sectons":[]}', 'invalid_content'),
   ('secciones:descubre', '{"sections":[{"key":"entorno","enabled":true}]}', 'invalid_content'),
   ('accesos', '{"shortcut":[]}', 'invalid_content'),
   ('accesos', '{}', 'invalid_content'),
   ('accesos', '{"shortcuts":[{"title":"Sin destino","image_path":"accesos/bb000000-0000-4000-8000-000000000001.webp"}]}', 'invalid_content'),
   ('accesos', '{"shortcuts":[{"title":"X","image_path":"accesos/bb000000-0000-4000-8000-000000000001.webp","href":"/x","color":"rojo"}]}', 'invalid_content'),
   ('accesos', '{"shortcuts":[{"title":"X","image_path":"accesos/bb000000-0000-4000-8000-000000000099.webp","href":"/x"}]}', 'missing_asset'),
   ('portada', '{"hero_titel":"Error","hero_subtitle":"x"}', 'invalid_content'),
   ('portada', '{"hero_title":"Solo título"}', 'invalid_content'),
   ('portada', '{"hero_title":1,"hero_subtitle":"x"}', 'invalid_content'),
   ('aviso-cabecera', '{"banner_enabled":"sí","banner_text":"x"}', 'invalid_content'),
   ('datos-legales', '{"legal_name":"x"}', 'invalid_content'),
   ('identidad', '{"primary_color":"#000000"}', 'invalid_content'),
   ('cabecera:inicio', '{"image_path":"cabeceras/inicio/cc000000-0000-4000-8000-000000000001.webp"}', 'invalid_content'),
   ('cabecera:inicio', '{"remove":false}', 'invalid_content'),
   ('cabecera:inicio', '{"remove":true,"alt":"x"}', 'invalid_content'),
   ('cabecera:inicio', '{"image_path":"cabeceras/inicio/cc000000-0000-4000-8000-000000000099.webp",
     "image_small_path":"cabeceras/inicio/cc000000-0000-4000-8000-000000000099-movil.webp","alt":"x","focal_x":50,"focal_y":50}', 'missing_asset')
 ) AS t(draft_key, content, hint) LOOP
  v_at := (public.save_content_draft(v_case.draft_key, v_case.content::jsonb) ->> 'updated_at')::timestamptz;
  BEGIN
   PERFORM public.submit_content_draft(v_case.draft_key, v_at);
   RAISE EXCEPTION 'Malformed draft submitted: % %', v_case.draft_key, v_case.content;
  EXCEPTION WHEN SQLSTATE 'PT422' THEN
   DECLARE v_hint text; BEGIN
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
    IF v_hint <> v_case.hint THEN
     RAISE EXCEPTION 'Wrong refusal for % %: % (expected %)', v_case.draft_key, v_case.content, v_hint, v_case.hint;
    END IF;
   END;
  END;
  IF NOT EXISTS (SELECT 1 FROM public.content_drafts WHERE draft_key = v_case.draft_key AND updated_at = v_at
    AND status = 'borrador') THEN
   RAISE EXCEPTION 'A refused publication must keep the draft: %', v_case.draft_key;
  END IF;
  PERFORM public.discard_content_draft(v_case.draft_key, v_at);
 END LOOP;

 IF (SELECT coalesce(jsonb_agg(jsonb_build_array(m.entry_key, m.enabled, m.sort_order) ORDER BY m.entry_key), '[]') FROM public.site_menu AS m) <> v_menu
 OR (SELECT coalesce(jsonb_agg(h.title ORDER BY h.id), '[]') FROM public.home_shortcuts AS h) <> v_shortcuts
 OR (SELECT to_jsonb(s) FROM public.site_settings AS s WHERE s.id) <> v_settings
 OR (public.content_draft_state('identidad') -> 'published') <> v_identity
 OR (SELECT coalesce(jsonb_agg(jsonb_build_array(h.page_key, h.image_path, h.image_small_path, h.alt, h.focal_x, h.focal_y)), '[]') FROM public.page_headers AS h) <> v_headers THEN
  RAISE EXCEPTION 'Refused publications must leave the published content untouched';
 END IF;
 IF (SELECT count(*) FROM storage.objects WHERE bucket_id = 'site-assets') <> v_objects
 OR (SELECT count(*) FROM public.content_publications) <> v_publications THEN
  RAISE EXCEPTION 'Refused publications must not touch files nor the publication log';
 END IF;
END $$;
RESET ROLE;

-- updated_by no es legible desde el navegador: se comprueba como propietario de la tabla.
DO $$ BEGIN
 IF (SELECT updated_by::text FROM public.site_identity) IS DISTINCT FROM current_setting('test.cd_admin') THEN
  RAISE EXCEPTION 'The identity must record the admin who published';
 END IF;
END $$;
ROLLBACK;
