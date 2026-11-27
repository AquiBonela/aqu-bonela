/**
 * Imagen de cabecera de cada página pública. Primero la configurada en Supabase desde el editor
 * de la página; si no hay, la compilada de la instalación; si tampoco, ninguna (la página usa su
 * fondo de color). Apto para navegador y servidor.
 */
import { getSiteConfigSnapshot } from "@/config/municipality";
import { siteAssetUrl, type PageKey } from "./site-identity";

export type HeaderImage = {
  src: string;
  /** Versión ligera para pantallas estrechas. */
  srcSmall?: string;
  alt: string;
  /** Encuadre para object-position, p. ej. «50% 40%». */
  position: string;
  /** Viene del editor de la página (no de la instalación compilada). */
  configured: boolean;
};

export function pageHeaderImage(
  page: PageKey,
  fallback?: { src?: string | undefined; alt?: string | undefined },
): HeaderImage | null {
  const header = getSiteConfigSnapshot().pageHeaders?.[page];
  if (header)
    return {
      src: siteAssetUrl(header.imagePath),
      srcSmall: siteAssetUrl(header.imageSmallPath),
      alt: header.alt,
      position: `${header.focalX}% ${header.focalY}%`,
      configured: true,
    };
  if (fallback?.src)
    return { src: fallback.src, alt: fallback.alt ?? "", position: "50% 50%", configured: false };
  return null;
}

/** Nombre de cada página en el panel. */
export const PAGE_LABELS: Record<PageKey, string> = {
  inicio: "Portada",
  directorio: "Directorio",
  "servicios-publicos": "Servicios públicos",
  tramites: "Trámites",
  descubre: "Descubre el municipio",
  tablon: "Tablón",
  actualidad: "Actualidad y eventos",
};
