-- Vuelta atrás de 20261201091000_listing_details.sql.
-- Restaura save_listing, sync_public_contact, la vista public_listings y sus políticas como estaban
-- (definiciones copiadas literalmente de supabase/template/01_schema.sql de la versión anterior) y
-- quita la tabla de periodos y las columnas añadidas.
-- Pérdida de datos inevitable: los periodos de horario y sus franjas de temporada, la dirección
-- estructurada, las coordenadas, los permisos nuevos y los textos de portada y horario.
-- La web ya copiada a listings.public_website se conserva: el guardado anterior la escribe ahí.

DROP FUNCTION IF EXISTS public.save_listing(jsonb, jsonb, jsonb, uuid[], uuid, timestamp with time zone, jsonb);
CREATE OR REPLACE FUNCTION public.save_listing(
  p_listing jsonb,
  p_contact jsonb,
  p_hours jsonb,
  p_activity_ids uuid[],
  p_id uuid DEFAULT NULL,
  p_expected_updated_at timestamp with time zone DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  r public.listings;
  c public.listing_contacts;
  v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo la administración puede guardar fichas' USING ERRCODE = '42501';
  END IF;
  r := jsonb_populate_record(NULL::public.listings, p_listing);
  c := jsonb_populate_record(NULL::public.listing_contacts, coalesce(p_contact, '{}'::jsonb));

  IF p_id IS NULL THEN
    INSERT INTO public.listings (type, category_id, activity, labels, name, slug, short_description,
      description, tags, translations, featured, featured_until, urgent_24h, status, public_website,
      home_service, service_area)
    VALUES (r.type, r.category_id, r.activity, coalesce(r.labels, '{}'), r.name, r.slug,
      coalesce(r.short_description, ''), coalesce(r.description, ''), coalesce(r.tags, '{}'),
      coalesce(r.translations, '{}'::jsonb), coalesce(r.featured, false), r.featured_until,
      coalesce(r.urgent_24h, false), coalesce(r.status, 'borrador'), r.public_website,
      coalesce(r.home_service, false), coalesce(r.service_area, ''))
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
      public_website = r.public_website,
      home_service = coalesce(r.home_service, false),
      service_area = coalesce(r.service_area, '')
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
    show_x_twitter, show_instagram, show_tiktok, owner_name, owner_contact)
  VALUES (v_id, c.phone, c.phone_2, c.whatsapp, c.address, c.email, c.linkedin, c.facebook,
    c.youtube, c.x_twitter, c.instagram, c.tiktok, coalesce(c.show_phone, false),
    coalesce(c.show_phone_2, false), coalesce(c.show_whatsapp, false),
    coalesce(c.show_address, false), coalesce(c.show_email, false),
    coalesce(c.show_linkedin, false), coalesce(c.show_facebook, false),
    coalesce(c.show_youtube, false), coalesce(c.show_x_twitter, false),
    coalesce(c.show_instagram, false), coalesce(c.show_tiktok, false), c.owner_name,
    c.owner_contact)
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
    owner_name = EXCLUDED.owner_name, owner_contact = EXCLUDED.owner_contact;

  DELETE FROM public.listing_hours AS h WHERE h.listing_id = v_id;
  INSERT INTO public.listing_hours (listing_id, weekday, opens, closes)
  SELECT v_id, h.weekday, h.opens, h.closes
  FROM jsonb_populate_recordset(NULL::public.listing_hours, coalesce(p_hours, '[]'::jsonb)) AS h;

  DELETE FROM public.listing_activities AS a WHERE a.listing_id = v_id;
  INSERT INTO public.listing_activities (listing_id, activity_id, sort_order)
  SELECT v_id, a.activity_id, (a.n - 1)::integer
  FROM unnest(coalesce(p_activity_ids, '{}'::uuid[])) WITH ORDINALITY AS a(activity_id, n);

  RETURN jsonb_build_object('id', v_id,
    'updated_at', (SELECT l.updated_at FROM public.listings AS l WHERE l.id = v_id));
