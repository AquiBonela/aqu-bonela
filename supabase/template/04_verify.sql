-- =====================================================================
-- Groundwork · 04_verify.sql
-- Verificación de una instalación nueva. Ejecutar en SQL Editor tras 01-03.
-- No deja datos: todas las pruebas se deshacen al final.
-- Resultado correcto: NOTICE «VERIFICACIÓN SUPERADA». Cualquier fallo
-- detiene la ejecución con un mensaje «FALLO: ...».
-- =====================================================================
DO $verify$
DECLARE
  n integer;
  v_admin uuid := gen_random_uuid();
  v_member uuid := gen_random_uuid();
  v_cat uuid; v_pub uuid; v_draft uuid; v_ok boolean; v_at timestamptz; v_content jsonb;
BEGIN
  -- ---------- 1. Estructura ----------
  SELECT count(*) INTO n FROM pg_tables WHERE schemaname = 'public' AND tablename IN
    ('activities','approval_tokens','categories','consents','listing_activities','listing_contacts',
     'listing_hours','listing_photos','listing_reports','listing_requests','listings',
     'procedure_categories','procedures','site_identity','site_settings','suggestions','translation_gateway_state','user_roles',
     'page_headers','listing_hour_periods','listing_events',
     'site_menu','page_sections','home_shortcuts','content_drafts','content_publications','admin_audit_log');
  IF n <> 27 THEN RAISE EXCEPTION 'FALLO: tablas public = % (esperado 27)', n; END IF;
  IF to_regclass('private.form_rate_limits') IS NULL THEN RAISE EXCEPTION 'FALLO: falta private.form_rate_limits'; END IF;
  SELECT count(*) INTO n FROM pg_class c JOIN pg_namespace s ON s.oid = c.relnamespace
    WHERE s.nspname IN ('public','private') AND c.relkind = 'r' AND NOT c.relrowsecurity;
  IF n <> 0 THEN RAISE EXCEPTION 'FALLO: % tablas sin RLS', n; END IF;
  SELECT count(*) INTO n FROM information_schema.columns WHERE table_schema IN ('public','private')
    AND table_name IN (SELECT tablename FROM pg_tables WHERE schemaname IN ('public','private'));
  IF n <> 307 THEN RAISE EXCEPTION 'FALLO: columnas = % (esperado 307)', n; END IF;
  SELECT count(*) INTO n FROM pg_constraint co JOIN pg_namespace s ON s.oid = co.connamespace WHERE s.nspname IN ('public','private');
  IF n <> 133 THEN RAISE EXCEPTION 'FALLO: restricciones = % (esperado 133)', n; END IF;

  -- ---------- 2. ENUM ----------
  IF (SELECT string_agg(enumlabel, ',' ORDER BY enumsortorder) FROM pg_enum WHERE enumtypid = 'public.app_role'::regtype) <> 'admin'
  OR (SELECT string_agg(enumlabel, ',' ORDER BY enumsortorder) FROM pg_enum WHERE enumtypid = 'public.listing_type'::regtype) <> 'comercio,profesional,publico,asociacion'
  OR (SELECT string_agg(enumlabel, ',' ORDER BY enumsortorder) FROM pg_enum WHERE enumtypid = 'public.listing_status'::regtype) <> 'borrador,pendiente,publicada,rechazada,oculta'
  THEN RAISE EXCEPTION 'FALLO: valores ENUM distintos de producción'; END IF;

  -- ---------- 3. Políticas, funciones, triggers ----------
  SELECT count(*) INTO n FROM pg_policies WHERE schemaname = 'public';
  IF n <> 50 THEN RAISE EXCEPTION 'FALLO: políticas public = % (esperado 50)', n; END IF;
  SELECT count(*) INTO n FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
    AND (coalesce(qual,'') || coalesce(with_check,'')) ~ '(listing-photos|procedure-images)';
  IF n <> 8 THEN RAISE EXCEPTION 'FALLO: políticas de Storage = % (esperado 8)', n; END IF;
  SELECT count(*) INTO n FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
    AND (coalesce(qual,'') || coalesce(with_check,'')) ~ 'site-assets';
  IF n <> 2 THEN RAISE EXCEPTION 'FALLO: políticas de Storage de site-assets = % (esperado 2)', n; END IF;
  SELECT count(*) INTO n FROM pg_proc p JOIN pg_namespace s ON s.oid = p.pronamespace
    WHERE (s.nspname, p.proname) IN (('private','has_role'),('public','has_role'),('public','check_rate_limit'),
      ('private','cleanup_expired_rate_limits'),('public','set_updated_at'),('public','limit_listing_photos'),
      ('public','listings_publish_stamp'),('public','sync_public_contact'),
      ('public','can_manage_identity'),('private','site_identity_before_update'),('public','site_config'),
      ('public','save_listing'),('public','approve_listing_review'),
      ('private','page_headers_stamp'),('public','listing_review_state'),('private','listings_publish_rule'),
      ('private','listings_status_log'),('private','approval_tokens_issue'),
      ('public','request_listing_corrections'),('public','withdraw_listing_consent'),
      ('private','site_structure_stamp'),('private','published_content'),('public','save_content_draft'),
      ('public','discard_content_draft'),('public','content_draft_state'),('public','publish_content_draft'),
      ('private','draft_keys'),('private','validate_draft_content'),
      ('private','content_draft_reset'),('private','draft_missing_assets'),('private','apply_content_draft'),
      ('private','lock_published_content'),('public','submit_content_draft'),('public','record_content_conformity'),
      ('public','return_content_draft'),('private','audit_change'));
  IF n <> 36 THEN RAISE EXCEPTION 'FALLO: funciones = % (esperado 36)', n; END IF;
  SELECT count(*) INTO n FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace s ON s.oid = c.relnamespace
    WHERE s.nspname = 'public' AND NOT t.tgisinternal;
  IF n <> 41 THEN RAISE EXCEPTION 'FALLO: triggers = % (esperado 41)', n; END IF;
  -- Toda función SECURITY DEFINER de la plantilla fija search_path vacío.
  SELECT count(*) INTO n FROM pg_proc p JOIN pg_namespace s ON s.oid = p.pronamespace
    WHERE s.nspname IN ('public','private') AND p.prosecdef AND p.proname <> 'rls_auto_enable'
      AND NOT coalesce(p.proconfig, '{}') && ARRAY['search_path=""', 'search_path='];
  IF n <> 0 THEN RAISE EXCEPTION 'FALLO: % funciones SECURITY DEFINER sin search_path vacío', n; END IF;
  IF has_function_privilege('anon', 'public.check_rate_limit(text,integer,integer)', 'EXECUTE')
  OR has_function_privilege('authenticated', 'public.check_rate_limit(text,integer,integer)', 'EXECUTE')
  OR NOT has_function_privilege('service_role', 'public.check_rate_limit(text,integer,integer)', 'EXECUTE')
  THEN RAISE EXCEPTION 'FALLO: permisos de check_rate_limit'; END IF;
  IF has_function_privilege('anon', 'public.has_role(uuid,public.app_role)', 'EXECUTE')
  THEN RAISE EXCEPTION 'FALLO: anon puede ejecutar has_role'; END IF;
  IF has_function_privilege('anon', 'public.can_manage_identity()', 'EXECUTE')
  OR NOT has_function_privilege('anon', 'public.site_config()', 'EXECUTE')
  THEN RAISE EXCEPTION 'FALLO: permisos de can_manage_identity/site_config'; END IF;
  IF has_function_privilege('anon', 'public.save_listing(jsonb,jsonb,jsonb,uuid[],uuid,timestamp with time zone,jsonb)', 'EXECUTE')
  OR NOT has_function_privilege('authenticated', 'public.save_listing(jsonb,jsonb,jsonb,uuid[],uuid,timestamp with time zone,jsonb)', 'EXECUTE')
  THEN RAISE EXCEPTION 'FALLO: permisos de save_listing'; END IF;
  IF has_function_privilege('anon', 'public.approve_listing_review(text,jsonb,boolean,jsonb,text,text)', 'EXECUTE')
  OR has_function_privilege('authenticated', 'public.approve_listing_review(text,jsonb,boolean,jsonb,text,text)', 'EXECUTE')
  OR NOT has_function_privilege('service_role', 'public.approve_listing_review(text,jsonb,boolean,jsonb,text,text)', 'EXECUTE')
  OR has_function_privilege('anon', 'public.request_listing_corrections(text,text)', 'EXECUTE')
  OR has_function_privilege('authenticated', 'public.request_listing_corrections(text,text)', 'EXECUTE')
  OR NOT has_function_privilege('service_role', 'public.request_listing_corrections(text,text)', 'EXECUTE')
  OR has_function_privilege('anon', 'public.withdraw_listing_consent(uuid,text)', 'EXECUTE')
  OR has_function_privilege('anon', 'public.listing_review_state(uuid)', 'EXECUTE')
  THEN RAISE EXCEPTION 'FALLO: permisos de las funciones de revisión'; END IF;
  IF has_function_privilege('anon', 'public.save_content_draft(text,jsonb,timestamp with time zone)', 'EXECUTE')
  OR has_function_privilege('anon', 'public.publish_content_draft(text,timestamp with time zone,boolean,text)', 'EXECUTE')
  OR has_function_privilege('anon', 'public.discard_content_draft(text,timestamp with time zone)', 'EXECUTE')
  OR has_function_privilege('anon', 'public.content_draft_state(text)', 'EXECUTE')
  OR NOT has_function_privilege('authenticated', 'public.publish_content_draft(text,timestamp with time zone,boolean,text)', 'EXECUTE')
  OR has_function_privilege('anon', 'public.submit_content_draft(text,timestamp with time zone)', 'EXECUTE')
  OR has_function_privilege('anon', 'public.record_content_conformity(text,timestamp with time zone,text,date,text,text)', 'EXECUTE')
  OR has_function_privilege('anon', 'public.return_content_draft(text,timestamp with time zone)', 'EXECUTE')
  OR NOT has_function_privilege('authenticated', 'public.record_content_conformity(text,timestamp with time zone,text,date,text,text)', 'EXECUTE')
  OR has_function_privilege('authenticated', 'private.apply_content_draft(text,jsonb)', 'EXECUTE')
  OR has_function_privilege('authenticated', 'private.audit_change()', 'EXECUTE')
  THEN RAISE EXCEPTION 'FALLO: permisos de las funciones de borradores'; END IF;

  -- ---------- 4. Storage ----------
  SELECT count(*) INTO n FROM storage.buckets WHERE NOT public AND
    ((id = 'listing-photos' AND file_size_limit = 5242880 AND allowed_mime_types IS NULL) OR
     (id = 'procedure-images' AND file_size_limit = 8388608 AND allowed_mime_types = ARRAY['image/webp']));
  IF n <> 2 THEN RAISE EXCEPTION 'FALLO: buckets privados incorrectos'; END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'site-assets' AND NOT public
    AND file_size_limit = 5242880 AND allowed_mime_types = ARRAY['image/webp','image/png'])
  THEN RAISE EXCEPTION 'FALLO: falta el bucket privado site-assets (5 MB, image/webp e image/png)'; END IF;

  -- ---------- 5. Permisos de columna ----------
  IF has_column_privilege('anon', 'public.site_settings', 'admin_whatsapp', 'SELECT')
  OR has_column_privilege('anon', 'public.site_settings', 'contact_email', 'SELECT')
  OR NOT has_column_privilege('anon', 'public.site_settings', 'hero_title', 'SELECT')
  OR has_table_privilege('anon', 'public.suggestions', 'INSERT')
  OR has_table_privilege('authenticated', 'public.listing_reports', 'INSERT')
  OR has_table_privilege('anon', 'private.form_rate_limits', 'SELECT')
  OR has_table_privilege('anon', 'public.listings', 'SELECT')
  OR NOT has_table_privilege('anon', 'public.public_listings', 'SELECT')
  OR has_table_privilege('anon', 'public.listings', 'INSERT') OR has_table_privilege('anon', 'public.listings', 'UPDATE')
  OR has_table_privilege('anon', 'public.listings', 'DELETE')
  OR has_table_privilege('anon', 'public.listing_hours', 'INSERT') OR has_table_privilege('anon', 'public.listing_hours', 'UPDATE')
  OR has_table_privilege('anon', 'public.listing_hours', 'DELETE')
  OR has_table_privilege('anon', 'public.listing_photos', 'INSERT') OR has_table_privilege('anon', 'public.listing_photos', 'UPDATE')
  OR has_table_privilege('anon', 'public.listing_photos', 'DELETE')
  OR has_table_privilege('anon', 'public.listing_activities', 'INSERT') OR has_table_privilege('anon', 'public.listing_activities', 'UPDATE')
  OR has_table_privilege('anon', 'public.listing_activities', 'DELETE')
  OR NOT has_table_privilege('anon', 'public.listing_hours', 'SELECT')
  OR NOT has_table_privilege('authenticated', 'public.listings', 'UPDATE')
  OR NOT has_column_privilege('anon', 'public.site_identity', 'app_name', 'SELECT')
  OR has_column_privilege('anon', 'public.site_identity', 'updated_by', 'SELECT')
  OR has_any_column_privilege('anon', 'public.site_identity', 'UPDATE')
  OR has_table_privilege('authenticated', 'public.site_identity', 'INSERT')
  OR has_table_privilege('authenticated', 'public.site_identity', 'DELETE')
  OR has_column_privilege('authenticated', 'public.site_identity', 'id', 'UPDATE')
  OR has_column_privilege('authenticated', 'public.site_identity', 'updated_by', 'UPDATE')
  OR NOT has_column_privilege('anon', 'public.site_identity', 'primary_color', 'SELECT')
  OR NOT has_column_privilege('anon', 'public.page_headers', 'image_path', 'SELECT')
  OR has_column_privilege('anon', 'public.page_headers', 'updated_by', 'SELECT')
  OR has_table_privilege('anon', 'public.page_headers', 'INSERT') OR has_table_privilege('anon', 'public.page_headers', 'UPDATE')
  OR has_table_privilege('anon', 'public.page_headers', 'DELETE')
  OR has_table_privilege('anon', 'public.listing_hour_periods', 'INSERT')
  OR has_table_privilege('anon', 'public.listing_events', 'SELECT')
  OR has_table_privilege('authenticated', 'public.listing_events', 'INSERT')
  OR has_table_privilege('authenticated', 'public.consents', 'INSERT') OR has_table_privilege('authenticated', 'public.consents', 'UPDATE')
  OR has_table_privilege('authenticated', 'public.listing_requests', 'INSERT')
  OR has_column_privilege('anon', 'public.site_settings', 'publish_on_owner_approval', 'SELECT')
  OR NOT has_column_privilege('anon', 'public.site_menu', 'enabled', 'SELECT')
  OR has_column_privilege('anon', 'public.site_menu', 'updated_by', 'SELECT')
  OR has_column_privilege('anon', 'public.home_shortcuts', 'updated_by', 'SELECT')
  OR has_table_privilege('authenticated', 'public.site_menu', 'INSERT') OR has_table_privilege('authenticated', 'public.site_menu', 'UPDATE')
  OR has_table_privilege('authenticated', 'public.page_sections', 'INSERT') OR has_table_privilege('authenticated', 'public.page_sections', 'DELETE')
  OR has_table_privilege('authenticated', 'public.home_shortcuts', 'INSERT') OR has_table_privilege('authenticated', 'public.home_shortcuts', 'UPDATE')
  OR has_table_privilege('authenticated', 'public.content_drafts', 'INSERT') OR has_table_privilege('authenticated', 'public.content_drafts', 'UPDATE')
  OR has_table_privilege('authenticated', 'public.content_drafts', 'DELETE')
  OR has_table_privilege('authenticated', 'public.content_publications', 'INSERT')
  OR has_table_privilege('authenticated', 'public.content_publications', 'UPDATE')
  OR has_table_privilege('authenticated', 'public.content_publications', 'DELETE')
  OR has_table_privilege('anon', 'public.content_drafts', 'SELECT') OR has_table_privilege('anon', 'public.content_publications', 'SELECT')
  THEN RAISE EXCEPTION 'FALLO: permisos de tabla/columna'; END IF;

  -- Ni visitantes ni usuarios (incluidos admins) pueden vaciar tablas saltándose RLS.
  SELECT count(*) INTO n FROM pg_tables t
  WHERE t.schemaname IN ('public','private') AND
    (has_table_privilege('anon', format('%I.%I',t.schemaname,t.tablename), 'TRUNCATE') OR
     has_table_privilege('authenticated', format('%I.%I',t.schemaname,t.tablename), 'TRUNCATE'));
  IF n <> 0 THEN RAISE EXCEPTION 'FALLO: vaciado de tablas accesible a visitantes/usuarios'; END IF;

  -- Los visitantes no escriben en ninguna tabla ni leen las privadas (además de RLS).
  SELECT count(*) INTO n FROM pg_class c JOIN pg_namespace s ON s.oid = c.relnamespace
  WHERE s.nspname = 'public' AND c.relkind IN ('r', 'v') AND (
    has_table_privilege('anon', c.oid, 'INSERT') OR has_table_privilege('anon', c.oid, 'UPDATE')
    OR has_table_privilege('anon', c.oid, 'DELETE') OR has_any_column_privilege('anon', c.oid, 'INSERT')
    OR has_any_column_privilege('anon', c.oid, 'UPDATE'));
  IF n <> 0 THEN RAISE EXCEPTION 'FALLO: % tablas con escritura para visitantes', n; END IF;
  SELECT count(*) INTO n FROM unnest(ARRAY['approval_tokens','consents','listing_contacts','listing_reports',
    'listing_requests','suggestions','translation_gateway_state','user_roles','listing_events','listings',
    'content_drafts','content_publications','admin_audit_log']) AS t
  WHERE has_any_column_privilege('anon', format('public.%I', t), 'SELECT');
  IF n <> 0 THEN RAISE EXCEPTION 'FALLO: % tablas privadas legibles por visitantes', n; END IF;
  -- Lo publicado solo cambia al publicar: nadie escribe directamente identidad, cabeceras ni textos públicos.
  IF has_any_column_privilege('authenticated', 'public.site_identity', 'UPDATE')
  OR has_any_column_privilege('authenticated', 'public.page_headers', 'INSERT')
  OR has_any_column_privilege('authenticated', 'public.page_headers', 'UPDATE')
  OR has_table_privilege('authenticated', 'public.page_headers', 'DELETE')
  OR has_table_privilege('authenticated', 'public.site_settings', 'INSERT')
  OR has_table_privilege('authenticated', 'public.site_settings', 'DELETE')
  OR has_column_privilege('authenticated', 'public.site_settings', 'hero_title', 'UPDATE')
  OR has_column_privilege('authenticated', 'public.site_settings', 'banner_text', 'UPDATE')
  OR has_column_privilege('authenticated', 'public.site_settings', 'legal_nif', 'UPDATE')
  OR NOT has_column_privilege('authenticated', 'public.site_settings', 'admin_whatsapp', 'UPDATE')
  OR NOT has_column_privilege('authenticated', 'public.site_settings', 'publish_on_owner_approval', 'UPDATE')
  OR has_table_privilege('authenticated', 'public.admin_audit_log', 'INSERT')
  OR has_table_privilege('authenticated', 'public.admin_audit_log', 'UPDATE')
  OR has_table_privilege('authenticated', 'public.admin_audit_log', 'DELETE')
  OR has_table_privilege('service_role', 'public.admin_audit_log', 'DELETE')
  THEN RAISE EXCEPTION 'FALLO: escritura directa de lo publicado o del registro de operaciones'; END IF;

  -- ---------- 6. Datos universales ----------
  IF (SELECT count(*) FROM public.categories) <> 28 OR (SELECT count(*) FROM public.activities) <> 155
  OR (SELECT count(*) FROM public.procedure_categories) <> 6
  THEN RAISE EXCEPTION 'FALLO: semilla universal incompleta'; END IF;
  IF (SELECT count(*) FROM public.site_settings) <> 1 THEN RAISE EXCEPTION 'FALLO: falta site_settings (03)'; END IF;
  IF (SELECT count(*) FROM public.site_identity) <> 1 THEN RAISE EXCEPTION 'FALLO: falta site_identity (01)'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'public_listings'
    AND column_name IN ('featured_until','created_at','updated_at','published_at','home_service','service_area','status'))
  THEN RAISE EXCEPTION 'FALLO: public_listings expone columnas internas'; END IF;

  -- ---------- 7. Pruebas reales con roles (se deshacen) ----------
  BEGIN
    INSERT INTO auth.users (id) VALUES (v_admin), (v_member);
    INSERT INTO public.user_roles (user_id, role) VALUES (v_admin, 'admin');
    SELECT id INTO v_cat FROM public.categories ORDER BY sort_order LIMIT 1;
    -- Una ficha de comercio solo se publica con la aprobación del titular (regla de la base).
    INSERT INTO public.listings (slug, type, category_id, name, status) VALUES
      ('verify-pub-' || v_admin, 'comercio', v_cat, 'Verify pub', 'borrador') RETURNING id INTO v_pub;
    BEGIN UPDATE public.listings SET status = 'publicada' WHERE id = v_pub; RAISE EXCEPTION 'FALLO: se publica sin aprobación del titular';
    EXCEPTION WHEN SQLSTATE 'PT422' THEN NULL; END;
    INSERT INTO public.listing_events (listing_id, kind) VALUES (v_pub, 'aprobacion');
    UPDATE public.listings SET status = 'publicada' WHERE id = v_pub;
    IF NOT EXISTS (SELECT 1 FROM public.listing_events WHERE listing_id = v_pub AND kind = 'estado' AND to_status = 'publicada')
    THEN RAISE EXCEPTION 'FALLO: el cambio de estado no queda registrado'; END IF;
    INSERT INTO public.listings (slug, type, category_id, name, status) VALUES
      ('verify-draft-' || v_admin, 'comercio', v_cat, 'Verify draft', 'borrador') RETURNING id INTO v_draft;
    INSERT INTO public.listing_contacts (listing_id, phone, show_phone, owner_contact, street, street_number, postal_code, locality,
      latitude, longitude, show_approximate_location, website, show_website)
      VALUES (v_pub, '600000000', false, 'privado', 'Calle Verificación', '1', '00000', 'Localidad', 40.41234, -3.70456, true,
      'https://ejemplo.org', false);
    UPDATE public.listings SET home_service = true, service_area = 'Zona de prueba', show_service_area = false WHERE id = v_pub;
    -- Horario que el titular ha ocultado y traducción con memoria editorial.
    INSERT INTO public.listing_hours (listing_id, weekday, opens, closes) VALUES (v_pub, 1, '09:00', '14:00');
    UPDATE public.listings SET tags = ARRAY['pan de leña', '__ocultar_horario'], featured = true, featured_until = now() + interval '1 day',
      translations = '{"en":{"content":{"description":"Bread"},"source":{"description":"Pan"},"manual":true,"glossary":[]}}'::jsonb
    WHERE id = v_pub;

    -- Trigger de contacto: teléfono no autorizado no se publica
    IF (SELECT public_phone FROM public.listings WHERE id = v_pub) IS NOT NULL THEN RAISE EXCEPTION 'FALLO: sync_public_contact'; END IF;
    -- Ubicación aproximada: sin calle, con localidad y coordenadas redondeadas; web no autorizada.
    IF NOT EXISTS (SELECT 1 FROM public.listings WHERE id = v_pub AND public_address IS NULL AND public_locality = '00000 Localidad'
      AND public_latitude = 40.41 AND public_longitude = -3.70 AND public_location_approximate AND public_website IS NULL)
    THEN RAISE EXCEPTION 'FALLO: ubicación aproximada o web no autorizada'; END IF;

    -- Rate limiting (service_role): 2 intentos permitidos, el 3.º denegado
    PERFORM set_config('role', 'service_role', true);
    v_ok := public.check_rate_limit('verify:ss:' || repeat('a', 64), 2, 60);
    v_ok := v_ok AND public.check_rate_limit('verify:ss:' || repeat('a', 64), 2, 60);
    IF NOT v_ok OR public.check_rate_limit('verify:ss:' || repeat('a', 64), 2, 60) THEN
      RAISE EXCEPTION 'FALLO: check_rate_limit no limita'; END IF;
    PERFORM set_config('role', 'postgres', true);

    -- Visitante anónimo
    PERFORM set_config('role', 'anon', true);
    PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
    IF (SELECT count(*) FROM public.public_listings WHERE id IN (v_pub, v_draft)) <> 1 THEN RAISE EXCEPTION 'FALLO: anon ve borradores'; END IF;
    BEGIN PERFORM 1 FROM public.listings; RAISE EXCEPTION 'FALLO: anon lee listings directamente';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    IF EXISTS (SELECT 1 FROM public.listing_hours WHERE listing_id = v_pub) THEN RAISE EXCEPTION 'FALLO: anon ve un horario oculto'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.public_listings WHERE id = v_pub AND featured AND tags = ARRAY['pan de leña'] AND hours_hidden
      AND translations = '{"en":{"content":{"description":"Bread"}}}'::jsonb)
    THEN RAISE EXCEPTION 'FALLO: public_listings no calcula destacado, etiquetas o traducciones'; END IF;
    PERFORM set_config('role', 'postgres', true);
    UPDATE public.listings SET tags = '{}' WHERE id = v_pub;
    PERFORM set_config('role', 'anon', true);
    IF NOT EXISTS (SELECT 1 FROM public.listing_hours WHERE listing_id = v_pub) THEN RAISE EXCEPTION 'FALLO: anon no ve un horario publicado'; END IF;
    BEGIN PERFORM 1 FROM public.listing_contacts; RAISE EXCEPTION 'FALLO: anon lee contactos privados';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    IF NOT EXISTS (SELECT 1 FROM public.public_listings WHERE id = v_pub AND NOT public_home_service AND public_service_area = '')
    THEN RAISE EXCEPTION 'FALLO: public_listings publica la zona de servicio sin permiso'; END IF;
    BEGIN PERFORM 1 FROM public.listing_events; RAISE EXCEPTION 'FALLO: anon lee el historial de fichas';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN INSERT INTO public.page_headers (page_key, image_path, image_small_path)
      VALUES ('inicio', 'cabeceras/inicio/00000000-0000-4000-8000-000000000000.webp', 'cabeceras/inicio/00000000-0000-4000-8000-000000000000-movil.webp');
      RAISE EXCEPTION 'FALLO: anon crea cabeceras';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    IF jsonb_typeof(public.site_config() -> 'page_headers') <> 'object' THEN RAISE EXCEPTION 'FALLO: site_config sin cabeceras'; END IF;
    BEGIN PERFORM admin_whatsapp FROM public.site_settings; RAISE EXCEPTION 'FALLO: anon lee admin_whatsapp';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN INSERT INTO public.suggestions (name, message) VALUES ('Prueba', 'Mensaje de prueba'); RAISE EXCEPTION 'FALLO: anon inserta sugerencias';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN PERFORM public.check_rate_limit('verify:ss:' || repeat('b', 64), 5, 60); RAISE EXCEPTION 'FALLO: anon ejecuta check_rate_limit';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN PERFORM 1 FROM private.form_rate_limits; RAISE EXCEPTION 'FALLO: anon lee rate limits';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;

    BEGIN TRUNCATE TABLE public.listing_contacts; RAISE EXCEPTION 'FALLO: anon vacía contactos';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    IF public.site_config() -> 'identity' IS NULL OR jsonb_typeof(public.site_config() -> 'identity') <> 'object'
    THEN RAISE EXCEPTION 'FALLO: anon no lee site_config'; END IF;
    IF public.site_config() -> 'identity' ? 'updated_by' THEN RAISE EXCEPTION 'FALLO: site_config expone updated_by'; END IF;
    IF jsonb_typeof(public.site_config() -> 'menu') <> 'object' OR jsonb_typeof(public.site_config() -> 'sections') <> 'object'
    OR jsonb_typeof(public.site_config() -> 'shortcuts') <> 'array' THEN RAISE EXCEPTION 'FALLO: site_config sin estructura'; END IF;
    BEGIN PERFORM public.save_content_draft('menu', '{}'::jsonb); RAISE EXCEPTION 'FALLO: anon guarda borradores';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN UPDATE public.site_identity SET app_name = 'x' WHERE id; RAISE EXCEPTION 'FALLO: anon edita la identidad';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;

    -- Usuario autenticado sin rol
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_member, 'role', 'authenticated')::text, true);
    IF EXISTS (SELECT 1 FROM public.listing_contacts) THEN RAISE EXCEPTION 'FALLO: usuario sin rol lee contactos'; END IF;
    BEGIN INSERT INTO public.user_roles (user_id, role) VALUES (v_member, 'admin'); RAISE EXCEPTION 'FALLO: autoasignación de admin';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    UPDATE public.listings SET name = 'x' WHERE id = v_pub;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 0 THEN RAISE EXCEPTION 'FALLO: usuario sin rol edita fichas'; END IF;
    BEGIN UPDATE public.site_identity SET app_name = 'x' WHERE id; RAISE EXCEPTION 'FALLO: usuario sin rol edita la identidad';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    IF EXISTS (SELECT 1 FROM public.admin_audit_log) THEN RAISE EXCEPTION 'FALLO: usuario sin rol lee el registro de operaciones'; END IF;
    BEGIN PERFORM public.submit_content_draft('menu', now()); RAISE EXCEPTION 'FALLO: usuario sin rol presenta borradores';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN DELETE FROM public.site_identity; RAISE EXCEPTION 'FALLO: usuario borra la identidad';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    IF public.has_role(v_admin, 'admin') THEN RAISE EXCEPTION 'FALLO: has_role permite consultar a otros'; END IF;
    BEGIN PERFORM public.save_content_draft('menu', '{}'::jsonb); RAISE EXCEPTION 'FALLO: usuario sin rol guarda borradores';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;

    BEGIN TRUNCATE TABLE public.listing_contacts; RAISE EXCEPTION 'FALLO: usuario vacía contactos';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;

    -- Administrador
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    IF NOT public.has_role(v_admin, 'admin') THEN RAISE EXCEPTION 'FALLO: admin no reconocido'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.listing_contacts WHERE listing_id = v_pub) THEN RAISE EXCEPTION 'FALLO: admin no lee contactos'; END IF;
    IF (SELECT count(*) FROM public.listings WHERE id IN (v_pub, v_draft)) <> 2 THEN RAISE EXCEPTION 'FALLO: admin no ve borradores'; END IF;
    PERFORM admin_whatsapp FROM public.site_settings;
    -- Lo publicado no se escribe directamente: identidad, cabeceras y textos públicos cambian al publicar.
    BEGIN UPDATE public.site_identity SET app_name = 'x' WHERE id; RAISE EXCEPTION 'FALLO: admin edita la identidad sin publicar';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN INSERT INTO public.page_headers (page_key, image_path, image_small_path, alt)
      VALUES ('inicio', 'cabeceras/inicio/00000000-0000-4000-8000-000000000000.webp', 'cabeceras/inicio/00000000-0000-4000-8000-000000000000-movil.webp', 'Plaza');
      RAISE EXCEPTION 'FALLO: admin crea cabeceras sin publicar';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN UPDATE public.site_settings SET hero_title = 'x' WHERE id; RAISE EXCEPTION 'FALLO: admin edita la portada sin publicar';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    -- Los ajustes internos de Groundwork se guardan al momento.
    UPDATE public.site_settings SET admin_whatsapp = '+34 600 000 000' WHERE id;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN RAISE EXCEPTION 'FALLO: admin no guarda los ajustes internos'; END IF;
    BEGIN INSERT INTO public.consents (listing_id, purpose, text_version, granted) VALUES (v_pub, 'x', 'v1', true);
      RAISE EXCEPTION 'FALLO: admin escribe consentimientos directamente';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    BEGIN UPDATE public.listings SET status = 'publicada' WHERE id = v_draft; RAISE EXCEPTION 'FALLO: admin publica sin aprobación';
    EXCEPTION WHEN SQLSTATE 'PT422' THEN NULL; END;

    -- Circuito municipal: guardar no publica; presentar, registrar la conformidad y publicar, en orden.
    v_content := (public.content_draft_state('identidad') -> 'published') || '{"app_name":"Verificación",
      "timezone":"Europe/Madrid","latitude":40.4,"longitude":-3.7,"postal_code":"00000",
      "primary_color":"#1f4e79","accent_color":"#b5562a"}'::jsonb;
    v_at := (public.save_content_draft('identidad', v_content) ->> 'updated_at')::timestamptz;
    IF public.site_config() #>> '{identity,app_name}' = 'Verificación' THEN RAISE EXCEPTION 'FALLO: un borrador llega a la web'; END IF;
    BEGIN PERFORM public.publish_content_draft('identidad', v_at, true); RAISE EXCEPTION 'FALLO: se publica sin conformidad registrada';
    EXCEPTION WHEN SQLSTATE 'PT422' THEN NULL; END;
    BEGIN PERFORM public.record_content_conformity('identidad', v_at, 'Alcaldía', current_date, 'correo');
      RAISE EXCEPTION 'FALLO: conformidad de un borrador sin presentar';
    EXCEPTION WHEN SQLSTATE 'PT422' THEN NULL; END;
    v_at := (public.submit_content_draft('identidad', v_at) ->> 'updated_at')::timestamptz;
    BEGIN PERFORM public.record_content_conformity('identidad', v_at, 'Alcaldía', current_date + 10, 'correo');
      RAISE EXCEPTION 'FALLO: conformidad con fecha futura';
    EXCEPTION WHEN SQLSTATE 'PT422' THEN NULL; END;
    v_at := (public.record_content_conformity('identidad', v_at, 'Alcaldía', current_date, 'correo', 'Ref. 1') ->> 'updated_at')::timestamptz;
    BEGIN PERFORM public.publish_content_draft('identidad', v_at, false); RAISE EXCEPTION 'FALLO: se publica sin la revisión final';
    EXCEPTION WHEN SQLSTATE 'PT422' THEN NULL; END;
    PERFORM public.publish_content_draft('identidad', v_at, true, 'Correo del Ayuntamiento');
    IF public.site_config() #>> '{identity,app_name}' <> 'Verificación' OR public.site_config() #>> '{identity,primary_color}' <> '#1f4e79'
    THEN RAISE EXCEPTION 'FALLO: la publicación no llega a la web'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.content_publications WHERE draft_key = 'identidad' AND conformity AND published_by = v_admin
      AND note = 'Correo del Ayuntamiento' AND conformity_by = 'Alcaldía' AND conformity_channel = 'correo'
      AND conformity_reference = 'Ref. 1' AND content ->> 'app_name' = 'Verificación' AND previous_content ? 'app_name')
    THEN RAISE EXCEPTION 'FALLO: la publicación no queda registrada'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.admin_audit_log WHERE table_name = 'site_identity' AND actor = v_admin
      AND 'app_name' = ANY (changed_columns)) THEN RAISE EXCEPTION 'FALLO: la publicación no queda en el registro de operaciones'; END IF;
    BEGIN INSERT INTO public.admin_audit_log (actor_role, operation, table_name, record_key) VALUES ('x', 'insert', 'x', 'x');
      RAISE EXCEPTION 'FALLO: el navegador escribe en el registro de operaciones';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    -- Contenido que no se podría publicar: no se presenta al Ayuntamiento.
    v_at := (public.save_content_draft('identidad', v_content || '{"primary_color":"red"}'::jsonb) ->> 'updated_at')::timestamptz;
    BEGIN PERFORM public.submit_content_draft('identidad', v_at); RAISE EXCEPTION 'FALLO: se presenta un color no válido';
    EXCEPTION WHEN SQLSTATE 'PT422' THEN NULL; END;
    PERFORM public.discard_content_draft('identidad', v_at);
    v_at := (public.save_content_draft('menu', '{"entries":[{"key":"directorio","enabled":false,"sort_order":0}]}'::jsonb) ->> 'updated_at')::timestamptz;
    BEGIN PERFORM public.submit_content_draft('menu', v_at); RAISE EXCEPTION 'FALLO: el Directorio se puede desactivar';
    EXCEPTION WHEN SQLSTATE 'PT422' THEN NULL; END;
    -- Cambiar el contenido de un borrador presentado lo devuelve a «borrador».
    v_at := (public.save_content_draft('menu', '{"entries":[{"key":"guia-tramites","enabled":false,"sort_order":1}]}'::jsonb, v_at) ->> 'updated_at')::timestamptz;
    v_at := (public.submit_content_draft('menu', v_at) ->> 'updated_at')::timestamptz;
    v_at := (public.save_content_draft('menu', '{"entries":[{"key":"guia-tramites","enabled":true,"sort_order":1}]}'::jsonb, v_at) ->> 'updated_at')::timestamptz;
    IF (SELECT status FROM public.content_drafts WHERE draft_key = 'menu') <> 'borrador' THEN
      RAISE EXCEPTION 'FALLO: un cambio conserva la conformidad de otro contenido'; END IF;
    PERFORM public.discard_content_draft('menu', v_at);
    BEGIN INSERT INTO public.site_menu (entry_key) VALUES ('actualidad'); RAISE EXCEPTION 'FALLO: el navegador escribe en el menú';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    -- Lo publicado cambia después de empezar el borrador: ya no se presenta.
    v_at := (public.save_content_draft('portada', '{"hero_title":"Borrador","hero_subtitle":"Subtítulo"}'::jsonb) ->> 'updated_at')::timestamptz;
    PERFORM set_config('role', 'postgres', true);
    UPDATE public.site_settings SET hero_title = 'Cambio por otra vía' WHERE id;
    PERFORM set_config('role', 'authenticated', true);
    BEGIN PERFORM public.submit_content_draft('portada', v_at); RAISE EXCEPTION 'FALLO: se presenta sobre una versión cambiada';
    EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL; END;
    PERFORM set_config('role', 'postgres', true);
    IF (SELECT updated_by FROM public.site_identity) IS DISTINCT FROM v_admin THEN RAISE EXCEPTION 'FALLO: updated_by no registra al autor'; END IF;

    -- Restricciones de los valores publicados (las mismas que comprueba la publicación).
    BEGIN UPDATE public.site_identity SET logo_path = '../otro/logo.webp' WHERE id; RAISE EXCEPTION 'FALLO: ruta de logotipo no válida aceptada';
    EXCEPTION WHEN check_violation THEN NULL; END;
    BEGIN UPDATE public.site_identity SET site_url = 'http://ejemplo.es/' WHERE id; RAISE EXCEPTION 'FALLO: URL no válida aceptada';
    EXCEPTION WHEN check_violation THEN NULL; END;
    BEGIN UPDATE public.site_identity SET app_name = '<b>{app}</b>' WHERE id; RAISE EXCEPTION 'FALLO: HTML o llaves aceptados';
    EXCEPTION WHEN check_violation THEN NULL; END;
    BEGIN UPDATE public.site_identity SET timezone = 'Marte/Olimpo' WHERE id; RAISE EXCEPTION 'FALLO: zona horaria no válida aceptada';
    EXCEPTION WHEN check_violation THEN NULL; END;
    BEGIN UPDATE public.site_identity SET latitude = NULL WHERE id; RAISE EXCEPTION 'FALLO: coordenadas incompletas aceptadas';
    EXCEPTION WHEN check_violation THEN NULL; END;
    INSERT INTO public.page_headers (page_key, image_path, image_small_path, alt)
      VALUES ('inicio', 'cabeceras/inicio/00000000-0000-4000-8000-000000000000.webp', 'cabeceras/inicio/00000000-0000-4000-8000-000000000000-movil.webp', 'Plaza');
    IF public.site_config() #>> '{page_headers,inicio,alt}' <> 'Plaza' THEN RAISE EXCEPTION 'FALLO: site_config no refleja la cabecera'; END IF;
    BEGIN INSERT INTO public.page_headers (page_key, image_path, image_small_path)
      VALUES ('directorio', 'cabeceras/inicio/00000000-0000-4000-8000-000000000000.webp', 'cabeceras/inicio/00000000-0000-4000-8000-000000000000-movil.webp');
      RAISE EXCEPTION 'FALLO: cabecera con ruta de otra página aceptada';
    EXCEPTION WHEN check_violation THEN NULL; END;

    RAISE EXCEPTION USING ERRCODE = 'PZ001', MESSAGE = 'rollback';
  EXCEPTION WHEN SQLSTATE 'PZ001' THEN NULL;
  END;

  RAISE NOTICE 'VERIFICACIÓN SUPERADA: estructura, ENUM, políticas, funciones, triggers, Storage, permisos, rate limiting, identidad, cabeceras, fichas, revisión, estructura de la web, borradores y semilla.';
END
$verify$;
