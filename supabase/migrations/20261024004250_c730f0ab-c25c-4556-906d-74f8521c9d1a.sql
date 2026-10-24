CREATE POLICY "Public reads photos of published listings" ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'listing-photos' AND EXISTS (
  SELECT 1 FROM public.listing_photos p JOIN public.listings l ON l.id = p.listing_id
  WHERE p.storage_path = storage.objects.name AND l.status = 'publicada'));
CREATE POLICY "Admins read listing photos" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'listing-photos' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins upload listing photos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'listing-photos' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update listing photos" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'listing-photos' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete listing photos" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'listing-photos' AND public.has_role(auth.uid(),'admin'));