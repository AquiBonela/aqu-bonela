-- Rollback-only regression for 20261201092000_listing_review_flow: publication rule, review links,
-- approval with terms version, corrections, consent withdrawal and the event log. No fixture survives.
BEGIN;
SELECT set_config('test.rf_admin', (SELECT user_id::text FROM public.user_roles WHERE role = 'admin' LIMIT 1), true);
SELECT set_config('test.rf_category', (SELECT id::text FROM public.categories ORDER BY sort_order LIMIT 1), true);
DO $$ BEGIN
 IF coalesce(current_setting('test.rf_admin', true), '') = '' THEN
  RAISE EXCEPTION 'This test needs an existing admin in public.user_roles';
 END IF;
END $$;

INSERT INTO public.listings (id, slug, type, category_id, name, status) VALUES
 ('2f000000-0000-4000-8000-000000000601', 'rls-rf-approve', 'comercio', current_setting('test.rf_category')::uuid, 'Regression approve', 'borrador'),
 ('2f000000-0000-4000-8000-000000000602', 'rls-rf-corrections', 'profesional', current_setting('test.rf_category')::uuid, 'Regression corrections', 'pendiente'),
 ('2f000000-0000-4000-8000-000000000603', 'rls-rf-public', 'publico', current_setting('test.rf_category')::uuid, 'Regression public service', 'borrador'),
 ('2f000000-0000-4000-8000-000000000604', 'rls-rf-manual', 'comercio', current_setting('test.rf_category')::uuid, 'Regression manual publish', 'borrador');
INSERT INTO public.listing_contacts (listing_id, phone, show_phone, website, show_website) VALUES
 ('2f000000-0000-4000-8000-000000000601', '600000601', false, 'https://ejemplo.org', false),
 ('2f000000-0000-4000-8000-000000000602', '600000602', true, NULL, false);

-- 1. Review links: a new link cancels the previous unused one and is logged.
INSERT INTO public.approval_tokens (listing_id, token_hash, expires_at) VALUES
 ('2f000000-0000-4000-8000-000000000601', 'rls-rf-old', now() + interval '1 day');
INSERT INTO public.approval_tokens (listing_id, token_hash, expires_at) VALUES
 ('2f000000-0000-4000-8000-000000000601', 'rls-rf-new', now() + interval '1 day'),
 ('2f000000-0000-4000-8000-000000000602', 'rls-rf-fix', now() + interval '1 day'),
 ('2f000000-0000-4000-8000-000000000604', 'rls-rf-manual', now() + interval '1 day');
DO $$ BEGIN
 IF (SELECT used_at FROM public.approval_tokens WHERE token_hash = 'rls-rf-old') IS NULL
 OR (SELECT used_at FROM public.approval_tokens WHERE token_hash = 'rls-rf-new') IS NOT NULL
 THEN RAISE EXCEPTION 'A new link must cancel the previous unused link of the same listing'; END IF;
 IF (SELECT count(*) FROM public.listing_events WHERE listing_id = '2f000000-0000-4000-8000-000000000601' AND kind = 'enlace') <> 2
 THEN RAISE EXCEPTION 'Every link must be logged'; END IF;
 IF public.listing_review_state('2f000000-0000-4000-8000-000000000601') <> 'en_revision' THEN
  RAISE EXCEPTION 'A listing with an active link is under review';
 END IF;
END $$;

