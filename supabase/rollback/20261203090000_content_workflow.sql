-- Vuelta atrás de 20261203090000_content_workflow: devuelve el esquema al estado de
-- 20261202090000_site_structure. No toca identidad, ajustes, cabeceras ni lo publicado.
-- - Los borradores conservan su contenido y pierden el estado y los datos de la conformidad.
-- - El registro de publicaciones conserva sus filas y pierde la conformidad, lo publicado y lo
--   anterior guardados desde esta migración. El registro de operaciones (admin_audit_log) se borra.
-- - El navegador del administrador vuelve a escribir directamente en identidad, cabeceras y ajustes.
-- - Los visitantes recuperan la lectura de las tablas privadas (RLS sigue sin dejarles ver ninguna
--   fila, como antes). No recuperan los permisos de escritura que esta migración retiró: nunca se
--   usaban (RLS ya los impedía) y la versión anterior no los necesita.

DROP TRIGGER IF EXISTS site_identity_audit ON public.site_identity;
DROP TRIGGER IF EXISTS site_settings_audit ON public.site_settings;
DROP TRIGGER IF EXISTS page_headers_audit ON public.page_headers;
DROP TRIGGER IF EXISTS site_menu_audit ON public.site_menu;
DROP TRIGGER IF EXISTS page_sections_audit ON public.page_sections;
DROP TRIGGER IF EXISTS home_shortcuts_audit ON public.home_shortcuts;
DROP TRIGGER IF EXISTS content_drafts_audit ON public.content_drafts;
DROP TRIGGER IF EXISTS content_publications_audit ON public.content_publications;
DROP TRIGGER IF EXISTS user_roles_audit ON public.user_roles;
DROP TRIGGER IF EXISTS listings_audit ON public.listings;
DROP TRIGGER IF EXISTS listing_contacts_audit ON public.listing_contacts;
DROP TRIGGER IF EXISTS listing_photos_audit ON public.listing_photos;
DROP TRIGGER IF EXISTS approval_tokens_audit ON public.approval_tokens;
DROP TRIGGER IF EXISTS consents_audit ON public.consents;
DROP TRIGGER IF EXISTS categories_audit ON public.categories;
DROP TRIGGER IF EXISTS activities_audit ON public.activities;
DROP TRIGGER IF EXISTS procedures_audit ON public.procedures;
DROP TRIGGER IF EXISTS procedure_categories_audit ON public.procedure_categories;
DROP TRIGGER IF EXISTS listing_reports_audit ON public.listing_reports;
DROP TRIGGER IF EXISTS suggestions_audit ON public.suggestions;
DROP FUNCTION IF EXISTS private.audit_change();
DROP TABLE IF EXISTS public.admin_audit_log;

-- Escritura directa del panel anterior en identidad, cabeceras y ajustes.
GRANT UPDATE (app_name, short_name, municipality_name, province, region, autonomous_community,
  demonym_masculine, demonym_feminine, site_url, town_hall_name, town_hall_address, town_hall_phone,
  town_hall_website, latitude, longitude, timezone, postal_code, primary_color, accent_color, logo_path,
  logo_light_path, icon_path, icon_small_path) ON public.site_identity TO authenticated;
CREATE POLICY "Identity managers update site identity" ON public.site_identity AS PERMISSIVE FOR UPDATE TO authenticated
  USING (public.can_manage_identity())
  WITH CHECK (public.can_manage_identity());
GRANT INSERT (page_key, image_path, image_small_path, alt, focal_x, focal_y),
  UPDATE (image_path, image_small_path, alt, focal_x, focal_y), DELETE
  ON public.page_headers TO authenticated;
CREATE POLICY "Admins insert page headers" ON public.page_headers AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins update page headers" ON public.page_headers AS PERMISSIVE FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins delete page headers" ON public.page_headers AS PERMISSIVE FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
REVOKE UPDATE ON public.site_settings FROM authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT SELECT ON public.approval_tokens, public.consents, public.listing_contacts, public.listing_reports,
  public.listing_requests, public.suggestions, public.translation_gateway_state, public.user_roles TO anon;

