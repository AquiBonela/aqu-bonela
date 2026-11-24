REVOKE INSERT ON TABLE public.suggestions FROM anon, authenticated;
REVOKE INSERT ON TABLE public.listing_reports FROM anon, authenticated;
DROP POLICY IF EXISTS "Anyone can suggest a business" ON public.suggestions;
DROP POLICY IF EXISTS "Anyone can report a published listing" ON public.listing_reports;