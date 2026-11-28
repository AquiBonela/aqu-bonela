-- =====================================================================
-- Groundwork · Plantilla de instalación limpia · 01_schema.sql
-- Esquema consolidado a partir del estado real de producción (catálogo
-- PostgreSQL), no de las migraciones históricas.
-- Ejecutar UNA vez, en un proyecto Supabase vacío, desde SQL Editor.
-- No contiene datos. Ver README.md.
-- =====================================================================
SET search_path = public, extensions;

-- 1. EXTENSIONES Y ESQUEMAS ------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
-- pg_cron es opcional: si no está disponible se avisa y la limpieza se
-- programa más tarde (ver README, apartado «Limpieza programada»).
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    BEGIN
      CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'pg_cron no se pudo activar (%). Actívalo en Database > Extensions.', SQLERRM;
    END;
  ELSE
    RAISE WARNING 'pg_cron no disponible en esta instancia.';
  END IF;
END
$cron$;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- 2. TIPOS ENUM (valores exactos de producción) ----------------------------
CREATE TYPE public.app_role AS ENUM ('admin');
CREATE TYPE public.listing_type AS ENUM ('comercio','profesional','publico','asociacion');
CREATE TYPE public.listing_status AS ENUM ('borrador','pendiente','publicada','rechazada','oculta');

-- 3. TABLAS (claves foráneas en el apartado 4) -----------------------------
CREATE TABLE private.form_rate_limits (
  key text NOT NULL,
  attempts integer DEFAULT 0 NOT NULL,
  window_start timestamp with time zone DEFAULT now() NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  CONSTRAINT form_rate_limits_pkey PRIMARY KEY (key)
);
REVOKE ALL ON private.form_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON private.form_rate_limits TO service_role;
ALTER TABLE private.form_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Browser roles denied rate limit rows" ON private.form_rate_limits AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE TABLE public.activities (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  category_id uuid NOT NULL,
  name text NOT NULL,
  synonyms text[] DEFAULT '{}'::text[] NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT activities_category_id_name_key UNIQUE (category_id, name),
  CONSTRAINT activities_pkey PRIMARY KEY (id)
);
REVOKE ALL ON public.activities FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.activities TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON public.activities TO anon, authenticated;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.approval_tokens (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  listing_id uuid NOT NULL,
  request_id uuid,
  token_hash text NOT NULL,
  expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval) NOT NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT approval_tokens_token_hash_key UNIQUE (token_hash),
  CONSTRAINT approval_tokens_pkey PRIMARY KEY (id)
);
REVOKE ALL ON public.approval_tokens FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.approval_tokens TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON public.approval_tokens TO anon, authenticated;
ALTER TABLE public.approval_tokens ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.categories (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  is_provisional boolean DEFAULT true NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  type listing_type DEFAULT 'comercio'::listing_type NOT NULL,
  CONSTRAINT categories_slug_key UNIQUE (slug),
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);
REVOKE ALL ON public.categories FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.categories TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON public.categories TO anon, authenticated;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.consents (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  listing_id uuid NOT NULL,
  request_id uuid,
  purpose text NOT NULL,
  text_version text NOT NULL,
  granted boolean NOT NULL,
  authorized_fields jsonb,
  method text DEFAULT 'enlace_privado'::text NOT NULL,
  granted_at timestamp with time zone DEFAULT now() NOT NULL,
  withdrawn_at timestamp with time zone,
  CONSTRAINT consents_pkey PRIMARY KEY (id)
);
REVOKE ALL ON public.consents FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.consents TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON public.consents TO anon, authenticated;
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.listing_activities (
  listing_id uuid NOT NULL,
  activity_id uuid NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT listing_activities_pkey PRIMARY KEY (listing_id, activity_id)
);
REVOKE ALL ON public.listing_activities FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.listing_activities TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON public.listing_activities TO anon, authenticated;
ALTER TABLE public.listing_activities ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.listing_contacts (
  listing_id uuid NOT NULL,
  phone text,
  whatsapp text,
  address text,
  show_phone boolean DEFAULT false NOT NULL,
  show_whatsapp boolean DEFAULT false NOT NULL,
  show_address boolean DEFAULT false NOT NULL,
  owner_name text,
  owner_contact text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  email text,
  show_email boolean DEFAULT false NOT NULL,
  phone_2 text,
  show_phone_2 boolean DEFAULT false NOT NULL,
  linkedin text,
  show_linkedin boolean DEFAULT false NOT NULL,
  facebook text,
  show_facebook boolean DEFAULT false NOT NULL,
  youtube text,
  show_youtube boolean DEFAULT false NOT NULL,
  x_twitter text,
  show_x_twitter boolean DEFAULT false NOT NULL,
  instagram text,
  show_instagram boolean DEFAULT false NOT NULL,
  tiktok text,
  show_tiktok boolean DEFAULT false NOT NULL,
  CONSTRAINT listing_contacts_pkey PRIMARY KEY (listing_id)
);
REVOKE ALL ON public.listing_contacts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.listing_contacts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON public.listing_contacts TO anon, authenticated;
ALTER TABLE public.listing_contacts ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.listing_hours (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  listing_id uuid NOT NULL,
  weekday smallint NOT NULL,
  opens time without time zone NOT NULL,
  closes time without time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT listing_hours_pkey PRIMARY KEY (id),
  CONSTRAINT listing_hours_weekday_check CHECK (((weekday >= 1) AND (weekday <= 7)))
);
REVOKE ALL ON public.listing_hours FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.listing_hours TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON public.listing_hours TO anon, authenticated;
ALTER TABLE public.listing_hours ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.listing_photos (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  listing_id uuid NOT NULL,
  storage_path text NOT NULL,
  alt text DEFAULT ''::text NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT listing_photos_pkey PRIMARY KEY (id)
);
REVOKE ALL ON public.listing_photos FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.listing_photos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON public.listing_photos TO anon, authenticated;
ALTER TABLE public.listing_photos ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.listing_reports (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  listing_id uuid NOT NULL,
  message text NOT NULL,
  contact text,
  resolved boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT listing_reports_pkey PRIMARY KEY (id),
  CONSTRAINT listing_reports_contact_check CHECK (((contact IS NULL) OR (char_length(contact) <= 120))),
  CONSTRAINT listing_reports_message_check CHECK (((char_length(message) >= 5) AND (char_length(message) <= 1000)))
);
REVOKE ALL ON public.listing_reports FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.listing_reports TO service_role;
GRANT SELECT, UPDATE, DELETE, REFERENCES, TRIGGER ON public.listing_reports TO anon, authenticated;  -- sin INSERT: solo vía servidor
ALTER TABLE public.listing_reports ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.listing_requests (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  listing_id uuid NOT NULL,
  status text DEFAULT 'abierta'::text NOT NULL,
  notes text,
  snapshot jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  decided_at timestamp with time zone,
  CONSTRAINT listing_requests_pkey PRIMARY KEY (id),
  CONSTRAINT listing_requests_status_check CHECK ((status = ANY (ARRAY['abierta'::text, 'aprobada'::text, 'rechazada'::text, 'devuelta'::text, 'retirada'::text])))
);
REVOKE ALL ON public.listing_requests FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.listing_requests TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON public.listing_requests TO anon, authenticated;
ALTER TABLE public.listing_requests ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.listings (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  slug text NOT NULL,
  type listing_type NOT NULL,
  category_id uuid,
  name text NOT NULL,
  description text DEFAULT ''::text NOT NULL,
  status listing_status DEFAULT 'borrador'::listing_status NOT NULL,
  featured boolean DEFAULT false NOT NULL,
  featured_until timestamp with time zone,
  tags text[] DEFAULT '{}'::text[] NOT NULL,
  public_phone text,
  public_whatsapp text,
  public_address text,
  published_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  activity text,
  labels text[] DEFAULT '{}'::text[] NOT NULL,
  cover_url text,
  gallery_urls text[] DEFAULT '{}'::text[] NOT NULL,
  urgent_24h boolean DEFAULT false NOT NULL,
  short_description text DEFAULT ''::text NOT NULL,
  cover_path text,
  public_email text,
  public_website text,
  home_service boolean DEFAULT false NOT NULL,
  service_area text DEFAULT ''::text NOT NULL,
  public_phone_2 text,
  public_linkedin text,
  public_facebook text,
  public_youtube text,
  public_x_twitter text,
  public_instagram text,
  public_tiktok text,
  translations jsonb DEFAULT '{}'::jsonb NOT NULL,
  CONSTRAINT listings_slug_key UNIQUE (slug),
  CONSTRAINT listings_pkey PRIMARY KEY (id),
  CONSTRAINT listings_gallery_max CHECK ((cardinality(gallery_urls) <= 5)),
  CONSTRAINT listings_labels_max CHECK ((cardinality(labels) <= 3))
);
REVOKE ALL ON public.listings FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.listings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON public.listings TO anon, authenticated;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.procedure_categories (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  slug text NOT NULL,
  title text NOT NULL,
  description text DEFAULT ''::text NOT NULL,
  title_en text DEFAULT ''::text NOT NULL,
  description_en text DEFAULT ''::text NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  visible boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT procedure_categories_slug_key UNIQUE (slug),
  CONSTRAINT procedure_categories_pkey PRIMARY KEY (id),
  CONSTRAINT procedure_categories_slug_check CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text)),
  CONSTRAINT procedure_categories_title_check CHECK ((length(TRIM(BOTH FROM title)) > 0))
);
REVOKE ALL ON public.procedure_categories FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.procedure_categories TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON public.procedure_categories TO anon, authenticated;
ALTER TABLE public.procedure_categories ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.procedures (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  category_id uuid NOT NULL,
  slug text NOT NULL,
  title text NOT NULL,
  summary text DEFAULT ''::text NOT NULL,
  status text DEFAULT 'borrador'::text NOT NULL,
  content jsonb DEFAULT '{}'::jsonb NOT NULL,
  content_en jsonb DEFAULT '{}'::jsonb NOT NULL,
  visibility jsonb DEFAULT '{}'::jsonb NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  source_key text,
  translations jsonb DEFAULT '{}'::jsonb NOT NULL,
  CONSTRAINT procedures_category_id_slug_key UNIQUE (category_id, slug),
  CONSTRAINT procedures_source_key_key UNIQUE (source_key),
  CONSTRAINT procedures_pkey PRIMARY KEY (id),
  CONSTRAINT procedures_content_check CHECK ((jsonb_typeof(content) = 'object'::text)),
  CONSTRAINT procedures_content_en_check CHECK ((jsonb_typeof(content_en) = 'object'::text)),
  CONSTRAINT procedures_slug_check CHECK ((slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text)),
  CONSTRAINT procedures_status_check CHECK ((status = ANY (ARRAY['borrador'::text, 'publicada'::text]))),
  CONSTRAINT procedures_title_check CHECK ((length(TRIM(BOTH FROM title)) > 0)),
  CONSTRAINT procedures_visibility_check CHECK ((jsonb_typeof(visibility) = 'object'::text))
);
REVOKE ALL ON public.procedures FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.procedures TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON public.procedures TO anon, authenticated;
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.site_settings (
  id boolean DEFAULT true NOT NULL,
  hero_title text DEFAULT 'Todo lo que necesitas, en tu pueblo'::text NOT NULL,
  hero_subtitle text DEFAULT 'Comercios, profesionales y servicios de tu municipio'::text NOT NULL,
  contact_email text DEFAULT ''::text NOT NULL,
  admin_whatsapp text DEFAULT ''::text NOT NULL,
  collaborator_months integer DEFAULT 1 NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  legal_name text DEFAULT ''::text NOT NULL,
  legal_nif text DEFAULT ''::text NOT NULL,
  legal_address text DEFAULT ''::text NOT NULL,
  legal_email text DEFAULT ''::text NOT NULL,
  whatsapp_template text DEFAULT 'Hola {nombre}: este es tu enlace privado para revisar y autorizar la publicación de tu ficha (válido 30 días): {enlace}'::text NOT NULL,
  banner_enabled boolean DEFAULT false NOT NULL,
  banner_text text DEFAULT ''::text NOT NULL,
  common_labels text[] DEFAULT ARRAY['Pago con tarjeta'::text, 'A domicilio'::text, 'Accesible'::text, 'Terraza'::text, 'Aparcamiento'::text, 'Productos locales'::text] NOT NULL,
  CONSTRAINT site_settings_pkey PRIMARY KEY (id),
  CONSTRAINT site_settings_collaborator_months_check CHECK (((collaborator_months >= 1) AND (collaborator_months <= 24))),
  CONSTRAINT site_settings_id_check CHECK (id)
);
REVOKE ALL ON public.site_settings FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON public.site_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON public.site_settings TO anon;
GRANT SELECT (id, hero_title, hero_subtitle, collaborator_months, updated_at, legal_name, legal_nif, legal_address, legal_email, banner_enabled, banner_text) ON public.site_settings TO anon;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.suggestions (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  contact text,
  message text NOT NULL,
  handled boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT suggestions_pkey PRIMARY KEY (id),
  CONSTRAINT suggestions_contact_check CHECK (((contact IS NULL) OR (length(TRIM(BOTH FROM contact)) <= 160))),
  CONSTRAINT suggestions_message_check CHECK (((length(TRIM(BOTH FROM message)) >= 5) AND (length(TRIM(BOTH FROM message)) <= 1000))),
  CONSTRAINT suggestions_name_check CHECK (((length(TRIM(BOTH FROM name)) >= 2) AND (length(TRIM(BOTH FROM name)) <= 120)))
);
REVOKE ALL ON public.suggestions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.suggestions TO service_role;
GRANT SELECT, UPDATE, DELETE, REFERENCES, TRIGGER ON public.suggestions TO anon, authenticated;  -- sin INSERT: solo vía servidor
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.translation_gateway_state (
  id boolean DEFAULT true NOT NULL,
  blocked boolean DEFAULT false NOT NULL,
  reason text DEFAULT ''::text NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT translation_gateway_state_pkey PRIMARY KEY (id),
  CONSTRAINT translation_gateway_state_id_check CHECK (id)
);
REVOKE ALL ON public.translation_gateway_state FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.translation_gateway_state TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON public.translation_gateway_state TO anon, authenticated;
ALTER TABLE public.translation_gateway_state ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.user_roles (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role),
  CONSTRAINT user_roles_pkey PRIMARY KEY (id)
);
REVOKE ALL ON public.user_roles FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.user_roles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE, REFERENCES, TRIGGER ON public.user_roles TO anon, authenticated;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. CLAVES FORÁNEAS ---------------------------------------------------------
ALTER TABLE public.activities ADD CONSTRAINT activities_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;
ALTER TABLE public.approval_tokens ADD CONSTRAINT approval_tokens_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;
ALTER TABLE public.approval_tokens ADD CONSTRAINT approval_tokens_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.listing_requests(id) ON DELETE SET NULL;
ALTER TABLE public.consents ADD CONSTRAINT consents_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;
ALTER TABLE public.consents ADD CONSTRAINT consents_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.listing_requests(id) ON DELETE SET NULL;
ALTER TABLE public.listing_activities ADD CONSTRAINT listing_activities_activity_id_fkey FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;
ALTER TABLE public.listing_activities ADD CONSTRAINT listing_activities_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;
ALTER TABLE public.listing_contacts ADD CONSTRAINT listing_contacts_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;
ALTER TABLE public.listing_hours ADD CONSTRAINT listing_hours_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;
ALTER TABLE public.listing_photos ADD CONSTRAINT listing_photos_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;
ALTER TABLE public.listing_reports ADD CONSTRAINT listing_reports_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;
ALTER TABLE public.listing_requests ADD CONSTRAINT listing_requests_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE;
ALTER TABLE public.listings ADD CONSTRAINT listings_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE public.procedures ADD CONSTRAINT procedures_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.procedure_categories(id) ON DELETE RESTRICT;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. ÍNDICES -----------------------------------------------------------------
CREATE INDEX form_rate_limits_expires_idx ON private.form_rate_limits USING btree (expires_at);
CREATE INDEX activities_category_idx ON public.activities USING btree (category_id);
CREATE INDEX listing_activities_activity_idx ON public.listing_activities USING btree (activity_id);
CREATE INDEX listing_hours_listing_idx ON public.listing_hours USING btree (listing_id);
CREATE INDEX listing_photos_listing_idx ON public.listing_photos USING btree (listing_id);
CREATE INDEX listings_category_idx ON public.listings USING btree (category_id);
CREATE INDEX listings_status_idx ON public.listings USING btree (status);
CREATE INDEX procedures_category_status_order ON public.procedures USING btree (category_id, status, sort_order);

