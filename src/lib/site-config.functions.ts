import { createServerFn } from "@tanstack/react-start";

// Identidad pública de esta instalación, leída de su Supabase con la clave publicable y RLS.
export const getSiteConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { loadSiteConfig } = await import("./site-config.server");
  return loadSiteConfig();
});
