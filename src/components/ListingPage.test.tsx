import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import type { ListingDetail } from "@/lib/listing-detail";
import { ListingPage, type ReviewField } from "./ListingPage";

const listing: ListingDetail = {
  id: "listing-test",
  slug: "contactos-completos",
  type: "comercio",
  name: "Comercio de prueba",
  description: "",
  short_description: "",
  category_id: null,
  featured: false,
  featured_until: null,
  tags: [],
  public_phone: "600000001",
  public_phone_2: "600000002",
  public_whatsapp: null,
  public_address: null,
  public_email: null,
  public_website: null,
  public_linkedin: "https://www.linkedin.com/in/prueba",
  public_facebook: "https://www.facebook.com/prueba",
  public_youtube: "https://www.youtube.com/@prueba",
  public_x_twitter: "https://x.com/prueba",
  public_instagram: "https://www.instagram.com/prueba",
  public_tiktok: "https://www.tiktok.com/@prueba",
  activity: null,
  labels: [],
  cover_url: null,
  gallery_urls: [],
  urgent_24h: false,
  categoryName: null,
  categorySlug: null,
  hours: [],
  photos: [],
};

const visible: Record<ReviewField, boolean> = {
  website: true,
  service_area: true,
  address: true,
  phone: true,
  phone_2: true,
  whatsapp: true,
  email: true,
  linkedin: true,
  facebook: true,
  youtube: true,
  x_twitter: true,
  instagram: true,
  tiktok: true,
  hours: true,
};

function renderReview(onToggle = vi.fn()) {
  render(
    <I18nProvider>
      <ListingPage listing={listing} review={{ show: visible, onToggle }} />
    </I18nProvider>,
  );
  return onToggle;
}

afterEach(cleanup);

describe("galería independiente del resaltado", () => {
  it.each([false, true])("permite ampliar cinco fotografías con resaltado=%s", (featured) => {
    render(
      <I18nProvider>
        <ListingPage
          listing={{
            ...listing,
            featured,
            featured_until: "2099-01-01T00:00:00Z",
            photos: Array.from({ length: 5 }, (_, i) => ({
              url: `https://example.com/photo-${i}.webp`,
              alt: `Foto ${i + 1}`,
            })),
          }}
          review={{ show: visible, onToggle: vi.fn() }}
        />
      </I18nProvider>,
    );
    expect(screen.getAllByRole("button", { name: /Ampliar fotografía/ })).toHaveLength(5);
    fireEvent.click(
      screen.getByRole("button", { name: "Ampliar fotografía 5: Comercio de prueba" }),
    );
    expect(screen.getByRole("dialog", { name: "Fotografía ampliada" })).toBeTruthy();
    expect(screen.getByText("5 / 5")).toBeTruthy();
  });
});

describe("contactos ampliados de la ficha", () => {
  it("muestra el segundo teléfono y todos los enlaces sociales", () => {
    renderReview();
    expect(screen.getByRole("switch", { name: "Mostrar Segundo teléfono" })).toBeTruthy();
    expect(screen.getByText("600000002")).toBeTruthy();

    const links = [
      ["LinkedIn", "https://www.linkedin.com/in/prueba"],
      ["Facebook", "https://www.facebook.com/prueba"],
      ["YouTube", "https://www.youtube.com/@prueba"],
      ["X (Twitter)", "https://x.com/prueba"],
      ["Instagram", "https://www.instagram.com/prueba"],
      ["TikTok", "https://www.tiktok.com/@prueba"],
    ] as const;
    for (const [name, href] of links) {
      expect(screen.getByRole("link", { name })).toHaveProperty("href", href);
    }
  });

  it.each([
    ["Segundo teléfono", "phone_2"],
    ["LinkedIn", "linkedin"],
    ["Facebook", "facebook"],
    ["YouTube", "youtube"],
    ["X (Twitter)", "x_twitter"],
    ["Instagram", "instagram"],
    ["TikTok", "tiktok"],
  ] as const)("el interruptor de %s controla su propio campo", (label, field) => {
    const onToggle = renderReview();
    fireEvent.click(screen.getByRole("switch", { name: `Mostrar ${label}` }));
    expect(onToggle).toHaveBeenCalledWith(field, false);
  });
});

function renderWithDescription(description: string) {
  render(
    <I18nProvider>
      <ListingPage
        listing={{ ...listing, description }}
        review={{ show: visible, onToggle: vi.fn() }}
      />
    </I18nProvider>,
  );
}

describe("formato de la descripción en la ficha", () => {
  it("enlaza la palabra ayuntamiento a la web indicada en la descripción compartida con revisión", () => {
    renderWithDescription("Consulta /ayuntamiento*www.casarabonela.es/.");
    expect(screen.getByRole("link", { name: "ayuntamiento" })).toHaveProperty(
      "href",
      "https://www.casarabonela.es/",
    );
  });
  it("muestra en negrita el doble asterisco y en cursiva el asterisco simple", () => {
    renderWithDescription("**Cerrado** *por obras*");
    expect(screen.getByText("Cerrado").tagName).toBe("STRONG");
    expect(screen.getByText("por obras").tagName).toBe("EM");
  });

  it("no interpreta HTML escrito dentro de la cursiva", () => {
    renderWithDescription("*<em>hola</em>*");
    const italic = screen.getByText("<em>hola</em>");
    expect(italic.tagName).toBe("EM");
    expect(italic.childElementCount).toBe(0);
  });
});
