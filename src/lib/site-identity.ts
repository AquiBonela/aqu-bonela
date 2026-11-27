/**
 * Identidad pública de la instalación leída de Supabase (public.site_config()).
 * Apto para navegador y servidor: solo valida, combina y serializa datos públicos.
 * Un campo vacío o no válido no sustituye al valor compilado de la instancia.
 */
import { z } from "zod";
import type { MunicipalityConfig } from "../../instances/schema";
import { hasControlCharacter } from "./control-characters";
import { themeFromColors } from "./brand-palette";

/** Campos que la base de datos puede sustituir. Las claves técnicas siguen en el build. */
export type IdentityOverrides = Partial<
  Pick<
    MunicipalityConfig,
    | "appName"
    | "shortName"
    | "name"
    | "province"
    | "region"
    | "autonomousCommunity"
    | "siteUrl"
    | "demonym"
    | "institutional"
    | "coordinates"
    | "postalCode"
  >
>;

/** Colores y recursos gráficos guardados en Supabase (rutas dentro del bucket site-assets). */
export interface Branding {
  primaryColor?: string;
  accentColor?: string;
  logoPath?: string;
  logoLightPath?: string;
  iconPath?: string;
  iconSmallPath?: string;
}

/** Páginas públicas comunes cuya cabecera se gestiona desde su editor. */
export const PAGE_KEYS = [
  "inicio",
  "directorio",
  "servicios-publicos",
  "tramites",
  "descubre",
  "tablon",
  "actualidad",
] as const;
export type PageKey = (typeof PAGE_KEYS)[number];

export interface PageHeader {
  imagePath: string;
  imageSmallPath: string;
  alt: string;
  /** Punto de encuadre en porcentaje (0–100): se mantiene visible al recortar. */
  focalX: number;
  focalY: number;
}

export type PageHeaders = Partial<Record<PageKey, PageHeader>>;

/** Configuración pública de la web. */
export interface SiteConfig {
  identity: IdentityOverrides;
  branding?: Branding;
  pageHeaders?: PageHeaders;
}

export const EMPTY_SITE_CONFIG: SiteConfig = Object.freeze({
  identity: Object.freeze({}),
  branding: Object.freeze({}),
  pageHeaders: Object.freeze({}),
}) as SiteConfig;

/** Dirección pública (en el propio dominio de la instalación) de un archivo de site-assets. */
export function siteAssetUrl(path: string): string {
  return `/marca/${path}`;
}

/** Rutas que el panel genera; las mismas que admite la base de datos. */
export const ASSET_PATHS = {
  logoPath: /^identidad\/[0-9a-f-]{36}\/logo\.webp$/,
  logoLightPath: /^identidad\/[0-9a-f-]{36}\/logo-claro\.webp$/,
  iconPath: /^identidad\/[0-9a-f-]{36}\/icono-512\.png$/,
  iconSmallPath: /^identidad\/[0-9a-f-]{36}\/icono-192\.png$/,
} as const;

export function pageHeaderPaths(page: PageKey) {
  return {
    image: new RegExp(`^cabeceras/${page}/[0-9a-f-]{36}\\.webp$`),
    small: new RegExp(`^cabeceras/${page}/[0-9a-f-]{36}-movil\\.webp$`),
  };
}

/** Rutas que la web sirve desde /marca/: solo las que el panel puede generar. */
export function isServableAssetPath(path: string): boolean {
  if (Object.values(ASSET_PATHS).some((re) => re.test(path))) return true;
  return PAGE_KEYS.some((page) => {
    const p = pageHeaderPaths(page);
    return p.image.test(path) || p.small.test(path);
  });
}

declare global {
  interface Window {
    __SITE_CONFIG__?: SiteConfig;
  }
}

// Mismas reglas que las restricciones de public.site_identity: lo que la base no admite tampoco se usa aquí.
/** Sin HTML ni llaves (se confundirían con {app}, {municipio}...). */
const UNSAFE_SYMBOLS = /[<>{}]/;
const SITE_URL_PATTERN =
  /^https:\/\/[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(:[0-9]{1,5})?$/;
const WEBSITE = /^https:\/\/[^\s<>"{}]+$/;
const PHONE = /^[0-9 +]{0,20}$/;

type FieldName =
  | "app_name"
  | "short_name"
  | "municipality_name"
  | "province"
  | "region"
  | "autonomous_community"
  | "demonym_masculine"
  | "demonym_feminine"
  | "site_url"
  | "town_hall_name"
  | "town_hall_address"
  | "town_hall_phone"
  | "town_hall_website"
  | "timezone";

const safeText = (value: string) => !UNSAFE_SYMBOLS.test(value) && !hasControlCharacter(value);
const text = (max: number) => z.string().trim().max(max).refine(safeText);
const FIELDS: Record<FieldName, z.ZodType<string>> = {
  app_name: text(60),
  short_name: text(30),
  municipality_name: text(80),
  province: text(60),
  region: text(80),
  autonomous_community: text(80),
  demonym_masculine: text(40),
  demonym_feminine: text(40),
  site_url: z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === "" || SITE_URL_PATTERN.test(v)),
  town_hall_name: text(120),
  town_hall_address: text(200),
  town_hall_phone: z.string().trim().regex(PHONE),
  town_hall_website: z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === "" || WEBSITE.test(v)),
  timezone: text(64),
};

