-- =====================================================================
-- Groundwork · 03_init_instance.sql
-- Configuración inicial de UNA instalación. Ejecutar en Supabase SQL Editor
-- después de 01 y 02. Edita solo los valores del bloque DECLARE.
-- Repetible: crea la fila única de configuración o la actualiza.
--
-- IMPORTANTE: los campos legal_* identifican al TITULAR que opera el
-- servicio (persona, empresa o entidad responsable del sitio). No tiene por
-- qué ser el Ayuntamiento ni el proveedor del software (Groundwork).
--
--  Campo               Obligatorio  Notas
--  hero_title          sí           Titular de la portada.
--  hero_subtitle       sí           Subtítulo de la portada.
--  legal_name          sí*          Titular del servicio (*antes de publicar).
--  legal_nif           sí*          NIF/CIF del titular.
--  legal_address       sí*          Domicilio a efectos legales.
--  legal_email         sí*          Correo para ejercicio de derechos RGPD.
--  contact_email       no           Privado. Avisos internos.
--  admin_whatsapp      no           Privado. Formato internacional sin «+».
--  whatsapp_template   sí           Debe contener {nombre} y {enlace}.
--  collaborator_months sí           1–24.
--  banner_enabled/text no           Aviso superior opcional.
--  common_labels       no           Etiquetas sugeridas en fichas.
--  first_admin_email   no           Usuario YA creado en Authentication.
-- =====================================================================
DO $init$
DECLARE
  v_hero_title          text    := '¿Qué buscas en tu pueblo?';
  v_hero_subtitle       text    := 'Comercios, profesionales y servicios locales';
  v_legal_name          text    := '';
  v_legal_nif           text    := '';
  v_legal_address       text    := '';
  v_legal_email         text    := '';
  v_contact_email       text    := '';
  v_admin_whatsapp      text    := '';
  v_whatsapp_template   text    := 'Hola {nombre}: este es tu enlace privado para revisar y autorizar la publicación de tu ficha (válido 30 días): {enlace}';
  v_collaborator_months integer := 1;
  v_banner_enabled      boolean := false;
  v_banner_text         text    := '';
  v_common_labels       text[]  := ARRAY['Pago con tarjeta','A domicilio','Accesible','Terraza','Aparcamiento','Productos locales'];
  v_first_admin_email   text    := '';   -- vacío = no asignar ahora
  v_admin_id uuid;
BEGIN
  IF length(trim(v_hero_title)) = 0 OR length(trim(v_hero_subtitle)) = 0 THEN
    RAISE EXCEPTION 'hero_title y hero_subtitle son obligatorios';
  END IF;
  IF position('{enlace}' IN v_whatsapp_template) = 0 OR position('{nombre}' IN v_whatsapp_template) = 0 THEN
    RAISE EXCEPTION 'whatsapp_template debe contener {nombre} y {enlace}';
  END IF;
  IF v_admin_whatsapp <> '' AND v_admin_whatsapp !~ '^[0-9]{8,15}$' THEN
    RAISE EXCEPTION 'admin_whatsapp: solo dígitos, con prefijo de país y sin «+»';
  END IF;
  IF v_legal_email <> '' AND v_legal_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'legal_email no válido';
  END IF;

  INSERT INTO public.site_settings AS s (id, hero_title, hero_subtitle, legal_name, legal_nif,
    legal_address, legal_email, contact_email, admin_whatsapp, whatsapp_template,
    collaborator_months, banner_enabled, banner_text, common_labels)
  VALUES (true, v_hero_title, v_hero_subtitle, v_legal_name, v_legal_nif, v_legal_address,
    v_legal_email, v_contact_email, v_admin_whatsapp, v_whatsapp_template,
    v_collaborator_months, v_banner_enabled, v_banner_text, v_common_labels)
  ON CONFLICT (id) DO UPDATE SET hero_title = EXCLUDED.hero_title,
    hero_subtitle = EXCLUDED.hero_subtitle, legal_name = EXCLUDED.legal_name,
    legal_nif = EXCLUDED.legal_nif, legal_address = EXCLUDED.legal_address,
    legal_email = EXCLUDED.legal_email, contact_email = EXCLUDED.contact_email,
    admin_whatsapp = EXCLUDED.admin_whatsapp, whatsapp_template = EXCLUDED.whatsapp_template,
    collaborator_months = EXCLUDED.collaborator_months, banner_enabled = EXCLUDED.banner_enabled,
    banner_text = EXCLUDED.banner_text, common_labels = EXCLUDED.common_labels;

  INSERT INTO public.translation_gateway_state (id, blocked, reason)
  VALUES (true, false, '') ON CONFLICT (id) DO NOTHING;

  IF trim(v_first_admin_email) <> '' THEN
    SELECT id INTO v_admin_id FROM auth.users WHERE lower(email) = lower(trim(v_first_admin_email));
    IF v_admin_id IS NULL THEN
      RAISE EXCEPTION 'No existe el usuario %. Créalo antes en Authentication > Users.', v_first_admin_email;
    END IF;
    INSERT INTO public.user_roles (user_id, role) VALUES (v_admin_id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  IF v_legal_name = '' OR v_legal_nif = '' OR v_legal_email = '' THEN
    RAISE NOTICE 'Aviso: faltan datos del titular legal; complétalos antes de publicar.';
  END IF;
END
$init$;