END;
$function$;
REVOKE ALL ON FUNCTION public.save_listing(jsonb, jsonb, jsonb, uuid[], uuid, timestamp with time zone) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_listing(jsonb, jsonb, jsonb, uuid[], uuid, timestamp with time zone) TO authenticated;

-- La vista depende de las columnas nuevas: se elimina con sus políticas y se recrea después.
DROP VIEW public.public_listings CASCADE;

DELETE FROM public.listing_hours WHERE period_id IS NOT NULL;
ALTER TABLE public.listing_hours DROP CONSTRAINT IF EXISTS listing_hours_period_fkey;
ALTER TABLE public.listing_hours DROP COLUMN IF EXISTS period_id;
DROP TABLE IF EXISTS public.listing_hour_periods;

CREATE OR REPLACE FUNCTION public.sync_public_contact()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.listings SET
      public_phone = NULL,
      public_phone_2 = NULL,
      public_whatsapp = NULL,
      public_address = NULL,
      public_email = NULL,
      public_linkedin = NULL,
      public_facebook = NULL,
      public_youtube = NULL,
      public_x_twitter = NULL,
      public_instagram = NULL,
      public_tiktok = NULL
    WHERE id = OLD.listing_id;
    RETURN OLD;
  END IF;

  UPDATE public.listings SET
    public_phone = CASE WHEN NEW.show_phone THEN NEW.phone END,
    public_phone_2 = CASE WHEN NEW.show_phone_2 THEN NEW.phone_2 END,
    public_whatsapp = CASE WHEN NEW.show_whatsapp THEN NEW.whatsapp END,
    public_address = CASE WHEN NEW.show_address THEN NEW.address END,
    public_email = CASE WHEN NEW.show_email THEN NEW.email END,
    public_linkedin = CASE WHEN NEW.show_linkedin THEN NEW.linkedin END,
    public_facebook = CASE WHEN NEW.show_facebook THEN NEW.facebook END,
    public_youtube = CASE WHEN NEW.show_youtube THEN NEW.youtube END,
    public_x_twitter = CASE WHEN NEW.show_x_twitter THEN NEW.x_twitter END,
    public_instagram = CASE WHEN NEW.show_instagram THEN NEW.instagram END,
    public_tiktok = CASE WHEN NEW.show_tiktok THEN NEW.tiktok END
  WHERE id = NEW.listing_id;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.sync_public_contact() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_public_contact() TO service_role;

ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS listings_hours_note,
  DROP CONSTRAINT IF EXISTS listings_cover_alt,
  DROP COLUMN IF EXISTS hours_note,
  DROP COLUMN IF EXISTS cover_alt,
  DROP COLUMN IF EXISTS show_service_area,
  DROP COLUMN IF EXISTS public_location_approximate,
  DROP COLUMN IF EXISTS public_longitude,
  DROP COLUMN IF EXISTS public_latitude,
  DROP COLUMN IF EXISTS public_locality;

ALTER TABLE public.listing_contacts
  DROP CONSTRAINT IF EXISTS listing_contacts_website,
  DROP CONSTRAINT IF EXISTS listing_contacts_coordinates,
  DROP CONSTRAINT IF EXISTS listing_contacts_address_parts,
  DROP COLUMN IF EXISTS show_website,
  DROP COLUMN IF EXISTS website,
  DROP COLUMN IF EXISTS show_approximate_location,
  DROP COLUMN IF EXISTS longitude,
  DROP COLUMN IF EXISTS latitude,
  DROP COLUMN IF EXISTS locality,
  DROP COLUMN IF EXISTS postal_code,
  DROP COLUMN IF EXISTS street_number,
  DROP COLUMN IF EXISTS street;

