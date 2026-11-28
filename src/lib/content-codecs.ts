/**
 * Formularios del panel ↔ contenido de los borradores municipales. Cada pantalla lee lo publicado
 * o su borrador (nunca lanza: lo que falta, con su valor por defecto) y escribe exactamente las
 * claves que valida la base (private.validate_draft_content). Apto para navegador y pruebas.
 * Las validaciones de aquí avisan antes de guardar; la base las vuelve a comprobar al presentar.
 */
import type { Json } from "@/integrations/supabase/types";
import { hasControlCharacter } from "./control-characters";
import {
  MENU_ENTRIES,
  PAGE_SECTIONS,
  isValidShortcutHref,
  type ConfigurablePage,
  type MenuEntryKey,
} from "./site-structure";
import { SHORTCUT_IMAGE_PATH } from "./site-identity";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
const text = (value: unknown) => (typeof value === "string" ? value : "");
const order = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : fallback;

export type FieldErrors<T> = { [K in keyof T]?: string | undefined };

function checkText(
  value: string,
  { max, required = false, braces = true }: { max: number; required?: boolean; braces?: boolean },
): string | undefined {
  if (required && !value.trim()) return "Campo obligatorio.";
  if (value.length > max) return `Máximo ${max} caracteres.`;
  if (/[<>]/.test(value) || (!braces && /[{}]/.test(value)))
    return braces ? "No uses los símbolos < >." : "No uses los símbolos < > { }.";
  if (hasControlCharacter(value)) return "Quita los saltos de línea y caracteres especiales.";
  return undefined;
}

function clean<T extends object>(errors: FieldErrors<T>): FieldErrors<T> {
  // Solo los campos con error: un objeto vacío significa que todo es válido.
  return Object.fromEntries(Object.entries(errors).filter(([, v]) => v)) as FieldErrors<T>;
}

// ---------- Portada: textos ----------

export type HomeTexts = { hero_title: string; hero_subtitle: string };
export const homeTextsCodec = {
  read: (raw: unknown): HomeTexts => ({
    hero_title: text(isRecord(raw) ? raw["hero_title"] : ""),
    hero_subtitle: text(isRecord(raw) ? raw["hero_subtitle"] : ""),
  }),
  write: (v: HomeTexts): Json => ({
    hero_title: v.hero_title.trim(),
    hero_subtitle: v.hero_subtitle.trim(),
  }),
};
export const validateHomeTexts = (v: HomeTexts): FieldErrors<HomeTexts> =>
  clean({
    hero_title: checkText(v.hero_title, { max: 160, required: true }),
    hero_subtitle: checkText(v.hero_subtitle, { max: 240 }),
  });

// ---------- Portada: aviso de cabecera ----------

export type Banner = { banner_enabled: boolean; banner_text: string };
export const bannerCodec = {
  read: (raw: unknown): Banner => ({
    banner_enabled: isRecord(raw) && raw["banner_enabled"] === true,
    banner_text: text(isRecord(raw) ? raw["banner_text"] : ""),
  }),
  write: (v: Banner): Json => ({
    banner_enabled: v.banner_enabled,
    banner_text: v.banner_text.trim(),
  }),
};
export const validateBanner = (v: Banner): FieldErrors<Banner> =>
  clean({
    banner_text: v.banner_enabled
      ? checkText(v.banner_text, { max: 240, required: true })
      : checkText(v.banner_text, { max: 240 }),
  });

// ---------- Datos legales ----------

export type LegalData = {
  legal_name: string;
  legal_nif: string;
  legal_address: string;
  legal_email: string;
};
export const legalCodec = {
  read: (raw: unknown): LegalData => {
    const r = isRecord(raw) ? raw : {};
    return {
      legal_name: text(r["legal_name"]),
      legal_nif: text(r["legal_nif"]),
      legal_address: text(r["legal_address"]),
      legal_email: text(r["legal_email"]),
    };
  },
  write: (v: LegalData): Json => ({
    legal_name: v.legal_name.trim(),
    legal_nif: v.legal_nif.trim().toUpperCase(),
    legal_address: v.legal_address.trim(),
    legal_email: v.legal_email.trim(),
  }),
};
const EMAIL = /^[^@\s<>{}]+@[^@\s<>{}]+\.[^@\s<>{}]+$/;
export const validateLegal = (v: LegalData): FieldErrors<LegalData> =>
  clean({
    legal_name: checkText(v.legal_name, { max: 200, braces: false }),
    legal_nif: checkText(v.legal_nif, { max: 20, braces: false }),
    legal_address: checkText(v.legal_address, { max: 300, braces: false }),
    legal_email:
      v.legal_email.trim() && !EMAIL.test(v.legal_email.trim())
        ? "Escribe un correo válido, por ejemplo: nombre@dominio.es"
        : checkText(v.legal_email, { max: 254, braces: false }),
  });

// ---------- Menú y secciones ----------

export type OrderedToggle<K extends string> = { key: K; enabled: boolean };

