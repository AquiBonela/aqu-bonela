import { describe, expect, it } from "vitest";
import { fitSize, gallerySlots, validateImage } from "./listing-images";

describe("imágenes de fichas", () => {
  it("permite cinco fotos de galería y ninguna sexta, contando las antiguas", () => {
    expect(gallerySlots(0)).toBe(5);
    expect(gallerySlots(4)).toBe(1);
    expect(gallerySlots(5)).toBe(0);
    expect(gallerySlots(6)).toBe(0);
  });
  it("rechaza formatos distintos de jpg/png/webp", () => {
    expect(validateImage({ type: "image/gif", size: 100 })).not.toBeNull();
    expect(validateImage({ type: "image/png", size: 100 })).toBeNull();
  });
  it("rechaza más de 8 MB", () => {
    expect(validateImage({ type: "image/jpeg", size: 8 * 1024 * 1024 + 1 })).not.toBeNull();
    expect(validateImage({ type: "image/jpeg", size: 8 * 1024 * 1024 })).toBeNull();
  });
  it("lado largo máximo 1600 px", () => {
    expect(fitSize(4000, 2000)).toEqual({ width: 1600, height: 800 });
    expect(fitSize(800, 600)).toEqual({ width: 800, height: 600 });
  });
});
