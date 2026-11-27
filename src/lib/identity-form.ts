/**
 * Formulario de identidad municipal del administrador (apto para navegador).
 * Valida antes de guardar con las mismas reglas que la lectura pública; la base de datos
 * vuelve a comprobarlas con sus restricciones, su disparador y su política de escritura.
 */
import type { Database } from "@/integrations/supabase/types";
import type { MunicipalityConfig } from "../../instances/schema";
import { isValidIdentityValue, type IdentityFieldName } from "./site-identity";

type Row = Database["public"]["Tables"]["site_identity"]["Row"];
export type IdentityUpdate = Database["public"]["Tables"]["site_identity"]["Update"];

/** Columnas legibles por el panel. updated_by no es visible para nadie desde la web. */
export const IDENTITY_COLUMNS =
  "app_name,short_name,municipality_name,province,region,autonomous_community,demonym_masculine,demonym_feminine,site_url,town_hall_name,town_hall_address,town_hall_phone,town_hall_website,latitude,longitude,timezone,postal_code,primary_color,accent_color,logo_path,logo_light_path,icon_path,icon_small_path,updated_at";

export type IdentityRow = Omit<Row, "id" | "updated_by">;

export type IdentityFormField = IdentityFieldName | "latitude" | "longitude";
export type IdentityForm = Record<IdentityFormField, string>;
export type IdentityErrors = Partial<Record<IdentityFormField, string>>;

/** Longitudes máximas de public.site_identity. */
const MAX_LENGTH: Record<IdentityFieldName, number> = {
  app_name: 60,
  short_name: 30,
  municipality_name: 80,
  province: 60,
  region: 80,
  autonomous_community: 80,
  demonym_masculine: 40,
  demonym_feminine: 40,
  site_url: 300,
  town_hall_name: 120,
  town_hall_address: 200,
  town_hall_phone: 20,
  town_hall_website: 300,
  timezone: 64,
  postal_code: 5,
  primary_color: 7,
  accent_color: 7,
};

const FORMAT_MESSAGE: Partial<Record<IdentityFieldName, string>> = {
  site_url:
    "Escribe solo la dirección principal, con https:// y sin rutas ni barra final (por ejemplo, https://ejemplo.es).",
  town_hall_phone: "Usa solo números, espacios y el signo +.",
  town_hall_website: "Debe empezar por https:// y no contener espacios.",
  postal_code: "Escribe las cinco cifras del código postal.",
  primary_color: "Elige un color o escribe su código, por ejemplo #1f4e79.",
  accent_color: "Elige un color o escribe su código, por ejemplo #b5562a.",
};
const TEXT_MESSAGE = "No uses los símbolos < > { } ni saltos de línea.";

const TEXT_FIELDS = Object.keys(MAX_LENGTH) as IdentityFieldName[];

export function formFromRow(row: IdentityRow): IdentityForm {
  const form = {} as IdentityForm;
  for (const name of TEXT_FIELDS) form[name] = row[name] ?? "";
  form.latitude = row.latitude === null ? "" : String(row.latitude);
  form.longitude = row.longitude === null ? "" : String(row.longitude);
  return form;
}

/** Valores compilados de la instalación, en los mismos campos que el formulario. */
export function identityFallbacks(build: MunicipalityConfig): IdentityForm {
  return {
    app_name: build.appName,
    short_name: build.shortName,
    municipality_name: build.name,
    province: build.province,
    region: build.region ?? "",
    autonomous_community: build.autonomousCommunity ?? "",
    demonym_masculine: build.demonym?.masculine ?? "",
    demonym_feminine: build.demonym?.feminine ?? "",
    site_url: build.siteUrl,
    town_hall_name: build.institutional?.townHallName ?? "",
    town_hall_address: build.institutional?.address ?? "",
    town_hall_phone: build.institutional?.phone ?? "",
    town_hall_website: build.institutional?.website ?? "",
    latitude: build.coordinates ? String(build.coordinates.lat) : "",
    longitude: build.coordinates ? String(build.coordinates.lng) : "",
    timezone: build.coordinates?.timezone ?? "",
    postal_code: build.postalCode ?? "",
    primary_color: "",
    accent_color: "",
  };
}

const INSTITUTIONAL: IdentityFormField[] = [
  "town_hall_name",
  "town_hall_address",
  "town_hall_phone",
  "town_hall_website",
];
const COORDINATES: IdentityFormField[] = ["latitude", "longitude", "timezone"];

/**
 * Lo que la web mostrará en cada campo vacío, con las mismas reglas que la lectura pública:
 * los datos del Ayuntamiento y las coordenadas se sustituyen en bloque (nunca se mezclan
 * con los de la instalación) y un gentilicio solo sirve para los dos.
 */
export function identityPlaceholders(form: IdentityForm, fallbacks: IdentityForm): IdentityForm {
  const placeholders = { ...fallbacks };
  const filled = (names: IdentityFormField[]) => names.some((name) => form[name].trim());
  if (filled(INSTITUTIONAL)) for (const name of INSTITUTIONAL) placeholders[name] = "";
  if (filled(COORDINATES)) for (const name of COORDINATES) placeholders[name] = "";
  const masculine = form.demonym_masculine.trim();
  const feminine = form.demonym_feminine.trim();
  if (masculine || feminine) {
    placeholders.demonym_masculine = feminine;
    placeholders.demonym_feminine = masculine;
  }
  return placeholders;
}

