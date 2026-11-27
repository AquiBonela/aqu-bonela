/**
 * Instancia de demostración de Conecta tu Pueblo. Municipio ficticio: no contiene
 * nombres, teléfonos, direcciones, imágenes ni datos legales de ningún lugar real.
 */
import type { MunicipalityConfig } from "../schema";

const instance: MunicipalityConfig = {
  id: "demo",
  name: "Municipio de ejemplo",
  appName: "Conecta tu Pueblo Demo",
  shortName: "Conecta tu Pueblo",
  storagePrefix: "conectatupueblo-demo",
  province: "Provincia de ejemplo",
  siteUrl: "https://conecta-tu-pueblo.vercel.app",
  assets: {
    favicon: "/favicon.png",
    appleTouchIcon: "/apple-touch-icon.png",
    pwaIcons: { icon192: "/icon-192.png", icon512: "/icon-512.png" },
  },
  theme: {
    themeColor: "#f5f7fa",
    light: {
      primary: "oklch(0.45 0.1 250)",
      primaryForeground: "oklch(1 0 0)",
      ring: "oklch(0.45 0.1 250)",
      accentForeground: "oklch(0.5 0.1 200)",
      terracotta: "oklch(0.52 0.1 190)",
      terracottaForeground: "oklch(1 0 0)",
      sand: "oklch(0.965 0.008 250)",
      beige: "oklch(0.93 0.02 240)",
      chart1: "oklch(0.45 0.1 250)",
      sidebarPrimary: "oklch(0.45 0.1 250)",
      sidebarPrimaryForeground: "oklch(1 0 0)",
      sidebarRing: "oklch(0.45 0.1 250)",
    },
    dark: {
      primary: "oklch(0.929 0.013 255.508)",
      primaryForeground: "oklch(0.208 0.042 265.755)",
      ring: "oklch(0.551 0.027 264.364)",
      accentForeground: "oklch(0.984 0.003 247.858)",
      chart1: "oklch(0.488 0.243 264.376)",
      sidebarPrimary: "oklch(0.488 0.243 264.376)",
      sidebarPrimaryForeground: "oklch(0.984 0.003 247.858)",
      sidebarRing: "oklch(0.551 0.027 264.364)",
    },
  },
};

export default instance;
