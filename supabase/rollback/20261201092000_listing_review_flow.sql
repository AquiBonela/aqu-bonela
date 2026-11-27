-- Vuelta atrás de 20261201092000_listing_review_flow.sql.
-- Restaura approve_listing_review y las políticas de consents y listing_requests como estaban
-- (copiadas literalmente de supabase/template/01_schema.sql de la versión anterior) y quita el
-- registro de eventos, la regla de publicación, las funciones nuevas y la opción de publicación.
-- Pérdida de datos inevitable: el registro listing_events y la opción publish_on_owner_approval.
-- Los consentimientos, solicitudes y avisos creados se conservan.

DROP TRIGGER IF EXISTS approval_tokens_issue ON public.approval_tokens;
DROP TRIGGER IF EXISTS listings_status_log ON public.listings;
DROP TRIGGER IF EXISTS listings_publish_rule ON public.listings;
DROP FUNCTION IF EXISTS private.approval_tokens_issue();
DROP FUNCTION IF EXISTS private.listings_status_log();
DROP FUNCTION IF EXISTS private.listings_publish_rule();

DROP FUNCTION IF EXISTS public.withdraw_listing_consent(uuid, text);
DROP FUNCTION IF EXISTS public.request_listing_corrections(text, text);
DROP FUNCTION IF EXISTS public.approve_listing_review(text, jsonb, boolean, jsonb, text, text);
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
REVOKE ALL ON FUNCTION public.approve_listing_review(text, jsonb, boolean, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_listing_review(text, jsonb, boolean, jsonb, text) TO service_role;

DROP FUNCTION IF EXISTS public.listing_review_state(uuid);
DROP TABLE IF EXISTS public.listing_events;

DROP POLICY IF EXISTS "Admins read consents" ON public.consents;
DROP POLICY IF EXISTS "Admins read requests" ON public.listing_requests;
CREATE POLICY "Admins manage consents" ON public.consents AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage requests" ON public.listing_requests AS PERMISSIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
GRANT INSERT, UPDATE, DELETE ON public.consents, public.listing_requests TO anon, authenticated;

ALTER TABLE public.site_settings DROP COLUMN IF EXISTS publish_on_owner_approval;
NOTIFY pgrst, 'reload schema';
