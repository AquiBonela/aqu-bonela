import { supabase } from "@/integrations/supabase/client";

export const BUCKET = "listing-photos";
export const MAX_INPUT_BYTES = 8 * 1024 * 1024;
export const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_SIDE = 1600;

/** Devuelve un mensaje de error si el archivo no es válido, o null. */
export function validateImage(file: { type: string; size: number }): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return "Solo se admiten imágenes JPG, PNG o WebP.";
  if (file.size > MAX_INPUT_BYTES) return "La imagen supera los 8 MB.";
  return null;
}

/** Escala para que el lado largo no supere MAX_SIDE (nunca amplía). */
export function fitSize(w: number, h: number, max = MAX_SIDE) {
  const k = Math.min(1, max / Math.max(w, h));
  return { width: Math.round(w * k), height: Math.round(h * k) };
}

export async function toWebp(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const { width, height } = fitSize(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, width, height);
  bmp.close();
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("No se pudo convertir la imagen"))), "image/webp", 0.8));
}

/** Valida, redimensiona, convierte y sube. Devuelve el storage_path. */
export async function uploadListingImage(listingId: string, file: File): Promise<string> {
  const err = validateImage(file);
  if (err) throw new Error(err);
  const blob = await toWebp(file);
  const path = `${listingId}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: "image/webp" });
  if (error) throw error;
  return path;
}

export async function removeFile(path: string) {
  await supabase.storage.from(BUCKET).remove([path]);
}

export async function signedUrl(path: string) {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
