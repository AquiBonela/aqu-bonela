/**
 * Subida de recursos gráficos de la instalación al bucket privado site-assets (navegador, panel).
 * Cada subida usa una carpeta o un nombre nuevos, así la web puede guardar los archivos en caché
 * para siempre y un cambio nunca muestra la imagen anterior. Los archivos viejos se borran después
 * de guardar la nueva ruta, nunca antes.
 */
import { supabase } from "@/integrations/supabase/client";
import { renderImage } from "./image-processing";
import type { PageKey } from "./site-identity";

export const SITE_ASSETS_BUCKET = "site-assets";
export const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
export const HEADER_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function validateSource(
  file: { type: string; size: number },
  types: string[],
): string | null {
  if (!types.includes(file.type)) return "Formato no admitido.";
  if (file.size > MAX_SOURCE_BYTES) return "La imagen supera los 10 MB.";
  return null;
}

export function identityAssetPaths(id: string) {
  return {
    logo: `identidad/${id}/logo.webp`,
    logoLight: `identidad/${id}/logo-claro.webp`,
    icon: `identidad/${id}/icono-512.png`,
    iconSmall: `identidad/${id}/icono-192.png`,
  };
}

export function headerAssetPaths(page: PageKey, id: string) {
  return { image: `cabeceras/${page}/${id}.webp`, small: `cabeceras/${page}/${id}-movil.webp` };
}

/** Logotipo (hasta 800 × 400 px) e iconos cuadrados de 512 y 192 px sobre fondo blanco. */
export async function prepareLogo(file: File) {
  const [logo, icon, iconSmall] = await Promise.all([
    renderImage(file, { maxWidth: 800, maxHeight: 400, type: "image/webp", quality: 0.9 }),
    renderImage(file, {
      maxWidth: 512,
      square: 512,
      padding: 0.12,
      background: "#ffffff",
      type: "image/png",
    }),
    renderImage(file, {
      maxWidth: 192,
      square: 192,
      padding: 0.12,
      background: "#ffffff",
      type: "image/png",
    }),
  ]);
  return { logo, icon, iconSmall };
}

export function prepareLightLogo(file: File) {
  return renderImage(file, { maxWidth: 800, maxHeight: 400, type: "image/webp", quality: 0.9 });
}

/** Cabecera: versión de escritorio (2000 px) y de móvil (900 px), en WebP. */
export async function prepareHeader(file: File) {
  const [image, small] = await Promise.all([
    renderImage(file, { maxWidth: 2000, maxHeight: 2000, type: "image/webp", quality: 0.8 }),
    renderImage(file, { maxWidth: 900, maxHeight: 1400, type: "image/webp", quality: 0.78 }),
  ]);
  return { image, small };
}

export async function uploadSiteAsset(path: string, blob: Blob): Promise<void> {
  const { error } = await supabase.storage.from(SITE_ASSETS_BUCKET).upload(path, blob, {
    contentType: path.endsWith(".png") ? "image/png" : "image/webp",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(error.message);
}

/** Borra archivos que ya no se usan. No lanza: devuelve si quedó alguno sin borrar. */
export async function removeSiteAssets(paths: string[]): Promise<boolean> {
  const list = paths.filter(Boolean);
  if (list.length === 0) return true;
  const { error } = await supabase.storage.from(SITE_ASSETS_BUCKET).remove(list);
  return !error;
}

export function newAssetId(): string {
  return crypto.randomUUID();
}
