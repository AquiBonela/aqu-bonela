import type { LucideIcon } from "lucide-react";
import { getInstanceContent, type InstanceContent } from "@/config/municipality";

/** Vida diaria categories shown in Servicios Públicos; each opens /vida-diaria/$categoria. */
export const CATEGORIAS_VIDA: { id: string; title: string; text: string }[] = [
  {
    id: "transporte",
    title: "Transporte",
    text: "Autobuses, horarios, taxi y conexiones con otros municipios.",
  },
  {
    id: "residuos",
    title: "Residuos y limpieza",
    text: "Contenedores, recogida de muebles y enseres, y punto limpio.",
  },
  {
    id: "espacios",
    title: "Espacios públicos",
    text: "Parques, instalaciones deportivas y piscina municipal.",
  },
  {
    id: "municipales",
    title: "Servicios municipales",
    text: "Horarios de atención, dependencias municipales y contacto.",
  },
  { id: "educacion", title: "Educación", text: "Colegio, guardería y otros servicios educativos." },
  {
    id: "otros",
    title: "Otros servicios",
    text: "Biblioteca, cementerio, consultorio, Correos y más.",
  },
];

/** Elemento de una categoría de «Vida diaria»; los aporta cada instancia. */
export type DailyLifeItem = {
  Icon: LucideIcon;
  title: string;
  text: string;
  facts?: { k: string; v: string }[];
  timetable?: { columns: string[]; rows: { days: string; cells: string[][] }[]; note?: string };
  list?: string[];
  blocks?: { k: string; v: string; tel?: string }[];
  note?: string;
  wide?: boolean;
  full?: boolean;
  span?: boolean;
  group?: string;
  tel?: string;
  link?: { label: string; href: string };
  link2?: { label: string; href: string };
};

/** Elementos de la instancia; vacío si no tiene. */
export function dailyLifeItems(content: InstanceContent = getInstanceContent()): DailyLifeItem[] {
  return content.dailyLife ?? [];
}

/** Solo las categorías con algún elemento: sin contenido, la sección no se muestra. */
export function dailyLifeCategories(content: InstanceContent = getInstanceContent()) {
  const items = dailyLifeItems(content);
  return CATEGORIAS_VIDA.filter((c) => items.some((i) => i.group === c.id));
}
