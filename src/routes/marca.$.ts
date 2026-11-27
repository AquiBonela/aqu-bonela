import { createFileRoute } from "@tanstack/react-router";

/** Logotipos, iconos y cabeceras de esta instalación, servidos con caché inmutable. */
export const Route = createFileRoute("/marca/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { serveSiteAsset } = await import("@/lib/site-assets.server");
        return serveSiteAsset(params._splat ?? "");
      },
    },
  },
});
