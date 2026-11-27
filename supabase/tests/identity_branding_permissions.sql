-- Rollback-only regression for 20261201090000_identity_branding: colours, postal code, logo and
-- icon paths, page headers and the private site-assets bucket. No fixture survives.
BEGIN;
SELECT set_config('test.ib_admin', (SELECT user_id::text FROM public.user_roles WHERE role = 'admin' LIMIT 1), true);
DO $$ BEGIN
 IF coalesce(current_setting('test.ib_admin', true), '') = '' THEN
  RAISE EXCEPTION 'This test needs an existing admin in public.user_roles';
 END IF;
END $$;

-- Fixtures written as the table owner: one referenced and one orphan file per kind.
UPDATE public.site_identity SET logo_path = 'identidad/11111111-1111-4111-8111-111111111111/logo.webp' WHERE id;
INSERT INTO public.page_headers (page_key, image_path, image_small_path, alt) VALUES
 ('directorio', 'cabeceras/directorio/22222222-2222-4222-8222-222222222222.webp',
  'cabeceras/directorio/22222222-2222-4222-8222-222222222222-movil.webp', 'Calle principal');
INSERT INTO storage.objects (bucket_id, name) VALUES
 ('site-assets', 'identidad/11111111-1111-4111-8111-111111111111/logo.webp'),
 ('site-assets', 'identidad/33333333-3333-4333-8333-333333333333/logo.webp'),
 ('site-assets', 'cabeceras/directorio/22222222-2222-4222-8222-222222222222.webp'),
 ('site-assets', 'cabeceras/directorio/22222222-2222-4222-8222-222222222222-movil.webp'),
 ('site-assets', 'cabeceras/directorio/44444444-4444-4444-8444-444444444444.webp');

-- Visitors: read only what the identity or a header uses; never write.
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF (SELECT count(*) FROM storage.objects WHERE bucket_id = 'site-assets') <> 3 THEN
  RAISE EXCEPTION 'Visitors must read only referenced site assets';
 END IF;
 IF public.site_config() #>> '{identity,logo_path}' <> 'identidad/11111111-1111-4111-8111-111111111111/logo.webp'
 OR public.site_config() #>> '{page_headers,directorio,alt}' <> 'Calle principal'
 OR public.site_config() -> 'page_headers' -> 'directorio' ? 'updated_by' THEN
  RAISE EXCEPTION 'site_config must return the logo and the headers without their author';
 END IF;
 BEGIN
  UPDATE public.site_identity SET primary_color = '#000000' WHERE id;
  RAISE EXCEPTION 'Visitors must not change colours';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  DELETE FROM public.page_headers;
  RAISE EXCEPTION 'Visitors must not delete headers';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO storage.objects (bucket_id, name) VALUES ('site-assets', 'identidad/55555555-5555-4555-8555-555555555555/logo.webp');
  RAISE EXCEPTION 'Visitors must not upload site assets';
 EXCEPTION WHEN insufficient_privilege OR check_violation THEN NULL; END;
END $$;
RESET ROLE;

-- Signed-in users without a role: same as visitors for writes.
SELECT set_config('request.jwt.claim.sub', 'ad000000-0000-4000-8000-000000000097', true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE n integer; BEGIN
 UPDATE public.page_headers SET alt = 'x' WHERE page_key = 'directorio';
 GET DIAGNOSTICS n = ROW_COUNT;
 IF n <> 0 THEN RAISE EXCEPTION 'Ordinary users must not edit headers'; END IF;
 UPDATE public.site_identity SET accent_color = '#000000' WHERE id;
 GET DIAGNOSTICS n = ROW_COUNT;
 IF n <> 0 THEN RAISE EXCEPTION 'Ordinary users must not edit colours'; END IF;
 BEGIN
  INSERT INTO storage.objects (bucket_id, name) VALUES ('site-assets', 'identidad/66666666-6666-4666-8666-666666666666/logo.webp');
  RAISE EXCEPTION 'Ordinary users must not upload site assets';
 EXCEPTION WHEN insufficient_privilege OR check_violation THEN NULL; END;
 IF (SELECT count(*) FROM storage.objects WHERE bucket_id = 'site-assets') <> 3 THEN
  RAISE EXCEPTION 'Ordinary users must read only referenced site assets';
 END IF;
END $$;
RESET ROLE;

-- Admin: edits colours, postal code and headers; bad values are rejected; manages the bucket.
SELECT set_config('request.jwt.claim.sub', current_setting('test.ib_admin'), true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE n integer; BEGIN
 UPDATE public.site_identity SET primary_color = '#1f4e79', accent_color = '#b5562a', postal_code = '12345' WHERE id;
 GET DIAGNOSTICS n = ROW_COUNT;
 IF n <> 1 THEN RAISE EXCEPTION 'Admin must edit colours and postal code'; END IF;
 BEGIN UPDATE public.site_identity SET postal_code = '1234' WHERE id; RAISE EXCEPTION 'A 4-digit postal code must be rejected';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN UPDATE public.site_identity SET accent_color = '#B5562A' WHERE id; RAISE EXCEPTION 'Upper-case colours must be rejected';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN UPDATE public.site_identity SET icon_path = 'identidad/x/icono-512.png' WHERE id; RAISE EXCEPTION 'Foreign icon paths must be rejected';
 EXCEPTION WHEN check_violation THEN NULL; END;
 UPDATE public.page_headers SET focal_x = 30, focal_y = 70, alt = 'Calle principal al atardecer' WHERE page_key = 'directorio';
 GET DIAGNOSTICS n = ROW_COUNT;
 IF n <> 1 THEN RAISE EXCEPTION 'Admin must edit headers'; END IF;
 BEGIN UPDATE public.page_headers SET focal_x = 101 WHERE page_key = 'directorio'; RAISE EXCEPTION 'Focal point must stay in 0..100';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN UPDATE public.page_headers SET alt = '<img>' WHERE page_key = 'directorio'; RAISE EXCEPTION 'HTML in alt text must be rejected';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN
  INSERT INTO public.page_headers (page_key, image_path, image_small_path)
  VALUES ('otra', 'cabeceras/otra/77777777-7777-4777-8777-777777777777.webp', 'cabeceras/otra/77777777-7777-4777-8777-777777777777-movil.webp');
  RAISE EXCEPTION 'Unknown pages must be rejected';
 EXCEPTION WHEN check_violation THEN NULL; END;
 INSERT INTO storage.objects (bucket_id, name) VALUES ('site-assets', 'identidad/88888888-8888-4888-8888-888888888888/logo.webp');
 IF (SELECT count(*) FROM storage.objects WHERE bucket_id = 'site-assets') <> 6 THEN
  RAISE EXCEPTION 'Admin must see every site asset, referenced or not';
 END IF;
 DELETE FROM public.page_headers WHERE page_key = 'directorio';
 IF public.site_config() -> 'page_headers' <> '{}'::jsonb THEN RAISE EXCEPTION 'Deleted headers must leave site_config'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT updated_by::text FROM public.site_identity) IS DISTINCT FROM current_setting('test.ib_admin') THEN
  RAISE EXCEPTION 'updated_by must record the admin';
 END IF;
END $$;
ROLLBACK;
