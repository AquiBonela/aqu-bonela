-- Privacidad del Directorio (etapa 1, tarea 1.3).
-- Los visitantes leen las fichas publicadas a través de public.public_listings, sin
-- columnas internas, y no reciben los horarios que el titular ocultó.
-- No cambia tablas, columnas ni estados de fichas. El administrador sigue leyendo y
-- escribiendo listings con su política propia; el enlace de revisión usa la clave de servicio.
-- >>> directory_public_view (bloque idéntico en supabase/template/01_schema.sql; lo comprueba src/lib/directory-public-view-sql.test.ts)

-- 1. Vista pública: solo fichas publicadas y solo lo que la web muestra o necesita para buscar.
--    Fuera: featured_until, fechas internas, home_service, service_area, status y la memoria
--    editorial de las traducciones. La vista se ejecuta con los permisos de su propietario,
--    así que no necesita que el visitante pueda leer la tabla.
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
-- <<< directory_public_view

-- La API (PostgREST) recarga su esquema para ofrecer la vista nueva sin esperar.
NOTIFY pgrst, 'reload schema';
