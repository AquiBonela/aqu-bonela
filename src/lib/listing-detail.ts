import { queryOptions } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { Listing } from "@/lib/directory";
import { getMunicipality } from "@/config/municipality";

/** URL pública de la instalación, leída en cada uso: puede cambiar desde /admin sin desplegar. */
export function siteUrl(): string {
  return getMunicipality().siteUrl;
}
export const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export type Hour = { weekday: number; opens: string; closes: string };
export type ListingDetail = Listing & {
  categoryName: string | null;
  categorySlug: string | null;
  hours: Hour[];
  photos: { url: string; alt: string }[];
  public_email: string | null;
  public_website: string | null;
  public_phone_2: string | null;
  public_linkedin: string | null;
  public_facebook: string | null;
  public_youtube: string | null;
  public_x_twitter: string | null;
  public_instagram: string | null;
  public_tiktok: string | null;
};

export const listingDetailQuery = (type: Listing["type"], slug: string) =>
  queryOptions({
    queryKey: ["listing", type, slug],
    queryFn: async (): Promise<ListingDetail> => {
      const { data, error } = await supabase
        .from("listings")
        .select(
          "id,slug,type,name,short_description,description,translations,category_id,featured,featured_until,tags,public_phone,public_phone_2,public_whatsapp,public_address,public_email,public_website,public_linkedin,public_facebook,public_youtube,public_x_twitter,public_instagram,public_tiktok,activity,labels,cover_url,cover_path,gallery_urls,urgent_24h,categories(name,slug),listing_hours(weekday,opens,closes),listing_photos(storage_path,alt,sort_order)",
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
        public_website: (rest as { public_website?: string | null }).public_website ?? null,
        public_phone_2: rest.public_phone_2 ?? null,
        public_linkedin: rest.public_linkedin ?? null,
        public_facebook: rest.public_facebook ?? null,
        public_youtube: rest.public_youtube ?? null,
        public_x_twitter: rest.public_x_twitter ?? null,
        public_instagram: rest.public_instagram ?? null,
        public_tiktok: rest.public_tiktok ?? null,
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
  const { name, province } = getMunicipality();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address}, ${name}, ${province}`)}`;
}

/** Enlace clicable de la web de la ficha: añade https:// si el valor no lo trae. */
export function websiteUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

export function listingPath(type: Listing["type"], slug: string) {
  return `/${type === "comercio" ? "comercios" : type === "publico" ? "servicios" : type === "asociacion" ? "asociaciones" : "profesionales"}/${slug}`;
}
