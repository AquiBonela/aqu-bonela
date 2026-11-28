import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SITE_ASSETS_BUCKET } from "@/lib/site-assets";

/**
 * Dirección temporal de una imagen de site-assets para verla en el panel. Las de un borrador aún no
 * son públicas (los visitantes solo leen lo publicado), así que el panel las firma con la sesión del
 * administrador. La firma dura una hora y se renueva antes.
 */
export function useAdminAssetUrl(path: string | null | undefined): string | null {
  const { data } = useQuery({
    queryKey: ["admin", "asset-url", path ?? ""],
    enabled: Boolean(path),
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data: signed, error } = await supabase.storage
        .from(SITE_ASSETS_BUCKET)
        .createSignedUrl(path as string, 3600);
      if (error) throw error;
      return signed.signedUrl;
    },
  });
  return path ? (data ?? null) : null;
}
