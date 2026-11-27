-- Rollback-only regression for safe listing writes (migration 20261129090000):
--  * the owner's approval by link is all-or-nothing: if any step fails nothing changes and the
--    link stays unused;
--  * the admin form only saves the version it opened, so it never overwrites a later approval,
--    and a failed save leaves nothing half-written.
-- Failures are injected with temporary triggers limited to the fixtures. Run in SQL Editor after
-- the migration; no fixture, trigger or function survives (everything ends in ROLLBACK).
BEGIN;
SELECT set_config('test.sw_category', (SELECT id::text FROM public.categories ORDER BY sort_order LIMIT 1), true);
SELECT set_config('test.sw_admin', coalesce((SELECT user_id::text FROM public.user_roles WHERE role = 'admin' LIMIT 1), ''), true);
DO $$ BEGIN
 IF coalesce(current_setting('test.sw_category', true), '') = '' THEN
  RAISE EXCEPTION 'This test needs at least one category';
 END IF;
END $$;

INSERT INTO public.listings (id, slug, type, category_id, name, status, tags) VALUES
 ('5a000000-0000-4000-8000-000000000301', 'rls-sw-approve', 'comercio', current_setting('test.sw_category')::uuid, 'Regression approve', 'borrador', ARRAY['llantas']),
 ('5a000000-0000-4000-8000-000000000302', 'rls-sw-show-hours', 'comercio', current_setting('test.sw_category')::uuid, 'Regression show hours', 'borrador', ARRAY['llantas', '__ocultar_horario']),
 ('5a000000-0000-4000-8000-000000000303', 'rls-sw-admin', 'comercio', current_setting('test.sw_category')::uuid, 'Regression admin', 'borrador', ARRAY['pan']),
 ('5a000000-0000-4000-8000-000000000304', 'rls-sw-race', 'comercio', current_setting('test.sw_category')::uuid, 'Regression race', 'borrador', ARRAY['llantas']),
 ('5a000000-0000-4000-8000-000000000305', 'rls-sw-expired', 'comercio', current_setting('test.sw_category')::uuid, 'Regression expired', 'borrador', ARRAY['llantas']);
INSERT INTO public.listing_contacts (listing_id, phone, show_phone, email, show_email) VALUES
 ('5a000000-0000-4000-8000-000000000301', '600000001', true, 'owner1@example.org', false),
 ('5a000000-0000-4000-8000-000000000303', '600000003', false, 'owner3@example.org', false),
 ('5a000000-0000-4000-8000-000000000304', '600000004', true, 'owner4@example.org', false);
INSERT INTO public.listing_hours (listing_id, weekday, opens, closes) VALUES
 ('5a000000-0000-4000-8000-000000000303', 1, '10:00', '13:00'),
 ('5a000000-0000-4000-8000-000000000304', 1, '10:00', '13:00');
INSERT INTO public.approval_tokens (listing_id, token_hash, expires_at, used_at) VALUES
 ('5a000000-0000-4000-8000-000000000301', 'rls-sw-hash-approve', now() + interval '1 day', NULL),
 ('5a000000-0000-4000-8000-000000000302', 'rls-sw-hash-show-hours', now() + interval '1 day', NULL),
 ('5a000000-0000-4000-8000-000000000304', 'rls-sw-hash-race', now() + interval '1 day', NULL),
 ('5a000000-0000-4000-8000-000000000305', 'rls-sw-hash-expired', now() - interval '1 day', NULL);
-- La ficha 303 ya la aprobó su titular: la administración puede publicarla al guardar.
INSERT INTO public.listing_events (listing_id, kind) VALUES ('5a000000-0000-4000-8000-000000000303', 'aprobacion');

