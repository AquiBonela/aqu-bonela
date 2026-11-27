-- Fichas del directorio: dirección estructurada, ubicación, web, servicio a domicilio, texto
-- alternativo de la portada y periodos de horario (cierres, vacaciones y temporadas).
-- 1. listing_contacts (privada): calle, número, código postal, localidad, coordenadas, web y los
--    permisos show_website y show_approximate_location. Nada se publica sin su permiso.
-- 2. listings: copias públicas calculadas por el trigger (localidad, coordenadas exactas o
--    redondeadas, si la ubicación es aproximada) y show_service_area, cover_alt y hours_note.
-- 3. La web de cada ficha pasa a listing_contacts con el mismo criterio de privacidad. Las fichas
--    que ya la publicaban la conservan visible: ninguna ficha pública cambia con esta migración.
-- 4. public_listings añade al final las columnas nuevas (las existentes no cambian).
-- 5. listing_hour_periods y listing_hours.period_id: horarios de temporada y cierres.
-- 6. save_listing guarda todo en una transacción; los campos que un formulario antiguo no envía
--    se conservan, así que desplegar la web antes o después no borra datos.
-- Requiere 20261128090000_directory_public_view y 20261129090000_listing_safe_writes.
-- Vuelta atrás: supabase/rollback/20261201091000_listing_details.sql
-- >>> listing_details (bloque idéntico en supabase/template/01_schema.sql; lo comprueba src/lib/listing-details-sql.test.ts)

ALTER TABLE public.listing_contacts
  ADD COLUMN street text,
  ADD COLUMN street_number text,
  ADD COLUMN postal_code text,
  ADD COLUMN locality text,
  ADD COLUMN latitude numeric(8,5),
  ADD COLUMN longitude numeric(8,5),
  ADD COLUMN show_approximate_location boolean NOT NULL DEFAULT false,
  ADD COLUMN website text,
  ADD COLUMN show_website boolean NOT NULL DEFAULT false;

ALTER TABLE public.listing_contacts
  ADD CONSTRAINT listing_contacts_address_parts CHECK (
    coalesce(char_length(street), 0) <= 120 AND coalesce(char_length(street_number), 0) <= 20
    AND coalesce(char_length(locality), 0) <= 80
    AND (postal_code IS NULL OR postal_code ~ '^[0-9]{5}$')),
  ADD CONSTRAINT listing_contacts_coordinates CHECK (
    (latitude IS NULL) = (longitude IS NULL)
    AND (latitude IS NULL OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))),
  ADD CONSTRAINT listing_contacts_website CHECK (
    website IS NULL OR (char_length(website) <= 300 AND website ~ '^https?://[^[:space:]<>"{}]+$'));

ALTER TABLE public.listings
  ADD COLUMN public_locality text,
  ADD COLUMN public_latitude numeric(8,5),
  ADD COLUMN public_longitude numeric(8,5),
  ADD COLUMN public_location_approximate boolean NOT NULL DEFAULT false,
  ADD COLUMN show_service_area boolean NOT NULL DEFAULT false,
  ADD COLUMN cover_alt text NOT NULL DEFAULT '',
  ADD COLUMN hours_note text NOT NULL DEFAULT '';

ALTER TABLE public.listings
  ADD CONSTRAINT listings_cover_alt CHECK (char_length(cover_alt) <= 200),
  ADD CONSTRAINT listings_hours_note CHECK (char_length(hours_note) <= 300);

