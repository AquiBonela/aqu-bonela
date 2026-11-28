/**
 * Nombres en el panel de las páginas, entradas del menú y secciones comunes del producto
 * (site-structure.ts). Iguales en todos los municipios; se traducen con tr().
 */
import type { ConfigurablePage, MenuEntryKey } from "./site-structure";

export const PAGE_LABELS: Record<ConfigurablePage, string> = {
  "servicios-publicos": "Servicios públicos",
  actualidad: "Actualidad",
  descubre: "Descubre",
};

export const MENU_LABELS: Record<MenuEntryKey, { label: string; hint: string }> = {
  "servicios-publicos": {
    label: "Servicios públicos",
    hint: "Página completa: desactivada, desaparece del menú y de la portada y su dirección da «no encontrada».",
  },
  "guia-tramites": {
    label: "Guía de trámites",
    hint: "Solo el enlace del menú: aunque se oculte, la guía sigue disponible en /tramites y dentro de Servicios públicos.",
  },
  actualidad: {
    label: "Actualidad",
    hint: "Página completa: desactivada, desaparece del menú y de la portada y su dirección da «no encontrada».",
  },
  descubre: {
    label: "Descubre",
    hint: "Página completa: desactivada, desaparece del menú y de la portada y su dirección da «no encontrada».",
  },
};

export const SECTION_LABELS: Record<string, string> = {
  emergencias: "Emergencias",
  "vida-cotidiana": "Vida cotidiana",
  tramites: "Guía de trámites",
  transporte: "Transporte y movilidad",
  noticias: "Noticias",
  avisos: "Avisos",
  agenda: "Agenda",
  fiestas: "Fiestas y celebraciones",
  "historia-patrimonio": "Historia y patrimonio",
  "lugares-interes": "Lugares de interés",
  miradores: "Miradores",
  entorno: "Entorno",
  "rutas-senderos": "Rutas y senderos",
  "cultura-tradiciones": "Cultura y tradiciones",
  gastronomia: "Gastronomía",
  "consejos-vecino": "Consejos de vecino",
  "donde-comer": "Dónde comer",
  "donde-dormir": "Dónde dormir",
};