-- 2. Publication rule for the admin: no publishing without the owner, except public services.
SELECT set_config('request.jwt.claim.sub', current_setting('test.rf_admin'), true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN
  UPDATE public.listings SET status = 'publicada' WHERE id = '2f000000-0000-4000-8000-000000000601';
  RAISE EXCEPTION 'A listing under review must not be published by the admin';
 EXCEPTION WHEN SQLSTATE 'PT422' THEN NULL; END;
 UPDATE public.listings SET status = 'publicada' WHERE id = '2f000000-0000-4000-8000-000000000603';
 IF (SELECT status::text FROM public.listings WHERE id = '2f000000-0000-4000-8000-000000000603') <> 'publicada'
 THEN RAISE EXCEPTION 'Public services may be published without an owner'; END IF;
 BEGIN
  INSERT INTO public.listing_events (listing_id, kind) VALUES ('2f000000-0000-4000-8000-000000000601', 'aprobacion');
  RAISE EXCEPTION 'The admin must not forge an approval';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  INSERT INTO public.listing_requests (listing_id, status) VALUES ('2f000000-0000-4000-8000-000000000601', 'aprobada');
  RAISE EXCEPTION 'The admin must not write requests directly';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  PERFORM public.request_listing_corrections('rls-rf-fix', 'Cambiad el teléfono');
  RAISE EXCEPTION 'Sessions must not call request_listing_corrections';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

-- 3. Owner approval through the server: terms version, snapshot, consent and publication.
SET LOCAL ROLE service_role;
DO $$ DECLARE res jsonb; BEGIN
 res := public.approve_listing_review('rls-rf-old', '{}', true, '[]', NULL, 'v2');
 IF res ->> 'status' <> 'used' THEN RAISE EXCEPTION 'A cancelled link must not approve: %', res; END IF;
 res := public.approve_listing_review('rls-rf-new', '{"show_website": true, "show_service_area": true}', true, '["web"]', 'De acuerdo', 'v2');
 IF res ->> 'status' <> 'ok' OR (res ->> 'published')::boolean IS NOT TRUE THEN
  RAISE EXCEPTION 'Approval must publish by default: %', res;
 END IF;
 res := public.request_listing_corrections('rls-rf-fix', 'no');
 IF res ->> 'status' <> 'invalid_message' THEN RAISE EXCEPTION 'A too short correction must be rejected: %', res; END IF;
 res := public.request_listing_corrections('rls-rf-fix', 'El teléfono correcto es otro');
 IF res ->> 'status' <> 'ok' THEN RAISE EXCEPTION 'Corrections must be accepted: %', res; END IF;
 res := public.request_listing_corrections('rls-rf-fix', 'Otra vez');
 IF res ->> 'status' <> 'used' THEN RAISE EXCEPTION 'A link must not be used twice: %', res; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.consents WHERE listing_id = '2f000000-0000-4000-8000-000000000601'
   AND granted AND text_version = 'v2' AND authorized_fields = '["web"]'::jsonb AND withdrawn_at IS NULL)
 OR NOT EXISTS (SELECT 1 FROM public.listing_requests WHERE listing_id = '2f000000-0000-4000-8000-000000000601'
   AND status = 'aprobada' AND notes = 'De acuerdo' AND snapshot -> 'listing' ->> 'name' = 'Regression approve')
 THEN RAISE EXCEPTION 'Approval must record the terms version, the comment and a snapshot of what was reviewed'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.listings WHERE id = '2f000000-0000-4000-8000-000000000601'
   AND status = 'publicada' AND public_website = 'https://ejemplo.org' AND show_service_area)
 OR public.listing_review_state('2f000000-0000-4000-8000-000000000601') <> 'aprobada'
 THEN RAISE EXCEPTION 'Approval must publish with the owner''s permissions'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.listings WHERE id = '2f000000-0000-4000-8000-000000000602' AND status = 'borrador')
 OR NOT EXISTS (SELECT 1 FROM public.listing_requests WHERE listing_id = '2f000000-0000-4000-8000-000000000602'
   AND status = 'devuelta' AND notes = 'El teléfono correcto es otro')
 OR NOT EXISTS (SELECT 1 FROM public.listing_reports WHERE listing_id = '2f000000-0000-4000-8000-000000000602')
 OR public.listing_review_state('2f000000-0000-4000-8000-000000000602') <> 'correcciones'
 THEN RAISE EXCEPTION 'Corrections must return the listing to draft, notify the admin and be logged'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.listing_events WHERE listing_id = '2f000000-0000-4000-8000-000000000601'
   AND kind = 'estado' AND from_status = 'borrador' AND to_status = 'publicada')
 THEN RAISE EXCEPTION 'Status changes must be logged'; END IF;
END $$;

-- 4. Without automatic publication the approval leaves the listing approved, and the admin publishes it.
UPDATE public.site_settings SET publish_on_owner_approval = false WHERE id;
SET LOCAL ROLE service_role;
DO $$ DECLARE res jsonb; BEGIN
 res := public.approve_listing_review('rls-rf-manual', '{}', true, '[]', NULL, 'v2');
 IF res ->> 'status' <> 'ok' OR (res ->> 'published')::boolean THEN RAISE EXCEPTION 'Approval must not publish: %', res; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub', current_setting('test.rf_admin'), true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE res jsonb; BEGIN
 IF (SELECT status::text FROM public.listings WHERE id = '2f000000-0000-4000-8000-000000000604') <> 'pendiente'
 OR public.listing_review_state('2f000000-0000-4000-8000-000000000604') <> 'aprobada'
 THEN RAISE EXCEPTION 'An approved, unpublished listing must wait for the admin'; END IF;
 UPDATE public.listings SET status = 'publicada' WHERE id = '2f000000-0000-4000-8000-000000000604';

 -- 5. Consent withdrawal: unpublished, contact hidden, no way back without a new approval.
 res := public.withdraw_listing_consent('2f000000-0000-4000-8000-000000000601', 'Lo pidió por teléfono');
 IF res ->> 'status' <> 'ok' THEN RAISE EXCEPTION 'Withdrawal must succeed: %', res; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.listings WHERE id = '2f000000-0000-4000-8000-000000000601'
   AND status = 'oculta' AND public_website IS NULL AND NOT show_service_area)
 OR EXISTS (SELECT 1 FROM public.consents WHERE listing_id = '2f000000-0000-4000-8000-000000000601' AND withdrawn_at IS NULL)
 OR public.listing_review_state('2f000000-0000-4000-8000-000000000601') <> 'retirada'
 THEN RAISE EXCEPTION 'Withdrawal must hide the listing and its contact data'; END IF;
 BEGIN
  UPDATE public.listings SET status = 'publicada' WHERE id = '2f000000-0000-4000-8000-000000000601';
  RAISE EXCEPTION 'A withdrawn listing must not be published again';
 EXCEPTION WHEN SQLSTATE 'PT422' THEN NULL; END;
 -- A listing hidden by the admin (without withdrawal) can be published again.
 UPDATE public.listings SET status = 'oculta' WHERE id = '2f000000-0000-4000-8000-000000000604';
 UPDATE public.listings SET status = 'publicada' WHERE id = '2f000000-0000-4000-8000-000000000604';
END $$;
RESET ROLE;

SELECT set_config('request.jwt.claim.sub', 'ad000000-0000-4000-8000-000000000096', true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN
  PERFORM public.withdraw_listing_consent('2f000000-0000-4000-8000-000000000604', NULL);
  RAISE EXCEPTION 'Ordinary users must not withdraw consents';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF EXISTS (SELECT 1 FROM public.listing_events) OR EXISTS (SELECT 1 FROM public.consents) THEN
  RAISE EXCEPTION 'Ordinary users must not read the event log or consents';
 END IF;
END $$;
RESET ROLE;
ROLLBACK;