-- 6. FUNCIONES (definiciones literales de producción) ----------------------
CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT COALESCE(_user_id = auth.uid(), false)
    AND EXISTS (
      SELECT 1 FROM public.user_roles AS ur
      WHERE ur.user_id = auth.uid() AND ur.role = _role
    );
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  SELECT private.has_role(_user_id, _role);
$function$;

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text, p_max_attempts integer, p_window_seconds integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_attempts integer;
BEGIN
  IF p_key IS NULL OR p_key !~ '^[a-z_]{2,24}:(ip|ss):[a-f0-9]{32,64}$' THEN
    RAISE EXCEPTION 'invalid p_key' USING ERRCODE = '22023';
  END IF;
  IF p_max_attempts IS NULL OR p_max_attempts < 1 OR p_max_attempts > 100 THEN
    RAISE EXCEPTION 'invalid p_max_attempts' USING ERRCODE = '22023';
  END IF;
  IF p_window_seconds IS NULL OR p_window_seconds < 10 OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'invalid p_window_seconds' USING ERRCODE = '22023';
  END IF;

  INSERT INTO private.form_rate_limits AS r (key, attempts, window_start, expires_at)
  VALUES (p_key, 1, now(), now() + make_interval(secs => p_window_seconds))
  ON CONFLICT (key) DO UPDATE SET
    attempts = CASE WHEN r.expires_at <= now() THEN 1 ELSE r.attempts + 1 END,
    window_start = CASE WHEN r.expires_at <= now() THEN now() ELSE r.window_start END,
    expires_at = CASE WHEN r.expires_at <= now() THEN now() + make_interval(secs => p_window_seconds) ELSE r.expires_at END
  RETURNING attempts INTO v_attempts;

  RETURN v_attempts <= p_max_attempts;
END;
$function$;

CREATE OR REPLACE FUNCTION private.cleanup_expired_rate_limits(p_batch_size integer DEFAULT 1000)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE v_deleted integer;
BEGIN
  IF p_batch_size IS NULL OR p_batch_size < 1 OR p_batch_size > 10000 THEN
    RAISE EXCEPTION 'invalid p_batch_size' USING ERRCODE = '22023';
  END IF;
  DELETE FROM private.form_rate_limits
  WHERE key IN (
    SELECT key FROM private.form_rate_limits
    WHERE expires_at < now()
    ORDER BY expires_at
    LIMIT p_batch_size
  );
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $function$;

CREATE OR REPLACE FUNCTION public.limit_listing_photos()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (SELECT count(*) FROM public.listing_photos WHERE listing_id = NEW.listing_id) >= 5 THEN
    RAISE EXCEPTION 'Máximo 5 fotos por ficha';
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.listings_publish_stamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'publicada' AND NEW.published_at IS NULL THEN NEW.published_at = now(); END IF;
  IF NEW.featured AND NEW.featured_until IS NULL THEN NEW.featured_until = now() + interval '1 month'; END IF;
  IF NOT NEW.featured THEN NEW.featured_until = NULL; END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.sync_public_contact()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.listings SET
      public_phone = NULL,
      public_phone_2 = NULL,
      public_whatsapp = NULL,
      public_address = NULL,
      public_email = NULL,
      public_linkedin = NULL,
      public_facebook = NULL,
      public_youtube = NULL,
      public_x_twitter = NULL,
      public_instagram = NULL,
      public_tiktok = NULL
    WHERE id = OLD.listing_id;
    RETURN OLD;
  END IF;

  UPDATE public.listings SET
    public_phone = CASE WHEN NEW.show_phone THEN NEW.phone END,
    public_phone_2 = CASE WHEN NEW.show_phone_2 THEN NEW.phone_2 END,
    public_whatsapp = CASE WHEN NEW.show_whatsapp THEN NEW.whatsapp END,
    public_address = CASE WHEN NEW.show_address THEN NEW.address END,
    public_email = CASE WHEN NEW.show_email THEN NEW.email END,
    public_linkedin = CASE WHEN NEW.show_linkedin THEN NEW.linkedin END,
    public_facebook = CASE WHEN NEW.show_facebook THEN NEW.facebook END,
    public_youtube = CASE WHEN NEW.show_youtube THEN NEW.youtube END,
    public_x_twitter = CASE WHEN NEW.show_x_twitter THEN NEW.x_twitter END,
    public_instagram = CASE WHEN NEW.show_instagram THEN NEW.instagram END,
    public_tiktok = CASE WHEN NEW.show_tiktok THEN NEW.tiktok END
  WHERE id = NEW.listing_id;
  RETURN NEW;
END;
$function$;

-- Permisos de ejecución (idénticos a producción)
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;
REVOKE ALL ON FUNCTION private.cleanup_expired_rate_limits(integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.sync_public_contact() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_public_contact() TO service_role;

-- 7. TRIGGERS ----------------------------------------------------------------
CREATE TRIGGER activities_updated_at BEFORE UPDATE ON public.activities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER categories_updated BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER listing_contacts_sync AFTER INSERT OR DELETE OR UPDATE ON public.listing_contacts FOR EACH ROW EXECUTE FUNCTION public.sync_public_contact();
CREATE TRIGGER listing_contacts_updated BEFORE UPDATE ON public.listing_contacts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER listing_photos_limit BEFORE INSERT ON public.listing_photos FOR EACH ROW EXECUTE FUNCTION public.limit_listing_photos();
CREATE TRIGGER listings_publish_stamp BEFORE INSERT OR UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.listings_publish_stamp();
CREATE TRIGGER listings_updated BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER procedure_categories_updated BEFORE UPDATE ON public.procedure_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER procedures_updated BEFORE UPDATE ON public.procedures FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER site_settings_updated BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER translation_state_updated BEFORE UPDATE ON public.translation_gateway_state FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 10. POLÍTICAS RLS (39 public) ----------------------------------------------
CREATE POLICY "Admins manage activities" ON public.activities AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public reads activities of active categories" ON public.activities AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING ((EXISTS ( SELECT 1
   FROM listings l
  WHERE ((l.category_id = activities.category_id) AND (l.status = 'publicada'::listing_status)))));
CREATE POLICY "Admins manage tokens" ON public.approval_tokens AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage categories" ON public.categories AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone reads categories" ON public.categories AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "Admins manage consents" ON public.consents AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage listing activities" ON public.listing_activities AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public reads activities of published" ON public.listing_activities AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING ((EXISTS ( SELECT 1
   FROM listings l
  WHERE ((l.id = listing_activities.listing_id) AND (l.status = 'publicada'::listing_status)))));
CREATE POLICY "Admins manage contacts" ON public.listing_contacts AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage hours" ON public.listing_hours AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public reads hours of published" ON public.listing_hours AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING ((EXISTS ( SELECT 1
   FROM listings l
  WHERE ((l.id = listing_hours.listing_id) AND (l.status = 'publicada'::listing_status)))));
CREATE POLICY "Admins manage photos" ON public.listing_photos AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public reads photos of published" ON public.listing_photos AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING ((EXISTS ( SELECT 1
   FROM listings l
  WHERE ((l.id = listing_photos.listing_id) AND (l.status = 'publicada'::listing_status)))));
CREATE POLICY "Admins delete reports" ON public.listing_reports AS PERMISSIVE FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins read reports" ON public.listing_reports AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update reports" ON public.listing_reports AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage requests" ON public.listing_requests AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage listings" ON public.listings AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Public reads published listings" ON public.listings AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING ((status = 'publicada'::listing_status));
CREATE POLICY "Admins create procedure categories" ON public.procedure_categories AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete procedure categories" ON public.procedure_categories AS PERMISSIVE FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update procedure categories" ON public.procedure_categories AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated read procedure categories" ON public.procedure_categories AS PERMISSIVE FOR SELECT TO authenticated
  USING ((visible OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Visitors read visible procedure categories" ON public.procedure_categories AS PERMISSIVE FOR SELECT TO anon
  USING (visible);
CREATE POLICY "Admins create procedures" ON public.procedures AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete procedures" ON public.procedures AS PERMISSIVE FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update procedures" ON public.procedures AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated read procedures" ON public.procedures AS PERMISSIVE FOR SELECT TO authenticated
  USING ((has_role(auth.uid(), 'admin'::app_role) OR ((status = 'publicada'::text) AND (EXISTS ( SELECT 1
   FROM procedure_categories c
  WHERE ((c.id = procedures.category_id) AND c.visible))))));
CREATE POLICY "Visitors read published procedures" ON public.procedures AS PERMISSIVE FOR SELECT TO anon
  USING (((status = 'publicada'::text) AND (EXISTS ( SELECT 1
   FROM procedure_categories c
  WHERE ((c.id = procedures.category_id) AND c.visible)))));
CREATE POLICY "Admins manage settings" ON public.site_settings AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Visitors read public settings" ON public.site_settings AS PERMISSIVE FOR SELECT TO anon
  USING ((id = true));
CREATE POLICY "Admins delete suggestions" ON public.suggestions AS PERMISSIVE FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins read suggestions" ON public.suggestions AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update suggestions" ON public.suggestions AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins create translation state" ON public.translation_gateway_state AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins read translation state" ON public.translation_gateway_state AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update translation state" ON public.translation_gateway_state AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage roles" ON public.user_roles AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users read own roles" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = auth.uid()));

-- 11. STORAGE: POLÍTICAS PARA BUCKETS PRIVADOS (8) -----------------------------
-- Crear los dos buckets privados mediante Storage API antes de 04 (ver README).

CREATE POLICY "Admins delete listing photos" ON storage.objects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((bucket_id = 'listing-photos'::text) AND has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Admins manage procedure images" ON storage.objects AS PERMISSIVE FOR ALL TO authenticated
  USING (((bucket_id = 'procedure-images'::text) AND has_role(auth.uid(), 'admin'::app_role)))
  WITH CHECK (((bucket_id = 'procedure-images'::text) AND has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Admins read listing photos" ON storage.objects AS PERMISSIVE FOR SELECT TO authenticated
  USING (((bucket_id = 'listing-photos'::text) AND has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Admins update listing photos" ON storage.objects AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((bucket_id = 'listing-photos'::text) AND has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Admins upload listing photos" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'listing-photos'::text) AND has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Public reads cover of published listings" ON storage.objects AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (((bucket_id = 'listing-photos'::text) AND (EXISTS ( SELECT 1
   FROM listings l
  WHERE ((l.cover_path = objects.name) AND ((storage.foldername(objects.name))[1] = (l.id)::text) AND (l.status = 'publicada'::listing_status))))));
CREATE POLICY "Public reads photos of published listings" ON storage.objects AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (((bucket_id = 'listing-photos'::text) AND (EXISTS ( SELECT 1
   FROM (listing_photos p
     JOIN listings l ON ((l.id = p.listing_id)))
  WHERE ((p.storage_path = objects.name) AND (l.status = 'publicada'::listing_status))))));
CREATE POLICY "Visitors read referenced published procedure images" ON storage.objects AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (((bucket_id = 'procedure-images'::text) AND (EXISTS ( SELECT 1
   FROM (((procedures p
     JOIN procedure_categories c ON ((c.id = p.category_id)))
     CROSS JOIN LATERAL jsonb_array_elements(
        CASE
            WHEN (jsonb_typeof((p.content -> 'sections'::text)) = 'array'::text) THEN (p.content -> 'sections'::text)
            ELSE '[]'::jsonb
        END) s(value))
     CROSS JOIN LATERAL jsonb_array_elements(
        CASE
            WHEN (jsonb_typeof((s.value -> 'elements'::text)) = 'array'::text) THEN (s.value -> 'elements'::text)
            ELSE '[]'::jsonb
        END) e(value))
  WHERE ((p.status = 'publicada'::text) AND c.visible AND (COALESCE((p.visibility ->> 'deleted'::text), 'false'::text) <> 'true'::text) AND (COALESCE((s.value ->> 'visible'::text), 'true'::text) <> 'false'::text) AND ((e.value ->> 'kind'::text) = 'image'::text) AND ((e.value ->> 'storagePath'::text) = objects.name))))));

-- 12. LIMPIEZA PROGRAMADA DEL RATE LIMITING ---------------------------------
-- Cada hora (minuto 17), lotes de 5000 filas caducadas. Solo si pg_cron existe.
DO $sched$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'cleanup-form-rate-limits';
    PERFORM cron.schedule('cleanup-form-rate-limits', '17 * * * *', 'SELECT private.cleanup_expired_rate_limits(5000);');
  ELSE
    RAISE WARNING 'Limpieza no programada: falta pg_cron. Ver README.';
  END IF;
END
$sched$;
-- 13. IDENTIDAD DE LA INSTALACIÓN (Fase 1 del administrador) --------------
-- >>> site_identity (bloque idéntico en supabase/template/01_schema.sql; lo comprueba src/lib/site-identity-sql.test.ts)
CREATE TABLE public.site_identity (
  id boolean NOT NULL DEFAULT true,
  app_name text NOT NULL DEFAULT '',
  short_name text NOT NULL DEFAULT '',
  municipality_name text NOT NULL DEFAULT '',
  province text NOT NULL DEFAULT '',
  region text NOT NULL DEFAULT '',
  autonomous_community text NOT NULL DEFAULT '',
  demonym_masculine text NOT NULL DEFAULT '',
  demonym_feminine text NOT NULL DEFAULT '',
  site_url text NOT NULL DEFAULT '',
  town_hall_name text NOT NULL DEFAULT '',
  town_hall_address text NOT NULL DEFAULT '',
  town_hall_phone text NOT NULL DEFAULT '',
  town_hall_website text NOT NULL DEFAULT '',
  latitude numeric(8,5),
  longitude numeric(8,5),
  timezone text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT site_identity_pkey PRIMARY KEY (id),
  CONSTRAINT site_identity_id_check CHECK (id),
  CONSTRAINT site_identity_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT site_identity_lengths CHECK (
    char_length(app_name) <= 60 AND char_length(short_name) <= 30 AND char_length(municipality_name) <= 80
    AND char_length(province) <= 60 AND char_length(region) <= 80 AND char_length(autonomous_community) <= 80
    AND char_length(demonym_masculine) <= 40 AND char_length(demonym_feminine) <= 40
    AND char_length(town_hall_name) <= 120 AND char_length(town_hall_address) <= 200
    AND char_length(town_hall_website) <= 300 AND char_length(timezone) <= 64),
  -- Sin HTML, sin llaves (se confundirían con {app}, {municipio}...) y sin caracteres de control.
  CONSTRAINT site_identity_safe_text CHECK (
    concat_ws(' ', app_name, short_name, municipality_name, province, region, autonomous_community,
      demonym_masculine, demonym_feminine, town_hall_name, town_hall_address, timezone) !~ '[<>{}[:cntrl:]]'),
  -- Origen https sin ruta ni barra final, p. ej. https://mipueblo.es
  CONSTRAINT site_identity_site_url CHECK (
    site_url = '' OR site_url ~ '^https://[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(:[0-9]{1,5})?$'),
  CONSTRAINT site_identity_town_hall_phone CHECK (town_hall_phone ~ '^[0-9 +]{0,20}$'),
  CONSTRAINT site_identity_town_hall_website CHECK (
    town_hall_website = '' OR town_hall_website ~ '^https://[^[:space:]<>"{}]+$'),
  CONSTRAINT site_identity_coordinates CHECK (
    (latitude IS NULL) = (longitude IS NULL)
    AND (latitude IS NULL OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180 AND timezone <> '')))
);

-- Quién puede cambiar la identidad. En fases posteriores (roles) solo cambia esta función, no las políticas.
CREATE OR REPLACE FUNCTION public.can_manage_identity()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role);
$$;
REVOKE ALL ON FUNCTION public.can_manage_identity() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_identity() TO authenticated, service_role;

