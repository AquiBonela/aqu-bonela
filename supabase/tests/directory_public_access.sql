-- Rollback-only regression for the public Directory: visitors read public.public_listings,
-- never public.listings, and never hours the owner hid. Run in SQL Editor after the migration;
-- no fixture survives.
BEGIN;
SELECT set_config('test.dir_category', (SELECT id::text FROM public.categories ORDER BY sort_order LIMIT 1), true);
SELECT set_config('test.dir_admin', (SELECT user_id::text FROM public.user_roles WHERE role = 'admin' LIMIT 1), true);
DO $$ BEGIN
 IF current_setting('test.dir_category', true) IS NULL OR current_setting('test.dir_category', true) = '' THEN
  RAISE EXCEPTION 'This test needs at least one category';
 END IF;
END $$;

-- Esta prueba comprueba el acceso público, no la regla de publicación (la comprueba
-- listing_review_flow.sql): las fichas de ejemplo se publican sin pasar por la aprobación.
-- ALTER TABLE dentro de la transacción: el ROLLBACK final lo deja como estaba.
ALTER TABLE public.listings DISABLE TRIGGER listings_publish_rule;
INSERT INTO public.listings (id, slug, type, category_id, name, status, tags, featured, featured_until, translations) VALUES
 ('ad000000-0000-4000-8000-000000000201', 'rls-dir-visible', 'comercio', current_setting('test.dir_category')::uuid, 'Regression visible',
  'publicada', ARRAY['pan de leña'], true, now() + interval '1 day',
  '{"en":{"content":{"description":"Bread"},"source":{"description":"Pan"},"manual":true,"glossary":[{"source":"pan","target":"bread","updatedAt":1}]}}'),
 ('ad000000-0000-4000-8000-000000000202', 'rls-dir-hidden-hours', 'comercio', current_setting('test.dir_category')::uuid, 'Regression hidden hours',
  'publicada', ARRAY['__ocultar_horario', 'encargos'], true, now() - interval '1 day', '{}'),
 ('ad000000-0000-4000-8000-000000000203', 'rls-dir-draft', 'comercio', current_setting('test.dir_category')::uuid, 'Regression draft',
  'borrador', '{}', false, NULL, '{}');
INSERT INTO public.listing_hours (listing_id, weekday, opens, closes) VALUES
 ('ad000000-0000-4000-8000-000000000201', 1, '09:00', '14:00'),
 ('ad000000-0000-4000-8000-000000000202', 1, '09:00', '14:00'),
 ('ad000000-0000-4000-8000-000000000203', 1, '09:00', '14:00');
INSERT INTO public.listing_photos (listing_id, storage_path, alt, sort_order) VALUES
 ('ad000000-0000-4000-8000-000000000201', 'ad000000-0000-4000-8000-000000000201/foto.webp', '', 0),
 ('ad000000-0000-4000-8000-000000000203', 'ad000000-0000-4000-8000-000000000203/foto.webp', '', 0);
UPDATE public.listings SET cover_path = 'ad000000-0000-4000-8000-000000000201/portada.webp' WHERE id = 'ad000000-0000-4000-8000-000000000201';
INSERT INTO storage.objects (bucket_id, name) VALUES
 ('listing-photos', 'ad000000-0000-4000-8000-000000000201/portada.webp'),
 ('listing-photos', 'ad000000-0000-4000-8000-000000000201/foto.webp'),
 ('listing-photos', 'ad000000-0000-4000-8000-000000000203/foto.webp');

SELECT set_config('test.dir_activities',
  (SELECT count(*)::text FROM public.activities WHERE category_id = current_setting('test.dir_category')::uuid), true);

