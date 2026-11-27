// Configuración pública (nunca secretos) entregada al navegador en window.__PUBLIC_ENV__.
export interface PublicEnv {
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
}

declare global {
  interface Window {
    __PUBLIC_ENV__?: Partial<PublicEnv>;
  }
}

export function getBrowserPublicEnv(): Partial<PublicEnv> {
  if (typeof window === "undefined") return {};
  return window.__PUBLIC_ENV__ ?? {};
}

// Serializa solo las dos claves permitidas y escapa "<" para impedir cerrar el <script>.
export function publicEnvScript(env: Partial<PublicEnv>): string {
  const safe = {
    SUPABASE_URL: typeof env.SUPABASE_URL === "string" ? env.SUPABASE_URL : "",
    SUPABASE_PUBLISHABLE_KEY:
      typeof env.SUPABASE_PUBLISHABLE_KEY === "string" ? env.SUPABASE_PUBLISHABLE_KEY : "",
  };
  const json = JSON.stringify(safe)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return `window.__PUBLIC_ENV__=${json};`;
}
