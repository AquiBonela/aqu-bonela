-- Rollback-only regression for 20261202090000_site_structure (published structure): menu entries,
-- page sections and extra home shortcuts. Visitors read only what is published and visible; no
-- browser role writes these tables; the Directory and the home shortcuts section are permanent.
BEGIN;
SELECT set_config('test.ss_admin', (SELECT user_id::text FROM public.user_roles WHERE role = 'admin' LIMIT 1), true);
DO $$ BEGIN
 IF coalesce(current_setting('test.ss_admin', true), '') = '' THEN
  RAISE EXCEPTION 'This test needs an existing admin in public.user_roles';
 END IF;
END $$;

-- Database rules, checked as the table owner.
DO $$ BEGIN
 BEGIN INSERT INTO public.site_menu (entry_key) VALUES ('directorio');
  RAISE EXCEPTION 'The Directory must not be configurable';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN INSERT INTO public.page_sections (page_key, section_key) VALUES ('inicio', 'accesos-directos');
  RAISE EXCEPTION 'The home shortcuts section must not be configurable';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN INSERT INTO public.page_sections (page_key, section_key) VALUES ('descubre', 'clasificados');
  RAISE EXCEPTION 'Sections outside the catalogue must be rejected';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN INSERT INTO public.home_shortcuts (title, image_path, href)
  VALUES ('Sin destino', 'accesos/11111111-1111-4111-8111-111111111111.webp', 'javascript:alert(1)');
  RAISE EXCEPTION 'A shortcut needs an internal path or an https link';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN INSERT INTO public.home_shortcuts (title, image_path, href)
  VALUES ('Fuera', 'accesos/11111111-1111-4111-8111-111111111111.webp', '//otro.example.org');
  RAISE EXCEPTION 'Protocol-relative links must be rejected';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN INSERT INTO public.home_shortcuts (title, image_path, href)
  VALUES ('Ruta', 'cabeceras/inicio/11111111-1111-4111-8111-111111111111.webp', '/sobre');
  RAISE EXCEPTION 'Shortcut images must live under accesos/';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN INSERT INTO public.home_shortcuts (title, image_path, href)
  VALUES ('<b>x</b>', 'accesos/11111111-1111-4111-8111-111111111111.webp', '/sobre');
  RAISE EXCEPTION 'HTML in shortcut titles must be rejected';
 EXCEPTION WHEN check_violation THEN NULL; END;
 BEGIN INSERT INTO public.home_shortcuts (title, image_path, href)
  VALUES ('   ', 'accesos/11111111-1111-4111-8111-111111111111.webp', '/sobre');
  RAISE EXCEPTION 'Empty shortcut titles must be rejected';
 EXCEPTION WHEN check_violation THEN NULL; END;
END $$;

-- Fixtures written as the table owner.
INSERT INTO public.site_menu (entry_key, enabled, sort_order) VALUES ('guia-tramites', false, 2), ('descubre', true, 1);
INSERT INTO public.page_sections (page_key, section_key, enabled, sort_order) VALUES
 ('descubre', 'entorno', false, 3), ('servicios-publicos', 'tramites', true, 0);
INSERT INTO public.home_shortcuts (id, title, description, image_path, image_alt, href, visible, sort_order) VALUES
 ('aa000000-0000-4000-8000-000000000001', 'Piscina', 'Horarios de verano',
  'accesos/aa000000-0000-4000-8000-000000000001.webp', 'Piscina municipal', '/servicios-publicos#vida-diaria', true, 2),
 ('aa000000-0000-4000-8000-000000000002', 'Oculto', '', 'accesos/aa000000-0000-4000-8000-000000000002.webp', '',
  'https://example.org/oculto', false, 1),
 ('aa000000-0000-4000-8000-000000000003', 'Feria', '', 'accesos/aa000000-0000-4000-8000-000000000003.webp', '',
  'https://example.org/feria', true, 1);
INSERT INTO storage.objects (bucket_id, name) VALUES
 ('site-assets', 'accesos/aa000000-0000-4000-8000-000000000001.webp'),
 ('site-assets', 'accesos/aa000000-0000-4000-8000-000000000002.webp'),
 ('site-assets', 'accesos/aa000000-0000-4000-8000-000000000003.webp'),
 ('site-assets', 'accesos/aa000000-0000-4000-8000-000000000004.webp');

-- Visitors: read the published structure and only the visible shortcuts and their images.
SET LOCAL ROLE anon;
DO $$ DECLARE cfg jsonb := public.site_config(); BEGIN
 IF (cfg #>> '{menu,guia-tramites,enabled}')::boolean IS NOT FALSE
 OR (cfg #>> '{menu,descubre,sort_order}')::int <> 1
 OR (cfg #>> '{sections,descubre,entorno,enabled}')::boolean IS NOT FALSE
 OR cfg -> 'menu' ? 'directorio' THEN
  RAISE EXCEPTION 'site_config must return the published menu and sections';
 END IF;
 IF jsonb_array_length(cfg -> 'shortcuts') <> 2
 OR cfg #>> '{shortcuts,0,title}' <> 'Feria' OR cfg #>> '{shortcuts,1,title}' <> 'Piscina'
 OR cfg -> 'shortcuts' -> 0 ? 'updated_by' OR cfg -> 'shortcuts' -> 0 ? 'visible' THEN
  RAISE EXCEPTION 'site_config must return only visible shortcuts, ordered, without internal fields';
 END IF;
 IF EXISTS (SELECT 1 FROM public.home_shortcuts WHERE NOT visible) THEN
  RAISE EXCEPTION 'Visitors must not read hidden shortcuts';
 END IF;
 IF (SELECT count(*) FROM storage.objects WHERE bucket_id = 'site-assets' AND name LIKE 'accesos/%') <> 2 THEN
  RAISE EXCEPTION 'Visitors must read only the images of visible shortcuts';
 END IF;
 BEGIN PERFORM updated_by FROM public.site_menu; RAISE EXCEPTION 'Visitors must not read who changed the menu';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.site_menu (entry_key) VALUES ('actualidad'); RAISE EXCEPTION 'Visitors must not edit the menu';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN DELETE FROM public.home_shortcuts; RAISE EXCEPTION 'Visitors must not delete shortcuts';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

-- Signed-in users without a role: no writes, no hidden shortcuts.
SELECT set_config('request.jwt.claim.sub', 'ad000000-0000-4000-8000-000000000096', true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.home_shortcuts WHERE NOT visible) THEN
  RAISE EXCEPTION 'Ordinary users must not read hidden shortcuts';
 END IF;
 BEGIN UPDATE public.page_sections SET enabled = true; RAISE EXCEPTION 'Ordinary users must not edit sections';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

-- Admin: reads everything but cannot write directly either; changes go through a published draft.
SELECT set_config('request.jwt.claim.sub', current_setting('test.ss_admin'), true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.home_shortcuts) <> 3 THEN RAISE EXCEPTION 'Admin must read hidden shortcuts'; END IF;
 BEGIN UPDATE public.site_menu SET enabled = true; RAISE EXCEPTION 'Admin must not edit the published menu directly';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.home_shortcuts (title, image_path, href)
  VALUES ('Directo', 'accesos/aa000000-0000-4000-8000-000000000005.webp', '/sobre');
  RAISE EXCEPTION 'Admin must not create published shortcuts directly';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF public.site_config() -> 'shortcuts' @> '[{"title":"Oculto"}]'::jsonb THEN
  RAISE EXCEPTION 'site_config must never return hidden shortcuts, not even to the admin';
 END IF;
END $$;
RESET ROLE;
ROLLBACK;