-- El trigger copia a listings.public_* solo lo autorizado. La dirección exacta se compone con los
-- campos estructurados si hay calle; si no, se usa la dirección libre de siempre. La ubicación
-- aproximada publica la localidad y coordenadas redondeadas a dos decimales (alrededor de 1 km).
CREATE OR REPLACE FUNCTION public.sync_public_contact()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_street text;
  v_locality text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.listings SET
      public_phone = NULL,
      public_phone_2 = NULL,
      public_whatsapp = NULL,
      public_address = NULL,
      public_email = NULL,
      public_website = NULL,
      public_linkedin = NULL,
      public_facebook = NULL,
      public_youtube = NULL,
      public_x_twitter = NULL,
      public_instagram = NULL,
      public_tiktok = NULL,
      public_locality = NULL,
      public_latitude = NULL,
      public_longitude = NULL,
      public_location_approximate = false
    WHERE id = OLD.listing_id;
    RETURN OLD;
  END IF;

  v_street := nullif(btrim(concat_ws(' ', nullif(btrim(NEW.street), ''), nullif(btrim(NEW.street_number), ''))), '');
  v_locality := nullif(btrim(concat_ws(' ', nullif(btrim(NEW.postal_code), ''), nullif(btrim(NEW.locality), ''))), '');

  UPDATE public.listings SET
    public_phone = CASE WHEN NEW.show_phone THEN NEW.phone END,
    public_phone_2 = CASE WHEN NEW.show_phone_2 THEN NEW.phone_2 END,
    public_whatsapp = CASE WHEN NEW.show_whatsapp THEN NEW.whatsapp END,
    public_address = CASE WHEN NEW.show_address THEN
      CASE WHEN v_street IS NOT NULL THEN concat_ws(', ', v_street, v_locality) ELSE NEW.address END END,
    public_email = CASE WHEN NEW.show_email THEN NEW.email END,
    public_website = CASE WHEN NEW.show_website THEN NEW.website END,
    public_linkedin = CASE WHEN NEW.show_linkedin THEN NEW.linkedin END,
    public_facebook = CASE WHEN NEW.show_facebook THEN NEW.facebook END,
    public_youtube = CASE WHEN NEW.show_youtube THEN NEW.youtube END,
    public_x_twitter = CASE WHEN NEW.show_x_twitter THEN NEW.x_twitter END,
    public_instagram = CASE WHEN NEW.show_instagram THEN NEW.instagram END,
    public_tiktok = CASE WHEN NEW.show_tiktok THEN NEW.tiktok END,
    public_locality = CASE WHEN NEW.show_address OR NEW.show_approximate_location THEN v_locality END,
    public_latitude = CASE WHEN NEW.show_address THEN NEW.latitude
      WHEN NEW.show_approximate_location THEN round(NEW.latitude, 2) END,
    public_longitude = CASE WHEN NEW.show_address THEN NEW.longitude
      WHEN NEW.show_approximate_location THEN round(NEW.longitude, 2) END,
    public_location_approximate = (NOT NEW.show_address AND NEW.show_approximate_location)
  WHERE id = NEW.listing_id;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.sync_public_contact() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_public_contact() TO service_role;

-- La web pasa a la parte privada. Las fichas sin fila de contacto reciben una que reproduce
-- exactamente lo que ya publicaban, para que el trigger no borre ningún dato público.
INSERT INTO public.listing_contacts AS lc (listing_id, phone, show_phone, phone_2, show_phone_2,
  whatsapp, show_whatsapp, address, show_address, email, show_email, linkedin, show_linkedin,
  facebook, show_facebook, youtube, show_youtube, x_twitter, show_x_twitter, instagram,
  show_instagram, tiktok, show_tiktok, website, show_website)
SELECT l.id, l.public_phone, l.public_phone IS NOT NULL, l.public_phone_2, l.public_phone_2 IS NOT NULL,
  l.public_whatsapp, l.public_whatsapp IS NOT NULL, l.public_address, l.public_address IS NOT NULL,
  l.public_email, l.public_email IS NOT NULL, l.public_linkedin, l.public_linkedin IS NOT NULL,
  l.public_facebook, l.public_facebook IS NOT NULL, l.public_youtube, l.public_youtube IS NOT NULL,
  l.public_x_twitter, l.public_x_twitter IS NOT NULL, l.public_instagram, l.public_instagram IS NOT NULL,
  l.public_tiktok, l.public_tiktok IS NOT NULL, l.public_website, true
FROM public.listings AS l
WHERE nullif(btrim(l.public_website), '') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.listing_contacts AS c WHERE c.listing_id = l.id);

UPDATE public.listing_contacts AS c SET website = l.public_website, show_website = true
FROM public.listings AS l
WHERE l.id = c.listing_id AND nullif(btrim(l.public_website), '') IS NOT NULL AND c.website IS NULL;

