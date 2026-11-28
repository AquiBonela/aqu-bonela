-- Circuito de conformidad municipal, cierre de la escritura directa del contenido publicado,
-- registro de operaciones y permisos mínimos (etapa 2B, PR 2B-1).
-- 1. Borradores con estados: borrador → presentado al Ayuntamiento → conformidad registrada →
--    publicado. Groundwork registra la conformidad que da el Ayuntamiento fuera de la plataforma
--    (quién, fecha, medio y referencia). Cambiar el contenido devuelve el borrador a «borrador».
--    Presentar comprueba antes que el contenido se puede aplicar (prueba que se deshace). Publicar
--    exige la conformidad registrada y la revisión final de Groundwork, y guarda en el registro lo
--    publicado, lo que había antes y los datos de la conformidad.
-- 2. Identidad, portada, aviso, datos legales y cabeceras solo cambian al publicar: el navegador ya
--    no escribe en site_identity, page_headers ni en las columnas públicas de site_settings. Los
--    ajustes internos de Groundwork (avisos, WhatsApp, etiquetas, publicación al aprobar) siguen
--    guardándose al momento, solo en sus columnas.
-- 3. admin_audit_log: quién, cuándo y qué operación (tabla, registro, columnas cambiadas y, en
--    algunas tablas, el estado nuevo; nunca los valores) en las tablas de administración. Solo lo
--    leen los administradores; nadie lo escribe ni lo borra desde el navegador.
-- 4. Permisos mínimos: los visitantes no tienen permisos de escritura en ninguna tabla ni de lectura
--    en las tablas privadas. Antes solo los frenaba RLS; ahora también los permisos.
-- Requiere 20261202090000_site_structure. Vuelta atrás: supabase/rollback/20261203090000_content_workflow.sql

-- Si ya está aplicada, se detiene sin tocar nada (no forma parte del bloque de la plantilla).
DO $guard$
BEGIN
  IF to_regclass('public.admin_audit_log') IS NOT NULL THEN
    RAISE EXCEPTION 'La migración 20261203090000_content_workflow ya está aplicada: no se ha cambiado nada.';
  END IF;
  IF to_regclass('public.content_drafts') IS NULL THEN
    RAISE EXCEPTION 'Falta 20261202090000_site_structure: aplícala antes que esta migración.';
  END IF;
END
$guard$;

-- >>> content_workflow (bloque idéntico en supabase/template/01_schema.sql; lo comprueba src/lib/product-migrations-sql.test.ts)

