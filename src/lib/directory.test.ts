import { describe, expect, it } from "vitest";
import { activitiesFor, filterListings, isFeatured, type Category, type Listing } from "./directory";

const now = new Date("2026-10-24T00:00:00Z");
const cats: Category[] = [
  { id: "c1", name: "Alimentación", slug: "alimentacion", sort_order: 1 },
  { id: "c2", name: "Salud", slug: "salud", sort_order: 2 },
];
const base = { public_phone: null, public_whatsapp: null, public_address: null, description: "", short_description: "", labels: [], cover_url: null, gallery_urls: [], urgent_24h: false };
const items: Listing[] = [
  { ...base, id: "1", slug: "a", type: "comercio", name: "Panadería", activity: "Panadería", category_id: "c1", featured: false, featured_until: null, tags: ["molletes"] },
  { ...base, id: "2", slug: "b", type: "comercio", name: "Carnicería", activity: "Carnicería", category_id: "c1", featured: true, featured_until: "2026-11-20T00:00:00Z", tags: [] },
  { ...base, id: "3", slug: "c", type: "profesional", name: "Fisio", activity: "Fisioterapeuta", category_id: "c2", featured: true, featured_until: "2026-10-01T00:00:00Z", tags: [] },
];

describe("directorio", () => {
  it("el destacado caduca al pasar su fecha", () => {
    expect(isFeatured(items[1] ?? items[0] as Listing, now)).toBe(true);
    expect(isFeatured(items[2] ?? items[0] as Listing, now)).toBe(false);
  });
  it("las destacadas van primero dentro de su categoría", () => {
    expect(filterListings(items, cats, "", "alimentacion", now).map((l) => l.id)).toEqual(["2", "1"]);
  });
  it("busca por tags ocultos y sin acentos", () => {
    expect(filterListings(items, cats, "MOLLETES", "", now).map((l) => l.id)).toEqual(["1"]);
    expect(filterListings(items, cats, "panaderia", "", now).map((l) => l.id)).toEqual(["1"]);
  });
  it("los oficios se listan solo para la categoría elegida", () => {
    expect(activitiesFor(items, "c1")).toEqual(["Carnicería", "Panadería"]);
    expect(activitiesFor(items, undefined)).toEqual([]);
  });

  it("el filtro de oficio deja solo ese oficio dentro de la categoría", () => {
    const r = filterListings(items, cats, "", "alimentacion", now, "Panadería");
    expect(r.map((l) => l.id)).toEqual(["1"]);
  });
});
