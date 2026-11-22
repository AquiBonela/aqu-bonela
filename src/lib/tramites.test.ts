import { describe, it, expect } from "vitest";
import { buscarTramites, CATEGORIAS, DESTACADOS, TRAMITES, TRAMITE_TAGS, TAG_LABEL, getTramite } from "./tramites";

describe("guía de trámites", () => {
  it("la TIE requiere tasa y combina cita online con asistencia presencial", () => {
    const tramite = getTramite("documentacion", "tie");
    expect(tramite?.tags).toEqual(["online", "presencial"]);
    expect(tramite?.guia?.costeImporte).toBe("Tasa oficial vigente");
    expect(tramite?.primaryAction?.url).toBe("https://sede.administracionespublicas.gob.es/pagina/index/directorio/icpplus");
    expect(tramite?.guia?.pasos).toHaveLength(5);
    expect(tramite?.necesitas).toContain("Formulario EX-17: cumplimentado y firmado.");
  });
  it("solo admite etiquetas de gratuidad, tasa y modalidad, nunca de lugar", () => {
    expect(Object.keys(TAG_LABEL).sort()).toEqual(["gratis", "online", "presencial", "tasa"]);
    expect(TAG_LABEL.tasa).toBe("Con tasa");
    for (const tramite of TRAMITES) {
      for (const tag of tramite.tags ?? []) expect(TRAMITE_TAGS).toContain(tag);
    }
    expect(getTramite("documentacion", "nie")?.tags).toEqual(["presencial"]);
    expect(getTramite("documentacion", "empadronamiento")?.tags).toEqual(["gratis", "presencial"]);
  });
  it("Cl@ve es gratuito tanto online como presencialmente", () => {
    const tramite = getTramite("documentacion", "clave");
    expect(tramite?.guia?.costeImporte).toBe("0 €");
    expect(tramite?.tags).toEqual(["gratis", "online", "presencial"]);
  });
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
  it("el alta y cambio de domicilio en el padrón son gratuitos", () => {
    const tramite = getTramite("documentacion", "empadronamiento");
    expect(tramite?.guia?.costeImporte).toBe("0 €");
    expect(tramite?.tags).toContain("gratis");
  });
});
