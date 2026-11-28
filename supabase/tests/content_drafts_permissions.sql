-- Rollback-only regression for 20261202090000_site_structure (drafts): a draft never reaches the
-- public web; publishing requires the admin role and the municipal conformity confirmation, applies
-- the whole screen at once, records who, when and the note, and refuses stale drafts.
BEGIN;
SELECT set_config('test.cd_admin', (SELECT user_id::text FROM public.user_roles WHERE role = 'admin' LIMIT 1), true);
DO $$ BEGIN
 IF coalesce(current_setting('test.cd_admin', true), '') = '' THEN
  RAISE EXCEPTION 'This test needs an existing admin in public.user_roles';
 END IF;
END $$;

-- Visitors and ordinary users cannot use drafts at all.
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM public.save_content_draft('portada', '{"hero_title":"x"}'::jsonb);
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
 BEGIN PERFORM public.save_content_draft('portada', '{"hero_title":"x"}'::jsonb);
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
BEGIN
 SELECT hero_title INTO v_before FROM public.site_settings WHERE id;

 -- Saving a draft changes nothing published, and nobody writes drafts or the log directly.
 v_at := (public.save_content_draft('portada', '{"hero_title":"Nuevo título","hero_subtitle":"Nuevo subtítulo"}'::jsonb)
   ->> 'updated_at')::timestamptz;
 IF (SELECT hero_title FROM public.site_settings WHERE id) <> v_before THEN
  RAISE EXCEPTION 'A saved draft must not change the published content';
 END IF;
 BEGIN PERFORM public.save_content_draft('portada', '{"hero_title":"Otro"}'::jsonb);
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

 -- Publishing needs the conformity confirmation and the loaded version of the draft.
 BEGIN PERFORM public.publish_content_draft('portada', v_at, false);
  RAISE EXCEPTION 'Publishing without conformity must be rejected';
 EXCEPTION WHEN SQLSTATE 'PT422' THEN NULL; END;
 BEGIN PERFORM public.publish_content_draft('portada', v_at, NULL);
  RAISE EXCEPTION 'Publishing with an unanswered conformity must be rejected';
 EXCEPTION WHEN SQLSTATE 'PT422' THEN NULL; END;
 BEGIN PERFORM public.publish_content_draft('portada', v_at - interval '1 second', true);
  RAISE EXCEPTION 'Publishing an outdated copy of the draft must be rejected';
 EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL; END;
 PERFORM public.publish_content_draft('portada', v_at, true, '  Correo del Ayuntamiento del 3 de diciembre  ');
 IF (SELECT hero_title FROM public.site_settings WHERE id) <> 'Nuevo título' THEN
  RAISE EXCEPTION 'Publishing must apply the draft';
 END IF;
 IF EXISTS (SELECT 1 FROM public.content_drafts WHERE draft_key = 'portada') THEN
  RAISE EXCEPTION 'Publishing must remove the draft';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM public.content_publications WHERE draft_key = 'portada' AND conformity
   AND published_by::text = current_setting('test.cd_admin') AND note = 'Correo del Ayuntamiento del 3 de diciembre'
   AND published_at IS NOT NULL) THEN
  RAISE EXCEPTION 'The publication must record user, date and note';
 END IF;

 -- A draft whose published base changed (old panel, SQL...) cannot be published.
 v_at := (public.save_content_draft('aviso-cabecera', '{"banner_enabled":true,"banner_text":"Corte de agua"}'::jsonb)
   ->> 'updated_at')::timestamptz;
 UPDATE public.site_settings SET banner_text = 'Cambio directo del panel actual' WHERE id;
 IF (public.content_draft_state('aviso-cabecera') ->> 'stale')::boolean IS NOT TRUE THEN
  RAISE EXCEPTION 'content_draft_state must report a stale draft';
 END IF;
 BEGIN PERFORM public.publish_content_draft('aviso-cabecera', v_at, true);
  RAISE EXCEPTION 'A stale draft must not be published';
 EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL; END;
 PERFORM public.discard_content_draft('aviso-cabecera', v_at);
 IF (SELECT banner_text FROM public.site_settings WHERE id) <> 'Cambio directo del panel actual' THEN
  RAISE EXCEPTION 'Discarding must not touch the published content';
 END IF;

 -- Menu, sections and shortcuts: the Directory stays permanent; a failed publish applies nothing.
 v_at := (public.save_content_draft('menu',
   '{"entries":[{"key":"actualidad","enabled":false,"sort_order":2},{"key":"directorio","enabled":false,"sort_order":0}]}'::jsonb)
   ->> 'updated_at')::timestamptz;
 BEGIN PERFORM public.publish_content_draft('menu', v_at, true);
  RAISE EXCEPTION 'A draft that disables the Directory must be rejected';
 EXCEPTION WHEN check_violation THEN NULL; END;
 IF EXISTS (SELECT 1 FROM public.site_menu) THEN RAISE EXCEPTION 'A rejected publication must apply nothing'; END IF;
 v_at := (public.save_content_draft('menu',
   '{"entries":[{"key":"actualidad","enabled":false,"sort_order":2},{"key":"guia-tramites","enabled":false,"sort_order":1}]}'::jsonb,
   v_at) ->> 'updated_at')::timestamptz;
 PERFORM public.publish_content_draft('menu', v_at, true);
 IF (public.site_config() #>> '{menu,guia-tramites,enabled}')::boolean IS NOT FALSE
 OR (SELECT count(*) FROM public.site_menu) <> 2 THEN
  RAISE EXCEPTION 'The published menu must be the draft';
 END IF;

 v_at := (public.save_content_draft('secciones:descubre',
   '{"sections":[{"key":"entorno","enabled":false,"sort_order":0},{"key":"rutas-senderos","enabled":true,"sort_order":1}]}'::jsonb)
   ->> 'updated_at')::timestamptz;
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
 PERFORM public.publish_content_draft('accesos', v_at, true);
 IF (SELECT count(*) FROM public.home_shortcuts) <> 2
 OR jsonb_array_length(public.site_config() -> 'shortcuts') <> 1 THEN
  RAISE EXCEPTION 'Publishing shortcuts must create them and show only the visible ones';
 END IF;
 v_at := (public.save_content_draft('accesos', '{"shortcuts":[
   {"id":"bb000000-0000-4000-8000-000000000001","title":"Piscina municipal",
    "image_path":"accesos/bb000000-0000-4000-8000-000000000001.webp","href":"/servicios-publicos","sort_order":1}]}'::jsonb)
   ->> 'updated_at')::timestamptz;
 PERFORM public.publish_content_draft('accesos', v_at, true);
 IF (SELECT string_agg(title, ',') FROM public.home_shortcuts) <> 'Piscina municipal' THEN
  RAISE EXCEPTION 'Publishing shortcuts must update kept ones and delete removed ones';
 END IF;

 -- Identity, legal data and headers.
 v_at := (public.save_content_draft('identidad', (public.content_draft_state('identidad') -> 'published')
   || '{"app_name":"Conecta Prueba","primary_color":"#1f4e79"}'::jsonb) ->> 'updated_at')::timestamptz;
 PERFORM public.publish_content_draft('identidad', v_at, true);
 IF public.site_config() #>> '{identity,app_name}' <> 'Conecta Prueba'
 OR public.site_config() #>> '{identity,primary_color}' <> '#1f4e79' THEN
  RAISE EXCEPTION 'Publishing the identity must apply the draft';
 END IF;
 v_at := (public.save_content_draft('identidad', '{"primary_color":"red"}'::jsonb) ->> 'updated_at')::timestamptz;
 BEGIN PERFORM public.publish_content_draft('identidad', v_at, true);
  RAISE EXCEPTION 'An invalid identity draft must be rejected';
 EXCEPTION WHEN check_violation THEN NULL; END;
 IF NOT EXISTS (SELECT 1 FROM public.content_drafts WHERE draft_key = 'identidad') THEN
  RAISE EXCEPTION 'A rejected publication must keep the draft';
 END IF;
 PERFORM public.discard_content_draft('identidad', v_at);

 v_at := (public.save_content_draft('datos-legales', '{"legal_name":"Titular de prueba","legal_email":"titular@example.org"}'::jsonb)
   ->> 'updated_at')::timestamptz;
 PERFORM public.publish_content_draft('datos-legales', v_at, true);
 IF (SELECT legal_name FROM public.site_settings WHERE id) <> 'Titular de prueba' THEN
  RAISE EXCEPTION 'Publishing legal data must apply the draft';
 END IF;

 v_at := (public.save_content_draft('cabecera:inicio', '{"image_path":"cabeceras/inicio/cc000000-0000-4000-8000-000000000001.webp",
   "image_small_path":"cabeceras/inicio/cc000000-0000-4000-8000-000000000001-movil.webp","alt":"Plaza","focal_x":40,"focal_y":60}'::jsonb)
   ->> 'updated_at')::timestamptz;
 PERFORM public.publish_content_draft('cabecera:inicio', v_at, true);
 IF public.site_config() #>> '{page_headers,inicio,alt}' <> 'Plaza' THEN
  RAISE EXCEPTION 'Publishing a header must apply the draft';
 END IF;
 v_at := (public.save_content_draft('cabecera:inicio', '{"remove":true}'::jsonb) ->> 'updated_at')::timestamptz;
 PERFORM public.publish_content_draft('cabecera:inicio', v_at, true);
 IF public.site_config() -> 'page_headers' ? 'inicio' THEN
  RAISE EXCEPTION 'Publishing a header removal must delete it';
 END IF;

 -- portada, menú, secciones, dos de accesos, identidad, datos legales y dos de cabecera.
 IF (SELECT count(*) FROM public.content_publications) <> 9 THEN
  RAISE EXCEPTION 'Every publication must be recorded once';
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
