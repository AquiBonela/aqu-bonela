-- Escrituras seguras de fichas (etapa 1).
-- 1. public.save_listing: el formulario de administración guarda la ficha, sus contactos, su
--    horario y sus actividades en una sola transacción y solo si la ficha no ha cambiado desde
--    que se abrió (comparando updated_at dentro del propio UPDATE). Así nunca sobrescribe una
--    aprobación del titular ni otra modificación posterior, ni deja guardados a medias.
-- 2. public.approve_listing_review: la aprobación del titular por enlace actualiza la ficha y
--    sus contactos, registra el consentimiento y gasta el enlace en una sola transacción. Si
--    algo falla no se aplica nada y el enlace sigue sin usar.
-- No cambia tablas, columnas, políticas ni datos.
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

NOTIFY pgrst, 'reload schema';
