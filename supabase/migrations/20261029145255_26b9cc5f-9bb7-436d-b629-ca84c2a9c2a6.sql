ALTER TABLE public.listings ADD COLUMN cover_path text;
CREATE POLICY "Public reads cover of published listings" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'listing-photos' AND EXISTS (SELECT 1 FROM public.listings l WHERE l.cover_path = storage.objects.name AND l.status = 'publicada'));