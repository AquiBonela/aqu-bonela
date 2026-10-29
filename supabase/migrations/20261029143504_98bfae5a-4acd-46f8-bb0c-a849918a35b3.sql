ALTER TABLE public.site_settings
  ADD COLUMN legal_name text NOT NULL DEFAULT '',
  ADD COLUMN legal_nif text NOT NULL DEFAULT '',
  ADD COLUMN legal_address text NOT NULL DEFAULT '',
  ADD COLUMN legal_email text NOT NULL DEFAULT '',
  ADD COLUMN whatsapp_template text NOT NULL DEFAULT 'Hola {nombre}: este es tu enlace privado para revisar y autorizar la publicación de tu ficha en Aquí Bonela (válido 30 días): {enlace}',
  ADD COLUMN banner_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN banner_text text NOT NULL DEFAULT '',
  ADD COLUMN common_labels text[] NOT NULL DEFAULT ARRAY['Pago con tarjeta','A domicilio','Accesible','Terraza','Aparcamiento','Productos locales']::text[];
GRANT SELECT (legal_name, legal_nif, legal_address, legal_email, banner_enabled, banner_text) ON public.site_settings TO anon;