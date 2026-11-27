import { getInstanceContent } from "@/config/municipality";
// Guía de trámites: datos navegables en 3 niveles (portada → categoría → ficha).
export const TRAMITE_TAGS = ["gratis", "tasa", "online", "presencial"] as const;
export type TramiteTag = (typeof TRAMITE_TAGS)[number];
export type TramiteLink = { label: string; url: string };
export type TramiteGuide = {
  paraIntro?: string;
  paraNota?: string;
  necesitasIntro?: string;
  quienIntro: string;
  quienNota: string;
  necesitasNota: string;
  pasos: { t: string; d: string[]; link?: TramiteLink; grupo?: string }[];
  lugares: {
    title: string;
    subtitle: string;
    description: string[];
    details?: { label: string; value: string; href?: string }[];
    note?: string;
    link?: TramiteLink;
  }[];
  fuentes: TramiteLink[];
  costeTitulo: string;
  costeImporte: string;
  costeTexto: string;
  ayuda?: string[];
  aclaracion?: { titulo: string; introduccion: string; puntos: string[]; nota: string };
  seguridad?: string;
  revision: string;
};
export type Tramite = {
  sections?: import("./procedure-sections").ProcedureSection[];
  notes?: string;
  slug: string;
  cat: string;
  title: string;
  short: string;
  summary?: string;
  cardDescription?: string;
  tags?: TramiteTag[];
  // Ficha completa (opcional; sin ella se muestra «guía en preparación»)
  para?: string[];
  quien?: string[];
  necesitas?: string[];
  requisitosGrupos?: { title: string; requisitos: string[] }[];
  pasos?: { t: string; d: string }[];
  guia?: TramiteGuide;
  primaryAction?: TramiteLink;
  coste?: string;
  donde?: string;
  ayuda?: string;
  links: TramiteLink[];
};
export type Categoria = {
  slug: string;
  title: string;
  text: string;
  icon: "doc" | "salud" | "trabajo" | "familia" | "coche" | "muni";
};

export const TAG_LABEL: Record<TramiteTag, string> = {
  gratis: "Gratuito",
  tasa: "Con tasa",
  online: "Online",
  presencial: "Requiere acudir en persona",
};

/** Categorías sin datos municipales; una instancia puede aportar las suyas. */
const DEFAULT_CATEGORIAS: Categoria[] = [
  {
    slug: "documentacion",
    icon: "doc",
    title: "Documentación e identidad",
    text: "Encuentra guías para obtener tus documentos de identidad, acreditar tu residencia y acceder a los servicios y trámites de las administraciones públicas.",
  },
  {
    slug: "salud",
    icon: "salud",
    title: "Salud y asistencia sanitaria",
    text: "Conoce cómo acceder a la sanidad pública y realizar gestiones relacionadas con tu atención médica.",
  },
  {
    slug: "trabajo",
    icon: "trabajo",
    title: "Trabajo y Seguridad Social",
    text: "Encuentra información para realizar gestiones relacionadas con tu situación laboral y tus derechos como trabajador.",
  },
  {
    slug: "familia",
    icon: "familia",
    title: "Familia, ayudas y prestaciones",
    text: "Infórmate sobre los recursos, ayudas y prestaciones disponibles para ti y tu familia en materia de dependencia, discapacidad o apoyo familiar.",
  },
  {
    slug: "vehiculos",
    icon: "coche",
    title: "Vehículos y conducción",
    text: "Consulta cómo realizar las gestiones más habituales relacionadas con tu vehículo y tu permiso de conducir.",
  },
  {
    slug: "municipales",
    icon: "muni",
    title: "Solicitudes y trámites municipales",
    text: "Conoce cómo realizar las gestiones administrativas relacionadas con tu Ayuntamiento.",
  },
];

const procedures = getInstanceContent().procedures;
export const CATEGORIAS: Categoria[] = procedures?.categories ?? DEFAULT_CATEGORIAS;
/** Plantillas del editor de la instancia. Lo publicado se lee siempre de Supabase. */
export const TRAMITES: Tramite[] = procedures?.templates ?? [];
export const DESTACADOS: string[] = procedures?.featured ?? [];

export const getCategoria = (slug: string) => CATEGORIAS.find((c) => c.slug === slug);
export const getTramite = (cat: string, slug: string) =>
  TRAMITES.find((t) => t.cat === cat && t.slug === slug);
export const tramitesDe = (cat: string) => TRAMITES.filter((t) => t.cat === cat);
export const isCompleta = (t: Tramite) => Boolean(t.pasos?.length || t.guia?.pasos.length);
export function buscarTramites(q: string, translate: (s: string) => string = (s) => s) {
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  const n = norm(q.trim());
  if (!n) return [];
  return TRAMITES.filter((t) =>
    norm(`${t.title} ${t.short} ${translate(t.title)} ${translate(t.short)}`).includes(n),
  );
}
