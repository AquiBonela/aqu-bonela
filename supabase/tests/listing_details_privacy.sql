-- Rollback-only regression for 20261201091000_listing_details: structured address, approximate
-- location, website visibility, home service, cover alt text and hour periods. No fixture survives.
BEGIN;
SELECT set_config('test.ld_admin', (SELECT user_id::text FROM public.user_roles WHERE role = 'admin' LIMIT 1), true);
SELECT set_config('test.ld_category', (SELECT id::text FROM public.categories ORDER BY sort_order LIMIT 1), true);
DO $$ BEGIN
 IF coalesce(current_setting('test.ld_admin', true), '') = '' THEN
  RAISE EXCEPTION 'This test needs an existing admin in public.user_roles';
 END IF;
END $$;

INSERT INTO public.listings (id, slug, type, category_id, name, status) VALUES
 ('1d000000-0000-4000-8000-000000000501', 'rls-ld-exact', 'comercio', current_setting('test.ld_category')::uuid, 'Regression exact', 'borrador'),
 ('1d000000-0000-4000-8000-000000000502', 'rls-ld-approx', 'comercio', current_setting('test.ld_category')::uuid, 'Regression approx', 'borrador');
-- Both were approved by their owners, so the admin may publish them.
INSERT INTO public.listing_events (listing_id, kind) VALUES
 ('1d000000-0000-4000-8000-000000000501', 'aprobacion'), ('1d000000-0000-4000-8000-000000000502', 'aprobacion');

SELECT set_config('request.jwt.claim.sub', current_setting('test.ld_admin'), true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
 res jsonb;
 v_listing jsonb := jsonb_build_object('type', 'comercio', 'category_id', current_setting('test.ld_category'),
   'name', 'Regression exact', 'slug', 'rls-ld-exact', 'status', 'publicada', 'home_service', true,
   'service_area', 'Todo el municipio', 'show_service_area', true, 'cover_alt', 'Fachada del comercio',
   'hours_note', 'Cerrado el día de la fiesta local');
 v_contact jsonb := jsonb_build_object('street', 'Calle Mayor', 'street_number', '3', 'postal_code', '12345',
   'locality', 'Villa Prueba', 'latitude', 40.12345, 'longitude', -3.54321, 'show_address', true,
   'website', 'https://ejemplo.org', 'show_website', true, 'phone', '600000501', 'show_phone', false);
 v_periods jsonb := '[
   {"kind": "temporada", "starts_on": "2026-07-01", "ends_on": "2026-08-31", "label": "Verano",
    "hours": [{"weekday": 1, "opens": "08:00", "closes": "14:00"}]},
   {"kind": "vacaciones", "starts_on": "2026-12-24", "ends_on": "2026-12-26", "label": "Navidad", "hours": []}]';
