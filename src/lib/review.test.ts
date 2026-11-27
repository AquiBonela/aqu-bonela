import { describe, expect, it } from "vitest";
import {
  authorizedContactFields,
  reviewMessage,
  TOKEN_RE,
  whatsappShareUrl,
  type ReviewVisibility,
} from "./review";

describe("enlace de revisión", () => {
  it("el mensaje incluye el enlace y el nombre del titular", () => {
    const m = reviewMessage("Paco", "https://x.test/revision/abc");
    expect(m).toContain("Paco");
    expect(m).toContain("https://x.test/revision/abc");
  });

  it("el mensaje funciona sin nombre del titular", () => {
    expect(reviewMessage(null, "https://x.test/revision/abc")).toContain("Hola:");
  });

  it("el enlace de WhatsApp usa el teléfono del titular cuando es válido", () => {
    expect(whatsappShareUrl("hola", "+34 600 123 456")).toContain(
      "https://wa.me/34600123456?text=",
    );
  });

  it("sin teléfono válido, WhatsApp deja elegir el contacto", () => {
    expect(whatsappShareUrl("hola", "paco@ejemplo.es")).toBe(
      `https://wa.me/?text=${encodeURIComponent("hola")}`,
    );
    expect(whatsappShareUrl("hola", null)).toBe(
      `https://wa.me/?text=${encodeURIComponent("hola")}`,
    );
  });

  it("los tokens del enlace tienen formato válido", () => {
    expect(TOKEN_RE.test("aB_-".repeat(11) + "a")).toBe(true);
    expect(TOKEN_RE.test("abc")).toBe(false);
    expect(TOKEN_RE.test("a+b".repeat(20))).toBe(false);
  });
});

describe("plantilla configurable", () => {
  it("rellena {nombre} y {enlace}", () => {
    expect(reviewMessage("Paco", "https://x/r/1", "Hola {nombre}, revisa: {enlace}")).toBe(
      "Hola Paco, revisa: https://x/r/1",
    );
  });
  it("sin nombre quita el hueco y añade el enlace si falta", () => {
    expect(reviewMessage(null, "https://x/r/1", "Hola {nombre}, revisa tu ficha")).toBe(
      "Hola, revisa tu ficha https://x/r/1",
    );
  });
});

describe("visibilidad de contactos en la revisión", () => {
  const hidden: ReviewVisibility = {
    show_phone: false,
    show_phone_2: false,
    show_whatsapp: false,
    show_address: false,
    show_email: false,
    show_linkedin: false,
    show_facebook: false,
    show_youtube: false,
    show_x_twitter: false,
    show_instagram: false,
    show_tiktok: false,
    show_hours: false,
  };

  it.each([
    ["show_phone_2", "segundo teléfono"],
    ["show_linkedin", "linkedin"],
    ["show_facebook", "facebook"],
    ["show_youtube", "youtube"],
    ["show_x_twitter", "x_twitter"],
    ["show_instagram", "instagram"],
    ["show_tiktok", "tiktok"],
  ] as const)("autoriza únicamente %s cuando su marcador está activo", (flag, label) => {
    expect(authorizedContactFields({ ...hidden, [flag]: true })).toEqual([label]);
  });

  it("no autoriza ningún contacto cuando todos los marcadores están ocultos", () => {
    expect(authorizedContactFields(hidden)).toEqual([]);
  });
});
