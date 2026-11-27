import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tables: [] as string[],
  rows: {} as Record<string, unknown>,
}));

// Cliente falso: registra qué tablas se consultan y devuelve filas fijas por tabla.
vi.mock("@/integrations/supabase/client", () => {
  const builder = (table: string) => {
    const result = () => ({ data: mocks.rows[table] ?? null, error: null });
    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      maybeSingle: () => Promise.resolve(result()),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve),
    };
    return chain;
  };
  return {
    supabase: {
      from: (table: string) => {
        mocks.tables.push(table);
        return builder(table);
      },
      storage: {
        from: () => ({
          createSignedUrls: (paths: string[]) =>
            Promise.resolve({ data: paths.map((p) => ({ signedUrl: `https://firmada/${p}` })) }),
          createSignedUrl: (path: string) =>
            Promise.resolve({ data: { signedUrl: `https://firmada/${path}` } }),
        }),
      },
    },
  };
});

import { listingDetailQuery } from "./listing-detail";

const row = {
  id: "f1",
  slug: "panaderia",
  type: "comercio",
  name: "Panadería",
  short_description: "Pan",
  description: "Pan de leña",
  translations: {},
  category_id: "c1",
  featured: true,
  tags: ["pan"],
  public_phone: "600000000",
  public_phone_2: null,
  public_whatsapp: null,
  public_address: null,
  public_email: null,
  public_website: null,
  public_linkedin: null,
  public_facebook: null,
  public_youtube: null,
  public_x_twitter: null,
  public_instagram: null,
  public_tiktok: null,
  activity: null,
  labels: [],
  cover_url: null,
  cover_path: "f1/portada.webp",
  gallery_urls: [],
  urgent_24h: false,
};

async function load() {
  const options = listingDetailQuery("comercio", "panaderia");
  return (
    options.queryFn as () => Promise<Awaited<ReturnType<NonNullable<typeof options.queryFn>>>>
  )();
}

beforeEach(() => {
  mocks.tables = [];
  mocks.rows = {};
});

describe("ficha pública", () => {
  it("lee la vista pública, nunca la tabla listings", async () => {
    mocks.rows = {
      public_listings: row,
      categories: { name: "Alimentación", slug: "alimentacion" },
      listing_hours: [
        { weekday: 2, opens: "17:00", closes: "20:00" },
        { weekday: 1, opens: "09:00", closes: "14:00" },
      ],
      listing_photos: [
        { storage_path: "f1/b.webp", alt: "", sort_order: 2 },
        { storage_path: "f1/a.webp", alt: "Mostrador", sort_order: 1 },
      ],
    };
    const detail = await load();
    expect(mocks.tables).not.toContain("listings");
    expect(mocks.tables).toEqual([
      "public_listings",
      "categories",
      "listing_hours",
      "listing_photos",
      "listing_hour_periods",
    ]);
    expect(detail.categoryName).toBe("Alimentación");
    expect(detail.hours.map((h) => h.weekday)).toEqual([1, 2]);
    expect(detail.photos).toEqual([
      { url: "https://firmada/f1/a.webp", alt: "Mostrador" },
      { url: "https://firmada/f1/b.webp", alt: "Panadería" },
    ]);
    expect(detail.cover_url).toBe("https://firmada/f1/portada.webp");
    expect(detail.featured).toBe(true);
  });

  it("sin horario visible (oculto por el titular) la ficha llega sin horario", async () => {
    mocks.rows = { public_listings: row, listing_hours: [], listing_photos: [] };
    const detail = await load();
    expect(detail.hours).toEqual([]);
  });

  it("con el horario oculto no lo pide, aunque una sesión de administrador lo recibiría", async () => {
    mocks.rows = {
      public_listings: { ...row, hours_hidden: true },
      listing_hours: [{ weekday: 1, opens: "10:00", closes: "13:00" }],
      listing_photos: [],
    };
    const detail = await load();
    expect(mocks.tables).not.toContain("listing_hours");
    expect(detail.hours).toEqual([]);
    expect(detail.hours_hidden).toBe(true);
  });

  it("sin categoría no la consulta", async () => {
    mocks.rows = {
      public_listings: { ...row, category_id: null },
      listing_hours: [],
      listing_photos: [],
    };
    const detail = await load();
    expect(mocks.tables).not.toContain("categories");
    expect(detail.categoryName).toBeNull();
  });

  it("una ficha que no está publicada no existe", async () => {
    await expect(load()).rejects.toBeTruthy();
    expect(mocks.tables).toEqual(["public_listings"]);
  });
});
