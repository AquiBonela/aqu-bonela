ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS activity text,
  ADD COLUMN IF NOT EXISTS labels text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS gallery_urls text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.listings ADD CONSTRAINT listings_labels_max CHECK (cardinality(labels) <= 3);
ALTER TABLE public.listings ADD CONSTRAINT listings_gallery_max CHECK (cardinality(gallery_urls) <= 5);

CREATE TABLE public.listing_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  message text NOT NULL CHECK (char_length(message) BETWEEN 5 AND 1000),
  contact text CHECK (contact IS NULL OR char_length(contact) <= 120),
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.listing_reports TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.listing_reports TO authenticated;
GRANT ALL ON public.listing_reports TO service_role;
ALTER TABLE public.listing_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can report a published listing" ON public.listing_reports
  FOR INSERT TO anon, authenticated
  WITH CHECK (resolved = false AND EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.status = 'publicada'));
CREATE POLICY "Admins read reports" ON public.listing_reports FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update reports" ON public.listing_reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete reports" ON public.listing_reports FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Datos de prueba: oficio, etiquetas visibles e imágenes
UPDATE public.listings l SET activity = v.activity, labels = v.labels,
  cover_url = 'https://loremflickr.com/960/600/' || v.kw || '?lock=' || v.n
FROM (VALUES
 ('carniceria-hermanos-ruiz','Carnicería',ARRAY['Embutidos caseros','Chacina','Encargos'],'butcher',1),
 ('fruteria-la-huerta','Frutería',ARRAY['Producto local','Ecológico','Temporada'],'fruit,market',2),
 ('panaderia-el-horno','Panadería',ARRAY['Molletes','Bollería','Horno de leña'],'bakery,bread',3),
 ('pescaderia-el-puerto','Pescadería',ARRAY['Pescado fresco','Marisco','Encargos'],'fish,market',4),
 ('ultramarinos-dona-carmen','Ultramarinos',ARRAY['Aceite de oliva','Quesos','Conservas'],'grocery',5),
 ('bar-la-plaza','Bar de tapas',ARRAY['Desayunos','Terraza','Tapas'],'tapas,bar',6),
 ('cafeteria-dulce-rincon','Cafetería',ARRAY['Tartas caseras','Meriendas','Café'],'cafe,coffee',7),
 ('restaurante-el-mirador','Restaurante',ARRAY['Menú del día','Vistas','Celebraciones'],'restaurant',8),
 ('venta-los-pinos','Venta',ARRAY['Brasa','Comida casera','Familias'],'grill,food',9),
 ('barberia-el-tijeras','Barbería',ARRAY['Arreglo de barba','Corte clásico','Sin cita'],'barber',10),
 ('estetica-lucia','Esteticista',ARRAY['Manicura','Depilación','Facial'],'manicure',11),
 ('peluqueria-estilo','Peluquería',ARRAY['Tintes','Novias','Corte'],'hairdresser',12),
 ('carpinteria-la-sierra','Carpintería',ARRAY['Muebles a medida','Puertas','Madera'],'carpentry,wood',13),
 ('electricidad-jm','Electricista',ARRAY['Placas solares','Boletines','Averías'],'electrician',14),
 ('fontaneria-paco','Fontanero',ARRAY['Averías urgentes','Calentadores','Baños'],'plumber',15),
 ('jardineria-verde-vivo','Jardinero',ARRAY['Poda','Riego','Mantenimiento'],'garden',16),
 ('pinturas-antonio','Pintor',ARRAY['Pintor','Reformas','Hogar'],'painter,wall',17),
 ('bicis-bonela','Taller de bicicletas',ARRAY['Alquiler','Reparación','Rutas'],'bicycle',18),
 ('taller-motor-sur','Taller mecánico',ARRAY['Neumáticos','Pre-ITV','Mecánica'],'mechanic,car',19),
 ('farmacia-central','Farmacia',ARRAY['Ortopedia','Guardias','Dermocosmética'],'pharmacy',20),
 ('fisioterapia-marta-lopez','Fisioterapeuta',ARRAY['Lesiones','Masaje','Espalda'],'physiotherapy',21),
 ('podologia-sergio-mena','Podólogo',ARRAY['Plantillas','Pie diabético','Estudio de la pisada'],'feet',22),
 ('psicologia-ana-vega','Psicóloga',ARRAY['Ansiedad','Terapia','Adultos'],'office,calm',23),
 ('abogada-elena-ruiz','Abogada',ARRAY['Herencias','Contratos','Civil'],'lawyer,books',24),
 ('asesoria-gomez','Gestoría',ARRAY['Autónomos','Renta','Impuestos'],'office,documents',25),
 ('clases-ingles-sarah','Profesora de inglés',ARRAY['Clases particulares','Niños','Adultos'],'classroom',26),
 ('fotografia-luz-de-sierra','Fotógrafo',ARRAY['Bodas','Eventos','Retratos'],'camera,photographer',27),
 ('ferreteria-el-clavo','Ferretería',ARRAY['Copia de llaves','Herramientas','Bricolaje'],'hardware,tools',28),
 ('floristeria-azahar','Floristería',ARRAY['Ramos','Plantas','Eventos'],'flowers,florist',29),
 ('papeleria-el-lapiz','Papelería',ARRAY['Fotocopias','Material escolar','Regalos'],'stationery',30)
) AS v(slug, activity, labels, kw, n)
WHERE l.slug = v.slug;

UPDATE public.listings SET gallery_urls = ARRAY[
  replace(cover_url, '?lock=', '?lock=10') , replace(cover_url, '?lock=', '?lock=20'), replace(cover_url, '?lock=', '?lock=30')]
WHERE featured = true;