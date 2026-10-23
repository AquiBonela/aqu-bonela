-- Enums
CREATE TYPE public.app_role AS ENUM ('admin');
CREATE TYPE public.listing_type AS ENUM ('comercio','profesional');
CREATE TYPE public.listing_status AS ENUM ('borrador','pendiente','publicada','rechazada','oculta');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  is_provisional boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER categories_updated BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Listings (public-facing fields only)
CREATE TABLE public.listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  type public.listing_type NOT NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  status public.listing_status NOT NULL DEFAULT 'borrador',
  featured boolean NOT NULL DEFAULT false,
  featured_until timestamptz,
  tags text[] NOT NULL DEFAULT '{}',
  public_phone text,
  public_whatsapp text,
  public_address text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX listings_status_idx ON public.listings(status);
CREATE INDEX listings_category_idx ON public.listings(category_id);
GRANT SELECT ON public.listings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT ALL ON public.listings TO service_role;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads published listings" ON public.listings FOR SELECT TO anon, authenticated USING (status = 'publicada');
CREATE POLICY "Admins manage listings" ON public.listings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER listings_updated BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.listings_publish_stamp() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'publicada' AND NEW.published_at IS NULL THEN NEW.published_at = now(); END IF;
  IF NEW.featured AND NEW.featured_until IS NULL THEN NEW.featured_until = now() + interval '1 month'; END IF;
  IF NOT NEW.featured THEN NEW.featured_until = NULL; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER listings_publish_stamp BEFORE INSERT OR UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.listings_publish_stamp();

