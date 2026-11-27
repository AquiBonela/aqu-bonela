import { describe, expect, it } from "vitest";
import { listingShareImage } from "./listing-head";

describe("portada al compartir fichas", () => {
  it("conserva las portadas subidas y su autorización temporal", () => {
    const cover =
      "https://photos.example.org/storage/v1/object/sign/listing-photos/listing/cover.webp?token=test";
    expect(listingShareImage(cover)).toBe(cover);
  });
  it("no inventa una imagen si la ficha no tiene portada", () => {
    expect(listingShareImage(null)).toBeNull();
    expect(listingShareImage("")).toBeNull();
  });
  it("no utiliza imágenes relativas o inseguras para compartir", () => {
    expect(listingShareImage("/cover.webp")).toBeNull();
    expect(listingShareImage("http://example.org/cover.webp")).toBeNull();
  });
  it("prepara las portadas remotas antiguas a 1200 por 630", () => {
    const result = listingShareImage("https://images.unsplash.com/photo-test?w=1600");
    expect(result).toBeTruthy();
    if (!result) throw new Error("Missing share image");
    const url = new URL(result);
    expect(url.searchParams.get("w")).toBe("1200");
    expect(url.searchParams.get("h")).toBe("630");
    expect(url.pathname).toBe("/photo-test");
  });
});
