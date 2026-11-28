-- Identidad visual y cabeceras de página por instalación.
-- 1. site_identity: código postal del municipio, dos colores (el resto de la paleta se calcula en
--    la web) y las rutas de logotipo, logotipo claro e iconos guardados en el bucket site-assets.
-- 2. page_headers: imagen de cabecera, texto alternativo y encuadre de cada página pública.
-- 3. Políticas de Storage del bucket privado site-assets (se crea antes por la API de Storage):
--    solo la administración escribe; los visitantes solo leen los archivos que la identidad o una
--    cabecera usan en ese momento. La web los sirve desde su propio dominio con caché inmutable.
-- 4. site_config() devuelve también estos datos, en la misma llamada que ya hace cada página.
-- Requiere 20261127150000_site_identity. Vuelta atrás: supabase/rollback/20261201090000_identity_branding.sql
-- >>> identity_branding (bloque idéntico en supabase/template/01_schema.sql; lo comprueba src/lib/identity-branding-sql.test.ts)

ALTER TABLE public.site_identity
  ADD COLUMN postal_code text NOT NULL DEFAULT '',
  ADD COLUMN primary_color text NOT NULL DEFAULT '',
  ADD COLUMN accent_color text NOT NULL DEFAULT '',
  ADD COLUMN logo_path text NOT NULL DEFAULT '',
  ADD COLUMN logo_light_path text NOT NULL DEFAULT '',
  ADD COLUMN icon_path text NOT NULL DEFAULT '',
  ADD COLUMN icon_small_path text NOT NULL DEFAULT '';

ALTER TABLE public.site_identity
  -- Código postal español de cinco cifras, o vacío.
  ADD CONSTRAINT site_identity_postal_code CHECK (postal_code ~ '^([0-9]{5})?$'),
  -- Colores en hexadecimal #rrggbb en minúsculas, o vacío (paleta de la instalación).
  ADD CONSTRAINT site_identity_colors CHECK (
    primary_color ~ '^(#[0-9a-f]{6})?$' AND accent_color ~ '^(#[0-9a-f]{6})?$'),
  -- Solo rutas generadas por el panel: carpeta propia por subida y nombres fijos.
  ADD CONSTRAINT site_identity_asset_paths CHECK (
    logo_path ~ '^(identidad/[0-9a-f-]{36}/logo\.webp)?$'
    AND logo_light_path ~ '^(identidad/[0-9a-f-]{36}/logo-claro\.webp)?$'
    AND icon_path ~ '^(identidad/[0-9a-f-]{36}/icono-512\.png)?$'
    AND icon_small_path ~ '^(identidad/[0-9a-f-]{36}/icono-192\.png)?$');

GRANT SELECT (postal_code, primary_color, accent_color, logo_path, logo_light_path, icon_path,
  icon_small_path) ON public.site_identity TO anon, authenticated;
GRANT UPDATE (postal_code, primary_color, accent_color, logo_path, logo_light_path, icon_path,
  icon_small_path) ON public.site_identity TO authenticated;

-- Cabeceras de las páginas públicas. Una fila por página con imagen; sin fila, la web usa su
-- alternativa visual. Las claves son las páginas comunes del producto, no las de un municipio.
CREATE TABLE public.page_headers (
  page_key text NOT NULL,
  image_path text NOT NULL,
  image_small_path text NOT NULL,
  alt text NOT NULL DEFAULT '',
  focal_x smallint NOT NULL DEFAULT 50,
  focal_y smallint NOT NULL DEFAULT 50,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT page_headers_pkey PRIMARY KEY (page_key),
  CONSTRAINT page_headers_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT page_headers_page_key CHECK (page_key IN
    ('inicio', 'directorio', 'servicios-publicos', 'tramites', 'descubre', 'tablon', 'actualidad')),
  CONSTRAINT page_headers_paths CHECK (
    image_path ~ ('^cabeceras/' || page_key || '/[0-9a-f-]{36}\.webp$')
    AND image_small_path ~ ('^cabeceras/' || page_key || '/[0-9a-f-]{36}-movil\.webp$')),
  CONSTRAINT page_headers_alt CHECK (char_length(alt) <= 200 AND alt !~ '[<>{}[:cntrl:]]'),
  CONSTRAINT page_headers_focal CHECK (focal_x BETWEEN 0 AND 100 AND focal_y BETWEEN 0 AND 100)
);

-- Fecha y autor de cada cambio, como en site_identity.
CREATE OR REPLACE FUNCTION private.page_headers_stamp()
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
REVOKE ALL ON FUNCTION private.page_headers_stamp() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER page_headers_stamp BEFORE INSERT OR UPDATE ON public.page_headers
  FOR EACH ROW EXECUTE FUNCTION private.page_headers_stamp();

REVOKE ALL ON public.page_headers FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.page_headers TO service_role;
GRANT SELECT (page_key, image_path, image_small_path, alt, focal_x, focal_y, updated_at)
  ON public.page_headers TO anon, authenticated;
GRANT INSERT (page_key, image_path, image_small_path, alt, focal_x, focal_y),
  UPDATE (image_path, image_small_path, alt, focal_x, focal_y), DELETE
  ON public.page_headers TO authenticated;
ALTER TABLE public.page_headers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visitors read page headers" ON public.page_headers AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "Admins insert page headers" ON public.page_headers AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins update page headers" ON public.page_headers AS PERMISSIVE FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins delete page headers" ON public.page_headers AS PERMISSIVE FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Storage: bucket privado site-assets.
CREATE POLICY "Admins manage site assets" ON storage.objects AS PERMISSIVE FOR ALL TO authenticated
  USING (bucket_id = 'site-assets'::text AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'site-assets'::text AND public.has_role(auth.uid(), 'admin'::public.app_role));
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
    )
  );

-- Configuración pública: la identidad con sus nuevos campos y las cabeceras de página.
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
      FROM public.page_headers AS h), '{}'::jsonb));
$$;
REVOKE ALL ON FUNCTION public.site_config() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.site_config() TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
-- <<< identity_branding
