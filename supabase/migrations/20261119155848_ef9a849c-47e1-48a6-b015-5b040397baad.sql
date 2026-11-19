DROP POLICY IF EXISTS "Anyone reads activities" ON public.activities;
CREATE POLICY "Public reads activities of active categories" ON public.activities
FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.category_id = activities.category_id AND l.status = 'publicada'::listing_status));

DROP POLICY IF EXISTS "Public reads cover of published listings" ON storage.objects;
CREATE POLICY "Public reads cover of published listings" ON storage.objects
FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'listing-photos'
  AND EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.cover_path = objects.name
      AND (storage.foldername(objects.name))[1] = l.id::text
      AND l.status = 'publicada'::listing_status
  )
);