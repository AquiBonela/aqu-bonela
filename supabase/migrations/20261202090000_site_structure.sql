-- Estructura de la web y borradores del contenido municipal (etapa 2, PR 2A).
-- 1. site_menu, page_sections y home_shortcuts: lo publicado del menú, de las secciones de cada
--    página y de los accesos directos adicionales. Sin filas, la web usa los valores por defecto
--    del producto (lo mismo que se ve hoy). El Directorio y la sección Accesos directos de la
--    portada son permanentes: estas tablas no admiten configurarlos.
-- 2. content_drafts y content_publications: un borrador por pantalla de contenido municipal y el
--    registro de cada publicación, con la confirmación de conformidad municipal obligatoria.
-- 3. save_content_draft, publish_content_draft, discard_content_draft y content_draft_state: la
--    administración guarda, publica y descarta. Publicar aplica el borrador a las tablas publicadas
--    en una transacción, solo si lo publicado no cambió desde que se empezó el borrador.
--    Antes de aplicar nada, publicar bloquea lo publicado de la pantalla, valida la forma y los tipos
--    del contenido (claves obligatorias, sin claves desconocidas) y comprueba que existen en
--    site-assets las imágenes que usa. Si algo falla, no cambia nada y el borrador se conserva.
-- 4. Las tablas nuevas no admiten escritura directa desde el navegador: solo cambian al publicar.
--    Las tablas ya existentes (site_identity, site_settings, page_headers) siguen admitiéndola hasta
--    el panel nuevo (PR 2B), que usará estas funciones.
-- 5. site_config() devuelve también el menú, las secciones y los accesos visibles publicados.
-- 6. Los visitantes pueden leer las imágenes de los accesos visibles (bucket privado site-assets).
-- Requiere 20261201092000_listing_review_flow. Vuelta atrás: supabase/rollback/20261202090000_site_structure.sql

-- Si ya está aplicada, se detiene sin tocar nada (no forma parte del bloque de la plantilla).
DO $guard$
BEGIN
  IF to_regclass('public.site_menu') IS NOT NULL THEN
    RAISE EXCEPTION 'La migración 20261202090000_site_structure ya está aplicada: no se ha cambiado nada.';
  END IF;
END
$guard$;

-- >>> site_structure (bloque idéntico en supabase/template/01_schema.sql; lo comprueba src/lib/product-migrations-sql.test.ts)

-- Fecha y autor de cada cambio en las tablas de estructura y en los borradores.
CREATE OR REPLACE FUNCTION private.site_structure_stamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.site_structure_stamp() FROM PUBLIC, anon, authenticated;

-- Entradas configurables del menú. Portada y Directorio son fijos y no se guardan aquí.
-- En una página, enabled decide si la página existe; en guia-tramites, solo si aparece en el menú.
CREATE TABLE public.site_menu (
  entry_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  sort_order smallint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT site_menu_pkey PRIMARY KEY (entry_key),
  CONSTRAINT site_menu_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT site_menu_entry_key CHECK (entry_key IN ('servicios-publicos', 'actualidad', 'descubre', 'guia-tramites')),
  CONSTRAINT site_menu_sort_order CHECK (sort_order BETWEEN 0 AND 99)
);

-- Secciones de cada página. Portada (Accesos directos, permanente) y Directorio no tienen filas.
CREATE TABLE public.page_sections (
  page_key text NOT NULL,
  section_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  sort_order smallint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT page_sections_pkey PRIMARY KEY (page_key, section_key),
  CONSTRAINT page_sections_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT page_sections_catalog CHECK (
    (page_key = 'servicios-publicos' AND section_key IN ('emergencias', 'vida-cotidiana', 'tramites', 'transporte'))
    OR (page_key = 'actualidad' AND section_key IN ('noticias', 'avisos', 'agenda', 'fiestas'))
    OR (page_key = 'descubre' AND section_key IN ('historia-patrimonio', 'lugares-interes', 'miradores', 'entorno',
      'rutas-senderos', 'cultura-tradiciones', 'gastronomia', 'consejos-vecino', 'donde-comer', 'donde-dormir'))),
  CONSTRAINT page_sections_sort_order CHECK (sort_order BETWEEN 0 AND 99)
);