-- Estados del borrador y datos de la conformidad municipal registrada por Groundwork.
ALTER TABLE public.content_drafts
  ADD COLUMN status text NOT NULL DEFAULT 'borrador',
  ADD COLUMN submitted_at timestamptz,
  ADD COLUMN submitted_by uuid,
  ADD COLUMN conformity_by text,
  ADD COLUMN conformity_on date,
  ADD COLUMN conformity_channel text,
  ADD COLUMN conformity_reference text,
  ADD COLUMN conformity_recorded_at timestamptz,
  ADD COLUMN conformity_recorded_by uuid,
  ADD CONSTRAINT content_drafts_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT content_drafts_conformity_recorded_by_fkey FOREIGN KEY (conformity_recorded_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT content_drafts_status CHECK (status IN ('borrador', 'presentado', 'conforme')),
  ADD CONSTRAINT content_drafts_conformity_by CHECK (conformity_by IS NULL OR (
    char_length(conformity_by) BETWEEN 2 AND 120 AND conformity_by !~ '[<>{}[:cntrl:]]')),
  ADD CONSTRAINT content_drafts_conformity_channel CHECK (conformity_channel IS NULL OR
    conformity_channel IN ('correo', 'reunion', 'telefono', 'documento', 'otro')),
  ADD CONSTRAINT content_drafts_conformity_reference CHECK (conformity_reference IS NULL OR (
    char_length(conformity_reference) <= 200 AND conformity_reference !~ '[<>{}[:cntrl:]]')),
  ADD CONSTRAINT content_drafts_workflow CHECK (
    (status = 'borrador' AND submitted_at IS NULL AND conformity_on IS NULL AND conformity_by IS NULL
      AND conformity_channel IS NULL AND conformity_recorded_at IS NULL)
    OR (status = 'presentado' AND submitted_at IS NOT NULL AND conformity_on IS NULL AND conformity_by IS NULL
      AND conformity_channel IS NULL AND conformity_recorded_at IS NULL)
    OR (status = 'conforme' AND submitted_at IS NOT NULL AND conformity_on IS NOT NULL AND conformity_by IS NOT NULL
      AND conformity_channel IS NOT NULL AND conformity_recorded_at IS NOT NULL));

-- El registro de publicaciones guarda también la conformidad, lo publicado y lo que había antes.
ALTER TABLE public.content_publications
  ADD COLUMN submitted_at timestamptz,
  ADD COLUMN conformity_by text,
  ADD COLUMN conformity_on date,
  ADD COLUMN conformity_channel text,
  ADD COLUMN conformity_reference text,
  ADD COLUMN content jsonb,
  ADD COLUMN previous_content jsonb,
  ADD CONSTRAINT content_publications_conformity_channel CHECK (conformity_channel IS NULL OR
    conformity_channel IN ('correo', 'reunion', 'telefono', 'documento', 'otro'));

-- Textos públicos de los ajustes: longitud y sin HTML ni caracteres de control. NOT VALID: se
-- exige a todo lo que se publique desde ahora sin bloquear la migración por un valor anterior.
ALTER TABLE public.site_settings ADD CONSTRAINT site_settings_public_texts CHECK (
  char_length(hero_title) <= 160 AND char_length(hero_subtitle) <= 240 AND char_length(banner_text) <= 240
  AND char_length(legal_name) <= 200 AND char_length(legal_nif) <= 20 AND char_length(legal_address) <= 300
  AND char_length(legal_email) <= 254
  AND hero_title !~ '[<>[:cntrl:]]' AND hero_subtitle !~ '[<>[:cntrl:]]' AND banner_text !~ '[<>[:cntrl:]]'
  AND legal_name !~ '[<>{}[:cntrl:]]' AND legal_nif !~ '[<>{}[:cntrl:]]' AND legal_address !~ '[<>{}[:cntrl:]]'
  AND (legal_email = '' OR legal_email ~ '^[^@[:space:]<>{}]+@[^@[:space:]<>{}]+\.[^@[:space:]<>{}]+$')) NOT VALID;

-- Cambiar el contenido de un borrador presentado o conforme lo devuelve a «borrador»: la
-- conformidad se dio sobre otro contenido.
CREATE OR REPLACE FUNCTION private.content_draft_reset()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.content IS DISTINCT FROM OLD.content THEN
    NEW.status := 'borrador';
    NEW.submitted_at := NULL;
    NEW.submitted_by := NULL;
    NEW.conformity_by := NULL;
    NEW.conformity_on := NULL;
    NEW.conformity_channel := NULL;
    NEW.conformity_reference := NULL;
    NEW.conformity_recorded_at := NULL;
    NEW.conformity_recorded_by := NULL;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.content_draft_reset() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER content_drafts_reset BEFORE UPDATE OF content ON public.content_drafts
  FOR EACH ROW EXECUTE FUNCTION private.content_draft_reset();

-- Rutas de site-assets que no existen (NULL si están todas).
CREATE OR REPLACE FUNCTION private.draft_missing_assets(p_paths text[])
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT string_agg(p, ', ') FROM unnest(p_paths) AS p
  WHERE NOT EXISTS (SELECT 1 FROM storage.objects AS o WHERE o.bucket_id = 'site-assets' AND o.name = p);
$$;
REVOKE ALL ON FUNCTION private.draft_missing_assets(text[]) FROM PUBLIC, anon, authenticated;

-- Aplica el contenido de una pantalla a las tablas publicadas. Solo la llaman las funciones de la
-- administración, después de comprobar el rol, la versión y la forma del contenido.
CREATE OR REPLACE FUNCTION private.apply_content_draft(p_key text, c jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_page text := split_part(p_key, ':', 2);
  v_ident public.site_identity;
BEGIN
  IF p_key = 'menu' THEN
    DELETE FROM public.site_menu AS m WHERE true;
    INSERT INTO public.site_menu (entry_key, enabled, sort_order)
    SELECT e.key, coalesce(e.enabled, true), coalesce(e.sort_order, 0)
    FROM jsonb_to_recordset(c -> 'entries') AS e(key text, enabled boolean, sort_order smallint);
  ELSIF p_key LIKE 'secciones:%' THEN
    DELETE FROM public.page_sections AS s WHERE s.page_key = v_page;
    INSERT INTO public.page_sections (page_key, section_key, enabled, sort_order)
    SELECT v_page, e.key, coalesce(e.enabled, true), coalesce(e.sort_order, 0)
    FROM jsonb_to_recordset(c -> 'sections') AS e(key text, enabled boolean, sort_order smallint);
  ELSIF p_key = 'accesos' THEN
    -- Los accesos que ya no están en el borrador se borran; los demás se crean o actualizan.
    DELETE FROM public.home_shortcuts AS h
    WHERE h.id NOT IN (
      SELECT (e ->> 'id')::uuid FROM jsonb_array_elements(c -> 'shortcuts') AS e
      WHERE e ->> 'id' IS NOT NULL);
    INSERT INTO public.home_shortcuts AS h (id, title, description, image_path, image_alt, href, visible, sort_order)
    SELECT coalesce(e.id, gen_random_uuid()), e.title, coalesce(e.description, ''), e.image_path,
      coalesce(e.image_alt, ''), e.href, coalesce(e.visible, true), coalesce(e.sort_order, 0)
    FROM jsonb_to_recordset(c -> 'shortcuts') AS e(id uuid, title text, description text,
      image_path text, image_alt text, href text, visible boolean, sort_order smallint)
    ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description,
      image_path = EXCLUDED.image_path, image_alt = EXCLUDED.image_alt, href = EXCLUDED.href,
      visible = EXCLUDED.visible, sort_order = EXCLUDED.sort_order;
  ELSIF p_key = 'portada' THEN
    UPDATE public.site_settings AS s SET
      hero_title = coalesce(c ->> 'hero_title', s.hero_title),
      hero_subtitle = coalesce(c ->> 'hero_subtitle', s.hero_subtitle)
    WHERE s.id;
  ELSIF p_key = 'aviso-cabecera' THEN
    UPDATE public.site_settings AS s SET
      banner_enabled = coalesce((c ->> 'banner_enabled')::boolean, s.banner_enabled),
      banner_text = coalesce(c ->> 'banner_text', s.banner_text)
    WHERE s.id;
  ELSIF p_key = 'datos-legales' THEN
    UPDATE public.site_settings AS s SET
      legal_name = coalesce(c ->> 'legal_name', s.legal_name),
      legal_nif = coalesce(c ->> 'legal_nif', s.legal_nif),
      legal_address = coalesce(c ->> 'legal_address', s.legal_address),
      legal_email = coalesce(c ->> 'legal_email', s.legal_email)
    WHERE s.id;
  ELSIF p_key = 'identidad' THEN
    SELECT * INTO v_ident FROM public.site_identity AS i WHERE i.id;
    v_ident := jsonb_populate_record(v_ident, c - 'id' - 'updated_at' - 'updated_by');
    UPDATE public.site_identity AS i SET
      app_name = v_ident.app_name, short_name = v_ident.short_name,
      municipality_name = v_ident.municipality_name, province = v_ident.province, region = v_ident.region,
      autonomous_community = v_ident.autonomous_community, demonym_masculine = v_ident.demonym_masculine,
      demonym_feminine = v_ident.demonym_feminine, site_url = v_ident.site_url,
      town_hall_name = v_ident.town_hall_name, town_hall_address = v_ident.town_hall_address,
      town_hall_phone = v_ident.town_hall_phone, town_hall_website = v_ident.town_hall_website,
      latitude = v_ident.latitude, longitude = v_ident.longitude, timezone = v_ident.timezone,
      postal_code = v_ident.postal_code, primary_color = v_ident.primary_color,
      accent_color = v_ident.accent_color, logo_path = v_ident.logo_path,
      logo_light_path = v_ident.logo_light_path, icon_path = v_ident.icon_path,
      icon_small_path = v_ident.icon_small_path
    WHERE i.id;
  ELSIF p_key LIKE 'cabecera:%' THEN
    IF coalesce((c ->> 'remove')::boolean, false) THEN
      DELETE FROM public.page_headers AS h WHERE h.page_key = v_page;
    ELSE
      INSERT INTO public.page_headers AS h (page_key, image_path, image_small_path, alt, focal_x, focal_y)
      VALUES (v_page, c ->> 'image_path', c ->> 'image_small_path', coalesce(c ->> 'alt', ''),
        coalesce((c ->> 'focal_x')::smallint, 50), coalesce((c ->> 'focal_y')::smallint, 50))
      ON CONFLICT (page_key) DO UPDATE SET image_path = EXCLUDED.image_path,
        image_small_path = EXCLUDED.image_small_path, alt = EXCLUDED.alt,
        focal_x = EXCLUDED.focal_x, focal_y = EXCLUDED.focal_y;
    END IF;
  ELSE
    RAISE EXCEPTION 'Pantalla de contenido desconocida: %', p_key USING ERRCODE = '22023';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION private.apply_content_draft(text, jsonb) FROM PUBLIC, anon, authenticated;

-- Bloquea lo publicado de una pantalla: una escritura en curso termina antes y se detecta; una
-- posterior espera a que acabe la publicación.
CREATE OR REPLACE FUNCTION private.lock_published_content(p_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF p_key = 'menu' THEN
    LOCK TABLE public.site_menu IN SHARE ROW EXCLUSIVE MODE;
  ELSIF p_key LIKE 'secciones:%' THEN
    LOCK TABLE public.page_sections IN SHARE ROW EXCLUSIVE MODE;
  ELSIF p_key = 'accesos' THEN
    LOCK TABLE public.home_shortcuts IN SHARE ROW EXCLUSIVE MODE;
  ELSIF p_key IN ('portada', 'aviso-cabecera', 'datos-legales') THEN
    PERFORM 1 FROM public.site_settings AS s WHERE s.id FOR UPDATE;
  ELSIF p_key = 'identidad' THEN
    PERFORM 1 FROM public.site_identity AS i WHERE i.id FOR UPDATE;
  ELSIF p_key LIKE 'cabecera:%' THEN
    LOCK TABLE public.page_headers IN SHARE ROW EXCLUSIVE MODE;
  ELSE
    RAISE EXCEPTION 'Pantalla de contenido desconocida: %', p_key USING ERRCODE = '22023';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION private.lock_published_content(text) FROM PUBLIC, anon, authenticated;

-- Presenta el borrador al Ayuntamiento. Antes comprueba que lo publicado no cambió, que la forma
-- y los archivos son correctos y que el contenido se puede aplicar (se prueba y se deshace), para
-- que nunca se pida conformidad sobre algo que no se podría publicar.
CREATE OR REPLACE FUNCTION public.submit_content_draft(p_key text, p_expected_updated_at timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  d public.content_drafts;
  v_missing text;
  v_at timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo la administración puede presentar borradores' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO d FROM public.content_drafts AS x WHERE x.draft_key = p_key FOR UPDATE;
  IF NOT FOUND OR d.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'El borrador ha cambiado desde que se abrió' USING ERRCODE = 'PT409', HINT = 'draft_changed';
  END IF;
  IF d.status <> 'borrador' THEN
    RAISE EXCEPTION 'El borrador ya está presentado al Ayuntamiento' USING ERRCODE = 'PT422', HINT = 'invalid_state';
  END IF;
  IF d.base_version <> md5(private.published_content(p_key)::text) THEN
    RAISE EXCEPTION 'Lo publicado cambió después de empezar el borrador' USING ERRCODE = 'PT409', HINT = 'published_changed';
  END IF;
  v_missing := private.draft_missing_assets(private.validate_draft_content(p_key, d.content));
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Faltan archivos en site-assets: %', v_missing USING ERRCODE = 'PT422', HINT = 'missing_asset';
  END IF;
  BEGIN
    PERFORM private.apply_content_draft(p_key, d.content);
    RAISE EXCEPTION USING ERRCODE = 'PZ002', MESSAGE = 'prueba deshecha';
  EXCEPTION
    WHEN SQLSTATE 'PZ002' THEN NULL;
    WHEN check_violation OR not_null_violation OR invalid_text_representation OR numeric_value_out_of_range
      OR string_data_right_truncation OR invalid_datetime_format OR datatype_mismatch THEN
      RAISE EXCEPTION 'Contenido no válido: %', SQLERRM USING ERRCODE = 'PT422', HINT = 'invalid_content';
  END;
  UPDATE public.content_drafts AS x SET status = 'presentado', submitted_at = now(), submitted_by = auth.uid()
  WHERE x.draft_key = p_key
  RETURNING x.updated_at INTO v_at;
  RETURN jsonb_build_object('draft_key', p_key, 'status', 'presentado', 'updated_at', v_at);
END;
$$;

-- Registra la conformidad que el Ayuntamiento dio fuera de la plataforma sobre el borrador presentado.
CREATE OR REPLACE FUNCTION public.record_content_conformity(
  p_key text,
  p_expected_updated_at timestamptz,
  p_by text,
  p_on date,
  p_channel text,
  p_reference text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  d public.content_drafts;
  v_by text := btrim(regexp_replace(coalesce(p_by, ''), '[[:cntrl:]]+', ' ', 'g'));
  v_reference text := nullif(btrim(regexp_replace(coalesce(p_reference, ''), '[[:cntrl:]]+', ' ', 'g')), '');
  v_at timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo la administración puede registrar la conformidad' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO d FROM public.content_drafts AS x WHERE x.draft_key = p_key FOR UPDATE;
  IF NOT FOUND OR d.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'El borrador ha cambiado desde que se abrió' USING ERRCODE = 'PT409', HINT = 'draft_changed';
  END IF;
  IF d.status <> 'presentado' THEN
    RAISE EXCEPTION 'Solo se registra la conformidad de un borrador presentado' USING ERRCODE = 'PT422', HINT = 'invalid_state';
  END IF;
  IF char_length(v_by) NOT BETWEEN 2 AND 120 OR v_by ~ '[<>{}]' THEN
    RAISE EXCEPTION 'Indica quién dio la conformidad (de 2 a 120 caracteres, sin < > { })'
      USING ERRCODE = 'PT422', HINT = 'invalid_conformity';
  END IF;
  IF p_channel IS NULL OR p_channel NOT IN ('correo', 'reunion', 'telefono', 'documento', 'otro') THEN
    RAISE EXCEPTION 'Medio de la conformidad no válido' USING ERRCODE = 'PT422', HINT = 'invalid_conformity';
  END IF;
  -- Un día de margen por la diferencia horaria entre el municipio y el servidor.
  IF p_on IS NULL OR p_on > current_date + 1 OR p_on < d.submitted_at::date - 1 THEN
    RAISE EXCEPTION 'La fecha de la conformidad no puede ser futura ni anterior a la presentación'
      USING ERRCODE = 'PT422', HINT = 'invalid_conformity';
  END IF;
  IF v_reference IS NOT NULL AND (char_length(v_reference) > 200 OR v_reference ~ '[<>{}]') THEN
    RAISE EXCEPTION 'Referencia no válida (hasta 200 caracteres, sin < > { })'
      USING ERRCODE = 'PT422', HINT = 'invalid_conformity';
  END IF;
  UPDATE public.content_drafts AS x SET status = 'conforme', conformity_by = v_by, conformity_on = p_on,
    conformity_channel = p_channel, conformity_reference = v_reference,
    conformity_recorded_at = now(), conformity_recorded_by = auth.uid()
  WHERE x.draft_key = p_key
  RETURNING x.updated_at INTO v_at;
  RETURN jsonb_build_object('draft_key', p_key, 'status', 'conforme', 'updated_at', v_at);
END;
$$;

-- Devuelve un borrador presentado o conforme a «borrador» (por ejemplo, si el Ayuntamiento pide
-- cambios), sin tocar su contenido ni lo publicado.
CREATE OR REPLACE FUNCTION public.return_content_draft(p_key text, p_expected_updated_at timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  d public.content_drafts;
  v_at timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo la administración puede cambiar el estado de un borrador' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO d FROM public.content_drafts AS x WHERE x.draft_key = p_key FOR UPDATE;
  IF NOT FOUND OR d.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'El borrador ha cambiado desde que se abrió' USING ERRCODE = 'PT409', HINT = 'draft_changed';
  END IF;
  IF d.status = 'borrador' THEN
    RAISE EXCEPTION 'El borrador no está presentado' USING ERRCODE = 'PT422', HINT = 'invalid_state';
  END IF;
  UPDATE public.content_drafts AS x SET status = 'borrador', submitted_at = NULL, submitted_by = NULL,
    conformity_by = NULL, conformity_on = NULL, conformity_channel = NULL, conformity_reference = NULL,
    conformity_recorded_at = NULL, conformity_recorded_by = NULL
  WHERE x.draft_key = p_key
  RETURNING x.updated_at INTO v_at;
  RETURN jsonb_build_object('draft_key', p_key, 'status', 'borrador', 'updated_at', v_at);
END;
$$;

-- Estado del borrador de una pantalla para el panel: contenido, estado, conformidad y si lo
-- publicado cambió desde que se empezó.
CREATE OR REPLACE FUNCTION public.content_draft_state(p_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  d public.content_drafts;
  v_published jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo la administración puede consultar borradores' USING ERRCODE = '42501';
  END IF;
  v_published := private.published_content(p_key);
  SELECT * INTO d FROM public.content_drafts AS x WHERE x.draft_key = p_key;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('exists', false, 'published', v_published);
  END IF;
  RETURN jsonb_build_object('exists', true, 'updated_at', d.updated_at, 'created_at', d.created_at,
    'stale', d.base_version <> md5(v_published::text), 'published', v_published, 'content', d.content,
    'status', d.status, 'submitted_at', d.submitted_at,
    'conformity', CASE WHEN d.status = 'conforme' THEN jsonb_build_object('by', d.conformity_by,
      'on', d.conformity_on, 'channel', d.conformity_channel, 'reference', d.conformity_reference,
      'recorded_at', d.conformity_recorded_at) END);
END;
$$;

-- Publica el borrador de una pantalla: exige la conformidad municipal registrada y la revisión final
-- de Groundwork (p_conformity), aplica todo en una transacción, registra quién, cuándo, la nota, la
-- conformidad, lo publicado y lo anterior, y borra el borrador. SECURITY DEFINER para que las tablas
-- publicadas no necesiten escritura directa desde el navegador; comprueba el rol antes de nada.
CREATE OR REPLACE FUNCTION public.publish_content_draft(
  p_key text,
  p_expected_updated_at timestamptz,
  p_conformity boolean,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  d public.content_drafts;
  -- Saltos de línea y demás caracteres de control de la nota pasan a ser espacios.
  v_note text := btrim(regexp_replace(coalesce(p_note, ''), '[[:cntrl:]]+', ' ', 'g'));
  v_previous jsonb;
  v_missing text;
  v_at timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo la administración puede publicar' USING ERRCODE = '42501';
  END IF;
  IF p_conformity IS NOT TRUE THEN
    RAISE EXCEPTION 'Falta confirmar la revisión final de Groundwork' USING ERRCODE = 'PT422', HINT = 'conformity_required';
  END IF;
  SELECT * INTO d FROM public.content_drafts AS x WHERE x.draft_key = p_key FOR UPDATE;
  IF NOT FOUND OR d.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'El borrador ha cambiado desde que se abrió' USING ERRCODE = 'PT409', HINT = 'draft_changed';
  END IF;
  IF d.status <> 'conforme' THEN
    RAISE EXCEPTION 'Falta registrar la conformidad municipal' USING ERRCODE = 'PT422', HINT = 'conformity_required';
  END IF;

  PERFORM private.lock_published_content(p_key);
  v_previous := private.published_content(p_key);
  IF d.base_version <> md5(v_previous::text) THEN
    RAISE EXCEPTION 'Lo publicado cambió después de empezar el borrador' USING ERRCODE = 'PT409', HINT = 'published_changed';
  END IF;

  -- Forma y tipos del contenido, y archivos que usa: nada se aplica si algo no cuadra.
  v_missing := private.draft_missing_assets(private.validate_draft_content(p_key, d.content));
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Faltan archivos en site-assets: %', v_missing USING ERRCODE = 'PT422', HINT = 'missing_asset';
  END IF;
  BEGIN
    PERFORM private.apply_content_draft(p_key, d.content);
  EXCEPTION
    WHEN check_violation OR not_null_violation OR invalid_text_representation OR numeric_value_out_of_range
      OR string_data_right_truncation OR invalid_datetime_format OR datatype_mismatch THEN
      RAISE EXCEPTION 'Contenido no válido: %', SQLERRM USING ERRCODE = 'PT422', HINT = 'invalid_content';
  END;

  INSERT INTO public.content_publications (draft_key, conformity, note, submitted_at, conformity_by,
    conformity_on, conformity_channel, conformity_reference, content, previous_content)
  VALUES (p_key, true, left(v_note, 500), d.submitted_at, d.conformity_by, d.conformity_on,
    d.conformity_channel, d.conformity_reference, d.content, v_previous)
  RETURNING published_at INTO v_at;
  DELETE FROM public.content_drafts AS x WHERE x.draft_key = p_key;
  RETURN jsonb_build_object('draft_key', p_key, 'published_at', v_at);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_content_draft(text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_content_draft(text, timestamptz) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.record_content_conformity(text, timestamptz, text, date, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_content_conformity(text, timestamptz, text, date, text, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.return_content_draft(text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.return_content_draft(text, timestamptz) TO authenticated, service_role;

-- Lo publicado solo cambia al publicar: el navegador deja de escribir en la identidad, las
-- cabeceras y las columnas públicas de los ajustes. Los ajustes internos se guardan al momento.
DROP POLICY IF EXISTS "Identity managers update site identity" ON public.site_identity;
DROP POLICY IF EXISTS "Admins insert page headers" ON public.page_headers;
DROP POLICY IF EXISTS "Admins update page headers" ON public.page_headers;
DROP POLICY IF EXISTS "Admins delete page headers" ON public.page_headers;
REVOKE INSERT, UPDATE, DELETE ON public.site_identity, public.page_headers FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.site_settings FROM authenticated;
GRANT UPDATE (contact_email, admin_whatsapp, collaborator_months, whatsapp_template, common_labels,
  publish_on_owner_approval) ON public.site_settings TO authenticated;

-- Permisos mínimos: los visitantes no escriben en ninguna tabla ni leen las privadas. RLS ya lo
-- impedía; ahora también los permisos, por si una política se configurara mal en el futuro.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM authenticated;
REVOKE SELECT ON public.approval_tokens, public.consents, public.listing_contacts, public.listing_reports,
  public.listing_requests, public.suggestions, public.translation_gateway_state, public.user_roles FROM anon;

-- Registro de operaciones de administración: quién, cuándo, qué tabla y registro, qué columnas
-- cambiaron y, en algunas tablas, el estado nuevo. Nunca guarda los valores (datos personales).
CREATE TABLE public.admin_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor uuid,
  actor_role text NOT NULL,
  operation text NOT NULL,
  table_name text NOT NULL,
  record_key text NOT NULL,
  changed_columns text[] NOT NULL DEFAULT '{}',
  state text,
  CONSTRAINT admin_audit_log_pkey PRIMARY KEY (id),
  CONSTRAINT admin_audit_log_operation CHECK (operation IN ('insert', 'update', 'delete')),
  CONSTRAINT admin_audit_log_state CHECK (state IS NULL OR char_length(state) <= 60)
);
CREATE INDEX admin_audit_log_occurred_at ON public.admin_audit_log (occurred_at DESC);
REVOKE ALL ON public.admin_audit_log FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.admin_audit_log TO authenticated, service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit log" ON public.admin_audit_log AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Trigger del registro. Argumentos: columnas que identifican el registro (separadas por comas) y,
-- opcionalmente, la columna cuyo valor nuevo se anota como estado (nunca datos personales).
CREATE OR REPLACE FUNCTION private.audit_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_new jsonb := CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END;
  v_old jsonb := CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END;
  v_row jsonb := coalesce(v_new, v_old);
  v_key text;
  v_changed text[] := '{}';
  v_state text;
  v_claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
BEGIN
  SELECT string_agg(v_row ->> k, ':' ORDER BY ord) INTO v_key
  FROM unnest(string_to_array(TG_ARGV[0], ',')) WITH ORDINALITY AS u(k, ord);
  IF TG_OP = 'UPDATE' THEN
    SELECT coalesce(array_agg(k ORDER BY k), '{}') INTO v_changed FROM jsonb_object_keys(v_new) AS k
    WHERE v_new -> k IS DISTINCT FROM v_old -> k AND k NOT IN ('updated_at', 'updated_by');
    -- Solo cambiaron la fecha o el autor: no es una operación.
    IF cardinality(v_changed) = 0 THEN RETURN NULL; END IF;
  END IF;
  IF TG_NARGS > 1 THEN v_state := left(v_row ->> TG_ARGV[1], 60); END IF;
  INSERT INTO public.admin_audit_log (actor, actor_role, operation, table_name, record_key, changed_columns, state)
  VALUES (auth.uid(),
    coalesce(v_claims ->> 'role', nullif(current_setting('request.jwt.claim.role', true), ''),
      nullif(current_setting('role', true), 'none'), session_user::text),
    lower(TG_OP), TG_TABLE_NAME, coalesce(v_key, ''), v_changed, v_state);
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION private.audit_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER site_identity_audit AFTER INSERT OR UPDATE OR DELETE ON public.site_identity
  FOR EACH ROW EXECUTE FUNCTION private.audit_change('id');
CREATE TRIGGER site_settings_audit AFTER INSERT OR UPDATE OR DELETE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION private.audit_change('id');
CREATE TRIGGER page_headers_audit AFTER INSERT OR UPDATE OR DELETE ON public.page_headers
  FOR EACH ROW EXECUTE FUNCTION private.audit_change('page_key');
CREATE TRIGGER site_menu_audit AFTER INSERT OR UPDATE OR DELETE ON public.site_menu
  FOR EACH ROW EXECUTE FUNCTION private.audit_change('entry_key');
CREATE TRIGGER page_sections_audit AFTER INSERT OR UPDATE OR DELETE ON public.page_sections
  FOR EACH ROW EXECUTE FUNCTION private.audit_change('page_key,section_key');
CREATE TRIGGER home_shortcuts_audit AFTER INSERT OR UPDATE OR DELETE ON public.home_shortcuts
  FOR EACH ROW EXECUTE FUNCTION private.audit_change('id');
CREATE TRIGGER content_drafts_audit AFTER INSERT OR UPDATE OR DELETE ON public.content_drafts
  FOR EACH ROW EXECUTE FUNCTION private.audit_change('draft_key', 'status');
CREATE TRIGGER content_publications_audit AFTER INSERT OR UPDATE OR DELETE ON public.content_publications
  FOR EACH ROW EXECUTE FUNCTION private.audit_change('id', 'draft_key');
CREATE TRIGGER user_roles_audit AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION private.audit_change('user_id,role');
CREATE TRIGGER listings_audit AFTER INSERT OR UPDATE OR DELETE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION private.audit_change('id', 'status');
CREATE TRIGGER listing_contacts_audit AFTER INSERT OR UPDATE OR DELETE ON public.listing_contacts
  FOR EACH ROW EXECUTE FUNCTION private.audit_change('listing_id');
CREATE TRIGGER listing_photos_audit AFTER INSERT OR UPDATE OR DELETE ON public.listing_photos
  FOR EACH ROW EXECUTE FUNCTION private.audit_change('listing_id,id');
CREATE TRIGGER approval_tokens_audit AFTER INSERT OR UPDATE OR DELETE ON public.approval_tokens
  FOR EACH ROW EXECUTE FUNCTION private.audit_change('listing_id,id');
CREATE TRIGGER consents_audit AFTER INSERT OR UPDATE OR DELETE ON public.consents
  FOR EACH ROW EXECUTE FUNCTION private.audit_change('listing_id,id', 'purpose');
CREATE TRIGGER categories_audit AFTER INSERT OR UPDATE OR DELETE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION private.audit_change('id');
CREATE TRIGGER activities_audit AFTER INSERT OR UPDATE OR DELETE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION private.audit_change('id');
CREATE TRIGGER procedures_audit AFTER INSERT OR UPDATE OR DELETE ON public.procedures
  FOR EACH ROW EXECUTE FUNCTION private.audit_change('id', 'status');
CREATE TRIGGER procedure_categories_audit AFTER INSERT OR UPDATE OR DELETE ON public.procedure_categories
  FOR EACH ROW EXECUTE FUNCTION private.audit_change('id');
CREATE TRIGGER listing_reports_audit AFTER UPDATE OR DELETE ON public.listing_reports
  FOR EACH ROW EXECUTE FUNCTION private.audit_change('id');
CREATE TRIGGER suggestions_audit AFTER UPDATE OR DELETE ON public.suggestions
  FOR EACH ROW EXECUTE FUNCTION private.audit_change('id');
NOTIFY pgrst, 'reload schema';
-- <<< content_workflow