-- Visitors.
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN
  INSERT INTO public.listing_hours (listing_id, weekday, opens, closes) VALUES ('ad000000-0000-4000-8000-000000000201', 2, '09:00', '10:00');
  RAISE EXCEPTION 'Anon must not write listing hours';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  UPDATE public.listings SET name = 'Anon' WHERE slug = 'rls-dir-visible';
  RAISE EXCEPTION 'Anon must not update listings';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM 1 FROM public.listings;
  RAISE EXCEPTION 'Anon must not read public.listings';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF EXISTS (SELECT 1 FROM public.public_listings WHERE slug = 'rls-dir-draft') THEN RAISE EXCEPTION 'Drafts must stay hidden'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.public_listings WHERE slug = 'rls-dir-visible' AND featured AND tags = ARRAY['pan de leña'] AND NOT hours_hidden
   AND translations = '{"en":{"content":{"description":"Bread"}}}'::jsonb)
 THEN RAISE EXCEPTION 'Visible listing must keep its public data, without editorial memory'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.public_listings WHERE slug = 'rls-dir-hidden-hours' AND NOT featured AND tags = ARRAY['encargos'] AND hours_hidden)
 THEN RAISE EXCEPTION 'Expired featured and reserved tag must not reach visitors'; END IF;
 IF (SELECT count(*) FROM public.listing_hours WHERE listing_id = 'ad000000-0000-4000-8000-000000000201') <> 1 THEN RAISE EXCEPTION 'Visible hours must stay public'; END IF;
 IF EXISTS (SELECT 1 FROM public.listing_hours WHERE listing_id IN ('ad000000-0000-4000-8000-000000000202', 'ad000000-0000-4000-8000-000000000203'))
 THEN RAISE EXCEPTION 'Hidden or draft hours must not be readable'; END IF;
 IF (SELECT count(*) FROM public.listing_photos WHERE listing_id IN ('ad000000-0000-4000-8000-000000000201', 'ad000000-0000-4000-8000-000000000203')) <> 1
 THEN RAISE EXCEPTION 'Only photos of published listings are readable'; END IF;
 IF (SELECT count(*) FROM storage.objects WHERE bucket_id = 'listing-photos' AND name LIKE 'ad000000-0000-4000-8000-0000000002%') <> 2
 THEN RAISE EXCEPTION 'Cover and gallery of published listings must stay signable, drafts must not'; END IF;
 IF (SELECT count(*) FROM public.activities WHERE category_id = current_setting('test.dir_category')::uuid)
   <> current_setting('test.dir_activities')::int
 THEN RAISE EXCEPTION 'Activities of categories with published listings must stay public'; END IF;
END $$;
RESET ROLE;

-- Columns the view must never expose.
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'public_listings'
   AND column_name IN ('featured_until', 'created_at', 'updated_at', 'published_at', 'home_service', 'service_area', 'status'))
 THEN RAISE EXCEPTION 'public_listings exposes internal columns'; END IF;
END $$;

-- Admin keeps full access to the table (skipped if the installation has no admin yet).
DO $$ BEGIN
 IF coalesce(current_setting('test.dir_admin', true), '') = '' THEN RAISE NOTICE 'No admin found: admin checks skipped'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub', coalesce(nullif(current_setting('test.dir_admin', true), ''), 'ad000000-0000-4000-8000-000000000299'), true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF coalesce(current_setting('test.dir_admin', true), '') <> '' THEN
  IF (SELECT count(*) FROM public.listings WHERE slug LIKE 'rls-dir-%') <> 3 THEN RAISE EXCEPTION 'Admin must read every listing'; END IF;
  IF (SELECT count(*) FROM public.listing_hours WHERE listing_id IN ('ad000000-0000-4000-8000-000000000202', 'ad000000-0000-4000-8000-000000000203')) <> 2
  THEN RAISE EXCEPTION 'Admin must read hidden and draft hours'; END IF;
  UPDATE public.listings SET name = 'Regression edited' WHERE slug = 'rls-dir-draft';
  IF NOT FOUND THEN RAISE EXCEPTION 'Admin must edit listings'; END IF;
 ELSE
  IF EXISTS (SELECT 1 FROM public.listings WHERE slug LIKE 'rls-dir-%') THEN RAISE EXCEPTION 'Users without role must not read listings'; END IF;
 END IF;
