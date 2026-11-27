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
-- Fin de 01_schema.sql
