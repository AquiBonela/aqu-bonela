import { describe, expect, it } from "vitest";
import { reviewMessage, TOKEN_RE, whatsappShareUrl } from "./review";

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
    expect(whatsappShareUrl("hola", "+34 600 123 456")).toContain("https://wa.me/34600123456?text=");
  });

  it("sin teléfono válido, WhatsApp deja elegir el contacto", () => {
    expect(whatsappShareUrl("hola", "paco@ejemplo.es")).toBe(`https://wa.me/?text=${encodeURIComponent("hola")}`);
    expect(whatsappShareUrl("hola", null)).toBe(`https://wa.me/?text=${encodeURIComponent("hola")}`);
  });

  it("los tokens del enlace tienen formato válido", () => {
    expect(TOKEN_RE.test("aB_-".repeat(11) + "a")).toBe(true);
    expect(TOKEN_RE.test("abc")).toBe(false);
    expect(TOKEN_RE.test("a+b".repeat(20))).toBe(false);
  });
});

describe("plantilla configurable", () => {
  it("rellena {nombre} y {enlace}", () => {
    expect(reviewMessage("Paco", "https://x/r/1", "Hola {nombre}, revisa: {enlace}")).toBe("Hola Paco, revisa: https://x/r/1");
  });
  it("sin nombre quita el hueco y añade el enlace si falta", () => {
    expect(reviewMessage(null, "https://x/r/1", "Hola {nombre}, revisa tu ficha")).toBe("Hola, revisa tu ficha https://x/r/1");
  });
});
