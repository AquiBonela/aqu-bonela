DROP POLICY IF EXISTS "Anyone reads settings" ON public.site_settings;
CREATE POLICY "Visitors read public settings" ON public.site_settings FOR SELECT TO anon USING (id = true);
REVOKE SELECT ON public.site_settings FROM anon;
GRANT SELECT (id, hero_title, hero_subtitle, collaborator_months, updated_at) ON public.site_settings TO anon;