-- Private contact data (admin only)
CREATE TABLE public.listing_contacts (
  listing_id uuid PRIMARY KEY REFERENCES public.listings(id) ON DELETE CASCADE,
  phone text,
  whatsapp text,
  address text,
  show_phone boolean NOT NULL DEFAULT false,
  show_whatsapp boolean NOT NULL DEFAULT false,
  show_address boolean NOT NULL DEFAULT false,
  owner_name text,
  owner_contact text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_contacts TO authenticated;
GRANT ALL ON public.listing_contacts TO service_role;
ALTER TABLE public.listing_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage contacts" ON public.listing_contacts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER listing_contacts_updated BEFORE UPDATE ON public.listing_contacts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Sync only authorized contact fields to public listing
CREATE OR REPLACE FUNCTION public.sync_public_contact() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.listings SET public_phone = NULL, public_whatsapp = NULL, public_address = NULL WHERE id = OLD.listing_id;
    RETURN OLD;
  END IF;
  UPDATE public.listings SET
    public_phone = CASE WHEN NEW.show_phone THEN NEW.phone END,
    public_whatsapp = CASE WHEN NEW.show_whatsapp THEN NEW.whatsapp END,
    public_address = CASE WHEN NEW.show_address THEN NEW.address END
  WHERE id = NEW.listing_id;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.sync_public_contact() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER listing_contacts_sync AFTER INSERT OR UPDATE OR DELETE ON public.listing_contacts FOR EACH ROW EXECUTE FUNCTION public.sync_public_contact();

-- Hours
CREATE TABLE public.listing_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  opens time NOT NULL,
  closes time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX listing_hours_listing_idx ON public.listing_hours(listing_id);
GRANT SELECT ON public.listing_hours TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.listing_hours TO authenticated;
GRANT ALL ON public.listing_hours TO service_role;
ALTER TABLE public.listing_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads hours of published" ON public.listing_hours FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.status = 'publicada'));
CREATE POLICY "Admins manage hours" ON public.listing_hours FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Photos
CREATE TABLE public.listing_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  alt text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX listing_photos_listing_idx ON public.listing_photos(listing_id);
GRANT SELECT ON public.listing_photos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.listing_photos TO authenticated;
GRANT ALL ON public.listing_photos TO service_role;
ALTER TABLE public.listing_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads photos of published" ON public.listing_photos FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.status = 'publicada'));
CREATE POLICY "Admins manage photos" ON public.listing_photos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.limit_listing_photos() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (SELECT count(*) FROM public.listing_photos WHERE listing_id = NEW.listing_id) >= 5 THEN
    RAISE EXCEPTION 'Máximo 5 fotos por ficha';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER listing_photos_limit BEFORE INSERT ON public.listing_photos FOR EACH ROW EXECUTE FUNCTION public.limit_listing_photos();

-- Requests history
CREATE TABLE public.listing_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'abierta' CHECK (status IN ('abierta','aprobada','rechazada','devuelta','retirada')),
  notes text,
  snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_requests TO authenticated;
GRANT ALL ON public.listing_requests TO service_role;
ALTER TABLE public.listing_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage requests" ON public.listing_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Approval tokens (hashed, 30 days)
CREATE TABLE public.approval_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.listing_requests(id) ON DELETE SET NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days',
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approval_tokens TO authenticated;
GRANT ALL ON public.approval_tokens TO service_role;
ALTER TABLE public.approval_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage tokens" ON public.approval_tokens FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Consents
CREATE TABLE public.consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.listing_requests(id) ON DELETE SET NULL,
  purpose text NOT NULL,
  text_version text NOT NULL,
  granted boolean NOT NULL,
  authorized_fields jsonb,
  method text NOT NULL DEFAULT 'enlace_privado',
  granted_at timestamptz NOT NULL DEFAULT now(),
  withdrawn_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consents TO authenticated;
GRANT ALL ON public.consents TO service_role;
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage consents" ON public.consents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ===== Demo data (provisional) =====
INSERT INTO public.categories (name, slug, sort_order) VALUES
 ('Alimentación','alimentacion',1),('Bares y restaurantes','bares-restaurantes',2),
 ('Salud','salud',3),('Belleza','belleza',4),('Hogar y reformas','hogar-reformas',5),
 ('Servicios profesionales','servicios-profesionales',6),('Tiendas','tiendas',7),
 ('Motor','motor',8);

WITH d(slug,type,cat,name,descr,tags,status,featured,phone,wa,addr,sp,sw,sa) AS (VALUES
 ('panaderia-el-horno','comercio','alimentacion','Panadería El Horno','Pan de leña, molletes y dulces tradicionales hechos cada mañana.','{pan,molletes,dulces,bolleria}','publicada',true,'952000101','34600000101','Calle Real 12',true,true,true),
 ('carniceria-hermanos-ruiz','comercio','alimentacion','Carnicería Hermanos Ruiz','Carne de la zona, chacinas caseras y embutidos de matanza.','{carne,chorizo,embutidos}','publicada',false,'952000102','34600000102','Calle Ancha 4',true,true,true),
 ('fruteria-la-huerta','comercio','alimentacion','Frutería La Huerta','Fruta y verdura de temporada de huertas cercanas.','{fruta,verdura,ecologico}','publicada',false,'952000103','34600000103','Plaza de la Constitución 2',false,true,true),
 ('ultramarinos-dona-carmen','comercio','alimentacion','Ultramarinos Doña Carmen','Tienda de barrio con aceite, quesos y productos locales.','{aceite,queso,conservas}','publicada',false,'952000104','34600000104','Calle Málaga 18',true,false,true),
 ('pescaderia-el-puerto','comercio','alimentacion','Pescadería El Puerto','Pescado fresco que llega cada día de la costa.','{pescado,marisco}','publicada',false,'952000105','34600000105','Calle Nueva 7',true,true,true),
 ('bar-la-plaza','comercio','bares-restaurantes','Bar La Plaza','Desayunos, tapas caseras y terraza en la plaza.','{tapas,desayunos,terraza,cafe}','publicada',true,'952000106','34600000106','Plaza de la Constitución 5',true,true,true),
 ('restaurante-el-mirador','comercio','bares-restaurantes','Restaurante El Mirador','Cocina malagueña con vistas a la sierra.','{comida,menu,vistas,celebraciones}','publicada',false,'952000107','34600000107','Camino del Mirador s/n',true,true,true),
 ('cafeteria-dulce-rincon','comercio','bares-restaurantes','Cafetería Dulce Rincón','Café de especialidad, tartas y meriendas.','{cafe,tartas,meriendas}','publicada',false,'952000108','34600000108','Calle Iglesia 3',false,true,true),
 ('venta-los-pinos','comercio','bares-restaurantes','Venta Los Pinos','Platos de cuchara y carnes a la brasa los fines de semana.','{brasa,venta,familia}','publicada',false,'952000109','34600000109','Carretera de Coín km 4',true,true,true),
 ('farmacia-central','comercio','salud','Farmacia Central','Farmacia con servicio de guardia rotativa y ortopedia.','{farmacia,ortopedia,guardia}','publicada',false,'952000110','34600000110','Calle Real 30',true,true,true),
 ('fisioterapia-marta-lopez','profesional','salud','Marta López, fisioterapeuta','Fisioterapia deportiva y tratamiento de dolor de espalda.','{fisio,masaje,espalda,lesiones}','publicada',true,'952000111','34600000111','Calle Jardín 9',false,true,true),
 ('podologia-sergio-mena','profesional','salud','Sergio Mena, podólogo','Estudio de la pisada, plantillas y quiropodia.','{pies,plantillas,podologo}','publicada',false,'952000112','34600000112','Calle Huerta 14',true,true,true),
 ('psicologia-ana-vega','profesional','salud','Ana Vega, psicóloga','Terapia individual y de pareja, presencial y online.','{psicologo,terapia,ansiedad}','publicada',false,null,'34600000113',null,false,true,false),
 ('peluqueria-estilo','comercio','belleza','Peluquería Estilo','Cortes, color y peinados para eventos.','{peluqueria,corte,tinte,novias}','publicada',false,'952000114','34600000114','Calle Ancha 21',true,true,true),
 ('barberia-el-tijeras','comercio','belleza','Barbería El Tijeras','Corte clásico, arreglo de barba y afeitado a navaja.','{barba,barberia,corte}','publicada',false,null,'34600000115','Calle Nueva 2',false,true,true),
 ('estetica-lucia','profesional','belleza','Lucía Moreno, esteticista','Tratamientos faciales, manicura y depilación.','{manicura,unas,depilacion,facial}','publicada',false,null,'34600000116','Calle Rosal 6',false,true,true),
 ('fontaneria-paco','profesional','hogar-reformas','Paco Gil, fontanero','Averías, calentadores y reformas de baño. Urgencias.','{fontanero,averias,agua,calentador}','publicada',true,'952000117','34600000117',null,true,true,false),
 ('electricidad-jm','profesional','hogar-reformas','JM Electricidad','Instalaciones eléctricas, boletines y placas solares.','{electricista,luz,solar,boletin}','publicada',false,'952000118','34600000118',null,true,true,false),
 ('carpinteria-la-sierra','comercio','hogar-reformas','Carpintería La Sierra','Puertas, ventanas y muebles a medida en madera.','{madera,muebles,puertas}','publicada',false,'952000119','34600000119','Polígono El Llano 3',true,true,true),
 ('pinturas-antonio','profesional','hogar-reformas','Antonio Ríos, pintor','Pintura de interiores, fachadas y pequeños arreglos.','{pintor,fachadas,reformas}','publicada',false,null,'34600000120',null,false,true,false),
 ('asesoria-gomez','profesional','servicios-profesionales','Asesoría Gómez','Gestión fiscal, laboral y contable para autónomos.','{gestoria,impuestos,autonomos,renta}','publicada',false,'952000121','34600000121','Calle Real 8',true,true,true),
 ('abogada-elena-ruiz','profesional','servicios-profesionales','Elena Ruiz, abogada','Derecho civil, herencias y contratos.','{abogado,herencias,contratos}','publicada',false,'952000122','34600000122','Calle Iglesia 11',true,true,true),
 ('fotografia-luz-de-sierra','profesional','servicios-profesionales','Luz de Sierra Fotografía','Bodas, comuniones y fotografía de producto.','{fotografo,bodas,eventos}','publicada',false,null,'34600000123',null,false,true,false),
 ('clases-ingles-sarah','profesional','servicios-profesionales','Sarah Collins, clases de inglés','Clases particulares y en grupo para todas las edades.','{ingles,clases,idiomas,apoyo}','publicada',false,null,'34600000124',null,false,true,false),
 ('ferreteria-el-clavo','comercio','tiendas','Ferretería El Clavo','Herramientas, menaje y copias de llaves.','{ferreteria,llaves,herramientas}','publicada',false,'952000125','34600000125','Calle Málaga 2',true,true,true),
 ('floristeria-azahar','comercio','tiendas','Floristería Azahar','Ramos, plantas y coronas por encargo.','{flores,plantas,ramos}','publicada',false,'952000126','34600000126','Calle Rosal 1',true,true,true),
 ('papeleria-el-lapiz','comercio','tiendas','Papelería El Lápiz','Material escolar, fotocopias y regalos.','{papeleria,fotocopias,colegio}','publicada',false,'952000127','34600000127','Calle Escuelas 5',true,false,true),
 ('taller-motor-sur','comercio','motor','Taller Motor Sur','Mecánica general, neumáticos y pre-ITV.','{taller,coche,neumaticos,itv}','publicada',false,'952000128','34600000128','Polígono El Llano 8',true,true,true),
 ('bicis-bonela','comercio','motor','Bicis Bonela','Venta y reparación de bicicletas y alquiler de eléctricas.','{bicicletas,alquiler,reparacion}','pendiente',false,'952000129','34600000129','Calle Ancha 30',true,true,true),
 ('jardineria-verde-vivo','profesional','hogar-reformas','Verde Vivo Jardinería','Mantenimiento de jardines, podas y riego.','{jardin,poda,riego}','borrador',false,null,'34600000130',null,false,true,false)
), ins AS (
  INSERT INTO public.listings (slug,type,category_id,name,description,tags,status,featured)
  SELECT d.slug, d.type::public.listing_type, c.id, d.name, d.descr, d.tags::text[], d.status::public.listing_status, d.featured
  FROM d JOIN public.categories c ON c.slug = d.cat
  RETURNING id, slug
)
INSERT INTO public.listing_contacts (listing_id, phone, whatsapp, address, show_phone, show_whatsapp, show_address)
SELECT ins.id, d.phone, d.wa, d.addr, d.sp, d.sw, d.sa FROM ins JOIN d ON d.slug = ins.slug;

-- Demo hours: Mon-Fri 9-14 and 17-20, Sat 10-14
INSERT INTO public.listing_hours (listing_id, weekday, opens, closes)
SELECT l.id, w::smallint, time '09:00', time '14:00' FROM public.listings l, generate_series(1,5) w
UNION ALL SELECT l.id, w::smallint, time '17:00', time '20:00' FROM public.listings l, generate_series(1,5) w
UNION ALL SELECT l.id, 6::smallint, time '10:00', time '14:00' FROM public.listings l;