/** Normaliza lo que un administrador suele pegar: barra final o mayúsculas en la dirección web. */
function normalizeSiteUrl(value: string) {
  return value.trim().replace(/\/+$/, "").toLowerCase();
}

function parseCoordinate(value: string, limit: number): number | "invalid" | null {
  const text = value.trim().replace(",", ".");
  if (text === "") return null;
  if (!/^-?\d+(\.\d+)?$/.test(text)) return "invalid";
  const number = Number(text);
  if (Math.abs(number) > limit) return "invalid";
  // La columna guarda cinco decimales (alrededor de un metro).
  return Math.round(number * 100_000) / 100_000;
}

function isKnownTimeZone(timezone: string) {
  try {
    new Intl.DateTimeFormat("es-ES", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export type IdentityValidation =
  { ok: true; values: IdentityUpdate } | { ok: false; errors: IdentityErrors };

/** Comprueba el formulario y devuelve los valores listos para guardar o los errores por campo. */
export function validateIdentityForm(form: IdentityForm): IdentityValidation {
  const errors: IdentityErrors = {};
  const values: IdentityUpdate = {};

  for (const name of TEXT_FIELDS) {
    const value =
      name === "site_url"
        ? normalizeSiteUrl(form[name])
        : name === "primary_color" || name === "accent_color"
          ? form[name].trim().toLowerCase()
          : form[name].trim();
    if (value.length > MAX_LENGTH[name]) errors[name] = `Máximo ${MAX_LENGTH[name]} caracteres.`;
    else if (!isValidIdentityValue(name, value))
      errors[name] = FORMAT_MESSAGE[name] ?? TEXT_MESSAGE;
    values[name] = value;
  }

  // La web solo muestra los datos institucionales si el Ayuntamiento tiene nombre.
  const institutional = [
    values.town_hall_address,
    values.town_hall_phone,
    values.town_hall_website,
  ].some(Boolean);
  if (institutional && !values.town_hall_name && !errors.town_hall_name)
    errors.town_hall_name = "Indica el nombre del Ayuntamiento para que se muestren sus datos.";

  const latitude = parseCoordinate(form.latitude, 90);
  const longitude = parseCoordinate(form.longitude, 180);
  if (latitude === "invalid") errors.latitude = "Escribe un número entre -90 y 90.";
  if (longitude === "invalid") errors.longitude = "Escribe un número entre -180 y 180.";
  if (latitude !== "invalid" && longitude !== "invalid") {
    if ((latitude === null) !== (longitude === null)) {
      const missing = latitude === null ? "latitude" : "longitude";
      errors[missing] = "Indica latitud y longitud, o deja las dos vacías.";
    } else if (latitude !== null && !values.timezone && !errors.timezone) {
      errors.timezone = "Indica la zona horaria de las coordenadas (por ejemplo, Europe/Madrid).";
    } else if (latitude === null && values.timezone && !errors.timezone) {
      // Sin coordenadas la web ignora la zona horaria y seguiría usando la de la instalación.
      errors.timezone = "Indica también latitud y longitud, o deja la zona horaria vacía.";
    }
    values.latitude = latitude;
    values.longitude = longitude;
  }
  if (values.timezone && !errors.timezone && !isKnownTimeZone(values.timezone))
    errors.timezone =
      "Zona horaria no reconocida. Usa el formato Región/Ciudad, como Europe/Madrid.";

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, values };
}

/** Códigos de PostgREST/PostgreSQL cuando la migración de identidad no está aplicada. */
const NOT_INSTALLED = new Set(["PGRST202", "PGRST205", "42883", "42P01"]);

/** Mensaje comprensible para un error al leer o guardar la identidad. */
export function identityErrorMessage(error: { code?: string; message?: string }): string {
  const code = error.code ?? "";
  if (NOT_INSTALLED.has(code))
    return "La identidad municipal aún no está instalada en este Supabase. Hay que aplicar su migración.";
  if (code === "42501") return "Esta cuenta no tiene permiso para cambiar la identidad municipal.";
  // Sesión de Supabase no válida o caducada.
  if (code === "PGRST301" || code === "PGRST303")
    return "La sesión no es válida o ha caducado. Sal del panel y vuelve a entrar.";
  if (code === "23514")
    return /zona horaria/i.test(error.message ?? "")
      ? "La base de datos no reconoce la zona horaria indicada."
      : "Algún dato no tiene un formato admitido. Revisa los campos y vuelve a intentarlo.";
  return "No se pudo completar la operación. Comprueba tu conexión y vuelve a intentarlo.";
}

/** Zona horaria predeterminada al indicar coordenadas. */
export const DEFAULT_TIMEZONE = "Europe/Madrid";
/** Zonas de España, primero en el selector. */
export const COMMON_TIMEZONES = ["Europe/Madrid", "Atlantic/Canary", "Africa/Ceuta"];

function supportedTimezones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return [];
  }
}

/**
 * Opciones del selector de zona horaria (IANA). Un valor guardado que no esté en la lista del
 * navegador se conserva como opción, para no perderlo al guardar.
 */
export function timezoneOptions(current: string): { label: string; zones: string[] }[] {
  const all = supportedTimezones();
  const others = all.filter((zone) => !COMMON_TIMEZONES.includes(zone));
  const value = current.trim();
  if (value && !COMMON_TIMEZONES.includes(value) && !all.includes(value)) others.unshift(value);
  return [
    { label: "España", zones: COMMON_TIMEZONES },
    { label: "Otras zonas", zones: others },
  ];
}