/** Campo de texto de public.site_identity. */
export type IdentityFieldName = FieldName;

/** Comprueba un valor con las mismas reglas que aplica la lectura pública (y la base de datos). */
export function isValidIdentityValue(name: IdentityFieldName, value: string): boolean {
  return FIELDS[name].safeParse(value).success;
}

const coordinate = (limit: number) =>
  z
    .union([
      z.number(),
      z
        .string()
        .trim()
        .regex(/^-?\d+(\.\d+)?$/)
        .transform(Number),
    ])
    .pipe(z.number().min(-limit).max(limit));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Convierte la respuesta de public.site_config() en sustituciones de identidad.
 * Nunca lanza: un valor que no cumple las reglas se descarta y se avisa en el registro.
 */
export function parseSiteConfig(raw: unknown): SiteConfig {
  const pageHeaders = parsePageHeaders(isRecord(raw) ? raw["page_headers"] : undefined);
  const row = isRecord(raw) && isRecord(raw["identity"]) ? raw["identity"] : null;
  if (!row) return { identity: {}, branding: {}, pageHeaders };

  const rejected: string[] = [];
  const read = (name: FieldName): string => {
    const value = row[name];
    if (value === undefined || value === null || value === "") return "";
    const parsed = FIELDS[name].safeParse(value);
    if (!parsed.success) {
      rejected.push(name);
      return "";
    }
    return parsed.data;
  };
  const readCoordinate = (name: "latitude" | "longitude", limit: number): number | undefined => {
    const value = row[name];
    if (value === undefined || value === null || value === "") return undefined;
    const parsed = coordinate(limit).safeParse(value);
    if (!parsed.success) {
      rejected.push(name);
      return undefined;
    }
    return parsed.data;
  };

  const identity: IdentityOverrides = {};
  const appName = read("app_name");
  const shortName = read("short_name");
  const name = read("municipality_name");
  const province = read("province");
  const region = read("region");
  const autonomousCommunity = read("autonomous_community");
  const siteUrl = read("site_url");
  if (appName) identity.appName = appName;
  if (shortName) identity.shortName = shortName;
  if (name) identity.name = name;
  if (province) identity.province = province;
  if (region) identity.region = region;
  if (autonomousCommunity) identity.autonomousCommunity = autonomousCommunity;
  if (siteUrl) identity.siteUrl = siteUrl;

  const masculine = read("demonym_masculine");
  const feminine = read("demonym_feminine");
  if (masculine || feminine)
    identity.demonym = { masculine: masculine || feminine, feminine: feminine || masculine };

  const townHallName = read("town_hall_name");
  const address = read("town_hall_address");
  const phone = read("town_hall_phone");
  const website = read("town_hall_website");
  if (townHallName) identity.institutional = { townHallName, address, phone, website };

  const lat = readCoordinate("latitude", 90);
  const lng = readCoordinate("longitude", 180);
  const timezone = read("timezone");
  if (lat !== undefined && lng !== undefined && timezone)
    identity.coordinates = { lat, lng, timezone };

  const postalCode = row["postal_code"];
  if (typeof postalCode === "string" && postalCode !== "") {
    if (POSTAL_CODE.test(postalCode)) identity.postalCode = postalCode;
    else rejected.push("postal_code");
  }

  const branding: Branding = {};
  const color = (name: "primary_color" | "accent_color", key: "primaryColor" | "accentColor") => {
    const value = row[name];
    if (typeof value !== "string" || value === "") return;
    if (COLOR.test(value)) branding[key] = value;
    else rejected.push(name);
  };
  color("primary_color", "primaryColor");
  color("accent_color", "accentColor");
  const asset = (name: string, key: keyof typeof ASSET_PATHS) => {
    const value = row[name];
    if (typeof value !== "string" || value === "") return;
    if (ASSET_PATHS[key].test(value)) branding[key] = value;
    else rejected.push(name);
  };
  asset("logo_path", "logoPath");
  asset("logo_light_path", "logoLightPath");
  asset("icon_path", "iconPath");
  asset("icon_small_path", "iconSmallPath");

  if (rejected.length)
    console.warn(`[site-identity] Valores no válidos descartados: ${rejected.join(", ")}`);
  return { identity, branding, pageHeaders };
}