-- Valida la zona horaria y registra fecha y autor de cada cambio.
CREATE OR REPLACE FUNCTION private.site_identity_before_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.timezone <> '' AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name = NEW.timezone) THEN
    RAISE EXCEPTION 'Zona horaria no válida: %', NEW.timezone USING ERRCODE = 'check_violation';
  END IF;
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.site_identity_before_update() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER site_identity_before_update BEFORE UPDATE ON public.site_identity
  FOR EACH ROW EXECUTE FUNCTION private.site_identity_before_update();

-- Todo es público salvo updated_by. Sin INSERT ni DELETE: la fila única no se crea ni se borra desde la web.
REVOKE ALL ON public.site_identity FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.site_identity TO service_role;
GRANT SELECT (id, app_name, short_name, municipality_name, province, region, autonomous_community,
  demonym_masculine, demonym_feminine, site_url, town_hall_name, town_hall_address, town_hall_phone,
  town_hall_website, latitude, longitude, timezone, updated_at) ON public.site_identity TO anon, authenticated;
GRANT UPDATE (app_name, short_name, municipality_name, province, region, autonomous_community,
  demonym_masculine, demonym_feminine, site_url, town_hall_name, town_hall_address, town_hall_phone,
  town_hall_website, latitude, longitude, timezone) ON public.site_identity TO authenticated;
ALTER TABLE public.site_identity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visitors read site identity" ON public.site_identity AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (id);
CREATE POLICY "Identity managers update site identity" ON public.site_identity AS PERMISSIVE FOR UPDATE TO authenticated
  USING (public.can_manage_identity())
  WITH CHECK (public.can_manage_identity());

-- Configuración pública de la web en una sola llamada. Las fases siguientes añaden claves (tema, secciones, menú).
CREATE OR REPLACE FUNCTION public.site_config()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT jsonb_build_object('identity', (
    SELECT jsonb_build_object(
      'app_name', i.app_name, 'short_name', i.short_name, 'municipality_name', i.municipality_name,
      'province', i.province, 'region', i.region, 'autonomous_community', i.autonomous_community,
      'demonym_masculine', i.demonym_masculine, 'demonym_feminine', i.demonym_feminine,
      'site_url', i.site_url, 'town_hall_name', i.town_hall_name, 'town_hall_address', i.town_hall_address,
      'town_hall_phone', i.town_hall_phone, 'town_hall_website', i.town_hall_website,
      'latitude', i.latitude, 'longitude', i.longitude, 'timezone', i.timezone, 'updated_at', i.updated_at)
    FROM public.site_identity AS i
    WHERE i.id));
$$;
REVOKE ALL ON FUNCTION public.site_config() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.site_config() TO anon, authenticated, service_role;

INSERT INTO public.site_identity (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
-- <<< site_identity
-- 14. PRIVACIDAD DEL DIRECTORIO: VISTA PÚBLICA DE FICHAS ---------------------
-- >>> directory_public_view (bloque idéntico en supabase/template/01_schema.sql; lo comprueba src/lib/directory-public-view-sql.test.ts)

-- 1. Vista pública: solo fichas publicadas y solo lo que la web muestra o necesita para buscar.
--    Fuera: featured_until, fechas internas, home_service, service_area, status y la memoria
--    editorial de las traducciones. La vista se ejecuta con los permisos de su propietario,
--    así que no necesita que el visitante pueda leer la tabla.
CREATE OR REPLACE VIEW public.public_listings WITH (security_barrier = true) AS
SELECT
  l.id,
  l.slug,
  l.type,
  l.name,
  l.short_description,
  l.description,
  l.category_id,
  l.activity,
  l.labels,
  l.cover_url,
  l.cover_path,
  l.gallery_urls,
  l.urgent_24h,
  l.public_phone,
  l.public_phone_2,
  l.public_whatsapp,
  l.public_address,
  l.public_email,
  l.public_website,
  l.public_linkedin,
  l.public_facebook,
  l.public_youtube,
  l.public_x_twitter,
  l.public_instagram,
  l.public_tiktok,
  -- Destacada ahora mismo: la fecha de caducidad no sale de la base.
  (l.featured AND l.featured_until IS NOT NULL AND l.featured_until > now()) AS featured,
  -- Palabras de búsqueda y distinciones, sin la marca reservada de horario oculto.
  ARRAY(
    SELECT t.tag
    FROM unnest(l.tags) WITH ORDINALITY AS t(tag, position)
    WHERE t.tag <> '__ocultar_horario'
    ORDER BY t.position
  ) AS tags,
  ('__ocultar_horario' = ANY (l.tags)) AS hours_hidden,
  -- Solo el texto traducido de cada idioma, sin texto origen, correcciones ni glosario.
  COALESCE(
    (
      SELECT jsonb_object_agg(e.key, jsonb_build_object('content', e.value -> 'content'))
      FROM jsonb_each(CASE WHEN jsonb_typeof(l.translations) = 'object' THEN l.translations ELSE '{}'::jsonb END) AS e
      WHERE jsonb_typeof(e.value -> 'content') = 'object'
    ),
    '{}'::jsonb
  ) AS translations
FROM public.listings AS l
WHERE l.status = 'publicada'::public.listing_status;

REVOKE ALL ON public.public_listings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_listings TO anon, authenticated, service_role;

-- 2. Sin lectura directa de listings para visitantes ni para usuarios sin rol.
--    El administrador conserva "Admins manage listings".
DROP POLICY IF EXISTS "Public reads published listings" ON public.listings;
REVOKE SELECT ON public.listings FROM anon;

-- Defensa adicional: RLS ya impedía a los visitantes escribir en las tablas de fichas;
-- además se retiran esos permisos. Conservan solo la lectura que la web necesita.
-- authenticated no cambia: el panel de administración los usa y RLS los limita al rol admin.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.listings, public.listing_hours, public.listing_photos, public.listing_activities FROM anon;

-- 3. Políticas que comprobaban listings: ahora comprueban la vista pública.
DROP POLICY IF EXISTS "Public reads activities of active categories" ON public.activities;
CREATE POLICY "Public reads activities of active categories" ON public.activities AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.public_listings AS l WHERE l.category_id = activities.category_id));

DROP POLICY IF EXISTS "Public reads activities of published" ON public.listing_activities;
CREATE POLICY "Public reads activities of published" ON public.listing_activities AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.public_listings AS l WHERE l.id = listing_activities.listing_id));

-- El horario que el titular ocultó deja de ser legible.
DROP POLICY IF EXISTS "Public reads hours of published" ON public.listing_hours;
DROP POLICY IF EXISTS "Public reads visible hours of published" ON public.listing_hours;
CREATE POLICY "Public reads visible hours of published" ON public.listing_hours AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.public_listings AS l WHERE l.id = listing_hours.listing_id AND NOT l.hours_hidden));

DROP POLICY IF EXISTS "Public reads photos of published" ON public.listing_photos;
CREATE POLICY "Public reads photos of published" ON public.listing_photos AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.public_listings AS l WHERE l.id = listing_photos.listing_id));

DROP POLICY IF EXISTS "Public reads cover of published listings" ON storage.objects;
CREATE POLICY "Public reads cover of published listings" ON storage.objects AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'listing-photos'::text
    AND EXISTS (
      SELECT 1 FROM public.public_listings AS l
      WHERE l.cover_path = objects.name AND (storage.foldername(objects.name))[1] = l.id::text
    )
  );

DROP POLICY IF EXISTS "Public reads photos of published listings" ON storage.objects;
CREATE POLICY "Public reads photos of published listings" ON storage.objects AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'listing-photos'::text
    AND EXISTS (
      SELECT 1 FROM public.listing_photos AS p
      JOIN public.public_listings AS l ON l.id = p.listing_id
      WHERE p.storage_path = objects.name
    )
  );
-- <<< directory_public_view
-- 15. ESCRITURAS SEGURAS DE FICHAS: GUARDADO DEL ADMINISTRADOR Y APROBACIÓN DEL TITULAR --
-- >>> listing_safe_writes (bloque idéntico en supabase/template/01_schema.sql; lo comprueba src/lib/listing-safe-writes-sql.test.ts)

-- 1. Guardado del administrador con control de concurrencia.
--    Sin p_id se crea la ficha. Con p_id, el UPDATE solo afecta a la fila si su updated_at sigue
--    siendo el que leyó el formulario. Si otra transacción la está cambiando, Postgres espera a
--    que termine y vuelve a evaluar la condición sobre la versión nueva: no hay ventana entre
--    comprobar y escribir. Si no coincide, se cancela todo con el código PT409 (HTTP 409).
--    Se ejecuta con los permisos de quien llama: las políticas de administración siguen mandando.
CREATE OR REPLACE FUNCTION public.save_listing(
  p_listing jsonb,
  p_contact jsonb,
  p_hours jsonb,
  p_activity_ids uuid[],
  p_id uuid DEFAULT NULL,
  p_expected_updated_at timestamp with time zone DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  r public.listings;
  c public.listing_contacts;
  v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo la administración puede guardar fichas' USING ERRCODE = '42501';
  END IF;
  r := jsonb_populate_record(NULL::public.listings, p_listing);
  c := jsonb_populate_record(NULL::public.listing_contacts, coalesce(p_contact, '{}'::jsonb));

  IF p_id IS NULL THEN
    INSERT INTO public.listings (type, category_id, activity, labels, name, slug, short_description,
      description, tags, translations, featured, featured_until, urgent_24h, status, public_website,
      home_service, service_area)
    VALUES (r.type, r.category_id, r.activity, coalesce(r.labels, '{}'), r.name, r.slug,
      coalesce(r.short_description, ''), coalesce(r.description, ''), coalesce(r.tags, '{}'),
      coalesce(r.translations, '{}'::jsonb), coalesce(r.featured, false), r.featured_until,
      coalesce(r.urgent_24h, false), coalesce(r.status, 'borrador'), r.public_website,
      coalesce(r.home_service, false), coalesce(r.service_area, ''))
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.listings AS l SET
      type = r.type,
      category_id = r.category_id,
      activity = r.activity,
      labels = coalesce(r.labels, '{}'),
      name = r.name,
      slug = r.slug,
      short_description = coalesce(r.short_description, ''),
      description = coalesce(r.description, ''),
      tags = coalesce(r.tags, '{}'),
      translations = coalesce(r.translations, '{}'::jsonb),
      featured = coalesce(r.featured, false),
      featured_until = r.featured_until,
      urgent_24h = coalesce(r.urgent_24h, false),
      status = coalesce(r.status, l.status),
      public_website = r.public_website,
      home_service = coalesce(r.home_service, false),
      service_area = coalesce(r.service_area, '')
    WHERE l.id = p_id AND l.updated_at = p_expected_updated_at
    RETURNING l.id INTO v_id;
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'La ficha ha cambiado desde que se abrió el formulario'
        USING ERRCODE = 'PT409', HINT = 'listing_changed';
    END IF;
  END IF;

  INSERT INTO public.listing_contacts AS lc (listing_id, phone, phone_2, whatsapp, address, email,
    linkedin, facebook, youtube, x_twitter, instagram, tiktok, show_phone, show_phone_2,
    show_whatsapp, show_address, show_email, show_linkedin, show_facebook, show_youtube,
    show_x_twitter, show_instagram, show_tiktok, owner_name, owner_contact)
  VALUES (v_id, c.phone, c.phone_2, c.whatsapp, c.address, c.email, c.linkedin, c.facebook,
    c.youtube, c.x_twitter, c.instagram, c.tiktok, coalesce(c.show_phone, false),
    coalesce(c.show_phone_2, false), coalesce(c.show_whatsapp, false),
    coalesce(c.show_address, false), coalesce(c.show_email, false),
    coalesce(c.show_linkedin, false), coalesce(c.show_facebook, false),
    coalesce(c.show_youtube, false), coalesce(c.show_x_twitter, false),
    coalesce(c.show_instagram, false), coalesce(c.show_tiktok, false), c.owner_name,
    c.owner_contact)
  ON CONFLICT (listing_id) DO UPDATE SET
    phone = EXCLUDED.phone, phone_2 = EXCLUDED.phone_2, whatsapp = EXCLUDED.whatsapp,
    address = EXCLUDED.address, email = EXCLUDED.email, linkedin = EXCLUDED.linkedin,
    facebook = EXCLUDED.facebook, youtube = EXCLUDED.youtube, x_twitter = EXCLUDED.x_twitter,
    instagram = EXCLUDED.instagram, tiktok = EXCLUDED.tiktok, show_phone = EXCLUDED.show_phone,
    show_phone_2 = EXCLUDED.show_phone_2, show_whatsapp = EXCLUDED.show_whatsapp,
    show_address = EXCLUDED.show_address, show_email = EXCLUDED.show_email,
    show_linkedin = EXCLUDED.show_linkedin, show_facebook = EXCLUDED.show_facebook,
    show_youtube = EXCLUDED.show_youtube, show_x_twitter = EXCLUDED.show_x_twitter,
    show_instagram = EXCLUDED.show_instagram, show_tiktok = EXCLUDED.show_tiktok,
    owner_name = EXCLUDED.owner_name, owner_contact = EXCLUDED.owner_contact;

  DELETE FROM public.listing_hours AS h WHERE h.listing_id = v_id;
  INSERT INTO public.listing_hours (listing_id, weekday, opens, closes)
  SELECT v_id, h.weekday, h.opens, h.closes
  FROM jsonb_populate_recordset(NULL::public.listing_hours, coalesce(p_hours, '[]'::jsonb)) AS h;

  DELETE FROM public.listing_activities AS a WHERE a.listing_id = v_id;
  INSERT INTO public.listing_activities (listing_id, activity_id, sort_order)
  SELECT v_id, a.activity_id, (a.n - 1)::integer
  FROM unnest(coalesce(p_activity_ids, '{}'::uuid[])) WITH ORDINALITY AS a(activity_id, n);

  RETURN jsonb_build_object('id', v_id,
    'updated_at', (SELECT l.updated_at FROM public.listings AS l WHERE l.id = v_id));
END;
$function$;

-- 2. Aprobación del titular por enlace, todo o nada.
--    Bloquea el enlace (FOR UPDATE) para que dos envíos simultáneos no lo usen dos veces y
--    calcula la marca de horario oculto sobre la fila actual, no sobre una lectura anterior.
--    Solo la usa el servidor con la clave de servicio, después de verificar el hash del token.
CREATE OR REPLACE FUNCTION public.approve_listing_review(
  p_token_hash text,
  p_visibility jsonb,
  p_show_hours boolean,
  p_authorized_fields jsonb,
  p_comment text DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  t public.approval_tokens;
  v public.listing_contacts;
  v_type public.listing_type;
  v_slug text;
BEGIN
  SELECT * INTO t FROM public.approval_tokens AS a WHERE a.token_hash = p_token_hash FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'invalid'); END IF;
  IF t.used_at IS NOT NULL THEN RETURN jsonb_build_object('status', 'used'); END IF;
  IF t.expires_at < now() THEN RETURN jsonb_build_object('status', 'expired'); END IF;
  v := jsonb_populate_record(NULL::public.listing_contacts, coalesce(p_visibility, '{}'::jsonb));

  UPDATE public.listings AS l SET
    status = 'publicada',
    tags = array_remove(l.tags, '__ocultar_horario')
      || CASE WHEN coalesce(p_show_hours, true) THEN '{}'::text[] ELSE ARRAY['__ocultar_horario'] END
  WHERE l.id = t.listing_id
  RETURNING l.type, l.slug INTO v_type, v_slug;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'invalid'); END IF;

  -- Solo los show_*: el trigger sync_public_contact copia a public_* lo autorizado.
  INSERT INTO public.listing_contacts AS lc (listing_id, show_phone, show_phone_2, show_whatsapp,
    show_address, show_email, show_linkedin, show_facebook, show_youtube, show_x_twitter,
    show_instagram, show_tiktok)
  VALUES (t.listing_id, coalesce(v.show_phone, false), coalesce(v.show_phone_2, false),
    coalesce(v.show_whatsapp, false), coalesce(v.show_address, false),
    coalesce(v.show_email, false), coalesce(v.show_linkedin, false),
    coalesce(v.show_facebook, false), coalesce(v.show_youtube, false),
    coalesce(v.show_x_twitter, false), coalesce(v.show_instagram, false),
    coalesce(v.show_tiktok, false))
  ON CONFLICT (listing_id) DO UPDATE SET
    show_phone = EXCLUDED.show_phone, show_phone_2 = EXCLUDED.show_phone_2,
    show_whatsapp = EXCLUDED.show_whatsapp, show_address = EXCLUDED.show_address,
    show_email = EXCLUDED.show_email, show_linkedin = EXCLUDED.show_linkedin,
    show_facebook = EXCLUDED.show_facebook, show_youtube = EXCLUDED.show_youtube,
    show_x_twitter = EXCLUDED.show_x_twitter, show_instagram = EXCLUDED.show_instagram,
    show_tiktok = EXCLUDED.show_tiktok;

  INSERT INTO public.consents (listing_id, request_id, purpose, text_version, granted,
    authorized_fields, method)
  VALUES (t.listing_id, t.request_id, 'publicacion_ficha', 'v1', true, p_authorized_fields,
    'enlace_privado');

  IF coalesce(p_comment, '') <> '' THEN
    INSERT INTO public.listing_requests (listing_id, status, notes, decided_at)
    VALUES (t.listing_id, 'aprobada', p_comment, now());
  END IF;

  UPDATE public.approval_tokens AS a SET used_at = now() WHERE a.id = t.id;
  RETURN jsonb_build_object('status', 'ok', 'type', v_type, 'slug', v_slug);