/** Lista completa en el orden publicado (lo que falta, activo y en su sitio por defecto). */
function readToggles<K extends string>(keys: readonly K[], rawList: unknown): OrderedToggle<K>[] {
  const rows = new Map<string, { enabled: boolean; order: number }>();
  if (Array.isArray(rawList))
    for (const row of rawList)
      if (isRecord(row) && typeof row["key"] === "string")
        rows.set(row["key"], {
          enabled: row["enabled"] !== false,
          order: order(row["sort_order"], Number.MAX_SAFE_INTEGER),
        });
  return keys
    .map((key, index) => ({ key, index, row: rows.get(key) }))
    .sort((a, b) => (a.row?.order ?? a.index) - (b.row?.order ?? b.index) || a.index - b.index)
    .map(({ key, row }) => ({ key, enabled: row?.enabled ?? true }));
}

const writeToggles = <K extends string>(list: OrderedToggle<K>[]) =>
  list.map((item, index) => ({ key: item.key, enabled: item.enabled, sort_order: index }));

export type MenuValue = OrderedToggle<MenuEntryKey>[];
export const menuCodec = {
  read: (raw: unknown): MenuValue =>
    readToggles(
      MENU_ENTRIES.map((e) => e.key),
      isRecord(raw) ? raw["entries"] : null,
    ),
  write: (v: MenuValue): Json => ({ entries: writeToggles(v) }),
};

export type SectionsValue = OrderedToggle<string>[];
export const sectionsCodec = (page: ConfigurablePage) => ({
  read: (raw: unknown): SectionsValue =>
    readToggles(PAGE_SECTIONS[page] as readonly string[], isRecord(raw) ? raw["sections"] : null),
  write: (v: SectionsValue): Json => ({ sections: writeToggles(v) }),
});

// ---------- Accesos directos ----------

export type ShortcutValue = {
  /** Vacío en un acceso nuevo: la base le asigna identificador al publicar. */
  id: string;
  /** Clave local estable para la lista, también en accesos nuevos. */
  localId: string;
  title: string;
  description: string;
  image_path: string;
  image_alt: string;
  href: string;
  visible: boolean;
};
export type ShortcutsValue = ShortcutValue[];

export const shortcutsCodec = {
  read: (raw: unknown): ShortcutsValue => {
    const list = isRecord(raw) && Array.isArray(raw["shortcuts"]) ? raw["shortcuts"] : [];
    return list
      .filter(isRecord)
      .map((s, index) => ({ s, index, order: order(s["sort_order"], index) }))
      .sort((a, b) => a.order - b.order || a.index - b.index)
      .map(({ s }, index) => {
        const id = text(s["id"]);
        return {
          id,
          localId: id || text(s["local_id"]) || `nuevo-${index}`,
          title: text(s["title"]),
          description: text(s["description"]),
          image_path: text(s["image_path"]),
          image_alt: text(s["image_alt"]),
          href: text(s["href"]),
          visible: s["visible"] !== false,
        };
      });
  },
  write: (v: ShortcutsValue): Json => ({
    shortcuts: v.map((s, index) => ({
      ...(s.id ? { id: s.id } : {}),
      title: s.title.trim(),
      description: s.description.trim(),
      image_path: s.image_path,
      image_alt: s.image_alt.trim(),
      href: s.href.trim(),
      visible: s.visible,
      sort_order: index,
    })),
  }),
};

/** `pendingImage`: hay una imagen elegida que se subirá al guardar. */
export function validateShortcut(
  s: ShortcutValue,
  pendingImage = false,
): FieldErrors<ShortcutValue> {
  const hasImage = pendingImage || SHORTCUT_IMAGE_PATH.test(s.image_path);
  return clean({
    title: checkText(s.title, { max: 60, required: true, braces: false }),
    description: checkText(s.description, { max: 160, braces: false }),
    image_alt: hasImage
      ? checkText(s.image_alt, { max: 200, required: true, braces: false })
      : checkText(s.image_alt, { max: 200, braces: false }),
    image_path: hasImage ? undefined : "Elige una imagen.",
    href: !s.href.trim()
      ? "Indica el destino."
      : isValidShortcutHref(s.href.trim())
        ? undefined
        : "Usa una ruta de la web (/servicios-publicos) o una dirección https://",
  });
}

// ---------- Cabecera de página ----------

export type HeaderValue =
  | { remove: true }
  | {
      image_path: string;
      image_small_path: string;
      alt: string;
      focal_x: number;
      focal_y: number;
    };

export const headerCodec = {
  read: (raw: unknown): HeaderValue => {
    if (isRecord(raw) && raw["remove"] === true) return { remove: true };
    if (!isRecord(raw) || !text(raw["image_path"])) return { remove: true };
    const focal = (v: unknown) =>
      typeof v === "number" && v >= 0 && v <= 100 ? Math.round(v) : 50;
    return {
      image_path: text(raw["image_path"]),
      image_small_path: text(raw["image_small_path"]),
      alt: text(raw["alt"]),
      focal_x: focal(raw["focal_x"]),
      focal_y: focal(raw["focal_y"]),
    };
  },
  write: (v: HeaderValue): Json =>
    "remove" in v
      ? { remove: true }
      : {
          image_path: v.image_path,
          image_small_path: v.image_small_path,
          alt: v.alt.trim(),
          focal_x: Math.round(v.focal_x),
          focal_y: Math.round(v.focal_y),
        },
};

export function validateHeader(v: HeaderValue): string | undefined {
  if ("remove" in v) return undefined;
  if (!v.alt.trim()) return "Describe la imagen en el texto alternativo.";
  return checkText(v.alt, { max: 200, braces: false });
}
