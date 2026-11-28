/**
 * Borrador de la identidad municipal (pantalla «identidad»): el formulario de identidad más las
 * rutas del logotipo y los iconos. Escribe exactamente las claves que valida la base. Apto para
 * navegador y pruebas.
 */
import type { Json } from "@/integrations/supabase/types";
import {
  formFromRow,
  validateIdentityForm,
  type IdentityForm,
  type IdentityRow,
} from "./identity-form";

export type IdentityAssets = {
  logo_path: string;
  logo_light_path: string;
  icon_path: string;
  icon_small_path: string;
};
export type IdentityDraft = { form: IdentityForm; assets: IdentityAssets };

const TEXT_KEYS = [
  "app_name",
  "short_name",
  "municipality_name",
  "province",
  "region",
  "autonomous_community",
  "demonym_masculine",
  "demonym_feminine",
  "site_url",
  "town_hall_name",
  "town_hall_address",
  "town_hall_phone",
  "town_hall_website",
  "timezone",
  "postal_code",
  "primary_color",
  "accent_color",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
const str = (value: unknown) => (typeof value === "string" ? value : "");
const num = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

function lenientCoordinate(value: string): number | null {
  const text = value.trim().replace(",", ".");
  return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : null;
}

export const identityCodec = {
  read: (raw: unknown): IdentityDraft => {
    const r = isRecord(raw) ? raw : {};
    const row = Object.fromEntries(TEXT_KEYS.map((k) => [k, str(r[k])])) as unknown as IdentityRow;
    row.latitude = num(r["latitude"]);
    row.longitude = num(r["longitude"]);
    return {
      form: formFromRow(row),
      assets: {
        logo_path: str(r["logo_path"]),
        logo_light_path: str(r["logo_light_path"]),
        icon_path: str(r["icon_path"]),
        icon_small_path: str(r["icon_small_path"]),
      },
    };
  },
  /**
   * Con el formulario válido, los valores normalizados que se publicarían; si aún tiene errores,
   * una versión sin normalizar (solo sirve para saber si hay cambios: guardar exige validarlo).
   */
  write: (v: IdentityDraft): Json => {
    const result = validateIdentityForm(v.form);
    const text = Object.fromEntries(
      TEXT_KEYS.map((k) => [k, result.ok ? (result.values[k] ?? "") : v.form[k].trim()]),
    );
    return {
      ...text,
      latitude: result.ok ? (result.values.latitude ?? null) : lenientCoordinate(v.form.latitude),
      longitude: result.ok
        ? (result.values.longitude ?? null)
        : lenientCoordinate(v.form.longitude),
      ...v.assets,
    };
  },
};