END $$;
RESET ROLE;

-- Groundwork (admin) controls hours visibility from the panel: it creates listings with visible
-- and hidden hours, then switches both. Visitors only ever receive the authorised hours.
-- Skipped when the installation has no admin yet.
SELECT set_config('request.jwt.claim.sub', coalesce(nullif(current_setting('test.dir_admin', true), ''), 'ad000000-0000-4000-8000-000000000299'), true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF coalesce(current_setting('test.dir_admin', true), '') <> '' THEN
  INSERT INTO public.listings (id, slug, type, category_id, name, status, tags) VALUES
   ('ad000000-0000-4000-8000-000000000211', 'rls-dir-admin-visible', 'comercio', current_setting('test.dir_category')::uuid,
    'Regression admin visible', 'publicada', ARRAY['pan']),
   ('ad000000-0000-4000-8000-000000000212', 'rls-dir-admin-hidden', 'comercio', current_setting('test.dir_category')::uuid,
    'Regression admin hidden', 'publicada', ARRAY['pan', '__ocultar_horario']);
  INSERT INTO public.listing_hours (listing_id, weekday, opens, closes) VALUES
   ('ad000000-0000-4000-8000-000000000211', 1, '09:00', '14:00'),
   ('ad000000-0000-4000-8000-000000000212', 1, '09:00', '14:00');
 END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF coalesce(current_setting('test.dir_admin', true), '') <> '' THEN
  IF (SELECT count(*) FROM public.listing_hours WHERE listing_id = 'ad000000-0000-4000-8000-000000000211') <> 1
  THEN RAISE EXCEPTION 'Visible hours created by the admin must reach visitors'; END IF;
  IF EXISTS (SELECT 1 FROM public.listing_hours WHERE listing_id = 'ad000000-0000-4000-8000-000000000212')
  THEN RAISE EXCEPTION 'Hidden hours created by the admin must not reach visitors'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.public_listings WHERE id = 'ad000000-0000-4000-8000-000000000212' AND hours_hidden AND tags = ARRAY['pan'])
  THEN RAISE EXCEPTION 'The public view must flag hidden hours without exposing the reserved tag'; END IF;
 END IF;
END $$;
RESET ROLE;

SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF coalesce(current_setting('test.dir_admin', true), '') <> '' THEN
  UPDATE public.listings SET tags = array_append(tags, '__ocultar_horario') WHERE id = 'ad000000-0000-4000-8000-000000000211';
  IF NOT FOUND THEN RAISE EXCEPTION 'The admin must be able to hide hours'; END IF;
  UPDATE public.listings SET tags = array_remove(tags, '__ocultar_horario') WHERE id = 'ad000000-0000-4000-8000-000000000212';
  IF NOT FOUND THEN RAISE EXCEPTION 'The admin must be able to show hours again'; END IF;
  IF (SELECT count(*) FROM public.listing_hours
      WHERE listing_id IN ('ad000000-0000-4000-8000-000000000211', 'ad000000-0000-4000-8000-000000000212')) <> 2
  THEN RAISE EXCEPTION 'The admin must keep reading every hour, visible or hidden'; END IF;
 END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF coalesce(current_setting('test.dir_admin', true), '') <> '' THEN
  IF EXISTS (SELECT 1 FROM public.listing_hours WHERE listing_id = 'ad000000-0000-4000-8000-000000000211')
  THEN RAISE EXCEPTION 'Hours hidden by the admin must stop reaching visitors'; END IF;
  IF (SELECT count(*) FROM public.listing_hours WHERE listing_id = 'ad000000-0000-4000-8000-000000000212') <> 1
  THEN RAISE EXCEPTION 'Hours shown again by the admin must reach visitors'; END IF;
 END IF;
END $$;
RESET ROLE;
ROLLBACK;
