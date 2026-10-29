import { supabase } from "@/integrations/supabase/client";
import { BUCKET } from "@/lib/listing-images";

/** RLS restricts both operations to administrators; never remove files before the row deletion succeeds. */
export async function deleteListing(id: string) {
  const [listing, photos] = await Promise.all([
    supabase.from("listings").select("cover_path").eq("id", id).single(),
    supabase.from("listing_photos").select("storage_path").eq("listing_id", id),
  ]);
  if (listing.error) throw listing.error;
  if (photos.error) throw photos.error;
  const paths = [...new Set([listing.data.cover_path, ...photos.data.map((p) => p.storage_path)]
    .filter((path): path is string => Boolean(path)))];
  const { data, error } = await supabase.from("listings").delete().eq("id", id).select("id").single();
  if (error) throw error;
  if (!data) throw new Error("No se pudo eliminar la ficha.");
  if (!paths.length) return { cleanupFailed: false };
  const { error: cleanupError } = await supabase.storage.from(BUCKET).remove(paths);
  return { cleanupFailed: Boolean(cleanupError) };
}