-- Failure injection, only for the fixture listing 301.
CREATE FUNCTION pg_temp.rls_sw_fail() RETURNS trigger LANGUAGE plpgsql AS $f$
BEGIN RAISE EXCEPTION 'injected failure' USING ERRCODE = 'PZ002'; END $f$;
CREATE FUNCTION pg_temp.rls_sw_unchanged() RETURNS void LANGUAGE plpgsql AS $f$
BEGIN
 IF (SELECT status::text FROM public.listings WHERE id = '5a000000-0000-4000-8000-000000000301') <> 'borrador'
 OR (SELECT tags FROM public.listings WHERE id = '5a000000-0000-4000-8000-000000000301') <> ARRAY['llantas']
 THEN RAISE EXCEPTION 'A failed approval must not publish the listing nor change its hours'; END IF;
 IF (SELECT show_phone FROM public.listing_contacts WHERE listing_id = '5a000000-0000-4000-8000-000000000301') IS NOT TRUE
 OR (SELECT show_email FROM public.listing_contacts WHERE listing_id = '5a000000-0000-4000-8000-000000000301') IS NOT FALSE
 THEN RAISE EXCEPTION 'A failed approval must not change contact visibility'; END IF;
 IF (SELECT used_at FROM public.approval_tokens WHERE token_hash = 'rls-sw-hash-approve') IS NOT NULL
 THEN RAISE EXCEPTION 'A failed approval must not use up the link'; END IF;
 IF EXISTS (SELECT 1 FROM public.consents WHERE listing_id = '5a000000-0000-4000-8000-000000000301')
 OR EXISTS (SELECT 1 FROM public.listing_requests WHERE listing_id = '5a000000-0000-4000-8000-000000000301')
 THEN RAISE EXCEPTION 'A failed approval must not record a consent or a request'; END IF;
END $f$;

-- 1. The approval fails at the consent, at the comment and at the very last step (using the link).
CREATE TRIGGER rls_sw_fail BEFORE INSERT ON public.consents FOR EACH ROW
 WHEN (NEW.listing_id = '5a000000-0000-4000-8000-000000000301') EXECUTE FUNCTION pg_temp.rls_sw_fail();
SET LOCAL ROLE service_role;
DO $$ BEGIN
 BEGIN
  PERFORM public.approve_listing_review('rls-sw-hash-approve', '{"show_phone": false, "show_email": true}', false, '["email"]', NULL);
  RAISE EXCEPTION 'The injected consent failure did not abort the approval';
 EXCEPTION WHEN SQLSTATE 'PZ002' THEN NULL;
 END;
END $$;
RESET ROLE;
SELECT pg_temp.rls_sw_unchanged();
DROP TRIGGER rls_sw_fail ON public.consents;

CREATE TRIGGER rls_sw_fail BEFORE INSERT ON public.listing_requests FOR EACH ROW
 WHEN (NEW.listing_id = '5a000000-0000-4000-8000-000000000301') EXECUTE FUNCTION pg_temp.rls_sw_fail();
SET LOCAL ROLE service_role;
DO $$ BEGIN
 BEGIN
  PERFORM public.approve_listing_review('rls-sw-hash-approve', '{"show_phone": false, "show_email": true}', false, '["email"]', 'Todo correcto');
  RAISE EXCEPTION 'The injected request failure did not abort the approval';
 EXCEPTION WHEN SQLSTATE 'PZ002' THEN NULL;
 END;
END $$;
RESET ROLE;
SELECT pg_temp.rls_sw_unchanged();
DROP TRIGGER rls_sw_fail ON public.listing_requests;

CREATE TRIGGER rls_sw_fail BEFORE UPDATE ON public.approval_tokens FOR EACH ROW
 WHEN (NEW.listing_id = '5a000000-0000-4000-8000-000000000301') EXECUTE FUNCTION pg_temp.rls_sw_fail();
SET LOCAL ROLE service_role;
DO $$ BEGIN
 BEGIN
  PERFORM public.approve_listing_review('rls-sw-hash-approve', '{"show_phone": false, "show_email": true}', false, '["email"]', 'Todo correcto');
  RAISE EXCEPTION 'The injected link failure did not abort the approval';
 EXCEPTION WHEN SQLSTATE 'PZ002' THEN NULL;
 END;
END $$;
RESET ROLE;
SELECT pg_temp.rls_sw_unchanged();
DROP TRIGGER rls_sw_fail ON public.approval_tokens;

