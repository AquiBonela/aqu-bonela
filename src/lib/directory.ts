import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Category = { id: string; name: string; slug: string; sort_order: number };
export type Listing = {
  id: string;
  slug: string;
  type: "comercio" | "profesional";
  name: string;
  description: string;
  category_id: string | null;
  featured: boolean;
  featured_until: string | null;
  tags: string[];
  public_phone: string | null;
  public_whatsapp: string | null;
  public_address: string | null;
};

export const directoryQuery = queryOptions({
  queryKey: ["directory"],
  queryFn: async () => {
    const [cats, list] = await Promise.all([
      supabase.from("categories").select("id,name,slug,sort_order").order("sort_order"),
      supabase
        .from("listings")
        .select(
          "id,slug,type,name,description,category_id,featured,featured_until,tags,public_phone,public_whatsapp,public_address",
        )
        .eq("status", "publicada")
        .order("name"),
    ]);
    if (cats.error) throw new Error(cats.error.message);
    if (list.error) throw new Error(list.error.message);
    return { categories: cats.data as Category[], listings: list.data as Listing[] };
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
) {
  const cat = categories.find((c) => c.slug === catSlug);
  const words = normalize(q).split(/\s+/).filter(Boolean);
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const result = listings.filter((l) => {
    if (cat && l.category_id !== cat.id) return false;
    if (!words.length) return true;
    const hay = normalize(
      [l.name, l.description, catName.get(l.category_id ?? "") ?? "", l.tags.join(" ")].join(" "),
    );
    return words.every((w) => hay.includes(w));
  });
  return result.sort(
    (a, b) => Number(isFeatured(b, now)) - Number(isFeatured(a, now)) || a.name.localeCompare(b.name, "es"),
  );
}

export function whatsappUrl(number: string, name?: string) {
  const text = name ? `?text=${encodeURIComponent(`Hola, os encuentro en Aquí Bonela (${name}).`)}` : "";
  return `https://wa.me/${number.replace(/\D/g, "")}${text}`;
}