END;
$function$;

-- 3. Permisos: el guardado, solo para sesiones autenticadas (la función exige el rol admin);
--    la aprobación, solo para el servidor con la clave de servicio.
REVOKE ALL ON FUNCTION public.save_listing(jsonb, jsonb, jsonb, uuid[], uuid, timestamp with time zone) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_listing(jsonb, jsonb, jsonb, uuid[], uuid, timestamp with time zone) TO authenticated;
REVOKE ALL ON FUNCTION public.approve_listing_review(text, jsonb, boolean, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_listing_review(text, jsonb, boolean, jsonb, text) TO service_role;
-- <<< listing_safe_writes
-- 16. IDENTIDAD VISUAL Y CABECERAS DE PÁGINA --
-- >>> identity_branding (bloque idéntico en supabase/template/01_schema.sql; lo comprueba src/lib/identity-branding-sql.test.ts)

ALTER TABLE public.site_identity
  ADD COLUMN postal_code text NOT NULL DEFAULT '',
  ADD COLUMN primary_color text NOT NULL DEFAULT '',
  ADD COLUMN accent_color text NOT NULL DEFAULT '',
  ADD COLUMN logo_path text NOT NULL DEFAULT '',
  ADD COLUMN logo_light_path text NOT NULL DEFAULT '',
  ADD COLUMN icon_path text NOT NULL DEFAULT '',
  ADD COLUMN icon_small_path text NOT NULL DEFAULT '';

ALTER TABLE public.site_identity
  -- Código postal español de cinco cifras, o vacío.
  ADD CONSTRAINT site_identity_postal_code CHECK (postal_code ~ '^([0-9]{5})?$'),
  -- Colores en hexadecimal #rrggbb en minúsculas, o vacío (paleta de la instalación).
  ADD CONSTRAINT site_identity_colors CHECK (
    primary_color ~ '^(#[0-9a-f]{6})?$' AND accent_color ~ '^(#[0-9a-f]{6})?$'),
  -- Solo rutas generadas por el panel: carpeta propia por subida y nombres fijos.
  ADD CONSTRAINT site_identity_asset_paths CHECK (
    logo_path ~ '^(identidad/[0-9a-f-]{36}/logo\.webp)?$'
    AND logo_light_path ~ '^(identidad/[0-9a-f-]{36}/logo-claro\.webp)?$'
    AND icon_path ~ '^(identidad/[0-9a-f-]{36}/icono-512\.png)?$'
    AND icon_small_path ~ '^(identidad/[0-9a-f-]{36}/icono-192\.png)?$');

GRANT SELECT (postal_code, primary_color, accent_color, logo_path, logo_light_path, icon_path,
  icon_small_path) ON public.site_identity TO anon, authenticated;
GRANT UPDATE (postal_code, primary_color, accent_color, logo_path, logo_light_path, icon_path,
  icon_small_path) ON public.site_identity TO authenticated;

-- Cabeceras de las páginas públicas. Una fila por página con imagen; sin fila, la web usa su
-- alternativa visual. Las claves son las páginas comunes del producto, no las de un municipio.
CREATE TABLE public.page_headers (
  page_key text NOT NULL,
  image_path text NOT NULL,
  image_small_path text NOT NULL,
  alt text NOT NULL DEFAULT '',
  focal_x smallint NOT NULL DEFAULT 50,
  focal_y smallint NOT NULL DEFAULT 50,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT page_headers_pkey PRIMARY KEY (page_key),
  CONSTRAINT page_headers_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT page_headers_page_key CHECK (page_key IN
    ('inicio', 'directorio', 'servicios-publicos', 'tramites', 'descubre', 'tablon', 'actualidad')),
  CONSTRAINT page_headers_paths CHECK (
    image_path ~ ('^cabeceras/' || page_key || '/[0-9a-f-]{36}\.webp$')
    AND image_small_path ~ ('^cabeceras/' || page_key || '/[0-9a-f-]{36}-movil\.webp$')),
  CONSTRAINT page_headers_alt CHECK (char_length(alt) <= 200 AND alt !~ '[<>{}[:cntrl:]]'),
  CONSTRAINT page_headers_focal CHECK (focal_x BETWEEN 0 AND 100 AND focal_y BETWEEN 0 AND 100)
);

-- Fecha y autor de cada cambio, como en site_identity.
CREATE OR REPLACE FUNCTION private.page_headers_stamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.page_headers_stamp() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER page_headers_stamp BEFORE INSERT OR UPDATE ON public.page_headers
  FOR EACH ROW EXECUTE FUNCTION private.page_headers_stamp();

REVOKE ALL ON public.page_headers FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.page_headers TO service_role;
GRANT SELECT (page_key, image_path, image_small_path, alt, focal_x, focal_y, updated_at)
  ON public.page_headers TO anon, authenticated;
GRANT INSERT (page_key, image_path, image_small_path, alt, focal_x, focal_y),
  UPDATE (image_path, image_small_path, alt, focal_x, focal_y), DELETE
  ON public.page_headers TO authenticated;
ALTER TABLE public.page_headers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visitors read page headers" ON public.page_headers AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "Admins insert page headers" ON public.page_headers AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins update page headers" ON public.page_headers AS PERMISSIVE FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins delete page headers" ON public.page_headers AS PERMISSIVE FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Storage: bucket privado site-assets.
CREATE POLICY "Admins manage site assets" ON storage.objects AS PERMISSIVE FOR ALL TO authenticated
  USING (bucket_id = 'site-assets'::text AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'site-assets'::text AND public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Visitors read referenced site assets" ON storage.objects AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'site-assets'::text
    AND (
      EXISTS (
        SELECT 1 FROM public.site_identity AS i
        WHERE i.id AND objects.name IN (i.logo_path, i.logo_light_path, i.icon_path, i.icon_small_path)
      )
      OR EXISTS (
        SELECT 1 FROM public.page_headers AS h
        WHERE objects.name IN (h.image_path, h.image_small_path)
      )
    )
  );

-- Configuración pública: la identidad con sus nuevos campos y las cabeceras de página.
CREATE OR REPLACE FUNCTION public.site_config()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'identity', (
      SELECT jsonb_build_object(
        'app_name', i.app_name, 'short_name', i.short_name, 'municipality_name', i.municipality_name,
        'province', i.province, 'region', i.region, 'autonomous_community', i.autonomous_community,
        'demonym_masculine', i.demonym_masculine, 'demonym_feminine', i.demonym_feminine,
        'site_url', i.site_url, 'town_hall_name', i.town_hall_name, 'town_hall_address', i.town_hall_address,
        'town_hall_phone', i.town_hall_phone, 'town_hall_website', i.town_hall_website,
        'latitude', i.latitude, 'longitude', i.longitude, 'timezone', i.timezone,
        'postal_code', i.postal_code, 'primary_color', i.primary_color, 'accent_color', i.accent_color,
        'logo_path', i.logo_path, 'logo_light_path', i.logo_light_path, 'icon_path', i.icon_path,
        'icon_small_path', i.icon_small_path, 'updated_at', i.updated_at)
      FROM public.site_identity AS i
      WHERE i.id),
    'page_headers', coalesce((
      SELECT jsonb_object_agg(h.page_key, jsonb_build_object(
        'image_path', h.image_path, 'image_small_path', h.image_small_path, 'alt', h.alt,
        'focal_x', h.focal_x, 'focal_y', h.focal_y, 'updated_at', h.updated_at))
      FROM public.page_headers AS h), '{}'::jsonb));
$$;
REVOKE ALL ON FUNCTION public.site_config() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.site_config() TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
-- <<< identity_branding
-- 17. FICHAS: DIRECCIÓN, UBICACIÓN, WEB, SERVICIO A DOMICILIO Y PERIODOS DE HORARIO --
-- >>> listing_details (bloque idéntico en supabase/template/01_schema.sql; lo comprueba src/lib/listing-details-sql.test.ts)

ALTER TABLE public.listing_contacts
  ADD COLUMN street text,
  ADD COLUMN street_number text,
  ADD COLUMN postal_code text,
  ADD COLUMN locality text,
  ADD COLUMN latitude numeric(8,5),
  ADD COLUMN longitude numeric(8,5),
  ADD COLUMN show_approximate_location boolean NOT NULL DEFAULT false,
  ADD COLUMN website text,
  ADD COLUMN show_website boolean NOT NULL DEFAULT false;

ALTER TABLE public.listing_contacts
  ADD CONSTRAINT listing_contacts_address_parts CHECK (
    coalesce(char_length(street), 0) <= 120 AND coalesce(char_length(street_number), 0) <= 20
    AND coalesce(char_length(locality), 0) <= 80
    AND (postal_code IS NULL OR postal_code ~ '^[0-9]{5}$')),
  ADD CONSTRAINT listing_contacts_coordinates CHECK (
    (latitude IS NULL) = (longitude IS NULL)
    AND (latitude IS NULL OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))),
  ADD CONSTRAINT listing_contacts_website CHECK (
    website IS NULL OR (char_length(website) <= 300 AND website ~ '^https?://[^[:space:]<>"{}]+$'));

ALTER TABLE public.listings
  ADD COLUMN public_locality text,
  ADD COLUMN public_latitude numeric(8,5),
  ADD COLUMN public_longitude numeric(8,5),
  ADD COLUMN public_location_approximate boolean NOT NULL DEFAULT false,
  ADD COLUMN show_service_area boolean NOT NULL DEFAULT false,
  ADD COLUMN cover_alt text NOT NULL DEFAULT '',
  ADD COLUMN hours_note text NOT NULL DEFAULT '';

ALTER TABLE public.listings
  ADD CONSTRAINT listings_cover_alt CHECK (char_length(cover_alt) <= 200),
  ADD CONSTRAINT listings_hours_note CHECK (char_length(hours_note) <= 300);

-- El trigger copia a listings.public_* solo lo autorizado. La dirección exacta se compone con los
-- campos estructurados si hay calle; si no, se usa la dirección libre de siempre. La ubicación
-- aproximada publica la localidad y coordenadas redondeadas a dos decimales (alrededor de 1 km).
CREATE OR REPLACE FUNCTION public.sync_public_contact()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_street text;
  v_locality text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.listings SET
      public_phone = NULL,
      public_phone_2 = NULL,
      public_whatsapp = NULL,
      public_address = NULL,
      public_email = NULL,
      public_website = NULL,
      public_linkedin = NULL,
      public_facebook = NULL,
      public_youtube = NULL,
      public_x_twitter = NULL,
      public_instagram = NULL,
      public_tiktok = NULL,
      public_locality = NULL,
      public_latitude = NULL,
      public_longitude = NULL,
      public_location_approximate = false
    WHERE id = OLD.listing_id;
    RETURN OLD;
  END IF;

  v_street := nullif(btrim(concat_ws(' ', nullif(btrim(NEW.street), ''), nullif(btrim(NEW.street_number), ''))), '');
  v_locality := nullif(btrim(concat_ws(' ', nullif(btrim(NEW.postal_code), ''), nullif(btrim(NEW.locality), ''))), '');

  UPDATE public.listings SET
    public_phone = CASE WHEN NEW.show_phone THEN NEW.phone END,
    public_phone_2 = CASE WHEN NEW.show_phone_2 THEN NEW.phone_2 END,
    public_whatsapp = CASE WHEN NEW.show_whatsapp THEN NEW.whatsapp END,
    public_address = CASE WHEN NEW.show_address THEN
      CASE WHEN v_street IS NOT NULL THEN concat_ws(', ', v_street, v_locality) ELSE NEW.address END END,
    public_email = CASE WHEN NEW.show_email THEN NEW.email END,
    public_website = CASE WHEN NEW.show_website THEN NEW.website END,
    public_linkedin = CASE WHEN NEW.show_linkedin THEN NEW.linkedin END,
    public_facebook = CASE WHEN NEW.show_facebook THEN NEW.facebook END,
    public_youtube = CASE WHEN NEW.show_youtube THEN NEW.youtube END,
    public_x_twitter = CASE WHEN NEW.show_x_twitter THEN NEW.x_twitter END,
    public_instagram = CASE WHEN NEW.show_instagram THEN NEW.instagram END,
    public_tiktok = CASE WHEN NEW.show_tiktok THEN NEW.tiktok END,
    public_locality = CASE WHEN NEW.show_address OR NEW.show_approximate_location THEN v_locality END,
    public_latitude = CASE WHEN NEW.show_address THEN NEW.latitude
      WHEN NEW.show_approximate_location THEN round(NEW.latitude, 2) END,
    public_longitude = CASE WHEN NEW.show_address THEN NEW.longitude
      WHEN NEW.show_approximate_location THEN round(NEW.longitude, 2) END,
    public_location_approximate = (NOT NEW.show_address AND NEW.show_approximate_location)
  WHERE id = NEW.listing_id;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.sync_public_contact() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_public_contact() TO service_role;

-- La web pasa a la parte privada. Las fichas sin fila de contacto reciben una que reproduce
-- exactamente lo que ya publicaban, para que el trigger no borre ningún dato público.
INSERT INTO public.listing_contacts AS lc (listing_id, phone, show_phone, phone_2, show_phone_2,
  whatsapp, show_whatsapp, address, show_address, email, show_email, linkedin, show_linkedin,
  facebook, show_facebook, youtube, show_youtube, x_twitter, show_x_twitter, instagram,
  show_instagram, tiktok, show_tiktok, website, show_website)
SELECT l.id, l.public_phone, l.public_phone IS NOT NULL, l.public_phone_2, l.public_phone_2 IS NOT NULL,
  l.public_whatsapp, l.public_whatsapp IS NOT NULL, l.public_address, l.public_address IS NOT NULL,
  l.public_email, l.public_email IS NOT NULL, l.public_linkedin, l.public_linkedin IS NOT NULL,
  l.public_facebook, l.public_facebook IS NOT NULL, l.public_youtube, l.public_youtube IS NOT NULL,
  l.public_x_twitter, l.public_x_twitter IS NOT NULL, l.public_instagram, l.public_instagram IS NOT NULL,
  l.public_tiktok, l.public_tiktok IS NOT NULL, l.public_website, true
FROM public.listings AS l
WHERE nullif(btrim(l.public_website), '') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.listing_contacts AS c WHERE c.listing_id = l.id);

UPDATE public.listing_contacts AS c SET website = l.public_website, show_website = true
FROM public.listings AS l
WHERE l.id = c.listing_id AND nullif(btrim(l.public_website), '') IS NOT NULL AND c.website IS NULL;