-- Accesos directos adicionales de la portada, detrás de los automáticos. Siempre con destino válido.
CREATE TABLE public.home_shortcuts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_path text NOT NULL,
  image_alt text NOT NULL DEFAULT '',
  href text NOT NULL,
  visible boolean NOT NULL DEFAULT true,
  sort_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT home_shortcuts_pkey PRIMARY KEY (id),
  CONSTRAINT home_shortcuts_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT home_shortcuts_title CHECK (char_length(btrim(title)) BETWEEN 1 AND 60 AND title !~ '[<>{}[:cntrl:]]'),
  CONSTRAINT home_shortcuts_description CHECK (char_length(description) <= 160 AND description !~ '[<>{}[:cntrl:]]'),
  CONSTRAINT home_shortcuts_image CHECK (image_path ~ '^accesos/[0-9a-f-]{36}\.webp$'),
  CONSTRAINT home_shortcuts_image_alt CHECK (char_length(image_alt) <= 200 AND image_alt !~ '[<>{}[:cntrl:]]'),
  CONSTRAINT home_shortcuts_href CHECK (char_length(href) <= 300 AND (
    href ~ '^/([A-Za-z0-9._~/?#=&%-]*)$' AND href !~ '^//'
    OR href ~ '^https://[^[:space:]<>"{}]+$')),
  CONSTRAINT home_shortcuts_sort_order CHECK (sort_order BETWEEN 0 AND 999)
);

-- Un borrador por pantalla de contenido municipal. base_version es la huella de lo publicado del
-- que parte: si lo publicado cambia después, el borrador no se puede publicar sin recargarlo.
CREATE TABLE public.content_drafts (
  draft_key text NOT NULL,
  content jsonb NOT NULL,
  base_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT content_drafts_pkey PRIMARY KEY (draft_key),
  CONSTRAINT content_drafts_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT content_drafts_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT content_drafts_key CHECK (draft_key ~ ('^(menu|accesos|portada|aviso-cabecera|identidad|datos-legales'
    || '|secciones:(servicios-publicos|actualidad|descubre)'
    || '|cabecera:(inicio|directorio|servicios-publicos|tramites|descubre|tablon|actualidad))$')),
  CONSTRAINT content_drafts_content CHECK (jsonb_typeof(content) = 'object')
);

