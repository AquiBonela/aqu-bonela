import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getMunicipality,
  MUNICIPALITIES,
  resolveMunicipality,
  UnknownMunicipalityError,
  type MunicipalityConfig,
} from "./municipality";

const base = MUNICIPALITIES["casarabonela"]!;
const otro: MunicipalityConfig = {
  ...base,
  id: "alozaina",
  name: "Alozaina",
  appName: "Aquí Alozaina",
  siteUrl: "https://aquialozaina.example",
  coordinates: { lat: 36.728, lng: -4.857, timezone: "Europe/Madrid" },
};
const registry = { casarabonela: base, alozaina: otro };

afterEach(() => vi.unstubAllEnvs());

describe("configuración municipal", () => {
  it("sin variable devuelve Casarabonela con sus valores actuales", () => {
    vi.stubEnv("VITE_MUNICIPALITY_ID", "");
    const m = getMunicipality();
    expect(m.id).toBe("casarabonela");
    expect(m.name).toBe("Casarabonela");
    expect(m.appName).toBe("Aquí Bonela");
    expect(m.siteUrl).toBe("https://bonela-local-finds.lovable.app");
    expect(m.coordinates).toEqual({ lat: 36.786, lng: -4.843, timezone: "Europe/Madrid" });
  });

  it("con identificador válido devuelve ese municipio, sus coordenadas y URL", () => {
    const m = resolveMunicipality("alozaina", registry);
    expect(m.name).toBe("Alozaina");
    expect(m.siteUrl).toBe("https://aquialozaina.example");
    expect(m.coordinates.lat).toBe(36.728);
    expect(m.coordinates.lng).toBe(-4.857);
  });

  it("con identificador desconocido lanza un error explícito", () => {
    vi.stubEnv("VITE_MUNICIPALITY_ID", "inexistente");
    expect(() => getMunicipality()).toThrow(UnknownMunicipalityError);
    expect(() => getMunicipality()).toThrow(/inexistente/);
  });

  it("no acepta claves heredadas del prototipo", () => {
    expect(() => resolveMunicipality("toString", registry)).toThrow(UnknownMunicipalityError);
  });
});
