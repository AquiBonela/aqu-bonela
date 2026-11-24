/**
 * Configuración municipal de la instalación.
 * Datos públicos, sin secretos. Seguro para SSR y navegador (solo lee VITE_MUNICIPALITY_ID).
 * Los datos operativos editables (avisos, titular legal, contacto) siguen en site_settings.
 */
import casarabonelaLogoHome from "@/assets/logo-menu.webp";
import casarabonelaLogoAdmin from "@/assets/logo-2.webp";
import casarabonelaLogoText from "@/assets/logo-texto.webp";
import casarabonelaHero from "@/assets/hero-casarabonela.jpg";

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

export const DEFAULT_MUNICIPALITY_ID = "casarabonela";

const casarabonela: MunicipalityConfig = {
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

/** Registro de municipios. Añadir uno nuevo = añadir una entrada aquí. */
export const MUNICIPALITIES: Readonly<Record<string, MunicipalityConfig>> = Object.freeze({
  [casarabonela.id]: casarabonela,
});

export class UnknownMunicipalityError extends Error {
  constructor(id: string, available: string[]) {
    super(
      `Municipio desconocido en VITE_MUNICIPALITY_ID: "${id}". Disponibles: ${available.join(", ")}.`,
    );
    this.name = "UnknownMunicipalityError";
  }
}

/** Resuelve un identificador contra un registro. Vacío → predeterminado; desconocido → error. */
export function resolveMunicipality(
  id: string | undefined | null,
  registry: Readonly<Record<string, MunicipalityConfig>> = MUNICIPALITIES,
): MunicipalityConfig {
  const key = (id ?? "").trim() || DEFAULT_MUNICIPALITY_ID;
  const found = Object.prototype.hasOwnProperty.call(registry, key) ? registry[key] : undefined;
  if (!found) throw new UnknownMunicipalityError(key, Object.keys(registry));
  return found;
}

/** Configuración de la instalación actual. */
export function getMunicipality(): MunicipalityConfig {
  return resolveMunicipality(import.meta.env["VITE_MUNICIPALITY_ID"] as string | undefined);
}


export class InvalidThemeValueError extends Error {
  constructor(token: string, value: unknown) {
    super(`Valor de color no válido en el tema municipal (${token}): ${JSON.stringify(value)}`);
    this.name = "InvalidThemeValueError";
  }
}

const NUM = String.raw`(?:\d+(?:\.\d+)?|\.\d+)`;
const OKLCH_RE = new RegExp(
  String.raw`^oklch\(${NUM}%? ${NUM} ${NUM}(?: \/ ${NUM}%?)?\)$`,
);
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const LIGHT_VARS: ReadonlyArray<[keyof MunicipalityLightTokens, string]> = [
  ["primary", "--primary"],
  ["primaryForeground", "--primary-foreground"],
  ["ring", "--ring"],
  ["accentForeground", "--accent-foreground"],
  ["terracotta", "--terracotta"],
  ["terracottaForeground", "--terracotta-foreground"],
  ["sand", "--sand"],
  ["beige", "--beige"],
  ["chart1", "--chart-1"],
  ["sidebarPrimary", "--sidebar-primary"],
  ["sidebarPrimaryForeground", "--sidebar-primary-foreground"],
  ["sidebarRing", "--sidebar-ring"],
];
const DARK_VARS: ReadonlyArray<[keyof MunicipalityDarkTokens, string]> = [
  ["primary", "--primary"],
  ["primaryForeground", "--primary-foreground"],
  ["ring", "--ring"],
  ["accentForeground", "--accent-foreground"],
  ["chart1", "--chart-1"],
  ["sidebarPrimary", "--sidebar-primary"],
  ["sidebarPrimaryForeground", "--sidebar-primary-foreground"],
  ["sidebarRing", "--sidebar-ring"],
];

function declarations<T extends object>(
  mode: string,
  tokens: T,
  vars: ReadonlyArray<[keyof T, string]>,
): string {
  return vars
    .map(([key, cssVar]) => {
      const value = tokens[key];
      if (typeof value !== "string" || !OKLCH_RE.test(value)) {
        throw new InvalidThemeValueError(`${mode}.${String(key)}`, value);
      }
      return `${cssVar}:${value};`;
    })
    .join("");
}

/** Valida el tema; lanza InvalidThemeValueError ante cualquier valor no OKLCH/hex. */
export function validateMunicipalityTheme(theme: MunicipalityTheme): void {
  getMunicipalityThemeCss(theme);
}

/**
 * CSS de variables municipales. Se inserta tras la hoja principal con mayor
 * especificidad (html:root > :root; html.dark/html .dark > .dark), así que
 * ninguna regla de styles.css lo sobrescribe. Solo admite valores validados.
 */
export function getMunicipalityThemeCss(theme: MunicipalityTheme): string {
  if (typeof theme.themeColor !== "string" || !HEX_RE.test(theme.themeColor)) {
    throw new InvalidThemeValueError("themeColor", theme.themeColor);
  }
  const light = declarations("light", theme.light, LIGHT_VARS);
  const dark = declarations("dark", theme.dark, DARK_VARS);
  return `html:root{${light}}html.dark,html .dark{${dark}}`;
}
