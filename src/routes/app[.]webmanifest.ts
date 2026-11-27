import { createFileRoute } from "@tanstack/react-router";

/**
 * Manifiesto con el nombre, los colores y los iconos de esta instalación. Se renueva con la misma
 * caché que la identidad (60 s en el servidor) y el navegador lo guarda unos minutos.
 */
export const Route = createFileRoute("/app.webmanifest")({
  server: {
    handlers: {
      GET: async () => {
        const [{ loadSiteConfig }, { getMunicipality }, { buildWebManifest }] = await Promise.all([
          import("@/lib/site-config.server"),
          import("@/config/municipality"),
          import("@/lib/web-manifest"),
        ]);
        await loadSiteConfig();
        return new Response(JSON.stringify(buildWebManifest(getMunicipality())), {
          headers: {
            "content-type": "application/manifest+json; charset=utf-8",
            "cache-control": "public, max-age=300",
          },
        });
      },
    },
  },
});