-- Vista y políticas anteriores (bloque directory_public_view).
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
  -- Destacada ahora mismo: la fecha de caducidad no sale de la base.
  (l.featured AND l.featured_until IS NOT NULL AND l.featured_until > now()) AS featured,
  -- Palabras de búsqueda y distinciones, sin la marca reservada de horario oculto.
  ARRAY(
    SELECT t.tag
    FROM unnest(l.tags) WITH ORDINALITY AS t(tag, position)
    WHERE t.tag <> '__ocultar_horario'
    ORDER BY t.position
  ) AS tags,
  ('__ocultar_horario' = ANY (l.tags)) AS hours_hidden,
  -- Solo el texto traducido de cada idioma, sin texto origen, correcciones ni glosario.
  COALESCE(
    (
      SELECT jsonb_object_agg(e.key, jsonb_build_object('content', e.value -> 'content'))
      FROM jsonb_each(CASE WHEN jsonb_typeof(l.translations) = 'object' THEN l.translations ELSE '{}'::jsonb END) AS e
      WHERE jsonb_typeof(e.value -> 'content') = 'object'
    ),
    '{}'::jsonb
  ) AS translations
FROM public.listings AS l
WHERE l.status = 'publicada'::public.listing_status;

REVOKE ALL ON public.public_listings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_listings TO anon, authenticated, service_role;

-- 2. Sin lectura directa de listings para visitantes ni para usuarios sin rol.
--    El administrador conserva "Admins manage listings".
DROP POLICY IF EXISTS "Public reads published listings" ON public.listings;
REVOKE SELECT ON public.listings FROM anon;

-- Defensa adicional: RLS ya impedía a los visitantes escribir en las tablas de fichas;
-- además se retiran esos permisos. Conservan solo la lectura que la web necesita.
-- authenticated no cambia: el panel de administración los usa y RLS los limita al rol admin.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.listings, public.listing_hours, public.listing_photos, public.listing_activities FROM anon;

-- 3. Políticas que comprobaban listings: ahora comprueban la vista pública.
DROP POLICY IF EXISTS "Public reads activities of active categories" ON public.activities;
CREATE POLICY "Public reads activities of active categories" ON public.activities AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.public_listings AS l WHERE l.category_id = activities.category_id));

DROP POLICY IF EXISTS "Public reads activities of published" ON public.listing_activities;
CREATE POLICY "Public reads activities of published" ON public.listing_activities AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.public_listings AS l WHERE l.id = listing_activities.listing_id));

-- El horario que el titular ocultó deja de ser legible.
DROP POLICY IF EXISTS "Public reads hours of published" ON public.listing_hours;
DROP POLICY IF EXISTS "Public reads visible hours of published" ON public.listing_hours;
CREATE POLICY "Public reads visible hours of published" ON public.listing_hours AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.public_listings AS l WHERE l.id = listing_hours.listing_id AND NOT l.hours_hidden));

DROP POLICY IF EXISTS "Public reads photos of published" ON public.listing_photos;
CREATE POLICY "Public reads photos of published" ON public.listing_photos AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.public_listings AS l WHERE l.id = listing_photos.listing_id));

DROP POLICY IF EXISTS "Public reads cover of published listings" ON storage.objects;
CREATE POLICY "Public reads cover of published listings" ON storage.objects AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'listing-photos'::text
    AND EXISTS (
      SELECT 1 FROM public.public_listings AS l
      WHERE l.cover_path = objects.name AND (storage.foldername(objects.name))[1] = l.id::text
    )
  );

DROP POLICY IF EXISTS "Public reads photos of published listings" ON storage.objects;
CREATE POLICY "Public reads photos of published listings" ON storage.objects AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'listing-photos'::text
    AND EXISTS (
      SELECT 1 FROM public.listing_photos AS p
      JOIN public.public_listings AS l ON l.id = p.listing_id
      WHERE p.storage_path = objects.name
    )
  );
NOTIFY pgrst, 'reload schema';
