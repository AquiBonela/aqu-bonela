-- Rollback-only authorization regression: no fixture or existing data changes survive.
BEGIN;
SELECT set_config('test.translation_admin', (SELECT user_id::text FROM public.user_roles WHERE role='admin' LIMIT 1), true);
INSERT INTO public.translation_gateway_state(id, blocked, reason) VALUES(true,true,'Regression block')
ON CONFLICT(id) DO UPDATE SET blocked=true, reason='Regression block';
SET LOCAL ROLE anon;
DO $$ BEGIN
 -- Either RLS hides the row or the privilege is missing: both keep visitors out.
 BEGIN
  IF EXISTS (SELECT 1 FROM public.translation_gateway_state) THEN RAISE EXCEPTION 'Anon must not read translation state'; END IF;
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
  UPDATE public.translation_gateway_state SET blocked=false WHERE id=true;
  IF FOUND THEN RAISE EXCEPTION 'Anon must not update translation state'; END IF;
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','ad000000-0000-4000-8000-000000000099',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.translation_gateway_state) THEN RAISE EXCEPTION 'Ordinary users must not read translation state'; END IF;
 UPDATE public.translation_gateway_state SET blocked=false WHERE id=true;
 IF FOUND THEN RAISE EXCEPTION 'Ordinary users must not resume translation'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub',current_setting('test.translation_admin'),true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.translation_gateway_state WHERE blocked AND reason='Regression block') THEN RAISE EXCEPTION 'Admin must read blocked state'; END IF;
 UPDATE public.translation_gateway_state SET blocked=false,reason='' WHERE id=true;
 IF NOT FOUND THEN RAISE EXCEPTION 'Admin must resume translation'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.translation_gateway_state WHERE NOT blocked) THEN RAISE EXCEPTION 'Admin changes must read back'; END IF;
END $$;
RESET ROLE;
ROLLBACK;