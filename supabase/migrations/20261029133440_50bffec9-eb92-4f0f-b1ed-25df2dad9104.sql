ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS short_description text NOT NULL DEFAULT '';
UPDATE public.listings SET short_description = left(split_part(description, '. ', 1), 140) WHERE short_description = '';
UPDATE public.listings SET description = description || ' Atención cercana y personalizada, con el trato de siempre de un negocio de Casarabonela. Consulta horarios y datos de contacto en esta ficha o acércate a conocernos.' WHERE length(description) < 220;

CREATE TABLE public.site_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  hero_title text NOT NULL DEFAULT 'Todo lo que necesitas, en tu pueblo',
  hero_subtitle text NOT NULL DEFAULT 'Comercios y profesionales de Casarabonela',
  contact_email text NOT NULL DEFAULT '',
  admin_whatsapp text NOT NULL DEFAULT '',
  collaborator_months integer NOT NULL DEFAULT 1 CHECK (collaborator_months BETWEEN 1 AND 24),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT INSERT, UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage settings" ON public.site_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER site_settings_updated BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.site_settings (id) VALUES (true);