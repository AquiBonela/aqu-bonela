import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import type { Listing } from "@/lib/directory";
import { ListingCard } from "./ListingCard";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="/comercios/prueba">{children}</a>,
}));
const listing: Listing = {
  id: "prueba", slug: "prueba", type: "comercio", name: "Prueba",
  description: "", short_description: "", category_id: null,
  featured: false, featured_until: null, tags: [], public_phone: null,
  public_whatsapp: null, public_address: null, activity: null, labels: [],
  cover_url: "https://example.com/portada.webp", gallery_urls: [], urgent_24h: false,
};
afterEach(cleanup);
it.each([false, true])("solo muestra portada cuando Resaltado=%s", (highlighted) => {
  const { container } = render(<I18nProvider><ListingCard listing={listing} highlighted={highlighted} /></I18nProvider>);
  expect(container.querySelectorAll("img")).toHaveLength(highlighted ? 1 : 0);
  if (highlighted) expect(container.querySelector("img")?.src).toBe("https://example.com/portada.webp");
  expect(screen.queryByText("Colaborador")).toBeNull();
});