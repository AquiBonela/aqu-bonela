CREATE TABLE public.procedure_categories (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 title text NOT NULL CHECK (length(trim(title)) > 0),
 description text NOT NULL DEFAULT '',
 title_en text NOT NULL DEFAULT '',
 description_en text NOT NULL DEFAULT '',
 sort_order integer NOT NULL DEFAULT 0,
 visible boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.procedure_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.procedure_categories TO authenticated;
GRANT ALL ON public.procedure_categories TO service_role;
ALTER TABLE public.procedure_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage procedure categories" ON public.procedure_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public reads visible procedure categories" ON public.procedure_categories FOR SELECT TO anon, authenticated USING (visible);
CREATE TRIGGER procedure_categories_updated BEFORE UPDATE ON public.procedure_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.procedures (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 category_id uuid NOT NULL REFERENCES public.procedure_categories(id) ON DELETE RESTRICT,
 slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 title text NOT NULL CHECK (length(trim(title)) > 0),
 summary text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'borrador' CHECK (status IN ('borrador', 'publicada')),
 content jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(content) = 'object'),
 content_en jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(content_en) = 'object'),
 visibility jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(visibility) = 'object'),
 sort_order integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(category_id, slug)
);
GRANT SELECT ON public.procedures TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.procedures TO authenticated;
GRANT ALL ON public.procedures TO service_role;
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage procedures" ON public.procedures FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public reads published procedures in visible categories" ON public.procedures FOR SELECT TO anon, authenticated USING (status = 'publicada' AND EXISTS (SELECT 1 FROM public.procedure_categories c WHERE c.id = procedures.category_id AND c.visible));
CREATE INDEX procedures_category_status_order ON public.procedures(category_id, status, sort_order);
CREATE TRIGGER procedures_updated BEFORE UPDATE ON public.procedures FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.procedure_categories (slug,title,description,title_en,description_en,sort_order) VALUES
('documentacion','Documentación personal','NIE, TIE, DNI, certificado digital, Cl@ve y empadronamiento.','Personal documentation','NIE, TIE, DNI, digital certificate, Cl@ve and town registration.',0),
('salud','Salud','Tarjeta sanitaria, médico de cabecera, tarjeta sanitaria europea y ClicSalud+.','Health','Health card, GP, European Health Insurance Card and ClicSalud+.',1),
('trabajo','Trabajo y Seguridad Social','Número de Seguridad Social, demanda de empleo, vida laboral y prestaciones.','Work and Social Security','Social Security number, job seeker registration, employment history and benefits.',2),
('familia','Familia y ayudas','Dependencia, discapacidad, ayudas familiares, becas y ayudas al alquiler.','Family and support','Dependency, disability, family support, grants and rent aid.',3),
('vehiculos','Vehículos y transporte','Renovación del carnet, cambio de titularidad, multas y documentación del vehículo.','Vehicles and transport','Driving licence renewal, ownership transfer, fines and vehicle documents.',4),
('municipales','Gestiones municipales','Licencias de obras, instancias, certificados municipales y sede electrónica.','Town hall procedures','Building permits, applications, municipal certificates and e-office.',5);