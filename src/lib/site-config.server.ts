/**
 * Configuración pública de la instalación desde su propio Supabase (solo servidor).
 * Cada despliegue sirve a un único municipio y usa solo las claves de su proyecto,
 * así que la caché en memoria nunca mezcla municipios; además se separa por SUPABASE_URL.
 */
import { setSiteConfig } from "@/config/municipality";
import { createRefreshingCache, type RefreshingCache } from "./site-config-cache";
import { EMPTY_SITE_CONFIG, parseSiteConfig, type SiteConfig } from "./site-identity";
import { readServerEnv } from "./runtime-env";

/** Vigencia de la caché: un cambio guardado en /admin llega a los visitantes en este plazo. */
export const SITE_CONFIG_FRESH_MS = 60_000;
/** Si Supabase no responde, se sigue usando el último valor bueno durante este tiempo. */
export const SITE_CONFIG_STALE_MS = 24 * 60 * 60_000;
const RETRY_AFTER_FAILURE_MS = 10_000;
const TIMEOUT_MS = 1_500;

/** La función o la tabla aún no existen (migración sin aplicar): equivale a «sin configurar». */
const NOT_INSTALLED = new Set(["PGRST202", "PGRST205", "42883", "42P01"]);

async function fetchSiteConfig(signal: AbortSignal): Promise<SiteConfig> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.rpc("site_config").abortSignal(signal);
  if (error) {
    if (NOT_INSTALLED.has(error.code ?? "")) return EMPTY_SITE_CONFIG;
    throw new Error(`${error.code ?? "error"}: ${error.message}`);
  }
  return parseSiteConfig(data);
}

let cache: RefreshingCache<SiteConfig> | undefined;
let cacheKey: string | undefined;

function cacheFor(key: string): RefreshingCache<SiteConfig> {
  if (!cache || cacheKey !== key) {
    cacheKey = key;
    cache = createRefreshingCache({
      load: fetchSiteConfig,
      fallback: EMPTY_SITE_CONFIG,
      freshMs: SITE_CONFIG_FRESH_MS,
      staleMs: SITE_CONFIG_STALE_MS,
      retryMs: RETRY_AFTER_FAILURE_MS,
      timeoutMs: TIMEOUT_MS,
      onError: (error) =>
        console.error("[site-config] Supabase no respondió; se usa la última configuración buena o la compilada.", error instanceof Error ? error.message : error),
    });
  }
  return cache;
}

/** Lee (con caché) la configuración, la aplica a getMunicipality() y la devuelve. Nunca lanza. */
export async function loadSiteConfig(): Promise<SiteConfig> {
  const { value } = await cacheFor(readServerEnv("SUPABASE_URL") ?? "").get();
  setSiteConfig(value);
  return value;
}

/** Solo para pruebas: olvida la caché. */
export function resetSiteConfigCache(): void {
  cache = undefined;
  cacheKey = undefined;
}
