/**
 * Identidad pública de la instalación leída de Supabase (public.site_config()).
 * Apto para navegador y servidor: solo valida, combina y serializa datos públicos.
 * Un campo vacío o no válido no sustituye al valor compilado de la instancia.
 */
import { z } from "zod";
import type { MunicipalityConfig } from "../../instances/schema";

/** Campos que la base de datos puede sustituir. Tema, recursos y claves técnicas siguen en el build. */
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
  >
>;

/** Configuración pública de la web. Las fases siguientes añaden claves (tema, secciones, menú). */
export interface SiteConfig {
  identity: IdentityOverrides;
}

export const EMPTY_SITE_CONFIG: SiteConfig = Object.freeze({ identity: Object.freeze({}) }) as SiteConfig;

declare global {
  interface Window {
    __SITE_CONFIG__?: SiteConfig;
  }
}

// Mismas reglas que las restricciones de public.site_identity: lo que la base no admite tampoco se usa aquí.
const SAFE_TEXT = /^[^<>{}\u0000-\u001f\u007f]*$/;
const SITE_URL_PATTERN = /^https:\/\/[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(:[0-9]{1,5})?$/;
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

const text = (max: number) => z.string().trim().max(max).regex(SAFE_TEXT);
const FIELDS: Record<FieldName, z.ZodType<string>> = {
  app_name: text(60),
  short_name: text(30),
  municipality_name: text(80),
  province: text(60),
  region: text(80),
  autonomous_community: text(80),
  demonym_masculine: text(40),
  demonym_feminine: text(40),
  site_url: z.string().trim().max(300).refine((v) => v === "" || SITE_URL_PATTERN.test(v)),
  town_hall_name: text(120),
  town_hall_address: text(200),
  town_hall_phone: z.string().trim().regex(PHONE),
  town_hall_website: z.string().trim().max(300).refine((v) => v === "" || WEBSITE.test(v)),
  timezone: text(64),
};

const coordinate = (limit: number) =>
  z.union([z.number(), z.string().trim().regex(/^-?\d+(\.\d+)?$/).transform(Number)]).pipe(z.number().min(-limit).max(limit));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Convierte la respuesta de public.site_config() en sustituciones de identidad.
 * Nunca lanza: un valor que no cumple las reglas se descarta y se avisa en el registro.
 */
export function parseSiteConfig(raw: unknown): SiteConfig {
  const row = isRecord(raw) && isRecord(raw["identity"]) ? raw["identity"] : null;
  if (!row) return { identity: {} };

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
  if (masculine || feminine) identity.demonym = { masculine: masculine || feminine, feminine: feminine || masculine };

  const townHallName = read("town_hall_name");
  const address = read("town_hall_address");
  const phone = read("town_hall_phone");
  const website = read("town_hall_website");
  if (townHallName) identity.institutional = { townHallName, address, phone, website };

  const lat = readCoordinate("latitude", 90);
  const lng = readCoordinate("longitude", 180);
  const timezone = read("timezone");
  if (lat !== undefined && lng !== undefined && timezone) identity.coordinates = { lat, lng, timezone };

  if (rejected.length) console.warn(`[site-identity] Valores no válidos descartados: ${rejected.join(", ")}`);
  return { identity };
}

/** Identidad efectiva: la de la base de datos donde exista, la compilada en el resto. */
export function mergeIdentity(base: MunicipalityConfig, overrides: IdentityOverrides): MunicipalityConfig {
  return { ...base, ...overrides };
}

/** Script que entrega al navegador la misma configuración usada en el servidor. Escapa "<" y separadores de línea. */
export function siteConfigScript(config: SiteConfig): string {
  const json = JSON.stringify({ identity: config.identity ?? {} })
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return `window.__SITE_CONFIG__=${json};`;
}

/** Configuración recibida en el HTML; undefined fuera del navegador o si no se ha inyectado. */
export function readBrowserSiteConfig(): SiteConfig | undefined {
  if (typeof window === "undefined") return undefined;
  const value: unknown = window.__SITE_CONFIG__;
  return isRecord(value) && isRecord(value["identity"]) ? (value as unknown as SiteConfig) : undefined;
}