BEGIN
 res := public.save_listing(v_listing, v_contact, '[{"weekday": 1, "opens": "09:00", "closes": "13:00"}]', '{}',
   '1d000000-0000-4000-8000-000000000501', (SELECT updated_at FROM public.listings WHERE id = '1d000000-0000-4000-8000-000000000501'),
   v_periods);
 IF (SELECT count(*) FROM public.listing_hour_periods WHERE listing_id = '1d000000-0000-4000-8000-000000000501') <> 2
 OR (SELECT count(*) FROM public.listing_hours WHERE listing_id = '1d000000-0000-4000-8000-000000000501' AND period_id IS NOT NULL) <> 1
 OR (SELECT count(*) FROM public.listing_hours WHERE listing_id = '1d000000-0000-4000-8000-000000000501' AND period_id IS NULL) <> 1
 THEN RAISE EXCEPTION 'save_listing must store regular hours, a season with its hours and a holiday'; END IF;

 -- A form that does not know the new fields keeps them (deploying the web before or after).
 res := public.save_listing(v_listing - 'cover_alt' - 'hours_note' - 'show_service_area',
   jsonb_build_object('address', 'Calle Mayor 3', 'show_address', true, 'phone', '600000501'),
   '[{"weekday": 1, "opens": "09:00", "closes": "13:00"}]', '{}',
   '1d000000-0000-4000-8000-000000000501', (res ->> 'updated_at')::timestamptz);
 IF NOT EXISTS (SELECT 1 FROM public.listings WHERE id = '1d000000-0000-4000-8000-000000000501'
   AND cover_alt = 'Fachada del comercio' AND hours_note <> '' AND show_service_area)
 OR NOT EXISTS (SELECT 1 FROM public.listing_contacts WHERE listing_id = '1d000000-0000-4000-8000-000000000501'
   AND street = 'Calle Mayor' AND website = 'https://ejemplo.org' AND show_website)
 OR (SELECT count(*) FROM public.listing_hour_periods WHERE listing_id = '1d000000-0000-4000-8000-000000000501') <> 2
 THEN RAISE EXCEPTION 'Fields an older form does not send must be preserved'; END IF;

 BEGIN
  PERFORM public.save_listing(v_listing, v_contact, '[]', '{}', '1d000000-0000-4000-8000-000000000501',
    (SELECT updated_at FROM public.listings WHERE id = '1d000000-0000-4000-8000-000000000501'),
    '[{"kind": "cierre", "starts_on": "2026-03-01", "ends_on": "2026-03-01", "hours": [{"weekday": 7, "opens": "09:00", "closes": "10:00"}]}]');
  RAISE EXCEPTION 'A closure with opening hours must be rejected';
 EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
 BEGIN
  PERFORM public.save_listing(v_listing, v_contact || '{"postal_code": "ABC"}', '[]', '{}', '1d000000-0000-4000-8000-000000000501',
    (SELECT updated_at FROM public.listings WHERE id = '1d000000-0000-4000-8000-000000000501'));
  RAISE EXCEPTION 'An invalid postal code must be rejected';
 EXCEPTION WHEN check_violation THEN NULL; END;

 res := public.save_listing(jsonb_set(jsonb_set(v_listing, '{slug}', '"rls-ld-approx"'), '{show_service_area}', 'false'),
   jsonb_build_object('street', 'Camino Privado', 'street_number', '9', 'postal_code', '12345', 'locality', 'Villa Prueba',
     'latitude', 40.12345, 'longitude', -3.54321, 'show_address', false, 'show_approximate_location', true,
     'website', 'https://privado.example.org', 'show_website', false),
   '[]', '{}', '1d000000-0000-4000-8000-000000000502',
   (SELECT updated_at FROM public.listings WHERE id = '1d000000-0000-4000-8000-000000000502'), '[]');
END $$;
RESET ROLE;

-- Visitors see exactly what was authorised.
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.public_listings WHERE id = '1d000000-0000-4000-8000-000000000501'
   AND public_address = 'Calle Mayor 3, 12345 Villa Prueba' AND public_locality = '12345 Villa Prueba'
   AND public_latitude = 40.12345 AND NOT public_location_approximate AND public_website = 'https://ejemplo.org'
   AND public_phone IS NULL AND public_home_service AND public_service_area = 'Todo el municipio'
   AND cover_alt = 'Fachada del comercio' AND hours_note = 'Cerrado el día de la fiesta local')
 THEN RAISE EXCEPTION 'The exact listing must publish its address, website and home service'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.public_listings WHERE id = '1d000000-0000-4000-8000-000000000502'
   AND public_address IS NULL AND public_locality = '12345 Villa Prueba' AND public_latitude = 40.12
   AND public_longitude = -3.54 AND public_location_approximate AND public_website IS NULL
   AND NOT public_home_service AND public_service_area = '')
 THEN RAISE EXCEPTION 'An approximate location must hide the street, round the coordinates and keep private data hidden'; END IF;
 IF (SELECT count(*) FROM public.listing_hour_periods WHERE listing_id = '1d000000-0000-4000-8000-000000000501') <> 2
 OR (SELECT count(*) FROM public.listing_hours WHERE listing_id = '1d000000-0000-4000-8000-000000000501') <> 2
 THEN RAISE EXCEPTION 'Visitors must read the periods and season hours of a published listing'; END IF;
 BEGIN
  INSERT INTO public.listing_hour_periods (listing_id, kind, starts_on, ends_on)
  VALUES ('1d000000-0000-4000-8000-000000000501', 'cierre', '2026-01-01', '2026-01-01');
  RAISE EXCEPTION 'Visitors must not create periods';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

-- Hidden hours also hide the periods and the hours note.
UPDATE public.listings SET tags = ARRAY['__ocultar_horario'] WHERE id = '1d000000-0000-4000-8000-000000000501';
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.listing_hour_periods WHERE listing_id = '1d000000-0000-4000-8000-000000000501')
 OR (SELECT hours_note FROM public.public_listings WHERE id = '1d000000-0000-4000-8000-000000000501') <> ''
 THEN RAISE EXCEPTION 'Hidden hours must hide periods and the hours note'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