-- Registro de publicaciones: una fila por publicación, que nadie edita ni borra desde el navegador.
CREATE TABLE public.content_publications (
  id bigint GENERATED ALWAYS AS IDENTITY,
  draft_key text NOT NULL,
  conformity boolean NOT NULL,
  note text NOT NULL DEFAULT '',
  published_at timestamptz NOT NULL DEFAULT now(),
  published_by uuid DEFAULT auth.uid(),
  CONSTRAINT content_publications_pkey PRIMARY KEY (id),
  CONSTRAINT content_publications_published_by_fkey FOREIGN KEY (published_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT content_publications_key CHECK (char_length(draft_key) BETWEEN 1 AND 60),
  CONSTRAINT content_publications_conformity CHECK (conformity),
  CONSTRAINT content_publications_note CHECK (char_length(note) <= 500 AND note !~ '[[:cntrl:]]')
);

CREATE TRIGGER site_menu_stamp BEFORE INSERT OR UPDATE ON public.site_menu
  FOR EACH ROW EXECUTE FUNCTION private.site_structure_stamp();
CREATE TRIGGER page_sections_stamp BEFORE INSERT OR UPDATE ON public.page_sections
  FOR EACH ROW EXECUTE FUNCTION private.site_structure_stamp();
CREATE TRIGGER home_shortcuts_stamp BEFORE INSERT OR UPDATE ON public.home_shortcuts
  FOR EACH ROW EXECUTE FUNCTION private.site_structure_stamp();
CREATE TRIGGER content_drafts_stamp BEFORE INSERT OR UPDATE ON public.content_drafts
  FOR EACH ROW EXECUTE FUNCTION private.site_structure_stamp();

-- Permisos: los visitantes leen lo publicado (nunca updated_by); el navegador no escribe en
-- ninguna de estas tablas. Solo las funciones de la administración las cambian.
REVOKE ALL ON public.site_menu, public.page_sections, public.home_shortcuts, public.content_drafts,
  public.content_publications FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.site_menu, public.page_sections, public.home_shortcuts, public.content_drafts,
  public.content_publications TO service_role;
GRANT SELECT (entry_key, enabled, sort_order, updated_at) ON public.site_menu TO anon, authenticated;
GRANT SELECT (page_key, section_key, enabled, sort_order, updated_at) ON public.page_sections TO anon, authenticated;
GRANT SELECT (id, title, description, image_path, image_alt, href, visible, sort_order, created_at, updated_at)
  ON public.home_shortcuts TO anon, authenticated;
GRANT SELECT ON public.content_drafts, public.content_publications TO authenticated;

ALTER TABLE public.site_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_shortcuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_publications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visitors read site menu" ON public.site_menu AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "Visitors read page sections" ON public.page_sections AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "Visitors read visible shortcuts" ON public.home_shortcuts AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (visible);
CREATE POLICY "Admins read all shortcuts" ON public.home_shortcuts AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins read drafts" ON public.content_drafts AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins read publications" ON public.content_publications AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Lo publicado de una pantalla, en la misma forma que su borrador. Su huella (md5) detecta cambios.
CREATE OR REPLACE FUNCTION private.published_content(p_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_page text := split_part(p_key, ':', 2);
BEGIN
  IF p_key = 'menu' THEN
    RETURN jsonb_build_object('entries', coalesce((
      SELECT jsonb_agg(jsonb_build_object('key', m.entry_key, 'enabled', m.enabled, 'sort_order', m.sort_order)
        ORDER BY m.entry_key)
      FROM public.site_menu AS m), '[]'::jsonb));
  ELSIF p_key LIKE 'secciones:%' THEN
    RETURN jsonb_build_object('sections', coalesce((
      SELECT jsonb_agg(jsonb_build_object('key', s.section_key, 'enabled', s.enabled, 'sort_order', s.sort_order)
        ORDER BY s.section_key)
      FROM public.page_sections AS s WHERE s.page_key = v_page), '[]'::jsonb));
  ELSIF p_key = 'accesos' THEN
    RETURN jsonb_build_object('shortcuts', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', h.id, 'title', h.title, 'description', h.description,
        'image_path', h.image_path, 'image_alt', h.image_alt, 'href', h.href, 'visible', h.visible,
        'sort_order', h.sort_order) ORDER BY h.id)
      FROM public.home_shortcuts AS h), '[]'::jsonb));
  ELSIF p_key = 'portada' THEN
    RETURN (SELECT jsonb_build_object('hero_title', s.hero_title, 'hero_subtitle', s.hero_subtitle)
      FROM public.site_settings AS s WHERE s.id);
  ELSIF p_key = 'aviso-cabecera' THEN
    RETURN (SELECT jsonb_build_object('banner_enabled', s.banner_enabled, 'banner_text', s.banner_text)
      FROM public.site_settings AS s WHERE s.id);
  ELSIF p_key = 'datos-legales' THEN
    RETURN (SELECT jsonb_build_object('legal_name', s.legal_name, 'legal_nif', s.legal_nif,
      'legal_address', s.legal_address, 'legal_email', s.legal_email)
      FROM public.site_settings AS s WHERE s.id);
  ELSIF p_key = 'identidad' THEN
    RETURN (SELECT to_jsonb(i) - 'id' - 'updated_at' - 'updated_by' FROM public.site_identity AS i WHERE i.id);
  ELSIF p_key LIKE 'cabecera:%' THEN
    RETURN coalesce((SELECT jsonb_build_object('image_path', h.image_path, 'image_small_path', h.image_small_path,
      'alt', h.alt, 'focal_x', h.focal_x, 'focal_y', h.focal_y)
      FROM public.page_headers AS h WHERE h.page_key = v_page), '{}'::jsonb);
  END IF;
  RAISE EXCEPTION 'Pantalla de contenido desconocida: %', p_key USING ERRCODE = '22023';
