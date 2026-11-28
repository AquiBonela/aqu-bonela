/**
 * Visibilidad efectiva de páginas, secciones y menú en esta instalación: la estructura publicada en
 * su Supabase combinada con lo que el producto ya ofrece aquí (implementado y con contenido).
 */
import { getInstanceContent, getSiteStructure } from "@/config/municipality";
import { dailyLifeCategories } from "./vida-diaria";
import {
  automaticShortcuts,
  isPageVisible,
  isSectionVisible,
  productAvailability,
  visibleMenuEntries,
  visibleSections,
  type Availability,
  type ConfigurablePage,
  type HomeShortcut,
  type MenuEntryKey,
  type SectionKey,
} from "./site-structure";

/** Disponibilidad de la instalación actual (no cambia mientras se ejecuta: depende del build). */
export function getAvailability(): Availability {
  const content = getInstanceContent();
  return productAvailability({
    hasDiscover: Boolean(content.discover),
    // Punto Vuela forma parte de Vida cotidiana aunque no haya categorías con elementos.
    hasDailyLife:
      dailyLifeCategories(content).length > 0 || Boolean(content.publicServices?.puntoVuela),
  });
}

export function pageVisible(page: ConfigurablePage | "inicio" | "directorio"): boolean {
  return isPageVisible(getSiteStructure(), getAvailability(), page);
}

export function sectionVisible<P extends ConfigurablePage>(
  page: P,
  section: SectionKey<P>,
): boolean {
  return isSectionVisible(getSiteStructure(), getAvailability(), page, section);
}

export function pageSections<P extends ConfigurablePage>(page: P): SectionKey<P>[] {
  return visibleSections(getSiteStructure(), getAvailability(), page);
}

export function menuEntries(): MenuEntryKey[] {
  return visibleMenuEntries(getSiteStructure(), getAvailability());
}

export function homeAutomaticShortcuts(): ("directorio" | ConfigurablePage)[] {
  return automaticShortcuts(getSiteStructure(), getAvailability());
}

export function homeExtraShortcuts(): HomeShortcut[] {
  return getSiteStructure().shortcuts;
}
