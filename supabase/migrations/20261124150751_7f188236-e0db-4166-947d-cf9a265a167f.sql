CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE private.form_rate_limits (
  key text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX form_rate_limits_expires_idx ON private.form_rate_limits (expires_at);
REVOKE ALL ON private.form_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON private.form_rate_limits TO service_role;
ALTER TABLE private.form_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text, p_max_attempts integer, p_window_seconds integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_attempts integer;
BEGIN
  IF p_key IS NULL OR p_key !~ '^[a-z_]{2,24}:(ip|ss):[a-f0-9]{32,64}$' THEN
    RAISE EXCEPTION 'invalid p_key' USING ERRCODE = '22023';
  END IF;
  IF p_max_attempts IS NULL OR p_max_attempts < 1 OR p_max_attempts > 100 THEN
    RAISE EXCEPTION 'invalid p_max_attempts' USING ERRCODE = '22023';
  END IF;
  IF p_window_seconds IS NULL OR p_window_seconds < 10 OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'invalid p_window_seconds' USING ERRCODE = '22023';
  END IF;

  INSERT INTO private.form_rate_limits AS r (key, attempts, window_start, expires_at)
  VALUES (p_key, 1, now(), now() + make_interval(secs => p_window_seconds))
  ON CONFLICT (key) DO UPDATE SET
    attempts = CASE WHEN r.expires_at <= now() THEN 1 ELSE r.attempts + 1 END,
    window_start = CASE WHEN r.expires_at <= now() THEN now() ELSE r.window_start END,
    expires_at = CASE WHEN r.expires_at <= now() THEN now() + make_interval(secs => p_window_seconds) ELSE r.expires_at END
  RETURNING attempts INTO v_attempts;

  RETURN v_attempts <= p_max_attempts;
END;
$$;
REVOKE ALL ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;

CREATE OR REPLACE FUNCTION private.cleanup_expired_rate_limits(p_batch_size integer DEFAULT 1000)
RETURNS integer
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE v_deleted integer;
BEGIN
  IF p_batch_size IS NULL OR p_batch_size < 1 OR p_batch_size > 10000 THEN
    RAISE EXCEPTION 'invalid p_batch_size' USING ERRCODE = '22023';
  END IF;
  DELETE FROM private.form_rate_limits
  WHERE key IN (
    SELECT key FROM private.form_rate_limits
    WHERE expires_at < now()
    ORDER BY expires_at
    LIMIT p_batch_size
  );
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;
REVOKE ALL ON FUNCTION private.cleanup_expired_rate_limits(integer) FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule('cleanup-form-rate-limits', '17 * * * *', $$SELECT private.cleanup_expired_rate_limits(5000);$$);