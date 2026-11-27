// Server-only anti-spam helpers. Never log IPs, hashes, tokens or secrets.
const enc = new TextEncoder();

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing server configuration: ${name}`);
  return v;
}

async function hmacHex(message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(requireEnv("RATE_LIMIT_SECRET")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

const IPV4 = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const IPV6 = /^[0-9a-f:]{2,39}$/i;

export function isValidIp(value: string): boolean {
  if (IPV4.test(value)) return true;
  if (!IPV6.test(value) || !value.includes(":")) return false;
  const parts = value.split("::");
  if (parts.length > 2) return false;
  const groups = value.split(":").filter(Boolean);
  if (groups.some((g) => g.length > 4)) return false;
  return parts.length === 2 ? groups.length < 8 : groups.length === 8;
}

/**
 * Trusted client IP according to the actual deployment edge:
 * - TRUSTED_CLIENT_IP_HEADER (optional) when another verified proxy sits in front (e.g. Cloudflare → cf-connecting-ip).
 * - Vercel: x-forwarded-for, which Vercel's edge overwrites with the client IP (first entry).
 * - Otherwise (Cloudflare Workers runtime): cf-connecting-ip, set by Cloudflare's edge.
 * Returns null when no syntactically valid IP is available; never a shared placeholder.
 */
export function getTrustedClientIp(headers: Headers): string | null {
  const override = process.env["TRUSTED_CLIENT_IP_HEADER"]?.trim().toLowerCase();
  let raw: string | null;
  if (override) raw = headers.get(override);
  else if (process.env["VERCEL"]) raw = headers.get("x-forwarded-for")?.split(",")[0] ?? null;
  else raw = headers.get("cf-connecting-ip");
  const ip = raw?.trim() ?? "";
  return ip && isValidIp(ip) ? ip.toLowerCase() : null;
}

// ---- Server-issued form session (complementary limit, never replaces Turnstile) ----
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

export async function issueFormSession(): Promise<string> {
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  const payload = `${nonce}.${Date.now() + SESSION_TTL_MS}`;
  return `${payload}.${await hmacHex(`session:${payload}`)}`;
}

/** Returns the nonce when the token was signed by this server and is not expired. */
export async function verifyFormSession(token: string): Promise<string | null> {
  const m = /^([a-f0-9]{32})\.(\d{10,16})\.([a-f0-9]{64})$/.exec(token);
  if (!m) return null;
  const [, nonce, exp, sig] = m as unknown as [string, string, string, string];
  if (Number(exp) < Date.now()) return null;
  const expected = await hmacHex(`session:${nonce}.${exp}`);
  return timingSafeEqual(expected, sig) ? nonce : null;
}

// ---- Rate limiting (atomic in PostgreSQL) ----
export type Subject = { kind: "ip" | "ss"; value: string };

export async function rateKey(scope: string, subject: Subject): Promise<string> {
  return `${scope}:${subject.kind}:${await hmacHex(`${subject.kind}:${subject.value}`)}`;
}

export async function checkRateLimit(
  scope: string,
  subject: Subject,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("check_rate_limit", {
    p_key: await rateKey(scope, subject),
    p_max_attempts: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("[antispam] rate limit check failed");
    return false; // fail closed
  }
  return data === true;
}

// ---- Turnstile Siteverify ----
// Reuse detection on Cloudflare's side is eventually consistent; our own rate limits remain mandatory.
function allowedHostnames(): Set<string> {
  return new Set(
    (process.env["TURNSTILE_ALLOWED_HOSTNAMES"] ?? "")
      .split(",")
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean),
  );
}

type TurnstileDiag = {
  success?: boolean;
  hostname?: string;
  action?: string;
  errorCodes?: string[];
  requestHost: string;
};

/** Hostname is checked against the fixed server-side allowlist, never against browser-supplied values. */
export async function verifyTurnstile(
  token: string,
  expectedAction: string,
  requestHost: string,
  ip: string | null,
): Promise<{ ok: boolean; diag: TurnstileDiag }> {
  const diag: TurnstileDiag = { requestHost };
  if (!token || token.length > 2048) return { ok: false, diag };
  const body = new URLSearchParams({
    secret: requireEnv("TURNSTILE_SECRET_KEY"),
    response: token,
    idempotency_key: crypto.randomUUID(),
  });
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    if (!res.ok) return { ok: false, diag };
    const r = (await res.json()) as {
      success?: boolean;
      action?: string;
      hostname?: string;
      "error-codes"?: string[];
    };
    Object.assign(diag, {
      success: r.success,
      hostname: r.hostname,
      action: r.action,
      errorCodes: r["error-codes"],
    });
    const ok =
      r.success === true &&
      r.action === expectedAction &&
      typeof r.hostname === "string" &&
      allowedHostnames().has(r.hostname.toLowerCase());
    return { ok, diag };
  } catch {
    console.error("[antispam] turnstile verification unavailable");
    return { ok: false, diag };
  }
}