-- 2. Without failures the whole approval is applied at once, and the link only works once.
SET LOCAL ROLE service_role;
DO $$ DECLARE res jsonb; BEGIN
 res := public.approve_listing_review('rls-sw-hash-approve', '{"show_phone": false, "show_email": true}', false, '["email"]', 'Todo correcto');
 IF res ->> 'status' <> 'ok' OR res ->> 'type' <> 'comercio' OR res ->> 'slug' <> 'rls-sw-approve'
 THEN RAISE EXCEPTION 'Approval must succeed and return the listing path: %', res; END IF;
 res := public.approve_listing_review('rls-sw-hash-approve', '{"show_phone": true}', true, '["teléfono"]', NULL);
 IF res ->> 'status' <> 'used' THEN RAISE EXCEPTION 'A used link must not approve again: %', res; END IF;
 res := public.approve_listing_review('rls-sw-hash-expired', '{}', true, '[]', NULL);
 IF res ->> 'status' <> 'expired' THEN RAISE EXCEPTION 'An expired link must be rejected: %', res; END IF;
 res := public.approve_listing_review('rls-sw-hash-unknown', '{}', true, '[]', NULL);
 IF res ->> 'status' <> 'invalid' THEN RAISE EXCEPTION 'An unknown link must be rejected: %', res; END IF;
 res := public.approve_listing_review('rls-sw-hash-show-hours', '{}', true, '[]', NULL);
 IF res ->> 'status' <> 'ok' THEN RAISE EXCEPTION 'Approval showing hours must succeed: %', res; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF (SELECT status::text FROM public.listings WHERE id = '5a000000-0000-4000-8000-000000000301') <> 'publicada'
 OR (SELECT tags FROM public.listings WHERE id = '5a000000-0000-4000-8000-000000000301') <> ARRAY['llantas', '__ocultar_horario']
 THEN RAISE EXCEPTION 'Approval must publish the listing with the owner''s hours decision'; END IF;
 IF (SELECT tags FROM public.listings WHERE id = '5a000000-0000-4000-8000-000000000302') <> ARRAY['llantas']
 THEN RAISE EXCEPTION 'Approval showing hours must remove the hidden-hours mark'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.listing_contacts WHERE listing_id = '5a000000-0000-4000-8000-000000000301'
   AND NOT show_phone AND show_email AND phone = '600000001' AND email = 'owner1@example.org')
 THEN RAISE EXCEPTION 'Approval must store the owner''s contact visibility and keep the contact data'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.listings WHERE id = '5a000000-0000-4000-8000-000000000301'
   AND public_phone IS NULL AND public_email = 'owner1@example.org')
 THEN RAISE EXCEPTION 'Only the contact fields the owner authorised may become public'; END IF;
 IF (SELECT count(*) FROM public.consents WHERE listing_id = '5a000000-0000-4000-8000-000000000301'
   AND granted AND authorized_fields = '["email"]'::jsonb) <> 1
 OR (SELECT count(*) FROM public.listing_requests WHERE listing_id = '5a000000-0000-4000-8000-000000000301'
   AND status = 'aprobada' AND notes = 'Todo correcto') <> 1
 THEN RAISE EXCEPTION 'Approval must record exactly one consent and the owner''s comment'; END IF;
 IF (SELECT used_at FROM public.approval_tokens WHERE token_hash = 'rls-sw-hash-approve') IS NULL
 THEN RAISE EXCEPTION 'Approval must use up the link'; END IF;
 IF (SELECT status::text FROM public.listings WHERE id = '5a000000-0000-4000-8000-000000000305') <> 'borrador'
 OR (SELECT used_at FROM public.approval_tokens WHERE token_hash = 'rls-sw-hash-expired') IS NOT NULL
 THEN RAISE EXCEPTION 'An expired link must not change anything'; END IF;
END $$;