-- Vista pública: mismas columnas en el mismo orden y, al final, las nuevas.
-- El servicio a domicilio y la zona solo salen si la administración o el titular lo autorizan.
CREATE OR REPLACE VIEW public.public_listings WITH (security_barrier = true) AS
SELECT
  l.id,
  l.slug,
  l.type,
  l.name,
  l.short_description,
  l.description,
  l.category_id,
  l.activity,
  l.labels,
  l.cover_url,
  l.cover_path,
  l.gallery_urls,
  l.urgent_24h,
  l.public_phone,
  l.public_phone_2,
  l.public_whatsapp,
  l.public_address,
  l.public_email,
  l.public_website,
  l.public_linkedin,
  l.public_facebook,
  l.public_youtube,
  l.public_x_twitter,
  l.public_instagram,
  l.public_tiktok,
  (l.featured AND l.featured_until IS NOT NULL AND l.featured_until > now()) AS featured,
  ARRAY(
    SELECT t.tag
    FROM unnest(l.tags) WITH ORDINALITY AS t(tag, position)
    WHERE t.tag <> '__ocultar_horario'
    ORDER BY t.position
  ) AS tags,
  ('__ocultar_horario' = ANY (l.tags)) AS hours_hidden,
  COALESCE(
    (
      SELECT jsonb_object_agg(e.key, jsonb_build_object('content', e.value -> 'content'))
      FROM jsonb_each(CASE WHEN jsonb_typeof(l.translations) = 'object' THEN l.translations ELSE '{}'::jsonb END) AS e
      WHERE jsonb_typeof(e.value -> 'content') = 'object'
    ),
    '{}'::jsonb
  ) AS translations,
  l.public_locality,
  l.public_latitude,
  l.public_longitude,
  l.public_location_approximate,
  (l.show_service_area AND l.home_service) AS public_home_service,
  CASE WHEN l.show_service_area THEN l.service_area ELSE '' END AS public_service_area,
  l.cover_alt,
  CASE WHEN '__ocultar_horario' = ANY (l.tags) THEN '' ELSE l.hours_note END AS hours_note
FROM public.listings AS l
WHERE l.status = 'publicada'::public.listing_status;

REVOKE ALL ON public.public_listings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_listings TO anon, authenticated, service_role;

-- Periodos de horario: cierre o vacaciones (sin franjas: cerrado) y temporada (con sus franjas en
-- listing_hours.period_id). El horario habitual son las franjas sin periodo.
CREATE TABLE public.listing_hour_periods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  kind text NOT NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  label text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listing_hour_periods_pkey PRIMARY KEY (id),
  CONSTRAINT listing_hour_periods_id_listing_key UNIQUE (id, listing_id),
  CONSTRAINT listing_hour_periods_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE,
  CONSTRAINT listing_hour_periods_kind CHECK (kind IN ('cierre', 'vacaciones', 'temporada')),
  CONSTRAINT listing_hour_periods_dates CHECK (ends_on >= starts_on AND ends_on - starts_on <= 366),
  CONSTRAINT listing_hour_periods_label CHECK (char_length(label) <= 80 AND label !~ '[<>{}[:cntrl:]]')
);
CREATE INDEX listing_hour_periods_listing_idx ON public.listing_hour_periods USING btree (listing_id);

ALTER TABLE public.listing_hours ADD COLUMN period_id uuid;
ALTER TABLE public.listing_hours ADD CONSTRAINT listing_hours_period_fkey
  FOREIGN KEY (period_id, listing_id) REFERENCES public.listing_hour_periods(id, listing_id) ON DELETE CASCADE;

REVOKE ALL ON public.listing_hour_periods FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.listing_hour_periods TO service_role;
GRANT SELECT ON public.listing_hour_periods TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_hour_periods TO authenticated;
ALTER TABLE public.listing_hour_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage hour periods" ON public.listing_hour_periods AS PERMISSIVE FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Public reads visible hour periods of published" ON public.listing_hour_periods AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.public_listings AS l WHERE l.id = listing_hour_periods.listing_id AND NOT l.hours_hidden));

