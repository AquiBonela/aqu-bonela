-- Vuelta atrás de 20261201090000_identity_branding.sql.
-- Restaura site_config() y quita las políticas, la tabla page_headers y las columnas añadidas.
-- Se pierden los valores guardados en esas columnas y las filas de page_headers (no existían antes).
-- Los archivos del bucket site-assets no se borran: el bucket se gestiona por la API de Storage.

CREATE OR REPLACE FUNCTION public.site_config()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT jsonb_build_object('identity', (
    SELECT jsonb_build_object(
      'app_name', i.app_name, 'short_name', i.short_name, 'municipality_name', i.municipality_name,
      'province', i.province, 'region', i.region, 'autonomous_community', i.autonomous_community,
      'demonym_masculine', i.demonym_masculine, 'demonym_feminine', i.demonym_feminine,
      'site_url', i.site_url, 'town_hall_name', i.town_hall_name, 'town_hall_address', i.town_hall_address,
      'town_hall_phone', i.town_hall_phone, 'town_hall_website', i.town_hall_website,
      'latitude', i.latitude, 'longitude', i.longitude, 'timezone', i.timezone, 'updated_at', i.updated_at)
    FROM public.site_identity AS i
    WHERE i.id));
$$;
REVOKE ALL ON FUNCTION public.site_config() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.site_config() TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Visitors read referenced site assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage site assets" ON storage.objects;

DROP TABLE IF EXISTS public.page_headers;
DROP FUNCTION IF EXISTS private.page_headers_stamp();

ALTER TABLE public.site_identity
  DROP CONSTRAINT IF EXISTS site_identity_asset_paths,
  DROP CONSTRAINT IF EXISTS site_identity_colors,
  DROP CONSTRAINT IF EXISTS site_identity_postal_code,
  DROP COLUMN IF EXISTS icon_small_path,
  DROP COLUMN IF EXISTS icon_path,
  DROP COLUMN IF EXISTS logo_light_path,
  DROP COLUMN IF EXISTS logo_path,
  DROP COLUMN IF EXISTS accent_color,
  DROP COLUMN IF EXISTS primary_color,
  DROP COLUMN IF EXISTS postal_code;
NOTIFY pgrst, 'reload schema';
