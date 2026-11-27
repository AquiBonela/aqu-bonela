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
  v_cat uuid; v_pub uuid; v_draft uuid; v_ok boolean;
BEGIN
  -- ---------- 1. Estructura ----------
  SELECT count(*) INTO n FROM pg_tables WHERE schemaname = 'public' AND tablename IN
    ('activities','approval_tokens','categories','consents','listing_activities','listing_contacts',
     'listing_hours','listing_photos','listing_reports','listing_requests','listings',
     'procedure_categories','procedures','site_identity','site_settings','suggestions','translation_gateway_state','user_roles');
  IF n <> 18 THEN RAISE EXCEPTION 'FALLO: tablas public = % (esperado 18)', n; END IF;
  IF to_regclass('private.form_rate_limits') IS NULL THEN RAISE EXCEPTION 'FALLO: falta private.form_rate_limits'; END IF;
  SELECT count(*) INTO n FROM pg_class c JOIN pg_namespace s ON s.oid = c.relnamespace
    WHERE s.nspname IN ('public','private') AND c.relkind = 'r' AND NOT c.relrowsecurity;
  IF n <> 0 THEN RAISE EXCEPTION 'FALLO: % tablas sin RLS', n; END IF;
  SELECT count(*) INTO n FROM information_schema.columns WHERE table_schema IN ('public','private')
    AND table_name IN (SELECT tablename FROM pg_tables WHERE schemaname IN ('public','private'));
  IF n <> 198 THEN RAISE EXCEPTION 'FALLO: columnas = % (esperado 198)', n; END IF;
  SELECT count(*) INTO n FROM pg_constraint co JOIN pg_namespace s ON s.oid = co.connamespace WHERE s.nspname IN ('public','private');
  IF n <> 70 THEN RAISE EXCEPTION 'FALLO: restricciones = % (esperado 70)', n; END IF;

  -- ---------- 2. ENUM ----------
  IF (SELECT string_agg(enumlabel, ',' ORDER BY enumsortorder) FROM pg_enum WHERE enumtypid = 'public.app_role'::regtype) <> 'admin'
  OR (SELECT string_agg(enumlabel, ',' ORDER BY enumsortorder) FROM pg_enum WHERE enumtypid = 'public.listing_type'::regtype) <> 'comercio,profesional,publico,asociacion'
  OR (SELECT string_agg(enumlabel, ',' ORDER BY enumsortorder) FROM pg_enum WHERE enumtypid = 'public.listing_status'::regtype) <> 'borrador,pendiente,publicada,rechazada,oculta'
  THEN RAISE EXCEPTION 'FALLO: valores ENUM distintos de producción'; END IF;

  -- ---------- 3. Políticas, funciones, triggers ----------
  SELECT count(*) INTO n FROM pg_policies WHERE schemaname = 'public';
  IF n <> 40 THEN RAISE EXCEPTION 'FALLO: políticas public = % (esperado 40)', n; END IF;
  SELECT count(*) INTO n FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
    AND (coalesce(qual,'') || coalesce(with_check,'')) ~ '(listing-photos|procedure-images)';
  IF n <> 8 THEN RAISE EXCEPTION 'FALLO: políticas de Storage = % (esperado 8)', n; END IF;
  SELECT count(*) INTO n FROM pg_proc p JOIN pg_namespace s ON s.oid = p.pronamespace
    WHERE (s.nspname, p.proname) IN (('private','has_role'),('public','has_role'),('public','check_rate_limit'),
      ('private','cleanup_expired_rate_limits'),('public','set_updated_at'),('public','limit_listing_photos'),
      ('public','listings_publish_stamp'),('public','sync_public_contact'),
      ('public','can_manage_identity'),('private','site_identity_before_update'),('public','site_config'));
  IF n <> 11 THEN RAISE EXCEPTION 'FALLO: funciones = % (esperado 11)', n; END IF;
  SELECT count(*) INTO n FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace s ON s.oid = c.relnamespace
    WHERE s.nspname = 'public' AND NOT t.tgisinternal;
  IF n <> 12 THEN RAISE EXCEPTION 'FALLO: triggers = % (esperado 12)', n; END IF;
  IF has_function_privilege('anon', 'public.check_rate_limit(text,integer,integer)', 'EXECUTE')
  OR has_function_privilege('authenticated', 'public.check_rate_limit(text,integer,integer)', 'EXECUTE')
  OR NOT has_function_privilege('service_role', 'public.check_rate_limit(text,integer,integer)', 'EXECUTE')
  THEN RAISE EXCEPTION 'FALLO: permisos de check_rate_limit'; END IF;
  IF has_function_privilege('anon', 'public.has_role(uuid,public.app_role)', 'EXECUTE')
  THEN RAISE EXCEPTION 'FALLO: anon puede ejecutar has_role'; END IF;
  IF has_function_privilege('anon', 'public.can_manage_identity()', 'EXECUTE')
  OR NOT has_function_privilege('anon', 'public.site_config()', 'EXECUTE')
  THEN RAISE EXCEPTION 'FALLO: permisos de can_manage_identity/site_config'; END IF;

  -- ---------- 4. Storage ----------
  SELECT count(*) INTO n FROM storage.buckets WHERE NOT public AND
    ((id = 'listing-photos' AND file_size_limit = 5242880 AND allowed_mime_types IS NULL) OR
     (id = 'procedure-images' AND file_size_limit = 8388608 AND allowed_mime_types = ARRAY['image/webp']));
  IF n <> 2 THEN RAISE EXCEPTION 'FALLO: buckets privados incorrectos'; END IF;

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
  THEN RAISE EXCEPTION 'FALLO: permisos de tabla/columna'; END IF;

  -- Ni visitantes ni usuarios (incluidos admins) pueden vaciar tablas saltándose RLS.
  SELECT count(*) INTO n FROM pg_tables t
  WHERE t.schemaname IN ('public','private') AND
    (has_table_privilege('anon', format('%I.%I',t.schemaname,t.tablename), 'TRUNCATE') OR
     has_table_privilege('authenticated', format('%I.%I',t.schemaname,t.tablename), 'TRUNCATE'));
  IF n <> 0 THEN RAISE EXCEPTION 'FALLO: vaciado de tablas accesible a visitantes/usuarios'; END IF;

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
    INSERT INTO public.listings (slug, type, category_id, name, status) VALUES
      ('verify-pub-' || v_admin, 'comercio', v_cat, 'Verify pub', 'publicada') RETURNING id INTO v_pub;
    INSERT INTO public.listings (slug, type, category_id, name, status) VALUES
      ('verify-draft-' || v_admin, 'comercio', v_cat, 'Verify draft', 'borrador') RETURNING id INTO v_draft;
    INSERT INTO public.listing_contacts (listing_id, phone, show_phone, owner_contact) VALUES (v_pub, '600000000', false, 'privado');
    -- Horario que el titular ha ocultado y traducción con memoria editorial.
    INSERT INTO public.listing_hours (listing_id, weekday, opens, closes) VALUES (v_pub, 1, '09:00', '14:00');
    UPDATE public.listings SET tags = ARRAY['pan de leña', '__ocultar_horario'], featured = true, featured_until = now() + interval '1 day',
      translations = '{"en":{"content":{"description":"Bread"},"source":{"description":"Pan"},"manual":true,"glossary":[]}}'::jsonb
    WHERE id = v_pub;

    -- Trigger de contacto: teléfono no autorizado no se publica
    IF (SELECT public_phone FROM public.listings WHERE id = v_pub) IS NOT NULL THEN RAISE EXCEPTION 'FALLO: sync_public_contact'; END IF;

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
    IF EXISTS (SELECT 1 FROM public.listing_contacts) THEN RAISE EXCEPTION 'FALLO: anon lee contactos privados'; END IF;
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
    UPDATE public.site_identity SET app_name = 'x' WHERE id;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 0 THEN RAISE EXCEPTION 'FALLO: usuario sin rol edita la identidad'; END IF;
    BEGIN DELETE FROM public.site_identity; RAISE EXCEPTION 'FALLO: usuario borra la identidad';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    IF public.has_role(v_admin, 'admin') THEN RAISE EXCEPTION 'FALLO: has_role permite consultar a otros'; END IF;

    BEGIN TRUNCATE TABLE public.listing_contacts; RAISE EXCEPTION 'FALLO: usuario vacía contactos';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;

    -- Administrador
    PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
    IF NOT public.has_role(v_admin, 'admin') THEN RAISE EXCEPTION 'FALLO: admin no reconocido'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.listing_contacts WHERE listing_id = v_pub) THEN RAISE EXCEPTION 'FALLO: admin no lee contactos'; END IF;
    IF (SELECT count(*) FROM public.listings WHERE id IN (v_pub, v_draft)) <> 2 THEN RAISE EXCEPTION 'FALLO: admin no ve borradores'; END IF;
    PERFORM admin_whatsapp FROM public.site_settings;
    UPDATE public.site_identity SET app_name = 'Verificación', timezone = 'Europe/Madrid', latitude = 40.4, longitude = -3.7 WHERE id;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN RAISE EXCEPTION 'FALLO: admin no edita la identidad'; END IF;
    IF public.site_config() #>> '{identity,app_name}' <> 'Verificación' THEN RAISE EXCEPTION 'FALLO: site_config no refleja el cambio'; END IF;
    BEGIN UPDATE public.site_identity SET site_url = 'http://ejemplo.es/' WHERE id; RAISE EXCEPTION 'FALLO: URL no válida aceptada';
    EXCEPTION WHEN check_violation THEN NULL; END;
    BEGIN UPDATE public.site_identity SET app_name = '<b>{app}</b>' WHERE id; RAISE EXCEPTION 'FALLO: HTML o llaves aceptados';
    EXCEPTION WHEN check_violation THEN NULL; END;
    BEGIN UPDATE public.site_identity SET timezone = 'Marte/Olimpo' WHERE id; RAISE EXCEPTION 'FALLO: zona horaria no válida aceptada';
    EXCEPTION WHEN check_violation THEN NULL; END;
    BEGIN UPDATE public.site_identity SET latitude = NULL WHERE id; RAISE EXCEPTION 'FALLO: coordenadas incompletas aceptadas';
    EXCEPTION WHEN check_violation THEN NULL; END;
    PERFORM set_config('role', 'postgres', true);
    IF (SELECT updated_by FROM public.site_identity) IS DISTINCT FROM v_admin THEN RAISE EXCEPTION 'FALLO: updated_by no registra al autor'; END IF;

    RAISE EXCEPTION USING ERRCODE = 'PZ001', MESSAGE = 'rollback';
  EXCEPTION WHEN SQLSTATE 'PZ001' THEN NULL;
  END;

  RAISE NOTICE 'VERIFICACIÓN SUPERADA: estructura, ENUM, 48 políticas, funciones, triggers, Storage, permisos, rate limiting, identidad y semilla.';
END
$verify$;
