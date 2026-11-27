/**
 * Contrato de una instancia municipal. Cada carpeta instances/<id>/ exporta
 * config.ts (MunicipalityConfig) y content.ts (InstanceContent).
 * Solo datos públicos; apto para navegador.
 * Un dato opcional ausente oculta su sección: nunca se rellena con otro municipio.
 */
import type { TKey } from "../src/lib/i18n";
import type { EmergencyGroup } from "../src/lib/emergency-phones";
import type { Categoria, Tramite } from "../src/lib/tramites";
import type { DailyLifeItem } from "../src/lib/vida-diaria";

/** Instancia que se compila cuando VITE_MUNICIPALITY_ID está vacío: la demo, sin datos reales. */
export const DEFAULT_MUNICIPALITY_ID = "demo";

export interface MunicipalityConfig {
  id: string;
  name: string;
  appName: string;
  /** Nombre breve en textos como «Tu negocio también forma parte de …». */
  shortName: string;
  /** Prefijo de las claves guardadas en el navegador (idioma, aviso de instalación). */
  storagePrefix: string;
  demonym?: { masculine: string; feminine: string };
  province: string;
  region?: string;
  autonomousCommunity?: string;
  siteUrl: string;
  /** Sin coordenadas no se muestra el tiempo. */
  coordinates?: { lat: number; lng: number; timezone: string };
  institutional?: {
    townHallName: string;
    address: string;
    phone: string;
    website: string;
  };
  assets: MunicipalityAssets;
  theme: MunicipalityTheme;
}

/**
 * Recursos gráficos del municipio. Los de assets/ de la instancia son URLs resueltas por Vite;
 * los de public/ son rutas absolutas servidas tal cual.
 */
export interface MunicipalityAssets {
  /** Logo claro para la portada, sobre la foto principal. Sin él se muestra el nombre. */
  logoHome?: string;
  /** Logo del panel de administración. Sin él se muestra el nombre. */
  logoAdmin?: string;
  /** Logo solo tipográfico. */
  logoText?: string;
  /** Imagen principal del municipio. Sin ella las cabeceras usan el color principal. */
  heroImage?: string;
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

export type HomeSection = "directorio" | "descubre" | "servicios" | "actualidad" | "clasificados";

export interface PublicServicesContent {
  heroImage?: string;
  heroAlt?: string;
  securityContacts?: { title: string; tel: string; description: string }[];
  healthCenter?: {
    name: string;
    text: string;
    address: string;
    urgent: { tel: string; show: string };
    info: { tel: string; show: string };
    directionsUrl: string;
    officialUrl: string;
  };
  /** Nota bajo las urgencias sanitarias. */
  healthNote?: string;
  /** Canal de avisos de la vía pública Línea Verde. */
  lineaVerde?: boolean;
  /** Ficha de Punto Vuela y dirección de reserva mientras carga. */
  puntoVuela?: { slug: string; fallbackAddress: string };
}

export interface DiscoverContent {
  images: { hero: string; history: string; nature: string; festivals: string; food: string };
  /** Búsqueda de mapa del casco histórico. */
  historicCentre: string;
  places: { img: string; q: string; name: TKey; text: TKey }[];
  /** Se añade a cada búsqueda de mapa: «lugar, sufijo». */
  mapsSuffix: string;
}

/** Contenido estable de la instancia. Lo editable por el panel vive en Supabase. */
export interface InstanceContent {
  /** Lista SOS completa. Sin ella solo se muestran los teléfonos nacionales. */
  emergencyGroups?: EmergencyGroup[];
  home?: {
    /** Descripción de la portada para buscadores. */
    metaDescription?: string;
    stats?: { value: string; label: TKey }[];
    /** Destino de «Cómo llegar» en Google Maps. */
    directionsQuery?: string;
    sectionImages?: Partial<Record<HomeSection, string>>;
  };
  publicServices?: PublicServicesContent;
  /** Elementos de «Vida diaria»; solo se muestran las categorías con elementos. */
  dailyLife?: DailyLifeItem[];
  /** Página Descubre; sin ella no existe la ruta ni su entrada en menús. */
  discover?: DiscoverContent;
  procedures?: { categories?: Categoria[]; templates: Tramite[]; featured: string[] };
  legal?: {
    /** Descripción de la forma jurídica del titular. Sin ella no se afirma ninguna. */
    operatorNote?: string;
  };
}
