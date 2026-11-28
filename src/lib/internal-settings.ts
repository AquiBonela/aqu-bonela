/**
 * Ajustes internos de Groundwork (avisos, WhatsApp, etiquetas, publicación al aprobar). No son
 * contenido municipal: se guardan al momento, solo en sus columnas (la base no deja escribir las
 * públicas desde el navegador) y sobre la versión cargada. Si entretanto solo cambió lo publicado
 * (por ejemplo, se publicó el aviso de la portada), se reintenta sobre la versión nueva sin pisar nada.
 */
import { supabase } from "@/integrations/supabase/client";

export const INTERNAL_SETTINGS_COLUMNS =
  "contact_email,admin_whatsapp,collaborator_months,whatsapp_template,common_labels,publish_on_owner_approval,updated_at";

export type InternalSettings = {
  contact_email: string;
  admin_whatsapp: string;
  collaborator_months: number;
  whatsapp_template: string;
  common_labels: string[];
  publish_on_owner_approval: boolean;
};
export type InternalSettingsRow = InternalSettings & { updated_at: string };

const KEYS: (keyof InternalSettings)[] = [
  "contact_email",
  "admin_whatsapp",
  "collaborator_months",
  "whatsapp_template",
  "common_labels",
  "publish_on_owner_approval",
];

export function readInternalSettings(
  raw: Partial<InternalSettingsRow> | null,
): InternalSettingsRow {
  return {
    contact_email: raw?.contact_email ?? "",
    admin_whatsapp: raw?.admin_whatsapp ?? "",
    collaborator_months: raw?.collaborator_months ?? 1,
    whatsapp_template: raw?.whatsapp_template ?? "",
    common_labels: Array.isArray(raw?.common_labels) ? raw.common_labels : [],
    publish_on_owner_approval: raw?.publish_on_owner_approval ?? true,
    updated_at: raw?.updated_at ?? "",
  };
}

export const sameInternal = (a: InternalSettings, b: InternalSettings) =>
  KEYS.every((k) => JSON.stringify(a[k]) === JSON.stringify(b[k]));

/** Normaliza antes de guardar: etiquetas sin repetir ni vacías, meses entre 1 y 24. */
export function normalizeInternal(v: InternalSettings): InternalSettings {
  return {
    contact_email: v.contact_email.trim(),
    admin_whatsapp: v.admin_whatsapp.trim(),
    collaborator_months: Math.min(24, Math.max(1, Math.round(Number(v.collaborator_months) || 1))),
    whatsapp_template: v.whatsapp_template,
    common_labels: Array.from(new Set(v.common_labels.map((t) => t.trim()).filter(Boolean))),
    publish_on_owner_approval: v.publish_on_owner_approval,
  };
}

export async function loadInternalSettings(): Promise<InternalSettingsRow> {
  const { data, error } = await supabase
    .from("site_settings")
    .select(INTERNAL_SETTINGS_COLUMNS)
    .eq("id", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return readInternalSettings(data as Partial<InternalSettingsRow> | null);
}

export type SaveResult =
  | { ok: true; row: InternalSettingsRow }
  | { ok: false; reason: "conflict"; current: InternalSettingsRow }
  | { ok: false; reason: "error" };

/**
 * Guarda los ajustes internos sobre `loaded`. Si la versión cambió pero los ajustes internos son
 * los mismos que se cargaron, solo cambió lo publicado: se reintenta una vez sobre la versión nueva.
 */
export async function saveInternalSettings(
  loaded: InternalSettingsRow,
  next: InternalSettings,
): Promise<SaveResult> {
  const values = normalizeInternal(next);
  let version = loaded.updated_at;
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await supabase
      .from("site_settings")
      .update(values)
      .eq("id", true)
      .eq("updated_at", version)
      .select(INTERNAL_SETTINGS_COLUMNS)
      .maybeSingle();
    if (error) return { ok: false, reason: "error" };
    if (data) return { ok: true, row: readInternalSettings(data as Partial<InternalSettingsRow>) };
    let current: InternalSettingsRow;
    try {
      current = await loadInternalSettings();
    } catch {
      return { ok: false, reason: "error" };
    }
    if (!sameInternal(current, loaded)) return { ok: false, reason: "conflict", current };
    version = current.updated_at;
  }
  return { ok: false, reason: "error" };
}
