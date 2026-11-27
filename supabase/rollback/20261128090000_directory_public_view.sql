-- Deshace supabase/migrations/20261128090000_directory_public_view.sql.
-- Solo para volver atrás si algo falla. Restaura exactamente las políticas y permisos anteriores
-- (los de supabase/template/01_schema.sql en main antes de la migración). No toca datos.
-- Después, la web debe volver al código anterior, que lee listings directamente.
-- El CI lo prueba: aplica la migración, este script y la verificación anterior (04_verify de main).

DROP POLICY IF EXISTS "Public reads activities of active categories" ON public.activities;
CREATE POLICY "Public reads activities of active categories" ON public.activities AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.listings AS l
    WHERE l.category_id = activities.category_id AND l.status = 'publicada'::public.listing_status));

DROP POLICY IF EXISTS "Public reads activities of published" ON public.listing_activities;
CREATE POLICY "Public reads activities of published" ON public.listing_activities AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.listings AS l
    WHERE l.id = listing_activities.listing_id AND l.status = 'publicada'::public.listing_status));

DROP POLICY IF EXISTS "Public reads visible hours of published" ON public.listing_hours;
DROP POLICY IF EXISTS "Public reads hours of published" ON public.listing_hours;
CREATE POLICY "Public reads hours of published" ON public.listing_hours AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.listings AS l
    WHERE l.id = listing_hours.listing_id AND l.status = 'publicada'::public.listing_status));

DROP POLICY IF EXISTS "Public reads photos of published" ON public.listing_photos;
CREATE POLICY "Public reads photos of published" ON public.listing_photos AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.listings AS l
    WHERE l.id = listing_photos.listing_id AND l.status = 'publicada'::public.listing_status));

DROP POLICY IF EXISTS "Public reads cover of published listings" ON storage.objects;
CREATE POLICY "Public reads cover of published listings" ON storage.objects AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (bucket_id = 'listing-photos'::text AND EXISTS (SELECT 1 FROM public.listings AS l
    WHERE l.cover_path = objects.name AND (storage.foldername(objects.name))[1] = l.id::text
      AND l.status = 'publicada'::public.listing_status));

DROP POLICY IF EXISTS "Public reads photos of published listings" ON storage.objects;
CREATE POLICY "Public reads photos of published listings" ON storage.objects AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (bucket_id = 'listing-photos'::text AND EXISTS (SELECT 1 FROM public.listing_photos AS p
    JOIN public.listings AS l ON l.id = p.listing_id
    WHERE p.storage_path = objects.name AND l.status = 'publicada'::public.listing_status));

GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER
  ON public.listings, public.listing_hours, public.listing_photos, public.listing_activities TO anon;
DROP POLICY IF EXISTS "Public reads published listings" ON public.listings;
CREATE POLICY "Public reads published listings" ON public.listings AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (status = 'publicada'::public.listing_status);

DROP VIEW IF EXISTS public.public_listings;

-- La API recarga su esquema para dejar de ofrecer la vista.
NOTIFY pgrst, 'reload schema';