END;
$$;
REVOKE ALL ON FUNCTION private.published_content(text) FROM PUBLIC, anon, authenticated;

-- Comprueba que un objeto del borrador tiene exactamente las claves esperadas: todas las
-- obligatorias y ninguna desconocida. Una lista ausente o mal escrita nunca cuenta como vacía.
CREATE OR REPLACE FUNCTION private.draft_keys(p_value jsonb, p_required text[], p_optional text[], p_label text)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_missing text;
  v_unknown text;
BEGIN
  IF p_value IS NULL OR jsonb_typeof(p_value) <> 'object' THEN
    RAISE EXCEPTION 'Contenido no válido en %: se esperaba un objeto', p_label
      USING ERRCODE = 'PT422', HINT = 'invalid_content';
  END IF;
  SELECT string_agg(k, ', ') INTO v_missing FROM unnest(p_required) AS k WHERE NOT p_value ? k;
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Contenido no válido en %: faltan %', p_label, v_missing
      USING ERRCODE = 'PT422', HINT = 'invalid_content';
  END IF;
  SELECT string_agg(k, ', ') INTO v_unknown FROM jsonb_object_keys(p_value) AS k
  WHERE NOT k = ANY (p_required || p_optional);
  IF v_unknown IS NOT NULL THEN
    RAISE EXCEPTION 'Contenido no válido en %: claves desconocidas %', p_label, v_unknown
      USING ERRCODE = 'PT422', HINT = 'invalid_content';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION private.draft_keys(jsonb, text[], text[], text) FROM PUBLIC, anon, authenticated;

-- Valida la forma y los tipos del borrador de una pantalla (las restricciones de las tablas validan
-- después los valores) y devuelve las rutas de site-assets que usa, para comprobar que existen.
CREATE OR REPLACE FUNCTION private.validate_draft_content(p_key text, c jsonb)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  e jsonb;
  v_list text;
  v_paths text[] := '{}';
  v_field text;
  v_identity_text text[] := ARRAY['app_name', 'short_name', 'municipality_name', 'province', 'region',
    'autonomous_community', 'demonym_masculine', 'demonym_feminine', 'site_url', 'town_hall_name',
    'town_hall_address', 'town_hall_phone', 'town_hall_website', 'timezone', 'postal_code', 'primary_color',
    'accent_color', 'logo_path', 'logo_light_path', 'icon_path', 'icon_small_path'];
  v_bad boolean;
