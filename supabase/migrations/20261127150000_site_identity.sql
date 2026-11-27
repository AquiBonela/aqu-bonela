-- Identidad pública de la instalación (Fase 1 del administrador).
-- Una sola fila y sin datos de ningún municipio: cada instalación la rellena
-- desde /admin o con supabase/template/03_init_instance.sql. Mientras un campo
-- esté vacío, la web usa el valor compilado de su instancia.
-- >>> site_identity (bloque idéntico en supabase/template/01_schema.sql; lo comprueba src/lib/site-identity-sql.test.ts)
CREATE TABLE public.site_identity (
  id boolean NOT NULL DEFAULT true,
  app_name text NOT NULL DEFAULT '',
  short_name text NOT NULL DEFAULT '',
  municipality_name text NOT NULL DEFAULT '',
  province text NOT NULL DEFAULT '',
  region text NOT NULL DEFAULT '',
  autonomous_community text NOT NULL DEFAULT '',
  demonym_masculine text NOT NULL DEFAULT '',
  demonym_feminine text NOT NULL DEFAULT '',
  site_url text NOT NULL DEFAULT '',
  town_hall_name text NOT NULL DEFAULT '',
  town_hall_address text NOT NULL DEFAULT '',
  town_hall_phone text NOT NULL DEFAULT '',
  town_hall_website text NOT NULL DEFAULT '',
  latitude numeric(8,5),
  longitude numeric(8,5),
  timezone text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT site_identity_pkey PRIMARY KEY (id),
  CONSTRAINT site_identity_id_check CHECK (id),
  CONSTRAINT site_identity_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT site_identity_lengths CHECK (
    char_length(app_name) <= 60 AND char_length(short_name) <= 30 AND char_length(municipality_name) <= 80
    AND char_length(province) <= 60 AND char_length(region) <= 80 AND char_length(autonomous_community) <= 80
    AND char_length(demonym_masculine) <= 40 AND char_length(demonym_feminine) <= 40
    AND char_length(town_hall_name) <= 120 AND char_length(town_hall_address) <= 200
    AND char_length(town_hall_website) <= 300 AND char_length(timezone) <= 64),
  -- Sin HTML, sin llaves (se confundirían con {app}, {municipio}...) y sin caracteres de control.
  CONSTRAINT site_identity_safe_text CHECK (
    concat_ws(' ', app_name, short_name, municipality_name, province, region, autonomous_community,
      demonym_masculine, demonym_feminine, town_hall_name, town_hall_address, timezone) !~ '[<>{}[:cntrl:]]'),
  -- Origen https sin ruta ni barra final, p. ej. https://mipueblo.es
  CONSTRAINT site_identity_site_url CHECK (
    site_url = '' OR site_url ~ '^https://[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(:[0-9]{1,5})?$'),
  CONSTRAINT site_identity_town_hall_phone CHECK (town_hall_phone ~ '^[0-9 +]{0,20}$'),
  CONSTRAINT site_identity_town_hall_website CHECK (
    town_hall_website = '' OR town_hall_website ~ '^https://[^[:space:]<>"{}]+$'),
  CONSTRAINT site_identity_coordinates CHECK (
    (latitude IS NULL) = (longitude IS NULL)
    AND (latitude IS NULL OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180 AND timezone <> '')))
);

-- Quién puede cambiar la identidad. En fases posteriores (roles) solo cambia esta función, no las políticas.
CREATE OR REPLACE FUNCTION public.can_manage_identity()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role);
$$;
REVOKE ALL ON FUNCTION public.can_manage_identity() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_identity() TO authenticated, service_role;

-- Valida la zona horaria y registra fecha y autor de cada cambio.
CREATE OR REPLACE FUNCTION private.site_identity_before_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.timezone <> '' AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name = NEW.timezone) THEN
    RAISE EXCEPTION 'Zona horaria no válida: %', NEW.timezone USING ERRCODE = 'check_violation';
  END IF;
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.site_identity_before_update() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER site_identity_before_update BEFORE UPDATE ON public.site_identity
  FOR EACH ROW EXECUTE FUNCTION private.site_identity_before_update();

-- Todo es público salvo updated_by. Sin INSERT ni DELETE: la fila única no se crea ni se borra desde la web.
REVOKE ALL ON public.site_identity FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.site_identity TO service_role;
GRANT SELECT (id, app_name, short_name, municipality_name, province, region, autonomous_community,
  demonym_masculine, demonym_feminine, site_url, town_hall_name, town_hall_address, town_hall_phone,
  town_hall_website, latitude, longitude, timezone, updated_at) ON public.site_identity TO anon, authenticated;
GRANT UPDATE (app_name, short_name, municipality_name, province, region, autonomous_community,
  demonym_masculine, demonym_feminine, site_url, town_hall_name, town_hall_address, town_hall_phone,
  town_hall_website, latitude, longitude, timezone) ON public.site_identity TO authenticated;
ALTER TABLE public.site_identity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visitors read site identity" ON public.site_identity AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (id);
CREATE POLICY "Identity managers update site identity" ON public.site_identity AS PERMISSIVE FOR UPDATE TO authenticated
  USING (public.can_manage_identity())
  WITH CHECK (public.can_manage_identity());

-- Configuración pública de la web en una sola llamada. Las fases siguientes añaden claves (tema, secciones, menú).
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

INSERT INTO public.site_identity (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
-- <<< site_identity