-- 3. Only the server (service key) approves; visitors and sessions cannot call it.
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM public.approve_listing_review('rls-sw-hash-race', '{}', true, '[]', NULL);
  RAISE EXCEPTION 'Visitors must not call approve_listing_review';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.save_listing('{}', '{}', '[]', '{}');
  RAISE EXCEPTION 'Visitors must not call save_listing';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', 'ad000000-0000-4000-8000-0000000003ff', true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.approve_listing_review('rls-sw-hash-race', '{}', true, '[]', NULL);
  RAISE EXCEPTION 'Sessions must not call approve_listing_review';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 -- A session without the admin role cannot save listings either.
 BEGIN PERFORM public.save_listing('{}', '{}', '[]', '{}');
  RAISE EXCEPTION 'Users without the admin role must not save listings';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

-- 4. Admin form: the owner approves listing 304 after the form opened it (the form holds an
--    older version). Saving that stale form must be rejected and keep the owner's decision.
SET LOCAL ROLE service_role;
DO $$ BEGIN
 IF public.approve_listing_review('rls-sw-hash-race', '{"show_phone": false}', false, '[]', NULL) ->> 'status' <> 'ok'
 THEN RAISE EXCEPTION 'Race fixture approval failed'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', coalesce(nullif(current_setting('test.sw_admin', true), ''), 'ad000000-0000-4000-8000-0000000003fe'), true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
 v_listing jsonb := jsonb_build_object('type', 'comercio', 'category_id', current_setting('test.sw_category'),
   'activity', NULL, 'labels', '[]'::jsonb, 'name', 'Regression race', 'slug', 'rls-sw-race',
   'short_description', '', 'description', '', 'tags', '["llantas"]'::jsonb, 'translations', '{}'::jsonb,
   'featured', false, 'featured_until', NULL, 'urgent_24h', false, 'status', 'borrador',
   'public_website', NULL, 'home_service', false, 'service_area', '');
 v_contact jsonb := '{"phone": "600000004", "email": "owner4@example.org", "show_phone": true, "show_email": false}';
BEGIN
 IF coalesce(current_setting('test.sw_admin', true), '') <> '' THEN
  BEGIN
   PERFORM public.save_listing(v_listing, v_contact, '[{"weekday": 1, "opens": "10:00", "closes": "13:00"}]', '{}',
     p_id => '5a000000-0000-4000-8000-000000000304',
     p_expected_updated_at => (SELECT updated_at FROM public.listings WHERE id = '5a000000-0000-4000-8000-000000000304') - interval '1 second');
   RAISE EXCEPTION 'A stale admin form must not overwrite a later approval';
  EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL;
  END;
  IF (SELECT status::text FROM public.listings WHERE id = '5a000000-0000-4000-8000-000000000304') <> 'publicada'
  OR (SELECT tags FROM public.listings WHERE id = '5a000000-0000-4000-8000-000000000304') <> ARRAY['llantas', '__ocultar_horario']
  OR (SELECT show_phone FROM public.listing_contacts WHERE listing_id = '5a000000-0000-4000-8000-000000000304') IS NOT FALSE
  THEN RAISE EXCEPTION 'The owner''s approval must survive a stale admin save'; END IF;
 END IF;
END $$;

-- 5. Admin form with the current version: everything is saved together; a failure in the last
--    step (hours) leaves the previous version intact; new listings are created.
DO $$
DECLARE
 res jsonb;
 v_version timestamptz;
 v_activity uuid := (SELECT id FROM public.activities WHERE category_id = current_setting('test.sw_category')::uuid ORDER BY sort_order LIMIT 1);
 v_listing jsonb := jsonb_build_object('type', 'comercio', 'category_id', current_setting('test.sw_category'),
   'activity', NULL, 'labels', '["Recién hecho"]'::jsonb, 'name', 'Regression admin edited', 'slug', 'rls-sw-admin',
   'short_description', 'Corta', 'description', 'Larga', 'tags', '["pan", "__ocultar_horario"]'::jsonb,
   'translations', '{}'::jsonb, 'featured', false, 'featured_until', NULL, 'urgent_24h', false,
   'status', 'publicada', 'public_website', NULL, 'home_service', false, 'service_area', '');
 v_contact jsonb := '{"phone": "600000033", "email": "owner3@example.org", "show_phone": true, "show_email": false, "owner_name": "Titular"}';
