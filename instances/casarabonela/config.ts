/** Instancia Aquí Bonela (Casarabonela). Solo datos públicos. */
import casarabonelaLogoHome from "./assets/logo-menu.webp";
import casarabonelaLogoAdmin from "./assets/logo-2.webp";
import casarabonelaLogoText from "./assets/logo-texto.webp";
import casarabonelaHero from "./assets/hero-casarabonela.jpg";
import type { MunicipalityConfig } from "../schema";

const instance: MunicipalityConfig = {
  id: "casarabonela",
  name: "Casarabonela",
  appName: "Aquí Bonela",
  demonym: { masculine: "morisco", feminine: "morisca" },
  province: "Málaga",
  region: "Sierra de las Nieves",
  autonomousCommunity: "Andalucía",
  siteUrl: "https://bonela-local-finds.lovable.app",
  coordinates: { lat: 36.786, lng: -4.843, timezone: "Europe/Madrid" },
  institutional: {
    townHallName: "Ayuntamiento de Casarabonela",
    address: "Plaza de Buenavista, 1, 29566 Casarabonela (Málaga)",
    phone: "952456561",
    website: "https://www.casarabonela.es/",
  },
  assets: {
    logoHome: casarabonelaLogoHome,
    logoAdmin: casarabonelaLogoAdmin,
    logoText: casarabonelaLogoText,
    heroImage: casarabonelaHero,
    favicon: "/favicon.png",
    appleTouchIcon: "/apple-touch-icon.png",
    pwaIcons: { icon192: "/icon-192.png", icon512: "/icon-512.png" },
  },
  // Valores idénticos a :root y .dark de src/styles.css (lo comprueba municipality.test.ts).
  theme: {
    themeColor: "#faf6ee",
    light: {
      primary: "oklch(0.493 0.052 127.4)",
      primaryForeground: "oklch(1 0 0)",
      ring: "oklch(0.493 0.052 127.4)",
      accentForeground: "oklch(0.564 0.106 42.4)",
      terracotta: "oklch(0.564 0.106 42.4)",
      terracottaForeground: "oklch(1 0 0)",
      sand: "oklch(0.953 0.012 95)",
      beige: "oklch(0.93 0.03 84)",
      chart1: "oklch(0.493 0.052 127.4)",
      sidebarPrimary: "oklch(0.493 0.052 127.4)",
      sidebarPrimaryForeground: "oklch(1 0 0)",
      sidebarRing: "oklch(0.493 0.052 127.4)",
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
