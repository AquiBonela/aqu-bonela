import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PageKey } from "./site-identity";

/** Cabecera guardada de una página (panel). */
export const PAGE_HEADER_COLUMNS =
  "page_key,image_path,image_small_path,alt,focal_x,focal_y,updated_at";
export type PageHeaderRow = {
  page_key: string;
  image_path: string;
  image_small_path: string;
  alt: string;
  focal_x: number;
  focal_y: number;
  updated_at: string;
};

export const pageHeaderQuery = (page: PageKey) =>
  queryOptions({
    queryKey: ["admin", "page-header", page],
    queryFn: async (): Promise<PageHeaderRow | null> => {
      const { data, error } = await supabase
        .from("page_headers")
        .select(PAGE_HEADER_COLUMNS)
        .eq("page_key", page)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });
