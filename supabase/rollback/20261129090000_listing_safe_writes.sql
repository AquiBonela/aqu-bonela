-- Vuelta atrás de 20261129090000_listing_safe_writes.sql: elimina las dos funciones.
-- No toca datos. Después, el formulario de administración y el enlace de revisión de una
-- versión anterior de la web vuelven a escribir en las tablas directamente.
-- Antes de ejecutarla, la web desplegada debe ser una versión que no llame a estas funciones.
DROP FUNCTION IF EXISTS public.approve_listing_review(text, jsonb, boolean, jsonb, text);
DROP FUNCTION IF EXISTS public.save_listing(jsonb, jsonb, jsonb, uuid[], uuid, timestamp with time zone);

NOTIFY pgrst, 'reload schema';
