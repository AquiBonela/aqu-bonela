/**
 * Estructura común de la web: páginas principales, entradas del menú, secciones de cada página y
 * accesos directos de la portada. Igual en todos los municipios; lo que cada uno activa, desactiva
 * u ordena se publica en su Supabase (public.site_config(): menu, sections y shortcuts).
 * Apto para navegador y servidor. Sin datos de ningún municipio.
 *
 * Reglas permanentes: Portada y Directorio están siempre activos y fijos al principio del menú, y
 * la sección Accesos directos de la portada no se puede desactivar. El Directorio aparece siempre
 * como primer acceso directo. La configuración no puede cambiar nada de eso.
 */
import { hasControlCharacter } from "./control-characters";

/** Páginas principales que la configuración puede activar, desactivar y ordenar. */
export const CONFIGURABLE_PAGES = ["servicios-publicos", "actualidad", "descubre"] as const;
export type ConfigurablePage = (typeof CONFIGURABLE_PAGES)[number];

/** Entradas configurables del menú, en su orden por defecto. guia-tramites es solo un enlace. */
export const MENU_ENTRIES = [
  { key: "servicios-publicos", kind: "page", page: "servicios-publicos" },
  { key: "guia-tramites", kind: "link", page: "servicios-publicos", section: "tramites" },
  { key: "actualidad", kind: "page", page: "actualidad" },
  { key: "descubre", kind: "page", page: "descubre" },
] as const;
export type MenuEntryKey = (typeof MENU_ENTRIES)[number]["key"];

/** Secciones de cada página, en su orden por defecto (las mismas claves que admite la base). */
export const PAGE_SECTIONS = {
  "servicios-publicos": ["emergencias", "vida-cotidiana", "tramites", "transporte"],
  actualidad: ["noticias", "avisos", "agenda", "fiestas"],
  descubre: [
    "historia-patrimonio",
    "lugares-interes",
    "miradores",
    "entorno",
    "rutas-senderos",
    "cultura-tradiciones",
    "gastronomia",
    "consejos-vecino",
    "donde-comer",
    "donde-dormir",
  ],
} as const satisfies Record<ConfigurablePage, readonly string[]>;
export type SectionKey<P extends ConfigurablePage> = (typeof PAGE_SECTIONS)[P][number];

export interface StructureEntry {
  enabled: boolean;
  sortOrder: number;
}

/** Acceso directo adicional publicado y visible. */
export interface HomeShortcut {
  id: string;
  title: string;
  description: string;
  imagePath: string;
  imageAlt: string;
  href: string;
}

/** Lo publicado en el Supabase de la instalación. Lo que falta usa los valores por defecto. */
export interface SiteStructure {
  menu: Partial<Record<MenuEntryKey, StructureEntry>>;
  sections: { [P in ConfigurablePage]?: Partial<Record<SectionKey<P>, StructureEntry>> };
  shortcuts: HomeShortcut[];
}

export const EMPTY_STRUCTURE: SiteStructure = Object.freeze({
  menu: Object.freeze({}),
  sections: Object.freeze({}),
  shortcuts: Object.freeze([]) as unknown as HomeShortcut[],
}) as SiteStructure;

/**
 * Lo que el producto ya ofrece en esta instalación (implementado y con contenido). Una página o
 * sección no disponible no se muestra aunque esté activa en la configuración.
 */
export interface Availability {
  pages: Record<ConfigurablePage, boolean>;
  sections: { [P in ConfigurablePage]: Record<SectionKey<P>, boolean> };
}

/** Qué contenido aporta la instalación hoy (etapa 2): de ello depende la disponibilidad. */
export interface AvailabilityInput {
  /** Descubre tiene contenido (hasta la etapa 6, el compilado de la instancia). */
  hasDiscover: boolean;
  /** Vida cotidiana tiene categorías con elementos. */
  hasDailyLife: boolean;
}