BEGIN
  IF p_key = 'menu' OR p_key LIKE 'secciones:%' THEN
    v_list := CASE WHEN p_key = 'menu' THEN 'entries' ELSE 'sections' END;
    PERFORM private.draft_keys(c, ARRAY[v_list], '{}', p_key);
    IF jsonb_typeof(c -> v_list) <> 'array' THEN
      RAISE EXCEPTION 'Contenido no válido en %: % debe ser una lista', p_key, v_list
        USING ERRCODE = 'PT422', HINT = 'invalid_content';
    END IF;
    FOR e IN SELECT x.value FROM jsonb_array_elements(c -> v_list) AS x LOOP
      PERFORM private.draft_keys(e, ARRAY['key', 'enabled', 'sort_order'], '{}', p_key);
      IF jsonb_typeof(e -> 'key') <> 'string' OR jsonb_typeof(e -> 'enabled') <> 'boolean'
        OR jsonb_typeof(e -> 'sort_order') <> 'number' OR (e ->> 'sort_order') !~ '^[0-9]{1,2}$' THEN
        RAISE EXCEPTION 'Contenido no válido en %: entrada con tipos incorrectos', p_key
          USING ERRCODE = 'PT422', HINT = 'invalid_content';
      END IF;
    END LOOP;
    IF (SELECT count(*) <> count(DISTINCT x.value ->> 'key') FROM jsonb_array_elements(c -> v_list) AS x) THEN
      RAISE EXCEPTION 'Contenido no válido en %: claves repetidas', p_key
        USING ERRCODE = 'PT422', HINT = 'invalid_content';
    END IF;
  ELSIF p_key = 'accesos' THEN
    PERFORM private.draft_keys(c, ARRAY['shortcuts'], '{}', p_key);
    IF jsonb_typeof(c -> 'shortcuts') <> 'array' THEN
      RAISE EXCEPTION 'Contenido no válido en accesos: shortcuts debe ser una lista'
        USING ERRCODE = 'PT422', HINT = 'invalid_content';
    END IF;
    FOR e IN SELECT x.value FROM jsonb_array_elements(c -> 'shortcuts') AS x LOOP
      PERFORM private.draft_keys(e, ARRAY['title', 'image_path', 'href'],
        ARRAY['id', 'description', 'image_alt', 'visible', 'sort_order'], 'acceso directo');
      v_bad := jsonb_typeof(e -> 'title') <> 'string' OR jsonb_typeof(e -> 'image_path') <> 'string'
        OR jsonb_typeof(e -> 'href') <> 'string'
        OR (e ? 'id' AND (jsonb_typeof(e -> 'id') <> 'string' OR (e ->> 'id') !~ '^[0-9a-f-]{36}$'))
        OR (e ? 'description' AND jsonb_typeof(e -> 'description') <> 'string')
        OR (e ? 'image_alt' AND jsonb_typeof(e -> 'image_alt') <> 'string')
        OR (e ? 'visible' AND jsonb_typeof(e -> 'visible') <> 'boolean')
        OR (e ? 'sort_order' AND (jsonb_typeof(e -> 'sort_order') <> 'number' OR (e ->> 'sort_order') !~ '^[0-9]{1,3}$'));
      IF v_bad THEN
        RAISE EXCEPTION 'Contenido no válido en accesos: acceso con tipos incorrectos'
          USING ERRCODE = 'PT422', HINT = 'invalid_content';
      END IF;
      v_paths := v_paths || (e ->> 'image_path');
    END LOOP;
    IF (SELECT count(x.value -> 'id') <> count(DISTINCT x.value ->> 'id')
        FROM jsonb_array_elements(c -> 'shortcuts') AS x) THEN
      RAISE EXCEPTION 'Contenido no válido en accesos: identificadores repetidos'
        USING ERRCODE = 'PT422', HINT = 'invalid_content';
    END IF;
  ELSIF p_key = 'portada' THEN
    PERFORM private.draft_keys(c, ARRAY['hero_title', 'hero_subtitle'], '{}', p_key);
    IF jsonb_typeof(c -> 'hero_title') <> 'string' OR jsonb_typeof(c -> 'hero_subtitle') <> 'string' THEN
      RAISE EXCEPTION 'Contenido no válido en portada: se esperaban textos'
        USING ERRCODE = 'PT422', HINT = 'invalid_content';
    END IF;
  ELSIF p_key = 'aviso-cabecera' THEN
    PERFORM private.draft_keys(c, ARRAY['banner_enabled', 'banner_text'], '{}', p_key);
    IF jsonb_typeof(c -> 'banner_enabled') <> 'boolean' OR jsonb_typeof(c -> 'banner_text') <> 'string' THEN
      RAISE EXCEPTION 'Contenido no válido en aviso-cabecera: tipos incorrectos'
        USING ERRCODE = 'PT422', HINT = 'invalid_content';
    END IF;
  ELSIF p_key = 'datos-legales' THEN
    PERFORM private.draft_keys(c, ARRAY['legal_name', 'legal_nif', 'legal_address', 'legal_email'], '{}', p_key);
    IF EXISTS (SELECT 1 FROM jsonb_each(c) AS x WHERE jsonb_typeof(x.value) <> 'string') THEN
      RAISE EXCEPTION 'Contenido no válido en datos-legales: se esperaban textos'
        USING ERRCODE = 'PT422', HINT = 'invalid_content';
    END IF;
  ELSIF p_key = 'identidad' THEN
    PERFORM private.draft_keys(c, v_identity_text || ARRAY['latitude', 'longitude'], '{}', p_key);
    FOREACH v_field IN ARRAY v_identity_text LOOP
      IF jsonb_typeof(c -> v_field) <> 'string' THEN
        RAISE EXCEPTION 'Contenido no válido en identidad: % debe ser un texto', v_field
          USING ERRCODE = 'PT422', HINT = 'invalid_content';
      END IF;
    END LOOP;
    IF jsonb_typeof(c -> 'latitude') NOT IN ('number', 'null') OR jsonb_typeof(c -> 'longitude') NOT IN ('number', 'null') THEN
      RAISE EXCEPTION 'Contenido no válido en identidad: coordenadas con tipos incorrectos'
        USING ERRCODE = 'PT422', HINT = 'invalid_content';
    END IF;
    SELECT coalesce(array_agg(p), '{}') INTO v_paths
    FROM unnest(ARRAY[c ->> 'logo_path', c ->> 'logo_light_path', c ->> 'icon_path', c ->> 'icon_small_path']) AS p
    WHERE p <> '';
  ELSIF p_key LIKE 'cabecera:%' THEN
    IF c ? 'remove' THEN
      PERFORM private.draft_keys(c, ARRAY['remove'], '{}', p_key);
      IF c -> 'remove' <> 'true'::jsonb THEN
        RAISE EXCEPTION 'Contenido no válido en %: remove solo admite true', p_key
          USING ERRCODE = 'PT422', HINT = 'invalid_content';
      END IF;
    ELSE
      PERFORM private.draft_keys(c, ARRAY['image_path', 'image_small_path', 'alt', 'focal_x', 'focal_y'], '{}', p_key);
      IF jsonb_typeof(c -> 'image_path') <> 'string' OR jsonb_typeof(c -> 'image_small_path') <> 'string'
        OR jsonb_typeof(c -> 'alt') <> 'string'
        OR jsonb_typeof(c -> 'focal_x') <> 'number' OR (c ->> 'focal_x') !~ '^[0-9]{1,3}$'
        OR jsonb_typeof(c -> 'focal_y') <> 'number' OR (c ->> 'focal_y') !~ '^[0-9]{1,3}$' THEN
        RAISE EXCEPTION 'Contenido no válido en %: tipos incorrectos', p_key
          USING ERRCODE = 'PT422', HINT = 'invalid_content';
      END IF;
      v_paths := ARRAY[c ->> 'image_path', c ->> 'image_small_path'];
    END IF;
  ELSE
    RAISE EXCEPTION 'Pantalla de contenido desconocida: %', p_key USING ERRCODE = '22023';
  END IF;
  RETURN v_paths;
