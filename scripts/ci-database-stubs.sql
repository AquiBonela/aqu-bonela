-- Solo para CI: piezas que en Supabase crean los servicios de Auth y Storage y que la imagen
-- de Postgres no trae. Cada una se crea solo si falta; nunca se ejecuta en una base real.
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
DO $g$ BEGIN
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
  GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE $m$Permisos de esquema ya gestionados por la imagen$m$;
END $g$;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY,
  email text,
  created_at timestamptz DEFAULT now()
);

DO $stubs$
BEGIN
  IF to_regprocedure('auth.uid()') IS NULL THEN
    EXECUTE $f$
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $b$
        SELECT coalesce(
          nullif(current_setting('request.jwt.claim.sub', true), ''),
          (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
        )::uuid
      $b$
    $f$;
  END IF;
  IF to_regprocedure('auth.jwt()') IS NULL THEN
    EXECUTE $f$
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $b$
        SELECT coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
      $b$
    $f$;
  END IF;
  IF to_regprocedure('auth.role()') IS NULL THEN
    EXECUTE $f$
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $b$
        SELECT coalesce(
          nullif(current_setting('request.jwt.claim.role', true), ''),
          (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
        )
      $b$
    $f$;
  END IF;
  IF to_regprocedure('storage.foldername(text)') IS NULL THEN
    EXECUTE $f$
      CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $b$
        SELECT (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)]
      $b$
    $f$;
  END IF;
END
$stubs$;
DO $g$ BEGIN
  GRANT EXECUTE ON FUNCTION auth.uid(), auth.jwt(), auth.role() TO anon, authenticated, service_role;
EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE $m$Funciones de auth ya gestionadas por la imagen$m$;
END $g$;

CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  owner uuid,
  public boolean DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets (id),
  name text,
  owner uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
GRANT ALL ON storage.objects, storage.buckets TO anon, authenticated, service_role;