const POSTAL_CODE = /^[0-9]{5}$/;
const COLOR = /^#[0-9a-f]{6}$/;

function parsePageHeaders(raw: unknown): PageHeaders {
  const headers: PageHeaders = {};
  if (!isRecord(raw)) return headers;
  for (const page of PAGE_KEYS) {
    const h = raw[page];
    if (!isRecord(h)) continue;
    const paths = pageHeaderPaths(page);
    const imagePath = h["image_path"];
    const imageSmallPath = h["image_small_path"];
    const alt = typeof h["alt"] === "string" ? h["alt"] : "";
    const focal = (v: unknown) =>
      typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 100 ? v : 50;
    if (
      typeof imagePath !== "string" ||
      typeof imageSmallPath !== "string" ||
      !paths.image.test(imagePath) ||
      !paths.small.test(imageSmallPath) ||
      alt.length > 200 ||
      !safeText(alt)
    ) {
      console.warn(`[site-identity] Cabecera no válida descartada: ${page}`);
      continue;
    }
    headers[page] = {
      imagePath,
      imageSmallPath,
      alt,
      focalX: focal(h["focal_x"]),
      focalY: focal(h["focal_y"]),
    };
  }
  return headers;
}

/** Identidad efectiva: la de la base de datos donde exista, la compilada en el resto. */
export function mergeIdentity(
  base: MunicipalityConfig,
  overrides: IdentityOverrides,
): MunicipalityConfig {
  return { ...base, ...overrides };
}

/**
 * Configuración efectiva completa: la identidad, los recursos gráficos servidos desde /marca/ y el
 * tema calculado con los colores. Lo que no está en Supabase sigue siendo lo compilado.
 */
export function mergeSiteConfig(base: MunicipalityConfig, config: SiteConfig): MunicipalityConfig {
  const merged = mergeIdentity(base, config.identity ?? {});
  const b = config.branding ?? {};
  const assets = { ...base.assets };
  if (b.logoPath) {
    assets.logoAdmin = siteAssetUrl(b.logoPath);
    assets.logoText = siteAssetUrl(b.logoPath);
    // Sin versión clara subida no se usa la compilada: sería de otra identidad visual.
    if (b.logoLightPath) assets.logoHome = siteAssetUrl(b.logoLightPath);
    else delete assets.logoHome;
  } else if (b.logoLightPath) {
    assets.logoHome = siteAssetUrl(b.logoLightPath);
  }
  if (b.iconSmallPath) {
    assets.favicon = siteAssetUrl(b.iconSmallPath);
    assets.appleTouchIcon = siteAssetUrl(b.iconSmallPath);
  }
  if (b.iconPath || b.iconSmallPath) {
    assets.pwaIcons = {
      icon192: b.iconSmallPath ? siteAssetUrl(b.iconSmallPath) : base.assets.pwaIcons.icon192,
      icon512: b.iconPath ? siteAssetUrl(b.iconPath) : base.assets.pwaIcons.icon512,
    };
  }
  return {
    ...merged,
    assets,
    theme: themeFromColors(base.theme, b.primaryColor, b.accentColor),
  };
}

/** Script que entrega al navegador la misma configuración usada en el servidor. Escapa "<" y separadores de línea. */
export function siteConfigScript(config: SiteConfig): string {
  const json = JSON.stringify({
    identity: config.identity ?? {},
    branding: config.branding ?? {},
    pageHeaders: config.pageHeaders ?? {},
  })
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return `window.__SITE_CONFIG__=${json};`;
}

/** Configuración recibida en el HTML; undefined fuera del navegador o si no se ha inyectado. */
export function readBrowserSiteConfig(): SiteConfig | undefined {
  if (typeof window === "undefined") return undefined;
  const value: unknown = window.__SITE_CONFIG__;
  if (!isRecord(value) || !isRecord(value["identity"])) return undefined;
  return {
    identity: value["identity"] as IdentityOverrides,
    branding: isRecord(value["branding"]) ? (value["branding"] as Branding) : {},
    pageHeaders: isRecord(value["pageHeaders"]) ? (value["pageHeaders"] as PageHeaders) : {},
  };
}