-- Vista pública: mismas columnas en el mismo orden y, al final, las nuevas.
-- El servicio a domicilio y la zona solo salen si la administración o el titular lo autorizan.
CREATE OR REPLACE VIEW public.public_listings WITH (security_barrier = true) AS
SELECT
  l.id,
  l.slug,
  l.type,
  l.name,
  l.short_description,
  l.description,
  l.category_id,
  l.activity,
  l.labels,
  l.cover_url,
  l.cover_path,
  l.gallery_urls,
  l.urgent_24h,
  l.public_phone,
  l.public_phone_2,
  l.public_whatsapp,
  l.public_address,
  l.public_email,
  l.public_website,
  l.public_linkedin,
  l.public_facebook,
  l.public_youtube,
  l.public_x_twitter,
  l.public_instagram,
  l.public_tiktok,
  (l.featured AND l.featured_until IS NOT NULL AND l.featured_until > now()) AS featured,
  ARRAY(
    SELECT t.tag
    FROM unnest(l.tags) WITH ORDINALITY AS t(tag, position)
    WHERE t.tag <> '__ocultar_horario'
    ORDER BY t.position
  ) AS tags,
  ('__ocultar_horario' = ANY (l.tags)) AS hours_hidden,
  COALESCE(
    (
      SELECT jsonb_object_agg(e.key, jsonb_build_object('content', e.value -> 'content'))
      FROM jsonb_each(CASE WHEN jsonb_typeof(l.translations) = 'object' THEN l.translations ELSE '{}'::jsonb END) AS e
      WHERE jsonb_typeof(e.value -> 'content') = 'object'
    ),
    '{}'::jsonb
  ) AS translations,
  l.public_locality,
  l.public_latitude,
  l.public_longitude,
  l.public_location_approximate,
  (l.show_service_area AND l.home_service) AS public_home_service,
  CASE WHEN l.show_service_area THEN l.service_area ELSE '' END AS public_service_area,
  l.cover_alt,
  CASE WHEN '__ocultar_horario' = ANY (l.tags) THEN '' ELSE l.hours_note END AS hours_note
FROM public.listings AS l
WHERE l.status = 'publicada'::public.listing_status;

REVOKE ALL ON public.public_listings FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_listings TO anon, authenticated, service_role;

-- Periodos de horario: cierre o vacaciones (sin franjas: cerrado) y temporada (con sus franjas en
-- listing_hours.period_id). El horario habitual son las franjas sin periodo.
CREATE TABLE public.listing_hour_periods (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  kind text NOT NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  label text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listing_hour_periods_pkey PRIMARY KEY (id),
  CONSTRAINT listing_hour_periods_id_listing_key UNIQUE (id, listing_id),
  CONSTRAINT listing_hour_periods_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE,
  CONSTRAINT listing_hour_periods_kind CHECK (kind IN ('cierre', 'vacaciones', 'temporada')),
  CONSTRAINT listing_hour_periods_dates CHECK (ends_on >= starts_on AND ends_on - starts_on <= 366),
  CONSTRAINT listing_hour_periods_label CHECK (char_length(label) <= 80 AND label !~ '[<>{}[:cntrl:]]')
);
CREATE INDEX listing_hour_periods_listing_idx ON public.listing_hour_periods USING btree (listing_id);

ALTER TABLE public.listing_hours ADD COLUMN period_id uuid;
ALTER TABLE public.listing_hours ADD CONSTRAINT listing_hours_period_fkey
  FOREIGN KEY (period_id, listing_id) REFERENCES public.listing_hour_periods(id, listing_id) ON DELETE CASCADE;

REVOKE ALL ON public.listing_hour_periods FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.listing_hour_periods TO service_role;
GRANT SELECT ON public.listing_hour_periods TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_hour_periods TO authenticated;
ALTER TABLE public.listing_hour_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage hour periods" ON public.listing_hour_periods AS PERMISSIVE FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Public reads visible hour periods of published" ON public.listing_hour_periods AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.public_listings AS l WHERE l.id = listing_hour_periods.listing_id AND NOT l.hours_hidden));

