import { describe, it, expect } from "vitest";
import { buscarTramites, CATEGORIAS, DESTACADOS, TRAMITES, getTramite } from "./tramites";

describe("guía de trámites", () => {
  it("tiene 6 categorías", () => expect(CATEGORIAS).toHaveLength(6));
  it("los 4 destacados existen", () => {
    expect(DESTACADOS).toHaveLength(4);
    for (const s of DESTACADOS) expect(TRAMITES.some((t) => t.slug === s)).toBe(true);
  });
  it("cada trámite pertenece a una categoría existente", () => {
    for (const t of TRAMITES) expect(CATEGORIAS.some((c) => c.slug === t.cat)).toBe(true);
  });
  it("busca sin tildes", () => expect(buscarTramites("padron").length + buscarTramites("empadronamiento").length).toBeGreaterThan(0));
  it("el certificado digital está en documentación", () => expect(getTramite("documentacion", "certificado-digital")).toBeTruthy());
});
