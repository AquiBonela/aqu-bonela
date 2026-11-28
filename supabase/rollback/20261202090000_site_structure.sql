-- Vuelta atrás de 20261202090000_site_structure: devuelve el esquema al estado de
-- 20261201092000_listing_review_flow. Borra la configuración del menú, las secciones, los accesos
-- directos adicionales, los borradores y el registro de publicaciones (datos que solo existen desde
-- esta migración); no toca identidad, ajustes ni cabeceras. Las imágenes de accesos que queden en
-- site-assets dejan de ser legibles por visitantes y pueden borrarse desde Storage.

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
    )
  );

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

DROP FUNCTION IF EXISTS public.publish_content_draft(text, timestamptz, boolean, text);
DROP FUNCTION IF EXISTS public.content_draft_state(text);
DROP FUNCTION IF EXISTS public.discard_content_draft(text, timestamptz);
DROP FUNCTION IF EXISTS public.save_content_draft(text, jsonb, timestamptz);
DROP FUNCTION IF EXISTS private.published_content(text);
DROP FUNCTION IF EXISTS private.validate_draft_content(text, jsonb);
DROP FUNCTION IF EXISTS private.draft_keys(jsonb, text[], text[], text);

DROP TABLE IF EXISTS public.content_publications;
DROP TABLE IF EXISTS public.content_drafts;
DROP TABLE IF EXISTS public.home_shortcuts;
DROP TABLE IF EXISTS public.page_sections;
DROP TABLE IF EXISTS public.site_menu;
DROP FUNCTION IF EXISTS private.site_structure_stamp();

NOTIFY pgrst, 'reload schema';
