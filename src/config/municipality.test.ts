import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getMunicipalityThemeCss,
  InvalidThemeValueError,
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

function cssBlock(selector: string): Record<string, string> {
  const css = readFileSync("src/styles.css", "utf8");
  const start = css.indexOf(`\n${selector} {`);
  const body = css.slice(start, css.indexOf("}", start));
  const vars: Record<string, string> = {};
  for (const m of body.matchAll(/(--[\w-]+):\s*([^;]+);/g)) vars[m[1]!] = m[2]!.trim();
  return vars;
}
function generated(part: "light" | "dark"): Record<string, string> {
  const css = getMunicipalityThemeCss(base.theme);
  const re = part === "light" ? /^html:root\{([^}]*)\}/ : /html\.dark,html \.dark\{([^}]*)\}$/;
  const vars: Record<string, string> = {};
  for (const d of re.exec(css)![1]!.split(";").filter(Boolean)) {
    const i = d.indexOf(":");
    vars[d.slice(0, i)] = d.slice(i + 1);
  }
  return vars;
}

describe("tema municipal", () => {
  it("Casarabonela en modo claro coincide exactamente con :root de styles.css", () => {
    const root = cssBlock(":root");
    const light = generated("light");
    expect(Object.keys(light)).toHaveLength(12);
    for (const [k, v] of Object.entries(light)) expect(v).toBe(root[k]);
    expect(light["--primary"]).toBe("oklch(0.493 0.052 127.4)");
    expect(light["--terracotta"]).toBe("oklch(0.564 0.106 42.4)");
  });

  it("Casarabonela en modo oscuro coincide exactamente con .dark de styles.css", () => {
    const dark = cssBlock(".dark");
    const gen = generated("dark");
    expect(Object.keys(gen)).toHaveLength(8);
    for (const [k, v] of Object.entries(gen)) expect(v).toBe(dark[k]);
  });

  it("theme-color se mantiene en #faf6ee", () => {
    expect(base.theme.themeColor).toBe("#faf6ee");
  });

  it("otro municipio puede definir una paleta distinta", () => {
    const css = getMunicipalityThemeCss({
      ...base.theme,
      light: { ...base.theme.light, primary: "oklch(0.5 0.1 250)" },
    });
    expect(css).toContain("--primary:oklch(0.5 0.1 250);");
  });

  it("rechaza CSS arbitrario en un color", () => {
    expect(() =>
      getMunicipalityThemeCss({
        ...base.theme,
        light: { ...base.theme.light, primary: "red;}body{display:none" },
      }),
    ).toThrow(InvalidThemeValueError);
  });

  it("rechaza un theme-color que no sea #rrggbb", () => {
    expect(() => getMunicipalityThemeCss({ ...base.theme, themeColor: "blue" })).toThrow(
      InvalidThemeValueError,
    );
  });

  it("rechaza un token ausente sin usar colores alternativos", () => {
    const { sand: _omit, ...rest } = base.theme.light;
    expect(() =>
      getMunicipalityThemeCss({ ...base.theme, light: rest as typeof base.theme.light }),
    ).toThrow(/light\.sand/);
  });
});
