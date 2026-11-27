/**
 * Formulario de identidad municipal del administrador (apto para navegador).
 * Valida antes de guardar con las mismas reglas que la lectura pública; la base de datos
 * vuelve a comprobarlas con sus restricciones, su disparador y su política de escritura.
 */
import type { Database } from "@/integrations/supabase/types";
import { isValidIdentityValue, type IdentityFieldName } from "./site-identity";

type Row = Database["public"]["Tables"]["site_identity"]["Row"];
export type IdentityUpdate = Database["public"]["Tables"]["site_identity"]["Update"];

/** Columnas legibles por el panel. updated_by no es visible para nadie desde la web. */
export const IDENTITY_COLUMNS =
  "app_name,short_name,municipality_name,province,region,autonomous_community,demonym_masculine,demonym_feminine,site_url,town_hall_name,town_hall_address,town_hall_phone,town_hall_website,latitude,longitude,timezone,updated_at";

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
};

const FORMAT_MESSAGE: Partial<Record<IdentityFieldName, string>> = {
  site_url:
    "Escribe solo la dirección principal, con https:// y sin rutas ni barra final (por ejemplo, https://ejemplo.es).",
  town_hall_phone: "Usa solo números, espacios y el signo +.",
  town_hall_website: "Debe empezar por https:// y no contener espacios.",
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
    const value = name === "site_url" ? normalizeSiteUrl(form[name]) : form[name].trim();
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
  if (code === "23514")
    return /zona horaria/i.test(error.message ?? "")
      ? "La base de datos no reconoce la zona horaria indicada."
      : "Algún dato no tiene un formato admitido. Revisa los campos y vuelve a intentarlo.";
  return "No se pudo completar la operación. Comprueba tu conexión y vuelve a intentarlo.";
}
