/** Manifiesto de la aplicación instalable a partir de la identidad efectiva de la instalación. */
import type { MunicipalityConfig } from "../../instances/schema";

export function buildWebManifest(m: MunicipalityConfig) {
  return {
    name: m.appName,
    short_name: m.shortName || m.appName,
    description: `${m.appName}: comercios, profesionales, servicios y trámites de ${m.name}.`,
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: m.theme.themeColor,
    theme_color: m.theme.themeColor,
    icons: [
      { src: m.assets.pwaIcons.icon192, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: m.assets.pwaIcons.icon512, sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
