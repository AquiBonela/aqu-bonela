-- Rollback-only regression test; fixture rows must never remain in production.
BEGIN;
SELECT set_config('test.procedure_admin', (SELECT user_id::text FROM public.user_roles WHERE role='admin' LIMIT 1), true);
INSERT INTO public.procedure_categories(id,slug,title,visible) VALUES
('ab000000-0000-4000-8000-000000000001','rls-test-visible','Regression visible',true),
('ab000000-0000-4000-8000-000000000002','rls-test-hidden','Regression hidden',false);
INSERT INTO public.procedures(id,category_id,slug,title,status) VALUES
('ab000000-0000-4000-8000-000000000011','ab000000-0000-4000-8000-000000000001','published','Regression published','publicada'),
('ab000000-0000-4000-8000-000000000012','ab000000-0000-4000-8000-000000000001','draft','Regression draft','borrador'),
('ab000000-0000-4000-8000-000000000013','ab000000-0000-4000-8000-000000000002','hidden','Regression hidden','publicada');
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.procedures WHERE id IN ('ab000000-0000-4000-8000-000000000011','ab000000-0000-4000-8000-000000000012','ab000000-0000-4000-8000-000000000013')) <> 1 THEN RAISE EXCEPTION 'Anon must read only published procedures in visible categories'; END IF;
 IF EXISTS(SELECT 1 FROM public.procedure_categories WHERE id='ab000000-0000-4000-8000-000000000002') THEN RAISE EXCEPTION 'Anon must not read hidden categories'; END IF;
 BEGIN
  INSERT INTO public.procedures(category_id,slug,title) VALUES('ab000000-0000-4000-8000-000000000001','anon-write','Denied');
  RAISE EXCEPTION 'Anon write unexpectedly allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','ab000000-0000-4000-8000-000000000099',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.procedures WHERE id IN ('ab000000-0000-4000-8000-000000000011','ab000000-0000-4000-8000-000000000012','ab000000-0000-4000-8000-000000000013')) <> 1 THEN RAISE EXCEPTION 'Non-admin must not read drafts or hidden categories'; END IF;
 UPDATE public.procedures SET title='Unauthorized' WHERE id='ab000000-0000-4000-8000-000000000011';
 IF FOUND THEN RAISE EXCEPTION 'Non-admin update allowed'; END IF;
 DELETE FROM public.procedures WHERE id='ab000000-0000-4000-8000-000000000011';
 IF FOUND THEN RAISE EXCEPTION 'Non-admin delete allowed'; END IF;
 BEGIN
  INSERT INTO public.procedure_categories(slug,title) VALUES('unauthorized-category','Denied');
  RAISE EXCEPTION 'Non-admin category creation allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub',current_setting('test.procedure_admin'),true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.procedures WHERE id IN ('ab000000-0000-4000-8000-000000000011','ab000000-0000-4000-8000-000000000012','ab000000-0000-4000-8000-000000000013')) <> 3 THEN RAISE EXCEPTION 'Admin cannot read all states'; END IF;
 UPDATE public.procedures SET title='Admin changed',visibility='{"pasos":false}'::jsonb WHERE id='ab000000-0000-4000-8000-000000000012';
 IF NOT FOUND THEN RAISE EXCEPTION 'Admin update failed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.procedures WHERE id='ab000000-0000-4000-8000-000000000012' AND title='Admin changed' AND visibility->>'pasos'='false') THEN RAISE EXCEPTION 'Admin changes not readable'; END IF;
 INSERT INTO public.procedures(category_id,slug,title) VALUES('ab000000-0000-4000-8000-000000000001','admin-created','Admin created');
 DELETE FROM public.procedures WHERE slug='admin-created' AND category_id='ab000000-0000-4000-8000-000000000001';
 IF NOT FOUND THEN RAISE EXCEPTION 'Admin delete failed'; END IF;
 UPDATE public.procedure_categories SET title='Admin category changed' WHERE id='ab000000-0000-4000-8000-000000000002';
 IF NOT FOUND THEN RAISE EXCEPTION 'Admin cannot edit hidden categories'; END IF;
END $$;
RESET ROLE;
ROLLBACK;