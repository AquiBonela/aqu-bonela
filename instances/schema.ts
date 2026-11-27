/**
 * Contrato de una instancia municipal. Cada carpeta instances/<id>/ exporta en
 * config.ts un MunicipalityConfig. Solo datos públicos; apto para navegador.
 */

/** Instancia que se compila cuando VITE_MUNICIPALITY_ID está vacío. */
export const DEFAULT_MUNICIPALITY_ID = "casarabonela";

export interface MunicipalityConfig {
  id: string;
  name: string;
  appName: string;
  demonym: { masculine: string; feminine: string };
  province: string;
  region: string;
  autonomousCommunity: string;
  siteUrl: string;
  coordinates: { lat: number; lng: number; timezone: string };
  institutional: {
    townHallName: string;
    address: string;
    phone: string;
    website: string;
  };
  assets: MunicipalityAssets;
  theme: MunicipalityTheme;
}

/**
 * Recursos gráficos del municipio. Los de src/assets son URLs resueltas por Vite;
 * los de public/ son rutas absolutas servidas tal cual.
 */
export interface MunicipalityAssets {
  /** Logo claro para la portada, sobre la foto principal. */
  logoHome: string;
  /** Logo del panel de administración. */
  logoAdmin: string;
  /** Logo solo tipográfico. */
  logoText: string;
  /** Imagen principal del municipio. */
  heroImage: string;
  favicon: string;
  appleTouchIcon: string;
  pwaIcons: { icon192: string; icon512: string };
}

/** Tokens de identidad en modo claro (valores OKLCH). */
export interface MunicipalityLightTokens {
  primary: string;
  primaryForeground: string;
  ring: string;
  accentForeground: string;
  terracotta: string;
  terracottaForeground: string;
  sand: string;
  beige: string;
  chart1: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarRing: string;
}

/** Tokens de identidad en modo oscuro (valores OKLCH). */
export interface MunicipalityDarkTokens {
  primary: string;
  primaryForeground: string;
  ring: string;
  accentForeground: string;
  chart1: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarRing: string;
}

export interface MunicipalityTheme {
  /** Color hexadecimal #rrggbb para <meta name="theme-color">. */
  themeColor: string;
  light: MunicipalityLightTokens;
  dark: MunicipalityDarkTokens;
}
