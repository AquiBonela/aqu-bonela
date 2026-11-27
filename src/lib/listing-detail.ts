import { queryOptions } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import type { Listing } from "@/lib/directory";
import { getMunicipality } from "@/config/municipality";
import type { HourPeriod } from "./listing-details";
import { CACHE } from "./cache-policy";

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
  /** El titular ocultó el horario (vista pública). */
  hours_hidden?: boolean;
  /** Localidad publicada (dirección exacta o solo zona aproximada). */
  public_locality?: string | null;
  public_latitude?: number | null;
  public_longitude?: number | null;
  /** Solo se publica la zona, no la calle. */
  public_location_approximate?: boolean | null;
  public_home_service?: boolean | null;
  public_service_area?: string | null;
  cover_alt?: string | null;
  hours_note?: string | null;
  /** Cierres, vacaciones y temporadas (vacío si el horario está oculto). */
  periods?: HourPeriod[];
};

export const listingDetailQuery = (type: Listing["type"], slug: string) =>
  queryOptions({
    queryKey: ["listing", type, slug],
    ...CACHE.listing,
    queryFn: async (): Promise<ListingDetail> => {
      const { data, error } = await supabase
        .from("public_listings")
        .select(
          "id,slug,type,name,short_description,description,translations,category_id,featured,tags,public_phone,public_phone_2,public_whatsapp,public_address,public_email,public_website,public_linkedin,public_facebook,public_youtube,public_x_twitter,public_instagram,public_tiktok,activity,labels,cover_url,cover_path,gallery_urls,urgent_24h,hours_hidden,public_locality,public_latitude,public_longitude,public_location_approximate,public_home_service,public_service_area,cover_alt,hours_note",
        )
        .eq("type", type)
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data?.id) throw notFound();
      const rest = data as unknown as Listing & Partial<ListingDetail>;
      // Categoría, horario visible y fotos, cada uno con su política pública.
      // El horario oculto ni se pide: una sesión de administrador en el navegador sí lo recibiría.
      const [category, hoursResult, photosResult, periodsResult] = await Promise.all([
        rest.category_id
          ? supabase.from("categories").select("name,slug").eq("id", rest.category_id).maybeSingle()
          : null,
        rest.hours_hidden
          ? null
          : supabase
              .from("listing_hours")
              .select("weekday,opens,closes,period_id")
              .eq("listing_id", rest.id),
        supabase
          .from("listing_photos")
          .select("storage_path,alt,sort_order")
          .eq("listing_id", rest.id),
        rest.hours_hidden
          ? null
          : supabase
              .from("listing_hour_periods")
              .select("id,kind,starts_on,ends_on,label")
              .eq("listing_id", rest.id)
              .order("sort_order"),
      ]);
      const relatedError =
        category?.error ?? hoursResult?.error ?? photosResult.error ?? periodsResult?.error;
      if (relatedError) throw new Error(relatedError.message);
      const sorted = [...(photosResult.data ?? [])].sort((a, b) => a.sort_order - b.sort_order);
      let photos: ListingDetail["photos"] = [];
      if (sorted.length) {
        const { data: signed } = await supabase.storage.from("listing-photos").createSignedUrls(
          sorted.map((p) => p.storage_path),
          3600,
        );
        photos = sorted
          .map((p, i) => ({ url: signed?.[i]?.signedUrl ?? "", alt: p.alt || rest.name }))
          .filter((p) => p.url);
      }
      let cover_url = rest.cover_url;
      if (rest.cover_path) {
        const { data: c } = await supabase.storage
          .from("listing-photos")
          .createSignedUrl(rest.cover_path, 3600);
        if (c?.signedUrl) cover_url = c.signedUrl;
      }
      return {
        ...(rest as Listing),
        public_email: rest.public_email ?? null,
        public_website: rest.public_website ?? null,
        public_phone_2: rest.public_phone_2 ?? null,
        public_linkedin: rest.public_linkedin ?? null,
        public_facebook: rest.public_facebook ?? null,
        public_youtube: rest.public_youtube ?? null,
        public_x_twitter: rest.public_x_twitter ?? null,
        public_instagram: rest.public_instagram ?? null,
        public_tiktok: rest.public_tiktok ?? null,
        cover_url,
        categoryName: category?.data?.name ?? null,
        categorySlug: category?.data?.slug ?? null,
        hours: sortHours((hoursResult?.data ?? []).filter((h) => !h.period_id)),
        periods: (periodsResult?.data ?? []).map((p) => ({
          kind: p.kind as HourPeriod["kind"],
          starts_on: p.starts_on,
          ends_on: p.ends_on,
          label: p.label,
          hours: sortHours((hoursResult?.data ?? []).filter((h) => h.period_id === p.id)),
        })),
        photos,
      };
    },
  });

function sortHours(hours: { weekday: number; opens: string; closes: string }[]): Hour[] {
  return hours
    .map(({ weekday, opens, closes }) => ({ weekday, opens, closes }))
    .sort((a, b) => a.weekday - b.weekday || a.opens.localeCompare(b.opens));
}

export function groupHours(hours: Hour[]) {
  return WEEKDAYS.map((day, i) => ({
    day,
    slots: hours
      .filter((h) => h.weekday === i + 1)
      .map((h) => `${h.opens.slice(0, 5)}–${h.closes.slice(0, 5)}`),
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