-- Funciones de borradores de la versión anterior.
DROP FUNCTION IF EXISTS public.submit_content_draft(text, timestamptz);
DROP FUNCTION IF EXISTS public.record_content_conformity(text, timestamptz, text, date, text, text);
DROP FUNCTION IF EXISTS public.return_content_draft(text, timestamptz);
-- Estado del borrador de una pantalla para el panel: si existe y si lo publicado cambió desde que se empezó.
CREATE OR REPLACE FUNCTION public.content_draft_state(p_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  d public.content_drafts;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo la administración puede consultar borradores' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO d FROM public.content_drafts AS x WHERE x.draft_key = p_key;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('exists', false, 'published', private.published_content(p_key));
  END IF;
  RETURN jsonb_build_object('exists', true, 'updated_at', d.updated_at,
    'stale', d.base_version <> md5(private.published_content(p_key)::text),
    'published', private.published_content(p_key));
END;
$$;

-- Publica el borrador de una pantalla: exige la conformidad municipal confirmada, aplica todo en una
-- transacción, registra quién, cuándo y la nota, y borra el borrador. SECURITY DEFINER para que las
-- tablas publicadas no necesiten escritura directa desde el navegador; comprueba el rol antes de nada.
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
  c jsonb;
  v_page text := split_part(p_key, ':', 2);
  v_ident public.site_identity;
  -- Saltos de línea y demás caracteres de control de la nota pasan a ser espacios.
  v_note text := btrim(regexp_replace(coalesce(p_note, ''), '[[:cntrl:]]+', ' ', 'g'));
  v_at timestamptz;
  v_paths text[];
  v_missing text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo la administración puede publicar' USING ERRCODE = '42501';
  END IF;
  IF p_conformity IS NOT TRUE THEN
    RAISE EXCEPTION 'Falta confirmar la conformidad municipal' USING ERRCODE = 'PT422', HINT = 'conformity_required';
  END IF;
  SELECT * INTO d FROM public.content_drafts AS x WHERE x.draft_key = p_key FOR UPDATE;
  IF NOT FOUND OR d.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'El borrador ha cambiado desde que se abrió' USING ERRCODE = 'PT409', HINT = 'draft_changed';
  END IF;

  -- Bloquea lo publicado de esta pantalla antes de comprobar su versión: una escritura directa en
  -- curso (panel actual) termina antes y se detecta; una posterior espera a que acabe la publicación.
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
  END IF;
  IF d.base_version <> md5(private.published_content(p_key)::text) THEN
    RAISE EXCEPTION 'Lo publicado cambió después de empezar el borrador' USING ERRCODE = 'PT409', HINT = 'published_changed';
  END IF;
  c := d.content;

  -- Forma y tipos del contenido, y archivos que usa: nada se aplica si algo no cuadra.
  v_paths := private.validate_draft_content(p_key, c);
  SELECT string_agg(p, ', ') INTO v_missing FROM unnest(v_paths) AS p
  WHERE NOT EXISTS (SELECT 1 FROM storage.objects AS o WHERE o.bucket_id = 'site-assets' AND o.name = p);
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Faltan archivos en site-assets: %', v_missing USING ERRCODE = 'PT422', HINT = 'missing_asset';
  END IF;

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

  INSERT INTO public.content_publications (draft_key, conformity, note)
  VALUES (p_key, true, left(v_note, 500))
  RETURNING published_at INTO v_at;
  DELETE FROM public.content_drafts AS x WHERE x.draft_key = p_key;
  RETURN jsonb_build_object('draft_key', p_key, 'published_at', v_at);
END;
$$;

DROP FUNCTION IF EXISTS private.apply_content_draft(text, jsonb);
DROP FUNCTION IF EXISTS private.lock_published_content(text);
DROP FUNCTION IF EXISTS private.draft_missing_assets(text[]);
DROP TRIGGER IF EXISTS content_drafts_reset ON public.content_drafts;
DROP FUNCTION IF EXISTS private.content_draft_reset();
ALTER TABLE public.site_settings DROP CONSTRAINT IF EXISTS site_settings_public_texts;

ALTER TABLE public.content_publications
  DROP COLUMN IF EXISTS submitted_at,
  DROP COLUMN IF EXISTS conformity_by,
  DROP COLUMN IF EXISTS conformity_on,
  DROP COLUMN IF EXISTS conformity_channel,
  DROP COLUMN IF EXISTS conformity_reference,
  DROP COLUMN IF EXISTS content,
  DROP COLUMN IF EXISTS previous_content;
ALTER TABLE public.content_drafts
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS submitted_at,
  DROP COLUMN IF EXISTS submitted_by,
  DROP COLUMN IF EXISTS conformity_by,
  DROP COLUMN IF EXISTS conformity_on,
  DROP COLUMN IF EXISTS conformity_channel,
  DROP COLUMN IF EXISTS conformity_reference,
  DROP COLUMN IF EXISTS conformity_recorded_at,
  DROP COLUMN IF EXISTS conformity_recorded_by;
NOTIFY pgrst, 'reload schema';