-- Guardado del administrador: misma transacción y mismo control de versión que antes, con los
-- campos nuevos. p_periods NULL deja los periodos como están (formularios antiguos).
DROP FUNCTION public.save_listing(jsonb, jsonb, jsonb, uuid[], uuid, timestamp with time zone);
CREATE FUNCTION public.save_listing(
  p_listing jsonb,
  p_contact jsonb,
  p_hours jsonb,
  p_activity_ids uuid[],
  p_id uuid DEFAULT NULL,
  p_expected_updated_at timestamp with time zone DEFAULT NULL,
  p_periods jsonb DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  r public.listings;
  c public.listing_contacts;
  v_id uuid;
  v_period uuid;
  p jsonb;
  v_sort integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo la administración puede guardar fichas' USING ERRCODE = '42501';
  END IF;
  r := jsonb_populate_record(NULL::public.listings, p_listing);
  c := jsonb_populate_record(NULL::public.listing_contacts, coalesce(p_contact, '{}'::jsonb));

  IF p_id IS NULL THEN
    INSERT INTO public.listings (type, category_id, activity, labels, name, slug, short_description,
      description, tags, translations, featured, featured_until, urgent_24h, status,
      home_service, service_area, show_service_area, cover_alt, hours_note)
    VALUES (r.type, r.category_id, r.activity, coalesce(r.labels, '{}'), r.name, r.slug,
      coalesce(r.short_description, ''), coalesce(r.description, ''), coalesce(r.tags, '{}'),
      coalesce(r.translations, '{}'::jsonb), coalesce(r.featured, false), r.featured_until,
      coalesce(r.urgent_24h, false), coalesce(r.status, 'borrador'),
      coalesce(r.home_service, false), coalesce(r.service_area, ''),
      coalesce(r.show_service_area, false), coalesce(r.cover_alt, ''), coalesce(r.hours_note, ''))
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.listings AS l SET
      type = r.type,
      category_id = r.category_id,
      activity = r.activity,
      labels = coalesce(r.labels, '{}'),
      name = r.name,
      slug = r.slug,
      short_description = coalesce(r.short_description, ''),
      description = coalesce(r.description, ''),
      tags = coalesce(r.tags, '{}'),
      translations = coalesce(r.translations, '{}'::jsonb),
      featured = coalesce(r.featured, false),
      featured_until = r.featured_until,
      urgent_24h = coalesce(r.urgent_24h, false),
      status = coalesce(r.status, l.status),
      home_service = coalesce(r.home_service, false),
      service_area = coalesce(r.service_area, ''),
      show_service_area = CASE WHEN p_listing ? 'show_service_area' THEN coalesce(r.show_service_area, false) ELSE l.show_service_area END,
      cover_alt = CASE WHEN p_listing ? 'cover_alt' THEN coalesce(r.cover_alt, '') ELSE l.cover_alt END,
      hours_note = CASE WHEN p_listing ? 'hours_note' THEN coalesce(r.hours_note, '') ELSE l.hours_note END
    WHERE l.id = p_id AND l.updated_at = p_expected_updated_at
    RETURNING l.id INTO v_id;
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'La ficha ha cambiado desde que se abrió el formulario'
        USING ERRCODE = 'PT409', HINT = 'listing_changed';
    END IF;
  END IF;

  INSERT INTO public.listing_contacts AS lc (listing_id, phone, phone_2, whatsapp, address, email,
    linkedin, facebook, youtube, x_twitter, instagram, tiktok, show_phone, show_phone_2,
    show_whatsapp, show_address, show_email, show_linkedin, show_facebook, show_youtube,
    show_x_twitter, show_instagram, show_tiktok, owner_name, owner_contact, street, street_number,
    postal_code, locality, latitude, longitude, show_approximate_location, website, show_website)
  VALUES (v_id, c.phone, c.phone_2, c.whatsapp, c.address, c.email, c.linkedin, c.facebook,
    c.youtube, c.x_twitter, c.instagram, c.tiktok, coalesce(c.show_phone, false),
    coalesce(c.show_phone_2, false), coalesce(c.show_whatsapp, false),
    coalesce(c.show_address, false), coalesce(c.show_email, false),
    coalesce(c.show_linkedin, false), coalesce(c.show_facebook, false),
    coalesce(c.show_youtube, false), coalesce(c.show_x_twitter, false),
    coalesce(c.show_instagram, false), coalesce(c.show_tiktok, false), c.owner_name,
    c.owner_contact, c.street, c.street_number, c.postal_code, c.locality, c.latitude, c.longitude,
    coalesce(c.show_approximate_location, false), c.website, coalesce(c.show_website, false))
  ON CONFLICT (listing_id) DO UPDATE SET
    phone = EXCLUDED.phone, phone_2 = EXCLUDED.phone_2, whatsapp = EXCLUDED.whatsapp,
    address = EXCLUDED.address, email = EXCLUDED.email, linkedin = EXCLUDED.linkedin,
    facebook = EXCLUDED.facebook, youtube = EXCLUDED.youtube, x_twitter = EXCLUDED.x_twitter,
    instagram = EXCLUDED.instagram, tiktok = EXCLUDED.tiktok, show_phone = EXCLUDED.show_phone,
    show_phone_2 = EXCLUDED.show_phone_2, show_whatsapp = EXCLUDED.show_whatsapp,
    show_address = EXCLUDED.show_address, show_email = EXCLUDED.show_email,
    show_linkedin = EXCLUDED.show_linkedin, show_facebook = EXCLUDED.show_facebook,
    show_youtube = EXCLUDED.show_youtube, show_x_twitter = EXCLUDED.show_x_twitter,
    show_instagram = EXCLUDED.show_instagram, show_tiktok = EXCLUDED.show_tiktok,
    owner_name = EXCLUDED.owner_name, owner_contact = EXCLUDED.owner_contact,
    street = CASE WHEN p_contact ? 'street' THEN EXCLUDED.street ELSE lc.street END,
    street_number = CASE WHEN p_contact ? 'street_number' THEN EXCLUDED.street_number ELSE lc.street_number END,
    postal_code = CASE WHEN p_contact ? 'postal_code' THEN EXCLUDED.postal_code ELSE lc.postal_code END,
    locality = CASE WHEN p_contact ? 'locality' THEN EXCLUDED.locality ELSE lc.locality END,
    latitude = CASE WHEN p_contact ? 'latitude' THEN EXCLUDED.latitude ELSE lc.latitude END,
    longitude = CASE WHEN p_contact ? 'longitude' THEN EXCLUDED.longitude ELSE lc.longitude END,
    show_approximate_location = CASE WHEN p_contact ? 'show_approximate_location'
      THEN EXCLUDED.show_approximate_location ELSE lc.show_approximate_location END,
    website = CASE WHEN p_contact ? 'website' THEN EXCLUDED.website ELSE lc.website END,
    show_website = CASE WHEN p_contact ? 'show_website' THEN EXCLUDED.show_website ELSE lc.show_website END;

  -- Horario habitual: franjas sin periodo.
  DELETE FROM public.listing_hours AS h WHERE h.listing_id = v_id AND h.period_id IS NULL;
  INSERT INTO public.listing_hours (listing_id, weekday, opens, closes)
  SELECT v_id, h.weekday, h.opens, h.closes
  FROM jsonb_populate_recordset(NULL::public.listing_hours, coalesce(p_hours, '[]'::jsonb)) AS h;

  IF p_periods IS NOT NULL THEN
    IF jsonb_typeof(p_periods) <> 'array' OR jsonb_array_length(p_periods) > 20 THEN
      RAISE EXCEPTION 'Periodos de horario no válidos' USING ERRCODE = '22023';
    END IF;
    DELETE FROM public.listing_hour_periods AS hp WHERE hp.listing_id = v_id;
    FOR p IN SELECT value FROM jsonb_array_elements(p_periods) LOOP
      IF coalesce(p ->> 'kind', '') <> 'temporada'
        AND jsonb_array_length(coalesce(p -> 'hours', '[]'::jsonb)) > 0 THEN
        RAISE EXCEPTION 'Un cierre o unas vacaciones no llevan franjas horarias' USING ERRCODE = '22023';
      END IF;
      INSERT INTO public.listing_hour_periods (listing_id, kind, starts_on, ends_on, label, sort_order)
      VALUES (v_id, p ->> 'kind', (p ->> 'starts_on')::date, (p ->> 'ends_on')::date,
        coalesce(p ->> 'label', ''), v_sort)
      RETURNING id INTO v_period;
      INSERT INTO public.listing_hours (listing_id, weekday, opens, closes, period_id)
      SELECT v_id, h.weekday, h.opens, h.closes, v_period
      FROM jsonb_populate_recordset(NULL::public.listing_hours, coalesce(p -> 'hours', '[]'::jsonb)) AS h;
      v_sort := v_sort + 1;
    END LOOP;
  END IF;

  DELETE FROM public.listing_activities AS a WHERE a.listing_id = v_id;
  INSERT INTO public.listing_activities (listing_id, activity_id, sort_order)
  SELECT v_id, a.activity_id, (a.n - 1)::integer
  FROM unnest(coalesce(p_activity_ids, '{}'::uuid[])) WITH ORDINALITY AS a(activity_id, n);

  RETURN jsonb_build_object('id', v_id,
    'updated_at', (SELECT l.updated_at FROM public.listings AS l WHERE l.id = v_id));
END;
$function$;
REVOKE ALL ON FUNCTION public.save_listing(jsonb, jsonb, jsonb, uuid[], uuid, timestamp with time zone, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_listing(jsonb, jsonb, jsonb, uuid[], uuid, timestamp with time zone, jsonb) TO authenticated;
NOTIFY pgrst, 'reload schema';
-- <<< listing_details