-- Guardado del administrador: misma transacción y mismo control de versión que antes, con los
-- campos nuevos. p_periods NULL deja los periodos como están (formularios antiguos).
DROP FUNCTION public.save_listing(jsonb, jsonb, jsonb, uuid[], uuid, timestamp with time zone);
CREATE FUNCTION public.save_listing(
  p_listing jsonb,
  p_contact jsonb,
  p_hours jsonb,
  p_activity_ids uuid[],
  p_id uuid DEFAULT NULL,
  p_expected_updated_at timestamp with time zone DEFAULT NULL,
  p_periods jsonb DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  r public.listings;
  c public.listing_contacts;
  v_id uuid;
  v_period uuid;
  p jsonb;
  v_sort integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo la administración puede guardar fichas' USING ERRCODE = '42501';
  END IF;
  r := jsonb_populate_record(NULL::public.listings, p_listing);
  c := jsonb_populate_record(NULL::public.listing_contacts, coalesce(p_contact, '{}'::jsonb));

  IF p_id IS NULL THEN
    INSERT INTO public.listings (type, category_id, activity, labels, name, slug, short_description,
      description, tags, translations, featured, featured_until, urgent_24h, status,
      home_service, service_area, show_service_area, cover_alt, hours_note)
    VALUES (r.type, r.category_id, r.activity, coalesce(r.labels, '{}'), r.name, r.slug,
      coalesce(r.short_description, ''), coalesce(r.description, ''), coalesce(r.tags, '{}'),
      coalesce(r.translations, '{}'::jsonb), coalesce(r.featured, false), r.featured_until,
      coalesce(r.urgent_24h, false), coalesce(r.status, 'borrador'),
      coalesce(r.home_service, false), coalesce(r.service_area, ''),
      coalesce(r.show_service_area, false), coalesce(r.cover_alt, ''), coalesce(r.hours_note, ''))
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.listings AS l SET
      type = r.type,
      category_id = r.category_id,
      activity = r.activity,
      labels = coalesce(r.labels, '{}'),
      name = r.name,
      slug = r.slug,
      short_description = coalesce(r.short_description, ''),
      description = coalesce(r.description, ''),
      tags = coalesce(r.tags, '{}'),
      translations = coalesce(r.translations, '{}'::jsonb),
      featured = coalesce(r.featured, false),
      featured_until = r.featured_until,
      urgent_24h = coalesce(r.urgent_24h, false),
      status = coalesce(r.status, l.status),
      home_service = coalesce(r.home_service, false),
      service_area = coalesce(r.service_area, ''),
      show_service_area = CASE WHEN p_listing ? 'show_service_area' THEN coalesce(r.show_service_area, false) ELSE l.show_service_area END,
      cover_alt = CASE WHEN p_listing ? 'cover_alt' THEN coalesce(r.cover_alt, '') ELSE l.cover_alt END,
      hours_note = CASE WHEN p_listing ? 'hours_note' THEN coalesce(r.hours_note, '') ELSE l.hours_note END
    WHERE l.id = p_id AND l.updated_at = p_expected_updated_at
    RETURNING l.id INTO v_id;
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'La ficha ha cambiado desde que se abrió el formulario'
        USING ERRCODE = 'PT409', HINT = 'listing_changed';
    END IF;
  END IF;

  INSERT INTO public.listing_contacts AS lc (listing_id, phone, phone_2, whatsapp, address, email,
    linkedin, facebook, youtube, x_twitter, instagram, tiktok, show_phone, show_phone_2,
    show_whatsapp, show_address, show_email, show_linkedin, show_facebook, show_youtube,
    show_x_twitter, show_instagram, show_tiktok, owner_name, owner_contact, street, street_number,
    postal_code, locality, latitude, longitude, show_approximate_location, website, show_website)
  VALUES (v_id, c.phone, c.phone_2, c.whatsapp, c.address, c.email, c.linkedin, c.facebook,
    c.youtube, c.x_twitter, c.instagram, c.tiktok, coalesce(c.show_phone, false),
    coalesce(c.show_phone_2, false), coalesce(c.show_whatsapp, false),
    coalesce(c.show_address, false), coalesce(c.show_email, false),
    coalesce(c.show_linkedin, false), coalesce(c.show_facebook, false),
    coalesce(c.show_youtube, false), coalesce(c.show_x_twitter, false),
    coalesce(c.show_instagram, false), coalesce(c.show_tiktok, false), c.owner_name,
    c.owner_contact, c.street, c.street_number, c.postal_code, c.locality, c.latitude, c.longitude,
    coalesce(c.show_approximate_location, false), c.website, coalesce(c.show_website, false))
  ON CONFLICT (listing_id) DO UPDATE SET
    phone = EXCLUDED.phone, phone_2 = EXCLUDED.phone_2, whatsapp = EXCLUDED.whatsapp,
    address = EXCLUDED.address, email = EXCLUDED.email, linkedin = EXCLUDED.linkedin,
    facebook = EXCLUDED.facebook, youtube = EXCLUDED.youtube, x_twitter = EXCLUDED.x_twitter,
    instagram = EXCLUDED.instagram, tiktok = EXCLUDED.tiktok, show_phone = EXCLUDED.show_phone,
    show_phone_2 = EXCLUDED.show_phone_2, show_whatsapp = EXCLUDED.show_whatsapp,
    show_address = EXCLUDED.show_address, show_email = EXCLUDED.show_email,
    show_linkedin = EXCLUDED.show_linkedin, show_facebook = EXCLUDED.show_facebook,
    show_youtube = EXCLUDED.show_youtube, show_x_twitter = EXCLUDED.show_x_twitter,
    show_instagram = EXCLUDED.show_instagram, show_tiktok = EXCLUDED.show_tiktok,
    owner_name = EXCLUDED.owner_name, owner_contact = EXCLUDED.owner_contact,
    street = CASE WHEN p_contact ? 'street' THEN EXCLUDED.street ELSE lc.street END,
    street_number = CASE WHEN p_contact ? 'street_number' THEN EXCLUDED.street_number ELSE lc.street_number END,
    postal_code = CASE WHEN p_contact ? 'postal_code' THEN EXCLUDED.postal_code ELSE lc.postal_code END,
    locality = CASE WHEN p_contact ? 'locality' THEN EXCLUDED.locality ELSE lc.locality END,
    latitude = CASE WHEN p_contact ? 'latitude' THEN EXCLUDED.latitude ELSE lc.latitude END,
    longitude = CASE WHEN p_contact ? 'longitude' THEN EXCLUDED.longitude ELSE lc.longitude END,
    show_approximate_location = CASE WHEN p_contact ? 'show_approximate_location'
      THEN EXCLUDED.show_approximate_location ELSE lc.show_approximate_location END,
    website = CASE WHEN p_contact ? 'website' THEN EXCLUDED.website ELSE lc.website END,
    show_website = CASE WHEN p_contact ? 'show_website' THEN EXCLUDED.show_website ELSE lc.show_website END;

  -- Horario habitual: franjas sin periodo.
  DELETE FROM public.listing_hours AS h WHERE h.listing_id = v_id AND h.period_id IS NULL;
  INSERT INTO public.listing_hours (listing_id, weekday, opens, closes)
  SELECT v_id, h.weekday, h.opens, h.closes
  FROM jsonb_populate_recordset(NULL::public.listing_hours, coalesce(p_hours, '[]'::jsonb)) AS h;

  IF p_periods IS NOT NULL THEN
    IF jsonb_typeof(p_periods) <> 'array' OR jsonb_array_length(p_periods) > 20 THEN
      RAISE EXCEPTION 'Periodos de horario no válidos' USING ERRCODE = '22023';
    END IF;
    DELETE FROM public.listing_hour_periods AS hp WHERE hp.listing_id = v_id;
    FOR p IN SELECT value FROM jsonb_array_elements(p_periods) LOOP
      IF coalesce(p ->> 'kind', '') <> 'temporada'
        AND jsonb_array_length(coalesce(p -> 'hours', '[]'::jsonb)) > 0 THEN
        RAISE EXCEPTION 'Un cierre o unas vacaciones no llevan franjas horarias' USING ERRCODE = '22023';
      END IF;
      INSERT INTO public.listing_hour_periods (listing_id, kind, starts_on, ends_on, label, sort_order)
      VALUES (v_id, p ->> 'kind', (p ->> 'starts_on')::date, (p ->> 'ends_on')::date,
        coalesce(p ->> 'label', ''), v_sort)
      RETURNING id INTO v_period;
      INSERT INTO public.listing_hours (listing_id, weekday, opens, closes, period_id)
      SELECT v_id, h.weekday, h.opens, h.closes, v_period
      FROM jsonb_populate_recordset(NULL::public.listing_hours, coalesce(p -> 'hours', '[]'::jsonb)) AS h;
      v_sort := v_sort + 1;
    END LOOP;
  END IF;

  DELETE FROM public.listing_activities AS a WHERE a.listing_id = v_id;
  INSERT INTO public.listing_activities (listing_id, activity_id, sort_order)
  SELECT v_id, a.activity_id, (a.n - 1)::integer
  FROM unnest(coalesce(p_activity_ids, '{}'::uuid[])) WITH ORDINALITY AS a(activity_id, n);

  RETURN jsonb_build_object('id', v_id,
    'updated_at', (SELECT l.updated_at FROM public.listings AS l WHERE l.id = v_id));
END;
$function$;
REVOKE ALL ON FUNCTION public.save_listing(jsonb, jsonb, jsonb, uuid[], uuid, timestamp with time zone, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_listing(jsonb, jsonb, jsonb, uuid[], uuid, timestamp with time zone, jsonb) TO authenticated;
NOTIFY pgrst, 'reload schema';
-- <<< listing_details
-- 18. REVISIÓN DEL TITULAR, ESTADOS Y TRAZABILIDAD --
-- >>> listing_review_flow (bloque idéntico en supabase/template/01_schema.sql; lo comprueba src/lib/listing-review-flow-sql.test.ts)

ALTER TABLE public.site_settings ADD COLUMN publish_on_owner_approval boolean NOT NULL DEFAULT true;

CREATE TABLE public.listing_events (
  id bigint GENERATED ALWAYS AS IDENTITY,
  listing_id uuid NOT NULL,
  kind text NOT NULL,
  from_status public.listing_status,
  to_status public.listing_status,
  note text NOT NULL DEFAULT '',
  actor uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT listing_events_pkey PRIMARY KEY (id),
  CONSTRAINT listing_events_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.listings(id) ON DELETE CASCADE,
  CONSTRAINT listing_events_kind CHECK (kind IN ('estado', 'enlace', 'aprobacion', 'correcciones', 'retirada')),
  CONSTRAINT listing_events_note CHECK (char_length(note) <= 1000)
);
CREATE INDEX listing_events_listing_idx ON public.listing_events USING btree (listing_id, id DESC);

REVOKE ALL ON public.listing_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.listing_events TO service_role;
GRANT SELECT ON public.listing_events TO authenticated;
ALTER TABLE public.listing_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read listing events" ON public.listing_events AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Aprobaciones anteriores a esta migración: quedan como aprobadas en el registro.
INSERT INTO public.listing_events (listing_id, kind, note, created_at)
SELECT c.listing_id, 'aprobacion', 'Aprobación registrada antes del historial', c.granted_at
FROM public.consents AS c
WHERE c.granted AND c.withdrawn_at IS NULL
ORDER BY c.granted_at;

CREATE OR REPLACE FUNCTION public.listing_review_state(p_listing_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT coalesce((
    SELECT CASE e.kind
      WHEN 'aprobacion' THEN 'aprobada'
      WHEN 'correcciones' THEN 'correcciones'
      WHEN 'retirada' THEN 'retirada'
      ELSE CASE WHEN EXISTS (
        SELECT 1 FROM public.approval_tokens AS t
        WHERE t.listing_id = p_listing_id AND t.used_at IS NULL AND t.expires_at > now()
      ) THEN 'en_revision' ELSE 'enlace_caducado' END
    END
    FROM public.listing_events AS e
    WHERE e.listing_id = p_listing_id AND e.kind IN ('enlace', 'aprobacion', 'correcciones', 'retirada')
    ORDER BY e.id DESC
    LIMIT 1), 'sin_enviar');
$$;
REVOKE ALL ON FUNCTION public.listing_review_state(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.listing_review_state(uuid) TO authenticated, service_role;

-- Regla de publicación. SECURITY DEFINER para leer el registro sea quien sea quien guarda.
CREATE OR REPLACE FUNCTION private.listings_publish_rule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_state text;
BEGIN
  IF NEW.status <> 'publicada'::public.listing_status
    OR (TG_OP = 'UPDATE' AND OLD.status = 'publicada'::public.listing_status) THEN
    RETURN NEW;
  END IF;
  IF NEW.type = 'publico'::public.listing_type THEN RETURN NEW; END IF;
  v_state := public.listing_review_state(NEW.id);
  IF v_state = 'aprobada' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'oculta'::public.listing_status
    AND OLD.published_at IS NOT NULL AND v_state <> 'retirada' THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'La ficha necesita la aprobación del titular antes de publicarse'
    USING ERRCODE = 'PT422', HINT = 'owner_approval_required';
END;
$$;
REVOKE ALL ON FUNCTION private.listings_publish_rule() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER listings_publish_rule BEFORE INSERT OR UPDATE OF status ON public.listings
  FOR EACH ROW EXECUTE FUNCTION private.listings_publish_rule();

-- Registro de cambios de estado.
CREATE OR REPLACE FUNCTION private.listings_status_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.listing_events (listing_id, kind, from_status, to_status, actor)
    VALUES (NEW.id, 'estado', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status END, NEW.status, auth.uid());
  END IF;
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION private.listings_status_log() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER listings_status_log AFTER INSERT OR UPDATE OF status ON public.listings
  FOR EACH ROW EXECUTE FUNCTION private.listings_status_log();

-- Un enlace nuevo anula los anteriores sin usar de la misma ficha y queda en el registro.
CREATE OR REPLACE FUNCTION private.approval_tokens_issue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.approval_tokens AS t SET used_at = now()
  WHERE t.listing_id = NEW.listing_id AND t.id <> NEW.id AND t.used_at IS NULL;
  INSERT INTO public.listing_events (listing_id, kind, note, actor)
  VALUES (NEW.listing_id, 'enlace', 'Caduca el ' || to_char(NEW.expires_at AT TIME ZONE 'UTC', 'YYYY-MM-DD'), auth.uid());
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION private.approval_tokens_issue() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER approval_tokens_issue AFTER INSERT ON public.approval_tokens
  FOR EACH ROW EXECUTE FUNCTION private.approval_tokens_issue();

-- Aprobación del titular, todo o nada. Mismo bloqueo del enlace que antes, más la versión de las
-- condiciones, la copia de lo revisado y los permisos nuevos (web, ubicación aproximada, zona).
DROP FUNCTION public.approve_listing_review(text, jsonb, boolean, jsonb, text);
CREATE FUNCTION public.approve_listing_review(
  p_token_hash text,
  p_visibility jsonb,
  p_show_hours boolean,
  p_authorized_fields jsonb,
  p_comment text DEFAULT NULL,
  p_terms_version text DEFAULT 'v1'
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  t public.approval_tokens;
  v public.listing_contacts;
  l public.listings;
  v_request uuid;
  v_publish boolean;
  v_status public.listing_status;
BEGIN
  SELECT * INTO t FROM public.approval_tokens AS a WHERE a.token_hash = p_token_hash FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'invalid'); END IF;
  IF t.used_at IS NOT NULL THEN RETURN jsonb_build_object('status', 'used'); END IF;
  IF t.expires_at < now() THEN RETURN jsonb_build_object('status', 'expired'); END IF;
  IF coalesce(btrim(p_terms_version), '') = '' OR char_length(p_terms_version) > 40 THEN
    RETURN jsonb_build_object('status', 'invalid');
  END IF;
  SELECT * INTO l FROM public.listings AS x WHERE x.id = t.listing_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'invalid'); END IF;
  v := jsonb_populate_record(NULL::public.listing_contacts, coalesce(p_visibility, '{}'::jsonb));

  INSERT INTO public.listing_requests (listing_id, status, notes, snapshot, decided_at)
  VALUES (t.listing_id, 'aprobada', nullif(btrim(coalesce(p_comment, '')), ''),
    jsonb_build_object('listing', to_jsonb(l) - 'translations',
      'contact', (SELECT to_jsonb(c) FROM public.listing_contacts AS c WHERE c.listing_id = t.listing_id),
      'visibility', coalesce(p_visibility, '{}'::jsonb), 'show_hours', coalesce(p_show_hours, true)),
    now())
  RETURNING id INTO v_request;

  INSERT INTO public.consents (listing_id, request_id, purpose, text_version, granted,
    authorized_fields, method)
  VALUES (t.listing_id, v_request, 'publicacion_ficha', p_terms_version, true, p_authorized_fields,
    'enlace_privado');

  -- Primero el registro: la regla de publicación ya ve la aprobación.
  INSERT INTO public.listing_events (listing_id, kind, note)
  VALUES (t.listing_id, 'aprobacion', left(coalesce(p_comment, ''), 1000));

  -- Solo los show_*: el trigger sync_public_contact copia a public_* lo autorizado.
  INSERT INTO public.listing_contacts AS lc (listing_id, show_phone, show_phone_2, show_whatsapp,
    show_address, show_email, show_linkedin, show_facebook, show_youtube, show_x_twitter,
    show_instagram, show_tiktok, show_website, show_approximate_location)
  VALUES (t.listing_id, coalesce(v.show_phone, false), coalesce(v.show_phone_2, false),
    coalesce(v.show_whatsapp, false), coalesce(v.show_address, false),
    coalesce(v.show_email, false), coalesce(v.show_linkedin, false),
    coalesce(v.show_facebook, false), coalesce(v.show_youtube, false),
    coalesce(v.show_x_twitter, false), coalesce(v.show_instagram, false),
    coalesce(v.show_tiktok, false), coalesce(v.show_website, false),
    coalesce(v.show_approximate_location, false))
  ON CONFLICT (listing_id) DO UPDATE SET
    show_phone = EXCLUDED.show_phone, show_phone_2 = EXCLUDED.show_phone_2,
    show_whatsapp = EXCLUDED.show_whatsapp, show_address = EXCLUDED.show_address,
    show_email = EXCLUDED.show_email, show_linkedin = EXCLUDED.show_linkedin,
    show_facebook = EXCLUDED.show_facebook, show_youtube = EXCLUDED.show_youtube,
    show_x_twitter = EXCLUDED.show_x_twitter, show_instagram = EXCLUDED.show_instagram,
    show_tiktok = EXCLUDED.show_tiktok, show_website = EXCLUDED.show_website,
    show_approximate_location = EXCLUDED.show_approximate_location;

  SELECT coalesce((SELECT s.publish_on_owner_approval FROM public.site_settings AS s WHERE s.id), true)
    INTO v_publish;
  v_status := CASE
    WHEN l.status = 'publicada'::public.listing_status THEN l.status
    WHEN l.status IN ('borrador'::public.listing_status, 'pendiente'::public.listing_status)
      THEN CASE WHEN v_publish THEN 'publicada'::public.listing_status ELSE 'pendiente'::public.listing_status END
    ELSE l.status
  END;

  UPDATE public.listings AS x SET
    status = v_status,
    show_service_area = coalesce((p_visibility ->> 'show_service_area')::boolean, false),
    tags = array_remove(x.tags, '__ocultar_horario')
      || CASE WHEN coalesce(p_show_hours, true) THEN '{}'::text[] ELSE ARRAY['__ocultar_horario'] END
  WHERE x.id = t.listing_id;

  UPDATE public.approval_tokens AS a SET used_at = now() WHERE a.id = t.id;
  RETURN jsonb_build_object('status', 'ok', 'type', l.type, 'slug', l.slug,
    'published', v_status = 'publicada'::public.listing_status);
END;
$function$;

-- El titular pide correcciones. Usa el enlace (un solo uso), guarda su mensaje y una copia de lo
-- que vio, avisa en la bandeja de avisos y devuelve la ficha a borrador si aún no estaba publicada.
CREATE OR REPLACE FUNCTION public.request_listing_corrections(p_token_hash text, p_message text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  t public.approval_tokens;
  l public.listings;
  v_message text := btrim(coalesce(p_message, ''));
BEGIN
  SELECT * INTO t FROM public.approval_tokens AS a WHERE a.token_hash = p_token_hash FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'invalid'); END IF;
  IF t.used_at IS NOT NULL THEN RETURN jsonb_build_object('status', 'used'); END IF;
  IF t.expires_at < now() THEN RETURN jsonb_build_object('status', 'expired'); END IF;
  IF char_length(v_message) < 5 OR char_length(v_message) > 1000 THEN
    RETURN jsonb_build_object('status', 'invalid_message');
  END IF;
  SELECT * INTO l FROM public.listings AS x WHERE x.id = t.listing_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'invalid'); END IF;

  INSERT INTO public.listing_requests (listing_id, status, notes, snapshot, decided_at)
  VALUES (t.listing_id, 'devuelta', v_message,
    jsonb_build_object('listing', to_jsonb(l) - 'translations',
      'contact', (SELECT to_jsonb(c) FROM public.listing_contacts AS c WHERE c.listing_id = t.listing_id)),
    now());
  INSERT INTO public.listing_reports (listing_id, message, contact)
  VALUES (t.listing_id, v_message, 'Titular (enlace de revisión)');
  INSERT INTO public.listing_events (listing_id, kind, note) VALUES (t.listing_id, 'correcciones', v_message);

  IF l.status = 'pendiente'::public.listing_status THEN
    UPDATE public.listings AS x SET status = 'borrador' WHERE x.id = t.listing_id;
  END IF;
  UPDATE public.approval_tokens AS a SET used_at = now() WHERE a.id = t.id;
  RETURN jsonb_build_object('status', 'ok');
END;
$function$;

-- Retirada del consentimiento, registrada por la administración cuando el titular lo pide.
-- SECURITY DEFINER porque consents y listing_requests ya no admiten escrituras del navegador;
-- comprueba el rol antes de tocar nada.
CREATE OR REPLACE FUNCTION public.withdraw_listing_consent(p_listing_id uuid, p_note text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  l public.listings;
  v_note text := left(btrim(coalesce(p_note, '')), 1000);
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo la administración puede registrar la retirada' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO l FROM public.listings AS x WHERE x.id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'invalid'); END IF;

  UPDATE public.consents AS c SET withdrawn_at = now()
  WHERE c.listing_id = p_listing_id AND c.withdrawn_at IS NULL;
  UPDATE public.listing_contacts AS c SET show_phone = false, show_phone_2 = false,
    show_whatsapp = false, show_address = false, show_email = false, show_linkedin = false,
    show_facebook = false, show_youtube = false, show_x_twitter = false, show_instagram = false,
    show_tiktok = false, show_website = false, show_approximate_location = false
  WHERE c.listing_id = p_listing_id;
  UPDATE public.approval_tokens AS a SET used_at = now()
  WHERE a.listing_id = p_listing_id AND a.used_at IS NULL;
  INSERT INTO public.listing_requests (listing_id, status, notes, decided_at)
  VALUES (p_listing_id, 'retirada', nullif(v_note, ''), now());
  INSERT INTO public.listing_events (listing_id, kind, note, actor)
  VALUES (p_listing_id, 'retirada', v_note, auth.uid());
  UPDATE public.listings AS x SET
    show_service_area = false,
    status = CASE WHEN x.status = 'publicada'::public.listing_status THEN 'oculta'::public.listing_status ELSE x.status END
  WHERE x.id = p_listing_id;
  RETURN jsonb_build_object('status', 'ok');
END;
$function$;

-- Permisos: las funciones del titular, solo para el servidor; la retirada, para sesiones
-- autenticadas (la función exige el rol admin).
REVOKE ALL ON FUNCTION public.approve_listing_review(text, jsonb, boolean, jsonb, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_listing_review(text, jsonb, boolean, jsonb, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.request_listing_corrections(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_listing_corrections(text, text) TO service_role;
REVOKE ALL ON FUNCTION public.withdraw_listing_consent(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.withdraw_listing_consent(uuid, text) TO authenticated, service_role;

-- Consentimientos y solicitudes: la administración solo los lee; los escriben las funciones.
DROP POLICY IF EXISTS "Admins manage consents" ON public.consents;
CREATE POLICY "Admins read consents" ON public.consents AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "Admins manage requests" ON public.listing_requests;
CREATE POLICY "Admins read requests" ON public.listing_requests AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.consents, public.listing_requests FROM anon, authenticated;
NOTIFY pgrst, 'reload schema';
-- <<< listing_review_flow
-- >>> site_structure (bloque idéntico en supabase/template/01_schema.sql; lo comprueba src/lib/product-migrations-sql.test.ts)

-- Fecha y autor de cada cambio en las tablas de estructura y en los borradores.
CREATE OR REPLACE FUNCTION private.site_structure_stamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.site_structure_stamp() FROM PUBLIC, anon, authenticated;

-- Entradas configurables del menú. Portada y Directorio son fijos y no se guardan aquí.
-- En una página, enabled decide si la página existe; en guia-tramites, solo si aparece en el menú.
CREATE TABLE public.site_menu (
  entry_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  sort_order smallint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT site_menu_pkey PRIMARY KEY (entry_key),
  CONSTRAINT site_menu_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT site_menu_entry_key CHECK (entry_key IN ('servicios-publicos', 'actualidad', 'descubre', 'guia-tramites')),
  CONSTRAINT site_menu_sort_order CHECK (sort_order BETWEEN 0 AND 99)
);

-- Secciones de cada página. Portada (Accesos directos, permanente) y Directorio no tienen filas.
CREATE TABLE public.page_sections (
  page_key text NOT NULL,
  section_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  sort_order smallint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT page_sections_pkey PRIMARY KEY (page_key, section_key),
  CONSTRAINT page_sections_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT page_sections_catalog CHECK (
    (page_key = 'servicios-publicos' AND section_key IN ('emergencias', 'vida-cotidiana', 'tramites', 'transporte'))
    OR (page_key = 'actualidad' AND section_key IN ('noticias', 'avisos', 'agenda', 'fiestas'))
    OR (page_key = 'descubre' AND section_key IN ('historia-patrimonio', 'lugares-interes', 'miradores', 'entorno',
      'rutas-senderos', 'cultura-tradiciones', 'gastronomia', 'consejos-vecino', 'donde-comer', 'donde-dormir'))),
  CONSTRAINT page_sections_sort_order CHECK (sort_order BETWEEN 0 AND 99)
);

-- Accesos directos adicionales de la portada, detrás de los automáticos. Siempre con destino válido.
CREATE TABLE public.home_shortcuts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_path text NOT NULL,
  image_alt text NOT NULL DEFAULT '',
  href text NOT NULL,
  visible boolean NOT NULL DEFAULT true,
  sort_order smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT home_shortcuts_pkey PRIMARY KEY (id),
  CONSTRAINT home_shortcuts_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT home_shortcuts_title CHECK (char_length(btrim(title)) BETWEEN 1 AND 60 AND title !~ '[<>{}[:cntrl:]]'),
  CONSTRAINT home_shortcuts_description CHECK (char_length(description) <= 160 AND description !~ '[<>{}[:cntrl:]]'),
  CONSTRAINT home_shortcuts_image CHECK (image_path ~ '^accesos/[0-9a-f-]{36}\.webp$'),
  CONSTRAINT home_shortcuts_image_alt CHECK (char_length(image_alt) <= 200 AND image_alt !~ '[<>{}[:cntrl:]]'),
  CONSTRAINT home_shortcuts_href CHECK (char_length(href) <= 300 AND (
    href ~ '^/([A-Za-z0-9._~/?#=&%-]*)$' AND href !~ '^//'
    OR href ~ '^https://[^[:space:]<>"{}]+$')),
  CONSTRAINT home_shortcuts_sort_order CHECK (sort_order BETWEEN 0 AND 999)
);

-- Un borrador por pantalla de contenido municipal. base_version es la huella de lo publicado del
-- que parte: si lo publicado cambia después, el borrador no se puede publicar sin recargarlo.
CREATE TABLE public.content_drafts (
  draft_key text NOT NULL,
  content jsonb NOT NULL,
  base_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT content_drafts_pkey PRIMARY KEY (draft_key),
  CONSTRAINT content_drafts_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT content_drafts_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT content_drafts_key CHECK (draft_key ~ ('^(menu|accesos|portada|aviso-cabecera|identidad|datos-legales'
    || '|secciones:(servicios-publicos|actualidad|descubre)'
    || '|cabecera:(inicio|directorio|servicios-publicos|tramites|descubre|tablon|actualidad))$')),
  CONSTRAINT content_drafts_content CHECK (jsonb_typeof(content) = 'object')
);

-- Registro de publicaciones: una fila por publicación, que nadie edita ni borra desde el navegador.
CREATE TABLE public.content_publications (
  id bigint GENERATED ALWAYS AS IDENTITY,
  draft_key text NOT NULL,
  conformity boolean NOT NULL,
  note text NOT NULL DEFAULT '',
  published_at timestamptz NOT NULL DEFAULT now(),
  published_by uuid DEFAULT auth.uid(),
  CONSTRAINT content_publications_pkey PRIMARY KEY (id),
  CONSTRAINT content_publications_published_by_fkey FOREIGN KEY (published_by) REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT content_publications_key CHECK (char_length(draft_key) BETWEEN 1 AND 60),
  CONSTRAINT content_publications_conformity CHECK (conformity),
  CONSTRAINT content_publications_note CHECK (char_length(note) <= 500 AND note !~ '[[:cntrl:]]')
);

CREATE TRIGGER site_menu_stamp BEFORE INSERT OR UPDATE ON public.site_menu
  FOR EACH ROW EXECUTE FUNCTION private.site_structure_stamp();
CREATE TRIGGER page_sections_stamp BEFORE INSERT OR UPDATE ON public.page_sections
  FOR EACH ROW EXECUTE FUNCTION private.site_structure_stamp();
CREATE TRIGGER home_shortcuts_stamp BEFORE INSERT OR UPDATE ON public.home_shortcuts
  FOR EACH ROW EXECUTE FUNCTION private.site_structure_stamp();
CREATE TRIGGER content_drafts_stamp BEFORE INSERT OR UPDATE ON public.content_drafts
  FOR EACH ROW EXECUTE FUNCTION private.site_structure_stamp();

-- Permisos: los visitantes leen lo publicado (nunca updated_by); el navegador no escribe en
-- ninguna de estas tablas. Solo las funciones de la administración las cambian.
REVOKE ALL ON public.site_menu, public.page_sections, public.home_shortcuts, public.content_drafts,
  public.content_publications FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.site_menu, public.page_sections, public.home_shortcuts, public.content_drafts,
  public.content_publications TO service_role;
GRANT SELECT (entry_key, enabled, sort_order, updated_at) ON public.site_menu TO anon, authenticated;
GRANT SELECT (page_key, section_key, enabled, sort_order, updated_at) ON public.page_sections TO anon, authenticated;
GRANT SELECT (id, title, description, image_path, image_alt, href, visible, sort_order, created_at, updated_at)
  ON public.home_shortcuts TO anon, authenticated;
GRANT SELECT ON public.content_drafts, public.content_publications TO authenticated;

ALTER TABLE public.site_menu ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_shortcuts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_publications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visitors read site menu" ON public.site_menu AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "Visitors read page sections" ON public.page_sections AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY "Visitors read visible shortcuts" ON public.home_shortcuts AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (visible);
CREATE POLICY "Admins read all shortcuts" ON public.home_shortcuts AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins read drafts" ON public.content_drafts AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins read publications" ON public.content_publications AS PERMISSIVE FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Lo publicado de una pantalla, en la misma forma que su borrador. Su huella (md5) detecta cambios.
CREATE OR REPLACE FUNCTION private.published_content(p_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_page text := split_part(p_key, ':', 2);
BEGIN
  IF p_key = 'menu' THEN
    RETURN jsonb_build_object('entries', coalesce((
      SELECT jsonb_agg(jsonb_build_object('key', m.entry_key, 'enabled', m.enabled, 'sort_order', m.sort_order)
        ORDER BY m.entry_key)
      FROM public.site_menu AS m), '[]'::jsonb));
  ELSIF p_key LIKE 'secciones:%' THEN
    RETURN jsonb_build_object('sections', coalesce((
      SELECT jsonb_agg(jsonb_build_object('key', s.section_key, 'enabled', s.enabled, 'sort_order', s.sort_order)
        ORDER BY s.section_key)
      FROM public.page_sections AS s WHERE s.page_key = v_page), '[]'::jsonb));
  ELSIF p_key = 'accesos' THEN
    RETURN jsonb_build_object('shortcuts', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', h.id, 'title', h.title, 'description', h.description,
        'image_path', h.image_path, 'image_alt', h.image_alt, 'href', h.href, 'visible', h.visible,
        'sort_order', h.sort_order) ORDER BY h.id)
      FROM public.home_shortcuts AS h), '[]'::jsonb));
  ELSIF p_key = 'portada' THEN
    RETURN (SELECT jsonb_build_object('hero_title', s.hero_title, 'hero_subtitle', s.hero_subtitle)
      FROM public.site_settings AS s WHERE s.id);
  ELSIF p_key = 'aviso-cabecera' THEN
    RETURN (SELECT jsonb_build_object('banner_enabled', s.banner_enabled, 'banner_text', s.banner_text)
      FROM public.site_settings AS s WHERE s.id);
  ELSIF p_key = 'datos-legales' THEN
    RETURN (SELECT jsonb_build_object('legal_name', s.legal_name, 'legal_nif', s.legal_nif,
      'legal_address', s.legal_address, 'legal_email', s.legal_email)
      FROM public.site_settings AS s WHERE s.id);
  ELSIF p_key = 'identidad' THEN
    RETURN (SELECT to_jsonb(i) - 'id' - 'updated_at' - 'updated_by' FROM public.site_identity AS i WHERE i.id);
  ELSIF p_key LIKE 'cabecera:%' THEN
    RETURN coalesce((SELECT jsonb_build_object('image_path', h.image_path, 'image_small_path', h.image_small_path,
      'alt', h.alt, 'focal_x', h.focal_x, 'focal_y', h.focal_y)
      FROM public.page_headers AS h WHERE h.page_key = v_page), '{}'::jsonb);
  END IF;
  RAISE EXCEPTION 'Pantalla de contenido desconocida: %', p_key USING ERRCODE = '22023';
END;
$$;
REVOKE ALL ON FUNCTION private.published_content(text) FROM PUBLIC, anon, authenticated;

-- Comprueba que un objeto del borrador tiene exactamente las claves esperadas: todas las
-- obligatorias y ninguna desconocida. Una lista ausente o mal escrita nunca cuenta como vacía.
CREATE OR REPLACE FUNCTION private.draft_keys(p_value jsonb, p_required text[], p_optional text[], p_label text)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_missing text;
  v_unknown text;
BEGIN
  IF p_value IS NULL OR jsonb_typeof(p_value) <> 'object' THEN
    RAISE EXCEPTION 'Contenido no válido en %: se esperaba un objeto', p_label
      USING ERRCODE = 'PT422', HINT = 'invalid_content';
  END IF;
  SELECT string_agg(k, ', ') INTO v_missing FROM unnest(p_required) AS k WHERE NOT p_value ? k;
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Contenido no válido en %: faltan %', p_label, v_missing
      USING ERRCODE = 'PT422', HINT = 'invalid_content';
  END IF;
  SELECT string_agg(k, ', ') INTO v_unknown FROM jsonb_object_keys(p_value) AS k
  WHERE NOT k = ANY (p_required || p_optional);
  IF v_unknown IS NOT NULL THEN
    RAISE EXCEPTION 'Contenido no válido en %: claves desconocidas %', p_label, v_unknown
      USING ERRCODE = 'PT422', HINT = 'invalid_content';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION private.draft_keys(jsonb, text[], text[], text) FROM PUBLIC, anon, authenticated;

-- Valida la forma y los tipos del borrador de una pantalla (las restricciones de las tablas validan
-- después los valores) y devuelve las rutas de site-assets que usa, para comprobar que existen.
CREATE OR REPLACE FUNCTION private.validate_draft_content(p_key text, c jsonb)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  e jsonb;
  v_list text;
  v_paths text[] := '{}';
  v_field text;
  v_identity_text text[] := ARRAY['app_name', 'short_name', 'municipality_name', 'province', 'region',
    'autonomous_community', 'demonym_masculine', 'demonym_feminine', 'site_url', 'town_hall_name',
    'town_hall_address', 'town_hall_phone', 'town_hall_website', 'timezone', 'postal_code', 'primary_color',
    'accent_color', 'logo_path', 'logo_light_path', 'icon_path', 'icon_small_path'];
  v_bad boolean;
BEGIN
  IF p_key = 'menu' OR p_key LIKE 'secciones:%' THEN
    v_list := CASE WHEN p_key = 'menu' THEN 'entries' ELSE 'sections' END;
    PERFORM private.draft_keys(c, ARRAY[v_list], '{}', p_key);
    IF jsonb_typeof(c -> v_list) <> 'array' THEN
      RAISE EXCEPTION 'Contenido no válido en %: % debe ser una lista', p_key, v_list
        USING ERRCODE = 'PT422', HINT = 'invalid_content';
    END IF;
    FOR e IN SELECT x.value FROM jsonb_array_elements(c -> v_list) AS x LOOP
      PERFORM private.draft_keys(e, ARRAY['key', 'enabled', 'sort_order'], '{}', p_key);
      IF jsonb_typeof(e -> 'key') <> 'string' OR jsonb_typeof(e -> 'enabled') <> 'boolean'
        OR jsonb_typeof(e -> 'sort_order') <> 'number' OR (e ->> 'sort_order') !~ '^[0-9]{1,2}$' THEN
        RAISE EXCEPTION 'Contenido no válido en %: entrada con tipos incorrectos', p_key
          USING ERRCODE = 'PT422', HINT = 'invalid_content';
      END IF;
    END LOOP;
    IF (SELECT count(*) <> count(DISTINCT x.value ->> 'key') FROM jsonb_array_elements(c -> v_list) AS x) THEN
      RAISE EXCEPTION 'Contenido no válido en %: claves repetidas', p_key
        USING ERRCODE = 'PT422', HINT = 'invalid_content';
    END IF;
  ELSIF p_key = 'accesos' THEN
    PERFORM private.draft_keys(c, ARRAY['shortcuts'], '{}', p_key);
    IF jsonb_typeof(c -> 'shortcuts') <> 'array' THEN
      RAISE EXCEPTION 'Contenido no válido en accesos: shortcuts debe ser una lista'
        USING ERRCODE = 'PT422', HINT = 'invalid_content';
    END IF;
    FOR e IN SELECT x.value FROM jsonb_array_elements(c -> 'shortcuts') AS x LOOP
      PERFORM private.draft_keys(e, ARRAY['title', 'image_path', 'href'],
        ARRAY['id', 'description', 'image_alt', 'visible', 'sort_order'], 'acceso directo');
      v_bad := jsonb_typeof(e -> 'title') <> 'string' OR jsonb_typeof(e -> 'image_path') <> 'string'
        OR jsonb_typeof(e -> 'href') <> 'string'
        OR (e ? 'id' AND (jsonb_typeof(e -> 'id') <> 'string' OR (e ->> 'id') !~ '^[0-9a-f-]{36}$'))
        OR (e ? 'description' AND jsonb_typeof(e -> 'description') <> 'string')
        OR (e ? 'image_alt' AND jsonb_typeof(e -> 'image_alt') <> 'string')
        OR (e ? 'visible' AND jsonb_typeof(e -> 'visible') <> 'boolean')
        OR (e ? 'sort_order' AND (jsonb_typeof(e -> 'sort_order') <> 'number' OR (e ->> 'sort_order') !~ '^[0-9]{1,3}$'));
      IF v_bad THEN
        RAISE EXCEPTION 'Contenido no válido en accesos: acceso con tipos incorrectos'
          USING ERRCODE = 'PT422', HINT = 'invalid_content';
      END IF;
      v_paths := v_paths || (e ->> 'image_path');
    END LOOP;
    IF (SELECT count(x.value -> 'id') <> count(DISTINCT x.value ->> 'id')
        FROM jsonb_array_elements(c -> 'shortcuts') AS x) THEN
      RAISE EXCEPTION 'Contenido no válido en accesos: identificadores repetidos'
        USING ERRCODE = 'PT422', HINT = 'invalid_content';
    END IF;
  ELSIF p_key = 'portada' THEN
    PERFORM private.draft_keys(c, ARRAY['hero_title', 'hero_subtitle'], '{}', p_key);
    IF jsonb_typeof(c -> 'hero_title') <> 'string' OR jsonb_typeof(c -> 'hero_subtitle') <> 'string' THEN
      RAISE EXCEPTION 'Contenido no válido en portada: se esperaban textos'
        USING ERRCODE = 'PT422', HINT = 'invalid_content';
    END IF;
  ELSIF p_key = 'aviso-cabecera' THEN
    PERFORM private.draft_keys(c, ARRAY['banner_enabled', 'banner_text'], '{}', p_key);
    IF jsonb_typeof(c -> 'banner_enabled') <> 'boolean' OR jsonb_typeof(c -> 'banner_text') <> 'string' THEN
      RAISE EXCEPTION 'Contenido no válido en aviso-cabecera: tipos incorrectos'
        USING ERRCODE = 'PT422', HINT = 'invalid_content';
    END IF;
  ELSIF p_key = 'datos-legales' THEN
    PERFORM private.draft_keys(c, ARRAY['legal_name', 'legal_nif', 'legal_address', 'legal_email'], '{}', p_key);
    IF EXISTS (SELECT 1 FROM jsonb_each(c) AS x WHERE jsonb_typeof(x.value) <> 'string') THEN
      RAISE EXCEPTION 'Contenido no válido en datos-legales: se esperaban textos'
        USING ERRCODE = 'PT422', HINT = 'invalid_content';
    END IF;
  ELSIF p_key = 'identidad' THEN
    PERFORM private.draft_keys(c, v_identity_text || ARRAY['latitude', 'longitude'], '{}', p_key);
    FOREACH v_field IN ARRAY v_identity_text LOOP
      IF jsonb_typeof(c -> v_field) <> 'string' THEN
        RAISE EXCEPTION 'Contenido no válido en identidad: % debe ser un texto', v_field
          USING ERRCODE = 'PT422', HINT = 'invalid_content';
      END IF;
    END LOOP;
    IF jsonb_typeof(c -> 'latitude') NOT IN ('number', 'null') OR jsonb_typeof(c -> 'longitude') NOT IN ('number', 'null') THEN
      RAISE EXCEPTION 'Contenido no válido en identidad: coordenadas con tipos incorrectos'
        USING ERRCODE = 'PT422', HINT = 'invalid_content';
    END IF;
    SELECT coalesce(array_agg(p), '{}') INTO v_paths
    FROM unnest(ARRAY[c ->> 'logo_path', c ->> 'logo_light_path', c ->> 'icon_path', c ->> 'icon_small_path']) AS p
    WHERE p <> '';
  ELSIF p_key LIKE 'cabecera:%' THEN
    IF c ? 'remove' THEN
      PERFORM private.draft_keys(c, ARRAY['remove'], '{}', p_key);
      IF c -> 'remove' <> 'true'::jsonb THEN
        RAISE EXCEPTION 'Contenido no válido en %: remove solo admite true', p_key
          USING ERRCODE = 'PT422', HINT = 'invalid_content';
      END IF;
    ELSE
      PERFORM private.draft_keys(c, ARRAY['image_path', 'image_small_path', 'alt', 'focal_x', 'focal_y'], '{}', p_key);
      IF jsonb_typeof(c -> 'image_path') <> 'string' OR jsonb_typeof(c -> 'image_small_path') <> 'string'
        OR jsonb_typeof(c -> 'alt') <> 'string'
        OR jsonb_typeof(c -> 'focal_x') <> 'number' OR (c ->> 'focal_x') !~ '^[0-9]{1,3}$'
        OR jsonb_typeof(c -> 'focal_y') <> 'number' OR (c ->> 'focal_y') !~ '^[0-9]{1,3}$' THEN
        RAISE EXCEPTION 'Contenido no válido en %: tipos incorrectos', p_key
          USING ERRCODE = 'PT422', HINT = 'invalid_content';
      END IF;
      v_paths := ARRAY[c ->> 'image_path', c ->> 'image_small_path'];
    END IF;
  ELSE
    RAISE EXCEPTION 'Pantalla de contenido desconocida: %', p_key USING ERRCODE = '22023';
  END IF;
  RETURN v_paths;
END;
$$;
REVOKE ALL ON FUNCTION private.validate_draft_content(text, jsonb) FROM PUBLIC, anon, authenticated;

-- Guarda el borrador de una pantalla. Sin versión esperada crea uno nuevo; con ella, lo actualiza
-- solo si nadie lo cambió desde que se cargó. No toca nada publicado.
CREATE OR REPLACE FUNCTION public.save_content_draft(
  p_key text,
  p_content jsonb,
  p_expected_updated_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_at timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo la administración puede guardar borradores' USING ERRCODE = '42501';
  END IF;
  IF p_expected_updated_at IS NULL THEN
    INSERT INTO public.content_drafts (draft_key, content, base_version)
    VALUES (p_key, p_content, md5(private.published_content(p_key)::text))
    ON CONFLICT (draft_key) DO NOTHING
    RETURNING updated_at INTO v_at;
    IF v_at IS NULL THEN
      RAISE EXCEPTION 'Ya hay un borrador de esta pantalla' USING ERRCODE = 'PT409', HINT = 'draft_exists';
    END IF;
  ELSE
    UPDATE public.content_drafts AS d SET content = p_content
    WHERE d.draft_key = p_key AND d.updated_at = p_expected_updated_at
    RETURNING d.updated_at INTO v_at;
    IF v_at IS NULL THEN
      RAISE EXCEPTION 'El borrador ha cambiado desde que se abrió' USING ERRCODE = 'PT409', HINT = 'draft_changed';
    END IF;
  END IF;
  RETURN jsonb_build_object('draft_key', p_key, 'updated_at', v_at);
END;
$$;

-- Descarta el borrador de una pantalla sin tocar lo publicado.
CREATE OR REPLACE FUNCTION public.discard_content_draft(p_key text, p_expected_updated_at timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo la administración puede descartar borradores' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.content_drafts AS d WHERE d.draft_key = p_key AND d.updated_at = p_expected_updated_at;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El borrador ha cambiado desde que se abrió' USING ERRCODE = 'PT409', HINT = 'draft_changed';
  END IF;
  RETURN jsonb_build_object('draft_key', p_key, 'discarded', true);
END;
$$;

-- Estado del borrador de una pantalla para el panel: si existe y si lo publicado cambió desde que se empezó.
CREATE OR REPLACE FUNCTION public.content_draft_state(p_key text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  d public.content_drafts;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo la administración puede consultar borradores' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO d FROM public.content_drafts AS x WHERE x.draft_key = p_key;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('exists', false, 'published', private.published_content(p_key));
  END IF;
  RETURN jsonb_build_object('exists', true, 'updated_at', d.updated_at,
    'stale', d.base_version <> md5(private.published_content(p_key)::text),
    'published', private.published_content(p_key));
END;
$$;

-- Publica el borrador de una pantalla: exige la conformidad municipal confirmada, aplica todo en una
-- transacción, registra quién, cuándo y la nota, y borra el borrador. SECURITY DEFINER para que las
-- tablas publicadas no necesiten escritura directa desde el navegador; comprueba el rol antes de nada.
CREATE OR REPLACE FUNCTION public.publish_content_draft(
  p_key text,
  p_expected_updated_at timestamptz,
  p_conformity boolean,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  d public.content_drafts;
  c jsonb;
  v_page text := split_part(p_key, ':', 2);
  v_ident public.site_identity;
  -- Saltos de línea y demás caracteres de control de la nota pasan a ser espacios.
  v_note text := btrim(regexp_replace(coalesce(p_note, ''), '[[:cntrl:]]+', ' ', 'g'));
  v_at timestamptz;
  v_paths text[];
  v_missing text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo la administración puede publicar' USING ERRCODE = '42501';
  END IF;
  IF p_conformity IS NOT TRUE THEN
    RAISE EXCEPTION 'Falta confirmar la conformidad municipal' USING ERRCODE = 'PT422', HINT = 'conformity_required';
  END IF;
  SELECT * INTO d FROM public.content_drafts AS x WHERE x.draft_key = p_key FOR UPDATE;
  IF NOT FOUND OR d.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'El borrador ha cambiado desde que se abrió' USING ERRCODE = 'PT409', HINT = 'draft_changed';
  END IF;

  -- Bloquea lo publicado de esta pantalla antes de comprobar su versión: una escritura directa en
  -- curso (panel actual) termina antes y se detecta; una posterior espera a que acabe la publicación.
  IF p_key = 'menu' THEN
    LOCK TABLE public.site_menu IN SHARE ROW EXCLUSIVE MODE;
  ELSIF p_key LIKE 'secciones:%' THEN
    LOCK TABLE public.page_sections IN SHARE ROW EXCLUSIVE MODE;
  ELSIF p_key = 'accesos' THEN
    LOCK TABLE public.home_shortcuts IN SHARE ROW EXCLUSIVE MODE;
  ELSIF p_key IN ('portada', 'aviso-cabecera', 'datos-legales') THEN
    PERFORM 1 FROM public.site_settings AS s WHERE s.id FOR UPDATE;
  ELSIF p_key = 'identidad' THEN
    PERFORM 1 FROM public.site_identity AS i WHERE i.id FOR UPDATE;
  ELSIF p_key LIKE 'cabecera:%' THEN
    LOCK TABLE public.page_headers IN SHARE ROW EXCLUSIVE MODE;
  END IF;
  IF d.base_version <> md5(private.published_content(p_key)::text) THEN
    RAISE EXCEPTION 'Lo publicado cambió después de empezar el borrador' USING ERRCODE = 'PT409', HINT = 'published_changed';
  END IF;
  c := d.content;

  -- Forma y tipos del contenido, y archivos que usa: nada se aplica si algo no cuadra.
  v_paths := private.validate_draft_content(p_key, c);
  SELECT string_agg(p, ', ') INTO v_missing FROM unnest(v_paths) AS p
  WHERE NOT EXISTS (SELECT 1 FROM storage.objects AS o WHERE o.bucket_id = 'site-assets' AND o.name = p);
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Faltan archivos en site-assets: %', v_missing USING ERRCODE = 'PT422', HINT = 'missing_asset';
  END IF;

  IF p_key = 'menu' THEN
    DELETE FROM public.site_menu AS m WHERE true;
    INSERT INTO public.site_menu (entry_key, enabled, sort_order)
    SELECT e.key, coalesce(e.enabled, true), coalesce(e.sort_order, 0)
    FROM jsonb_to_recordset(c -> 'entries') AS e(key text, enabled boolean, sort_order smallint);
  ELSIF p_key LIKE 'secciones:%' THEN
    DELETE FROM public.page_sections AS s WHERE s.page_key = v_page;
    INSERT INTO public.page_sections (page_key, section_key, enabled, sort_order)
    SELECT v_page, e.key, coalesce(e.enabled, true), coalesce(e.sort_order, 0)
    FROM jsonb_to_recordset(c -> 'sections') AS e(key text, enabled boolean, sort_order smallint);
  ELSIF p_key = 'accesos' THEN
    -- Los accesos que ya no están en el borrador se borran; los demás se crean o actualizan.
    DELETE FROM public.home_shortcuts AS h
    WHERE h.id NOT IN (
      SELECT (e ->> 'id')::uuid FROM jsonb_array_elements(c -> 'shortcuts') AS e
      WHERE e ->> 'id' IS NOT NULL);
    INSERT INTO public.home_shortcuts AS h (id, title, description, image_path, image_alt, href, visible, sort_order)
    SELECT coalesce(e.id, gen_random_uuid()), e.title, coalesce(e.description, ''), e.image_path,
      coalesce(e.image_alt, ''), e.href, coalesce(e.visible, true), coalesce(e.sort_order, 0)
    FROM jsonb_to_recordset(c -> 'shortcuts') AS e(id uuid, title text, description text,
      image_path text, image_alt text, href text, visible boolean, sort_order smallint)
    ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description,
      image_path = EXCLUDED.image_path, image_alt = EXCLUDED.image_alt, href = EXCLUDED.href,
      visible = EXCLUDED.visible, sort_order = EXCLUDED.sort_order;
  ELSIF p_key = 'portada' THEN
    UPDATE public.site_settings AS s SET
      hero_title = coalesce(c ->> 'hero_title', s.hero_title),
      hero_subtitle = coalesce(c ->> 'hero_subtitle', s.hero_subtitle)
    WHERE s.id;
  ELSIF p_key = 'aviso-cabecera' THEN
    UPDATE public.site_settings AS s SET
      banner_enabled = coalesce((c ->> 'banner_enabled')::boolean, s.banner_enabled),
      banner_text = coalesce(c ->> 'banner_text', s.banner_text)
    WHERE s.id;
  ELSIF p_key = 'datos-legales' THEN
    UPDATE public.site_settings AS s SET
      legal_name = coalesce(c ->> 'legal_name', s.legal_name),
      legal_nif = coalesce(c ->> 'legal_nif', s.legal_nif),
      legal_address = coalesce(c ->> 'legal_address', s.legal_address),
      legal_email = coalesce(c ->> 'legal_email', s.legal_email)
    WHERE s.id;
  ELSIF p_key = 'identidad' THEN
    SELECT * INTO v_ident FROM public.site_identity AS i WHERE i.id;
    v_ident := jsonb_populate_record(v_ident, c - 'id' - 'updated_at' - 'updated_by');
    UPDATE public.site_identity AS i SET
      app_name = v_ident.app_name, short_name = v_ident.short_name,
      municipality_name = v_ident.municipality_name, province = v_ident.province, region = v_ident.region,
      autonomous_community = v_ident.autonomous_community, demonym_masculine = v_ident.demonym_masculine,
      demonym_feminine = v_ident.demonym_feminine, site_url = v_ident.site_url,
      town_hall_name = v_ident.town_hall_name, town_hall_address = v_ident.town_hall_address,
      town_hall_phone = v_ident.town_hall_phone, town_hall_website = v_ident.town_hall_website,
      latitude = v_ident.latitude, longitude = v_ident.longitude, timezone = v_ident.timezone,
      postal_code = v_ident.postal_code, primary_color = v_ident.primary_color,
      accent_color = v_ident.accent_color, logo_path = v_ident.logo_path,
      logo_light_path = v_ident.logo_light_path, icon_path = v_ident.icon_path,
      icon_small_path = v_ident.icon_small_path
    WHERE i.id;
  ELSIF p_key LIKE 'cabecera:%' THEN
    IF coalesce((c ->> 'remove')::boolean, false) THEN
      DELETE FROM public.page_headers AS h WHERE h.page_key = v_page;
    ELSE
      INSERT INTO public.page_headers AS h (page_key, image_path, image_small_path, alt, focal_x, focal_y)
      VALUES (v_page, c ->> 'image_path', c ->> 'image_small_path', coalesce(c ->> 'alt', ''),
        coalesce((c ->> 'focal_x')::smallint, 50), coalesce((c ->> 'focal_y')::smallint, 50))
      ON CONFLICT (page_key) DO UPDATE SET image_path = EXCLUDED.image_path,
        image_small_path = EXCLUDED.image_small_path, alt = EXCLUDED.alt,
        focal_x = EXCLUDED.focal_x, focal_y = EXCLUDED.focal_y;
    END IF;
  ELSE
    RAISE EXCEPTION 'Pantalla de contenido desconocida: %', p_key USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.content_publications (draft_key, conformity, note)
  VALUES (p_key, true, left(v_note, 500))
  RETURNING published_at INTO v_at;
  DELETE FROM public.content_drafts AS x WHERE x.draft_key = p_key;
  RETURN jsonb_build_object('draft_key', p_key, 'published_at', v_at);
END;
$$;

REVOKE ALL ON FUNCTION public.save_content_draft(text, jsonb, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_content_draft(text, jsonb, timestamptz) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.discard_content_draft(text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.discard_content_draft(text, timestamptz) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.content_draft_state(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.content_draft_state(text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.publish_content_draft(text, timestamptz, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_content_draft(text, timestamptz, boolean, text) TO authenticated, service_role;

-- Storage: los visitantes leen también las imágenes de los accesos visibles publicados. Una imagen
-- subida para un borrador no es legible hasta que se publica.
DROP POLICY IF EXISTS "Visitors read referenced site assets" ON storage.objects;
CREATE POLICY "Visitors read referenced site assets" ON storage.objects AS PERMISSIVE FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'site-assets'::text
    AND (
      EXISTS (
        SELECT 1 FROM public.site_identity AS i
        WHERE i.id AND objects.name IN (i.logo_path, i.logo_light_path, i.icon_path, i.icon_small_path)
      )
      OR EXISTS (
        SELECT 1 FROM public.page_headers AS h
        WHERE objects.name IN (h.image_path, h.image_small_path)
      )
      OR EXISTS (
        SELECT 1 FROM public.home_shortcuts AS s
        WHERE s.visible AND objects.name = s.image_path
      )
    )
  );

-- Configuración pública: lo de antes más el menú, las secciones y los accesos visibles publicados.
CREATE OR REPLACE FUNCTION public.site_config()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'identity', (
      SELECT jsonb_build_object(
        'app_name', i.app_name, 'short_name', i.short_name, 'municipality_name', i.municipality_name,
        'province', i.province, 'region', i.region, 'autonomous_community', i.autonomous_community,
        'demonym_masculine', i.demonym_masculine, 'demonym_feminine', i.demonym_feminine,
        'site_url', i.site_url, 'town_hall_name', i.town_hall_name, 'town_hall_address', i.town_hall_address,
        'town_hall_phone', i.town_hall_phone, 'town_hall_website', i.town_hall_website,
        'latitude', i.latitude, 'longitude', i.longitude, 'timezone', i.timezone,
        'postal_code', i.postal_code, 'primary_color', i.primary_color, 'accent_color', i.accent_color,
        'logo_path', i.logo_path, 'logo_light_path', i.logo_light_path, 'icon_path', i.icon_path,
        'icon_small_path', i.icon_small_path, 'updated_at', i.updated_at)
      FROM public.site_identity AS i
      WHERE i.id),
    'page_headers', coalesce((
      SELECT jsonb_object_agg(h.page_key, jsonb_build_object(
        'image_path', h.image_path, 'image_small_path', h.image_small_path, 'alt', h.alt,
        'focal_x', h.focal_x, 'focal_y', h.focal_y, 'updated_at', h.updated_at))
      FROM public.page_headers AS h), '{}'::jsonb),
    'menu', coalesce((
      SELECT jsonb_object_agg(m.entry_key, jsonb_build_object('enabled', m.enabled, 'sort_order', m.sort_order))
      FROM public.site_menu AS m), '{}'::jsonb),
    'sections', coalesce((
      SELECT jsonb_object_agg(p.page_key, p.sections)
      FROM (
        SELECT s.page_key, jsonb_object_agg(s.section_key,
          jsonb_build_object('enabled', s.enabled, 'sort_order', s.sort_order)) AS sections
        FROM public.page_sections AS s
        GROUP BY s.page_key) AS p), '{}'::jsonb),
    'shortcuts', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', h.id, 'title', h.title, 'description', h.description,
        'image_path', h.image_path, 'image_alt', h.image_alt, 'href', h.href)
        ORDER BY h.sort_order, h.created_at)
      FROM public.home_shortcuts AS h
      WHERE h.visible), '[]'::jsonb));
$$;
REVOKE ALL ON FUNCTION public.site_config() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.site_config() TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
-- <<< site_structure
-- Fin de 01_schema.sql
