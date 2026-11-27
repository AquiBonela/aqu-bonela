/**
 * Sirve desde el propio dominio los archivos del bucket privado site-assets (logotipos, iconos y
 * cabeceras de página). Solo servidor.
 * - Solo admite las rutas que genera el panel (isServableAssetPath): nada de rutas arbitrarias.
 * - Lee con la clave publicable: las políticas de Storage solo dejan ver los archivos que la
 *   identidad o una cabecera usan en ese momento. No necesita la clave de servicio.
 * - Cada subida tiene su propia carpeta o nombre, así que la respuesta se puede guardar en caché
 *   para siempre: un archivo nuevo es una dirección nueva.
 * Cada instalación lee su propio Supabase (SUPABASE_URL), así que nunca sirve archivos de otra.
 */
import { isServableAssetPath } from "./site-identity";
import { readServerEnv } from "./runtime-env";

const TIMEOUT_MS = 5_000;
const IMMUTABLE = "public, max-age=31536000, immutable";

function notFound(): Response {
  return new Response("No encontrado", {
    status: 404,
    headers: { "cache-control": "public, max-age=60", "content-type": "text/plain; charset=utf-8" },
  });
}

function contentType(path: string): string {
  return path.endsWith(".png") ? "image/png" : "image/webp";
}

export async function serveSiteAsset(
  path: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  if (!isServableAssetPath(path)) return notFound();
  const url = readServerEnv("SUPABASE_URL");
  const key = readServerEnv("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) return notFound();

  let upstream: Response;
  try {
    upstream = await fetchImpl(
      `${url.replace(/\/+$/, "")}/storage/v1/object/authenticated/site-assets/${path}`,
      {
        headers: { apikey: key, authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
  } catch {
    return new Response("No disponible", {
      status: 503,
      headers: { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" },
    });
  }
  if (!upstream.ok || !upstream.body) return notFound();

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": contentType(path),
      "cache-control": IMMUTABLE,
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'",
    },
  });
}
