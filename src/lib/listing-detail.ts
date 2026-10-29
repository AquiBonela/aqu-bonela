import { queryOptions } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { Listing } from "@/lib/directory";

export const SITE_URL = "https://bonela-local-finds.lovable.app";
export const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export type Hour = { weekday: number; opens: string; closes: string };
export type ListingDetail = Listing & {
  categoryName: string | null;
  categorySlug: string | null;
  hours: Hour[];
  photos: { url: string; alt: string }[];
  public_email: string | null;
};

export const listingDetailQuery = (type: Listing["type"], slug: string) =>
  queryOptions({
    queryKey: ["listing", type, slug],
    queryFn: async (): Promise<ListingDetail> => {
      const { data, error } = await supabase
        .from("listings")
        .select(
          "id,slug,type,name,short_description,description,category_id,featured,featured_until,tags,public_phone,public_whatsapp,public_address,public_email,activity,labels,cover_url,cover_path,gallery_urls,urgent_24h,categories(name,slug),listing_hours(weekday,opens,closes),listing_photos(storage_path,alt,sort_order)",
        )
        .eq("status", "publicada")
        .eq("type", type)
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw notFound();
      const { categories, listing_hours, listing_photos, ...rest } = data;
      const sorted = [...listing_photos].sort((a, b) => a.sort_order - b.sort_order);
      let photos: ListingDetail["photos"] = [];
      if (sorted.length) {
        const { data: signed } = await supabase.storage
          .from("listing-photos")
          .createSignedUrls(sorted.map((p) => p.storage_path), 3600);
        photos = sorted
          .map((p, i) => ({ url: signed?.[i]?.signedUrl ?? "", alt: p.alt || rest.name }))
          .filter((p) => p.url);
      }
      let cover_url = rest.cover_url;
      if (rest.cover_path) {
        const { data: c } = await supabase.storage.from("listing-photos").createSignedUrl(rest.cover_path, 3600);
        if (c?.signedUrl) cover_url = c.signedUrl;
      }
      return {
        ...(rest as unknown as Listing),
        public_email: (rest as { public_email?: string | null }).public_email ?? null,
        cover_url,
        categoryName: categories?.name ?? null,
        categorySlug: categories?.slug ?? null,
        hours: [...listing_hours].sort((a, b) => a.weekday - b.weekday || a.opens.localeCompare(b.opens)),
        photos,
      };
    },
  });

export function groupHours(hours: Hour[]) {
  return WEEKDAYS.map((day, i) => ({
    day,
    slots: hours.filter((h) => h.weekday === i + 1).map((h) => `${h.opens.slice(0, 5)}–${h.closes.slice(0, 5)}`),
  }));
}

export function mapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, Casarabonela, Málaga`)}`;
}

export function listingPath(type: Listing["type"], slug: string) {
  return `/${type === "comercio" ? "comercios" : "profesionales"}/${slug}`;
}
