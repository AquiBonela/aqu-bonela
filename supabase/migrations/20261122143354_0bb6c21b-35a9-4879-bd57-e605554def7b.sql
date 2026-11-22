CREATE POLICY "Admins manage procedure images" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'procedure-images' AND public.has_role(auth.uid(), 'admin')) WITH CHECK (bucket_id = 'procedure-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Visitors read referenced published procedure images" ON storage.objects FOR SELECT TO anon, authenticated USING (
 bucket_id = 'procedure-images' AND EXISTS (
 SELECT 1 FROM public.procedures p JOIN public.procedure_categories c ON c.id = p.category_id
 CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(p.content->'sections') = 'array' THEN p.content->'sections' ELSE '[]'::jsonb END) s
 CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(s->'elements') = 'array' THEN s->'elements' ELSE '[]'::jsonb END) e
 WHERE p.status = 'publicada' AND c.visible AND COALESCE(p.visibility->>'deleted', 'false') <> 'true' AND COALESCE(s->>'visible', 'true') <> 'false' AND e->>'kind' = 'image' AND e->>'storagePath' = storage.objects.name
 ));