export function productAvailability({
  hasDiscover,
  hasDailyLife,
}: AvailabilityInput): Availability {
  return {
    pages: { "servicios-publicos": true, actualidad: false, descubre: hasDiscover },
    sections: {
      "servicios-publicos": {
        emergencias: true,
        "vida-cotidiana": hasDailyLife,
        tramites: true,
        transporte: false,
      },
      actualidad: { noticias: false, avisos: false, agenda: false, fiestas: false },
      descubre: {
        "historia-patrimonio": hasDiscover,
        "lugares-interes": hasDiscover,
        miradores: false,
        entorno: hasDiscover,
        "rutas-senderos": false,
        "cultura-tradiciones": hasDiscover,
        gastronomia: hasDiscover,
        "consejos-vecino": hasDiscover,
        "donde-comer": false,
        "donde-dormir": false,
      },
    },
  };
}

// ---------- Lectura de site_config() ----------

const SAFE_TEXT = (value: string) => !/[<>{}]/.test(value) && !hasControlCharacter(value);
const SHORTCUT_IMAGE = /^accesos\/[0-9a-f-]{36}\.webp$/;
const INTERNAL_HREF = /^\/[A-Za-z0-9._~/?#=&%-]*$/;
const EXTERNAL_HREF = /^https:\/\/[^\s<>"{}]+$/;

/** Mismo criterio que la base: ruta interna (no //) o enlace https. */
export function isValidShortcutHref(href: string): boolean {
  if (href.length > 300) return false;
  if (href.startsWith("//")) return false;
  return INTERNAL_HREF.test(href) || EXTERNAL_HREF.test(href);
}

export function isExternalHref(href: string): boolean {
  return href.startsWith("https://");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readEntry(raw: unknown): StructureEntry | undefined {
  if (!isRecord(raw)) return undefined;
  const enabled = raw["enabled"];
  const sortOrder = raw["sort_order"];
  if (typeof enabled !== "boolean") return undefined;
  return {
    enabled,
    sortOrder:
      typeof sortOrder === "number" && Number.isInteger(sortOrder) && sortOrder >= 0
        ? sortOrder
        : 0,
  };
}

/**
 * Convierte menu, sections y shortcuts de site_config() en la estructura publicada. Nunca lanza:
 * lo que no cumple las reglas se descarta. Una entrada del Directorio o de la portada se ignora
 * siempre, venga de donde venga.
 */
export function parseSiteStructure(raw: unknown): SiteStructure {
  if (!isRecord(raw)) return { menu: {}, sections: {}, shortcuts: [] };
  const rejected: string[] = [];

  const menu: SiteStructure["menu"] = {};
  const rawMenu = raw["menu"];
  if (isRecord(rawMenu)) {
    for (const { key } of MENU_ENTRIES) {
      if (!(key in rawMenu)) continue;
      const entry = readEntry(rawMenu[key]);
      if (entry) menu[key] = entry;
      else rejected.push(`menu.${key}`);
    }
  }

  const sections: SiteStructure["sections"] = {};
  const rawSections = raw["sections"];
  if (isRecord(rawSections)) {
    for (const page of CONFIGURABLE_PAGES) {
      const rawPage = rawSections[page];
      if (!isRecord(rawPage)) continue;
      const out: Partial<Record<string, StructureEntry>> = {};
      for (const section of PAGE_SECTIONS[page]) {
        if (!(section in rawPage)) continue;
        const entry = readEntry(rawPage[section]);
        if (entry) out[section] = entry;
        else rejected.push(`sections.${page}.${section}`);
      }
      (sections as Record<string, unknown>)[page] = out;
    }
  }

  const shortcuts: HomeShortcut[] = [];
  const rawShortcuts = raw["shortcuts"];
  if (Array.isArray(rawShortcuts)) {
    for (const item of rawShortcuts) {
      if (!isRecord(item)) continue;
      const str = (k: string) => (typeof item[k] === "string" ? (item[k] as string) : "");
      const shortcut: HomeShortcut = {
        id: str("id"),
        title: str("title").trim(),
        description: str("description"),
        imagePath: str("image_path"),
        imageAlt: str("image_alt"),
        href: str("href"),
      };
      if (
        shortcut.id === "" ||
        shortcut.title === "" ||
        shortcut.title.length > 60 ||
        shortcut.description.length > 160 ||
        shortcut.imageAlt.length > 200 ||
        !SAFE_TEXT(shortcut.title) ||
        !SAFE_TEXT(shortcut.description) ||
        !SAFE_TEXT(shortcut.imageAlt) ||
        !SHORTCUT_IMAGE.test(shortcut.imagePath) ||
        !isValidShortcutHref(shortcut.href)
      ) {
        rejected.push(`shortcuts.${shortcut.id || "?"}`);
        continue;
      }
      shortcuts.push(shortcut);
    }
  }

  if (rejected.length)
    console.warn(`[site-structure] Valores no válidos descartados: ${rejected.join(", ")}`);
  return { menu, sections, shortcuts };
}

// ---------- Visibilidad ----------

function isEnabled(entry: StructureEntry | undefined): boolean {
  return entry?.enabled ?? true;
}

function byOrder<K extends string>(
  keys: readonly K[],
  entries: Partial<Record<K, StructureEntry>> | undefined,
): K[] {
  return keys
    .map((key, index) => ({ key, index, order: entries?.[key]?.sortOrder ?? index }))
    .sort((a, b) => a.order - b.order || a.index - b.index)
    .map(({ key }) => key);
}

/** Una página principal se ve si está activa y disponible. Portada y Directorio, siempre. */
export function isPageVisible(
  structure: SiteStructure,
  availability: Availability,
  page: ConfigurablePage | "inicio" | "directorio",
): boolean {
  if (page === "inicio" || page === "directorio") return true;
  return availability.pages[page] && isEnabled(structure.menu[page]);
}

/** Una sección se ve si su página se ve y la sección está activa y disponible. */
export function isSectionVisible<P extends ConfigurablePage>(
  structure: SiteStructure,
  availability: Availability,
  page: P,
  section: SectionKey<P>,
): boolean {
  if (!isPageVisible(structure, availability, page)) return false;
  const available = (availability.sections[page] as Record<string, boolean>)[section] ?? false;
  const entries = structure.sections[page] as Partial<Record<string, StructureEntry>> | undefined;
  return available && isEnabled(entries?.[section]);
}

/** Secciones visibles de una página, en el orden configurado. */
export function visibleSections<P extends ConfigurablePage>(
  structure: SiteStructure,
  availability: Availability,
  page: P,
): SectionKey<P>[] {
  const keys = PAGE_SECTIONS[page] as readonly SectionKey<P>[];
  const entries = structure.sections[page] as Partial<Record<SectionKey<P>, StructureEntry>>;
  return byOrder(keys, entries).filter((section) =>
    isSectionVisible(structure, availability, page, section),
  );
}

/**
 * Entradas configurables del menú que se ven, en el orden configurado. Portada y Directorio no
 * están aquí: van siempre primero. La Guía de trámites solo aparece si su entrada está activa y
 * su sección se ve.
 */
export function visibleMenuEntries(
  structure: SiteStructure,
  availability: Availability,
): MenuEntryKey[] {
  const keys = MENU_ENTRIES.map((e) => e.key);
  return byOrder(keys, structure.menu).filter((key) => {
    const entry = MENU_ENTRIES.find((e) => e.key === key)!;
    if (entry.kind === "page") return isPageVisible(structure, availability, entry.page);
    return (
      isEnabled(structure.menu[key]) &&
      isSectionVisible(structure, availability, entry.page, entry.section)
    );
  });
}

/** Accesos directos automáticos: el Directorio siempre primero y después las páginas visibles. */
export function automaticShortcuts(
  structure: SiteStructure,
  availability: Availability,
): ("directorio" | ConfigurablePage)[] {
  const pages = visibleMenuEntries(structure, availability).filter((key): key is ConfigurablePage =>
    (CONFIGURABLE_PAGES as readonly string[]).includes(key),
  );
  return ["directorio", ...pages];
}
