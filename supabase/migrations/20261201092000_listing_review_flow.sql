-- Revisión del titular, estados y trazabilidad de las fichas.
-- 1. listing_events: registro cronológico de cada ficha (cambios de estado, enlaces enviados,
--    aprobaciones, correcciones solicitadas y retiradas del consentimiento). Solo lectura para la
--    administración; lo escriben triggers y funciones, nunca el navegador.
-- 2. Estado de revisión deducido del registro (listing_review_state): sin enviar, en revisión,
--    enlace caducado, correcciones, aprobada o retirada. El estado de publicación sigue siendo
--    listings.status, sin valores nuevos: las políticas que dependen de él no cambian.
-- 3. Regla de publicación en la base: una ficha solo pasa a «publicada» si es un servicio público,
--    si el titular la aprobó (y no retiró su consentimiento) o si vuelve de «oculta» tras haberse
--    publicado antes. Así no se publica por error sin autorización, desde ningún cliente.
-- 4. Un enlace nuevo invalida los anteriores de esa ficha y queda registrado.
-- 5. approve_listing_review guarda la versión de las condiciones, una copia de lo que vio el
--    titular, sus permisos y su decisión; publica si así está configurado (por defecto, como antes).
-- 6. request_listing_corrections: el titular pide correcciones desde su enlace (un solo uso).
-- 7. withdraw_listing_consent: la administración registra la retirada del consentimiento; la ficha
--    deja de publicarse y de mostrar datos de contacto.
-- 8. consents y listing_requests pasan a ser de solo lectura para la administración.
-- Requiere 20261201091000_listing_details. Vuelta atrás: supabase/rollback/20261201092000_listing_review_flow.sql
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