BEGIN
 IF coalesce(current_setting('test.sw_admin', true), '') <> '' THEN
  v_version := (SELECT updated_at FROM public.listings WHERE id = '5a000000-0000-4000-8000-000000000303');
  res := public.save_listing(v_listing, v_contact,
    '[{"weekday": 2, "opens": "09:00", "closes": "14:00"}, {"weekday": 3, "opens": "09:00", "closes": "14:00"}]',
    CASE WHEN v_activity IS NULL THEN '{}'::uuid[] ELSE ARRAY[v_activity] END,
    p_id => '5a000000-0000-4000-8000-000000000303', p_expected_updated_at => v_version);
  IF (res ->> 'id')::uuid <> '5a000000-0000-4000-8000-000000000303' OR (res ->> 'updated_at') IS NULL
  THEN RAISE EXCEPTION 'save_listing must return the id and the new version: %', res; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.listings WHERE id = '5a000000-0000-4000-8000-000000000303'
    AND name = 'Regression admin edited' AND status = 'publicada' AND tags = ARRAY['pan', '__ocultar_horario']
    AND labels = ARRAY['Recién hecho'] AND public_phone = '600000033' AND public_email IS NULL
    AND updated_at = (res ->> 'updated_at')::timestamptz)
  THEN RAISE EXCEPTION 'The admin save must update the listing and its public contact fields'; END IF;
  IF (SELECT count(*) FROM public.listing_hours WHERE listing_id = '5a000000-0000-4000-8000-000000000303') <> 2
  OR EXISTS (SELECT 1 FROM public.listing_hours WHERE listing_id = '5a000000-0000-4000-8000-000000000303' AND weekday = 1)
  THEN RAISE EXCEPTION 'The admin save must replace the hours'; END IF;
  IF (SELECT count(*) FROM public.listing_activities WHERE listing_id = '5a000000-0000-4000-8000-000000000303')
     <> (CASE WHEN v_activity IS NULL THEN 0 ELSE 1 END)
  THEN RAISE EXCEPTION 'The admin save must replace the activities'; END IF;
  IF (SELECT owner_name FROM public.listing_contacts WHERE listing_id = '5a000000-0000-4000-8000-000000000303') <> 'Titular'
  THEN RAISE EXCEPTION 'The admin save must store the private contact data'; END IF;
  -- Same version again, but an invalid hour makes the last step fail: nothing must change.
  BEGIN
   PERFORM public.save_listing(jsonb_set(v_listing, '{name}', '"Regression half saved"'),
     jsonb_set(v_contact, '{phone}', '"600000099"'), '[{"weekday": 9, "opens": "09:00", "closes": "14:00"}]', '{}',
     p_id => '5a000000-0000-4000-8000-000000000303', p_expected_updated_at => (res ->> 'updated_at')::timestamptz);
   RAISE EXCEPTION 'An invalid hour must abort the admin save';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  IF (SELECT name FROM public.listings WHERE id = '5a000000-0000-4000-8000-000000000303') <> 'Regression admin edited'
  OR (SELECT phone FROM public.listing_contacts WHERE listing_id = '5a000000-0000-4000-8000-000000000303') <> '600000033'
  OR (SELECT count(*) FROM public.listing_hours WHERE listing_id = '5a000000-0000-4000-8000-000000000303') <> 2
  THEN RAISE EXCEPTION 'A failed admin save must not leave anything half-written'; END IF;
  res := public.save_listing(jsonb_set(jsonb_set(v_listing, '{slug}', '"rls-sw-admin-new"'), '{status}', '"borrador"'),
    v_contact, '[]', '{}');
  IF NOT EXISTS (SELECT 1 FROM public.listings WHERE id = (res ->> 'id')::uuid AND slug = 'rls-sw-admin-new' AND status = 'borrador')
  OR NOT EXISTS (SELECT 1 FROM public.listing_contacts WHERE listing_id = (res ->> 'id')::uuid AND phone = '600000033')
  THEN RAISE EXCEPTION 'save_listing must create new listings with their contacts'; END IF;
 END IF;
END $$;
RESET ROLE;

ROLLBACK;
