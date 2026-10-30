import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Category = { id: string; name: string; slug: string; sort_order: number };
export type Listing = {
  id: string;
  slug: string;
  type: "comercio" | "profesional" | "publico";
  name: string;
  description: string;
  short_description: string;
  category_id: string | null;
  featured: boolean;
  featured_until: string | null;
  tags: string[];
  public_phone: string | null;
  public_whatsapp: string | null;
  public_address: string | null;
  activity: string | null;
  labels: string[];
  cover_url: string | null;
  cover_path?: string | null;
  gallery_urls: string[];
  urgent_24h: boolean;
};

export const directoryQuery = queryOptions({
  queryKey: ["directory"],
  queryFn: async () => {
    const [cats, settings, list] = await Promise.all([
      supabase.from("categories").select("id,name,slug,sort_order").order("sort_order"),
      supabase.from("site_settings").select("hero_title,hero_subtitle,banner_enabled,banner_text").maybeSingle(),
      supabase
        .from("listings")
        .select(
          "id,slug,type,name,description,short_description,category_id,featured,featured_until,tags,public_phone,public_whatsapp,public_address,activity,labels,cover_url,cover_path,gallery_urls,urgent_24h",
        )
        .eq("status", "publicada")
        .order("name"),
    ]);
    if (cats.error) throw new Error(cats.error.message);
    if (list.error) throw new Error(list.error.message);
    const listings = list.data as Listing[];
    // Firma en lote solo las cabeceras que se ven (fichas colaboradoras con imagen subida).
    const toSign = listings.filter((l) => l.cover_path && isFeatured(l));
    if (toSign.length) {
      const { data: signed } = await supabase.storage
        .from("listing-photos")
        .createSignedUrls(toSign.map((l) => l.cover_path!), 3600);
      toSign.forEach((l, i) => {
        const url = signed?.[i]?.signedUrl;
        if (url) l.cover_url = url;
      });
    }
    return {
      categories: cats.data as Category[],
      listings,
      heroTitle: settings.data?.hero_title || "¿Qué buscas en Casarabonela?",
      heroSubtitle: settings.data?.hero_subtitle ?? "",
      banner: settings.data?.banner_enabled && settings.data.banner_text.trim() ? settings.data.banner_text.trim() : null,
    };
  },
});

export function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Destacada solo mientras no haya caducado (1 mes). */
export function isFeatured(l: Pick<Listing, "featured" | "featured_until">, now = new Date()) {
  return l.featured && !!l.featured_until && new Date(l.featured_until) > now;
}

/** Busca en nombre, descripción, categoría y tags (los tags no se muestran). */
export function filterListings(
  listings: Listing[],
  categories: Category[],
  q: string,
  catSlug: string,
  now = new Date(),
  activity = "",
  type: Listing["type"] | "" = "",
) {
  const cat = categories.find((c) => c.slug === catSlug);
  const words = normalize(q).split(/\s+/).filter(Boolean);
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const result = listings.filter((l) => {
    if (type && l.type !== type) return false;
    if (cat && l.category_id !== cat.id) return false;
    if (cat && activity && normalize(l.activity ?? "") !== normalize(activity)) return false;
    if (!words.length) return true;
    const hay = normalize(
      [l.name, l.short_description, l.description, l.activity ?? "", catName.get(l.category_id ?? "") ?? "", l.tags.join(" "), l.labels.join(" ")].join(" "),
    );
    return words.every((w) => hay.includes(w));
  });
  return result.sort(
    (a, b) => Number(isFeatured(b, now)) - Number(isFeatured(a, now)) || a.name.localeCompare(b.name, "es"),
  );
}

/** Orden aleatorio estable durante un día (cambia a medianoche, hora local). */
export function dailyShuffle<T extends { id: string }>(items: T[], now = new Date()) {
  const day = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const hash = (s: string) => {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  };
  return [...items].sort((a, b) => hash(day + a.id) - hash(day + b.id) || a.id.localeCompare(b.id));
}

export function whatsappUrl(number: string, name?: string) {
  const text = name ? `?text=${encodeURIComponent(`Hola, os encuentro en Aquí Bonela (${name}).`)}` : "";
  return `https://wa.me/${number.replace(/\D/g, "")}${text}`;
}

/** Oficios disponibles dentro de una categoría (ordenados, sin duplicados). */
export function activitiesFor(listings: Listing[], categoryId: string | undefined) {
  if (!categoryId) return [];
  const set = new Set(listings.filter((l) => l.category_id === categoryId && l.activity).map((l) => l.activity!));
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}