END;
$$;
REVOKE ALL ON FUNCTION private.validate_draft_content(text, jsonb) FROM PUBLIC, anon, authenticated;

-- Guarda el borrador de una pantalla. Sin versión esperada crea uno nuevo; con ella, lo actualiza
-- solo si nadie lo cambió desde que se cargó. No toca nada publicado.
CREATE OR REPLACE FUNCTION public.save_content_draft(
  p_key text,
  p_content jsonb,
  p_expected_updated_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_at timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo la administración puede guardar borradores' USING ERRCODE = '42501';
  END IF;
  IF p_expected_updated_at IS NULL THEN
    INSERT INTO public.content_drafts (draft_key, content, base_version)
    VALUES (p_key, p_content, md5(private.published_content(p_key)::text))
    ON CONFLICT (draft_key) DO NOTHING
    RETURNING updated_at INTO v_at;
    IF v_at IS NULL THEN
      RAISE EXCEPTION 'Ya hay un borrador de esta pantalla' USING ERRCODE = 'PT409', HINT = 'draft_exists';
    END IF;
  ELSE
    UPDATE public.content_drafts AS d SET content = p_content
    WHERE d.draft_key = p_key AND d.updated_at = p_expected_updated_at
    RETURNING d.updated_at INTO v_at;
    IF v_at IS NULL THEN
      RAISE EXCEPTION 'El borrador ha cambiado desde que se abrió' USING ERRCODE = 'PT409', HINT = 'draft_changed';
    END IF;
  END IF;
  RETURN jsonb_build_object('draft_key', p_key, 'updated_at', v_at);
END;
$$;

-- Descarta el borrador de una pantalla sin tocar lo publicado.
CREATE OR REPLACE FUNCTION public.discard_content_draft(p_key text, p_expected_updated_at timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo la administración puede descartar borradores' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.content_drafts AS d WHERE d.draft_key = p_key AND d.updated_at = p_expected_updated_at;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El borrador ha cambiado desde que se abrió' USING ERRCODE = 'PT409', HINT = 'draft_changed';
  END IF;
  RETURN jsonb_build_object('draft_key', p_key, 'discarded', true);
END;
$$;

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

REVOKE ALL ON FUNCTION public.save_content_draft(text, jsonb, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_content_draft(text, jsonb, timestamptz) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.discard_content_draft(text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.discard_content_draft(text, timestamptz) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.content_draft_state(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.content_draft_state(text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.publish_content_draft(text, timestamptz, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_content_draft(text, timestamptz, boolean, text) TO authenticated, service_role;

-- Storage: los visitantes leen también las imágenes de los accesos visibles publicados. Una imagen
-- subida para un borrador no es legible hasta que se publica.
DROP POLICY IF EXISTS "Visitors read referenced site assets" ON storage.objects;
CREATE POLICY "Visitors read referenced site assets" ON storage.objects AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'site-assets'::text
    AND (
      EXISTS (
        SELECT 1 FROM public.site_identity AS i
        WHERE i.id AND objects.name IN (i.logo_path, i.logo_light_path, i.icon_path, i.icon_small_path)
      )
      OR EXISTS (
        SELECT 1 FROM public.page_headers AS h
        WHERE objects.name IN (h.image_path, h.image_small_path)
      )
      OR EXISTS (
        SELECT 1 FROM public.home_shortcuts AS s
        WHERE s.visible AND objects.name = s.image_path
      )
    )
  );

-- Configuración pública: lo de antes más el menú, las secciones y los accesos visibles publicados.
CREATE OR REPLACE FUNCTION public.site_config()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'identity', (
      SELECT jsonb_build_object(
        'app_name', i.app_name, 'short_name', i.short_name, 'municipality_name', i.municipality_name,
        'province', i.province, 'region', i.region, 'autonomous_community', i.autonomous_community,
        'demonym_masculine', i.demonym_masculine, 'demonym_feminine', i.demonym_feminine,
        'site_url', i.site_url, 'town_hall_name', i.town_hall_name, 'town_hall_address', i.town_hall_address,
        'town_hall_phone', i.town_hall_phone, 'town_hall_website', i.town_hall_website,
        'latitude', i.latitude, 'longitude', i.longitude, 'timezone', i.timezone,
        'postal_code', i.postal_code, 'primary_color', i.primary_color, 'accent_color', i.accent_color,
        'logo_path', i.logo_path, 'logo_light_path', i.logo_light_path, 'icon_path', i.icon_path,
        'icon_small_path', i.icon_small_path, 'updated_at', i.updated_at)
      FROM public.site_identity AS i
      WHERE i.id),
    'page_headers', coalesce((
      SELECT jsonb_object_agg(h.page_key, jsonb_build_object(
        'image_path', h.image_path, 'image_small_path', h.image_small_path, 'alt', h.alt,
        'focal_x', h.focal_x, 'focal_y', h.focal_y, 'updated_at', h.updated_at))
      FROM public.page_headers AS h), '{}'::jsonb),
    'menu', coalesce((
      SELECT jsonb_object_agg(m.entry_key, jsonb_build_object('enabled', m.enabled, 'sort_order', m.sort_order))
      FROM public.site_menu AS m), '{}'::jsonb),
    'sections', coalesce((
      SELECT jsonb_object_agg(p.page_key, p.sections)
      FROM (
        SELECT s.page_key, jsonb_object_agg(s.section_key,
          jsonb_build_object('enabled', s.enabled, 'sort_order', s.sort_order)) AS sections
        FROM public.page_sections AS s
        GROUP BY s.page_key) AS p), '{}'::jsonb),
    'shortcuts', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', h.id, 'title', h.title, 'description', h.description,
        'image_path', h.image_path, 'image_alt', h.image_alt, 'href', h.href)
        ORDER BY h.sort_order, h.created_at)
      FROM public.home_shortcuts AS h
      WHERE h.visible), '[]'::jsonb));
$$;
REVOKE ALL ON FUNCTION public.site_config() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.site_config() TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
-- <<< site_structure
