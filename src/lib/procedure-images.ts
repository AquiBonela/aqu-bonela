import { supabase } from "@/integrations/supabase/client";
import { toWebp, validateImage } from "./listing-images";

export const PROCEDURE_IMAGE_BUCKET = "procedure-images";
export async function uploadProcedureImage(elementId: string, file: File) {
  const message = validateImage(file);
  if (message) throw new Error(message);
  const blob = await toWebp(file);
  const path = `${elementId}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage
    .from(PROCEDURE_IMAGE_BUCKET)
    .upload(path, blob, { contentType: "image/webp" });
  if (error) throw error;
  return path;
}
export async function procedureImageUrl(path: string) {
  const { data, error } = await supabase.storage
    .from(PROCEDURE_IMAGE_BUCKET)
    .createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
