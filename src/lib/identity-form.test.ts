import { describe, expect, it } from "vitest";
import { getBuildMunicipality } from "@/config/municipality";
import {
  formFromRow,
  identityErrorMessage,
  identityFallbacks,
  identityPlaceholders,
  validateIdentityForm,
  type IdentityForm,
  type IdentityFormField,
  type IdentityRow,
} from "./identity-form";
import { mergeIdentity, parseSiteConfig } from "./site-identity";

const row: IdentityRow = {
  app_name: "Mi Pueblo",
  short_name: "Pueblo",
  municipality_name: "Villaprueba",
  province: "Provincia Prueba",
  region: "",
  autonomous_community: "",
  demonym_masculine: "",
  demonym_feminine: "",
  site_url: "",
  town_hall_name: "",
  town_hall_address: "",
  town_hall_phone: "",
  town_hall_website: "",
  latitude: null,
  longitude: null,
  timezone: "",
  updated_at: "2026-11-27T10:00:00.123456+00:00",
};

const form = (changes: Partial<IdentityForm> = {}): IdentityForm => ({
  ...formFromRow(row),
  ...changes,
});

function errorsOf(changes: Partial<IdentityForm>) {
  const result = validateIdentityForm(form(changes));
  return result.ok ? {} : result.errors;
}

describe("formulario de identidad municipal", () => {
  it("convierte la fila guardada en campos de texto", () => {
    expect(formFromRow({ ...row, latitude: 36.78, longitude: -4.85 })).toMatchObject({
      municipality_name: "Villaprueba",
      latitude: "36.78",
      longitude: "-4.85",
    });
  });

  it("devuelve todos los campos editables, sin la fecha ni el autor", () => {
    const result = validateIdentityForm(form({ municipality_name: "  Villaprueba  " }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.values.municipality_name).toBe("Villaprueba");
    expect(Object.keys(result.values).sort()).toEqual(
      [
        "app_name",
        "autonomous_community",
        "demonym_feminine",
        "demonym_masculine",
        "latitude",
        "longitude",
        "municipality_name",
        "province",
        "region",
        "short_name",
        "site_url",
        "timezone",
        "town_hall_address",
        "town_hall_name",
        "town_hall_phone",
        "town_hall_website",
      ].sort(),
    );
    expect(result.values).not.toHaveProperty("updated_at");
    expect(result.values).not.toHaveProperty("updated_by");
  });

  it("permite dejar campos vacíos para usar los valores de la instalación", () => {
    const empty = Object.fromEntries(
      Object.keys(form()).map((key) => [key, ""]),
    ) as unknown as IdentityForm;
    const result = validateIdentityForm(empty);
    expect(result).toMatchObject({ ok: true, values: { latitude: null, longitude: null } });
  });

  it("rechaza las mismas longitudes que la base de datos", () => {
    expect(errorsOf({ short_name: "x".repeat(31) }).short_name).toBe("Máximo 30 caracteres.");
    expect(errorsOf({ short_name: "x".repeat(30) }).short_name).toBeUndefined();
  });

  it.each(["<b>Pueblo</b>", "Pueblo {app}", "Línea\nnueva"])("rechaza texto inseguro: %j", (v) => {
    expect(errorsOf({ municipality_name: v }).municipality_name).toMatch(/< > \{ \}/);
  });

  it("normaliza la dirección pública y rechaza rutas o http", () => {
    const result = validateIdentityForm(form({ site_url: " https://Ejemplo.ES/ " }));
    expect(result.ok && result.values.site_url).toBe("https://ejemplo.es");
    expect(errorsOf({ site_url: "https://ejemplo.es/ruta" }).site_url).toMatch(/sin rutas/);
    expect(errorsOf({ site_url: "http://ejemplo.es" }).site_url).toMatch(/https/);
  });

  it("valida teléfono y web del Ayuntamiento", () => {
    expect(errorsOf({ town_hall_name: "Ayto.", town_hall_phone: "952 00 00 00" })).toEqual({});
    expect(
      errorsOf({ town_hall_name: "Ayto.", town_hall_phone: "952-000" }).town_hall_phone,
    ).toMatch(/números/);
    expect(
      errorsOf({ town_hall_name: "Ayto.", town_hall_website: "www.ayto.es" }).town_hall_website,
    ).toMatch(/https/);
  });

  it("pide el nombre del Ayuntamiento si hay otros datos institucionales", () => {
    expect(errorsOf({ town_hall_phone: "952000000" }).town_hall_name).toMatch(/Ayuntamiento/);
  });

  it("acepta coma decimal y redondea a cinco decimales", () => {
    const result = validateIdentityForm(
      form({ latitude: "36,7851234", longitude: "-4.8512", timezone: "Europe/Madrid" }),
    );
    expect(result).toMatchObject({ ok: true, values: { latitude: 36.78512, longitude: -4.8512 } });
  });

  it("exige las dos coordenadas y su zona horaria", () => {
    expect(errorsOf({ latitude: "36.7" }).longitude).toMatch(/latitud y longitud/);
    expect(errorsOf({ latitude: "36.7", longitude: "-4.8" }).timezone).toMatch(/zona horaria/);
    expect(errorsOf({ latitude: "91", longitude: "0", timezone: "UTC" }).latitude).toMatch(/-90/);
    expect(errorsOf({ latitude: "norte", longitude: "0" }).latitude).toBeDefined();
  });

  it("no admite una zona horaria sin coordenadas, porque la web la ignoraría", () => {
    expect(errorsOf({ timezone: "Europe/Madrid" }).timezone).toMatch(/latitud y longitud/);
  });

  it("rechaza zonas horarias inexistentes", () => {
    const withCoordinates = { latitude: "40.5", longitude: "-3.7" };
    expect(errorsOf({ ...withCoordinates, timezone: "Marte/Olimpo" }).timezone).toMatch(
      /no reconocida/,
    );
    expect(errorsOf({ ...withCoordinates, timezone: "Europe/Madrid" }).timezone).toBeUndefined();
  });
});

describe("valores de la instalación en los campos vacíos", () => {
  const build = getBuildMunicipality();
  const blank = Object.fromEntries(
    Object.keys(formFromRow(row)).map((key) => [key, ""]),
  ) as unknown as IdentityForm;

  /**
   * Lo que la web publicará de verdad tras guardar: los valores guardados pasan por la
   * misma lectura pública (parseSiteConfig) y se combinan con la instalación compilada.
   */
  function published(form: IdentityForm): IdentityForm {
    const result = validateIdentityForm(form);
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    return identityFallbacks(
      mergeIdentity(build, parseSiteConfig({ identity: result.values }).identity),
    );
  }

  /** Lo que el formulario anuncia: el valor escrito o, si está vacío, el texto en gris. */
  function announced(form: IdentityForm): IdentityForm {
    const placeholders = identityPlaceholders(form, identityFallbacks(build));
    const values = validateIdentityForm(form);
    if (!values.ok) throw new Error("invalid");
    const shown = {} as IdentityForm;
    for (const name of Object.keys(form) as IdentityFormField[]) {
      const value = values.values[name];
      shown[name] =
        value === null || value === undefined || value === "" ? placeholders[name] : String(value);
    }
    return shown;
  }

  it("la instalación de prueba tiene datos en todos los bloques", () => {
    // Si no los tuviera, las comprobaciones siguientes no demostrarían nada.
    expect(build.institutional?.townHallName).toBeTruthy();
    expect(build.demonym?.masculine).toBeTruthy();
    expect(build.coordinates).toBeDefined();
  });

  it.each<[string, Partial<IdentityForm>]>([
    ["todo vacío", {}],
    ["solo el nombre del municipio", { municipality_name: "Villaprueba" }],
    [
      "Ayuntamiento con nombre y teléfono",
      { town_hall_name: "Ayto. Prueba", town_hall_phone: "900 000 000" },
    ],
    ["solo el gentilicio femenino", { demonym_feminine: "pruebense" }],
    ["coordenadas completas", { latitude: "40,5", longitude: "-3.7", timezone: "Europe/Madrid" }],
  ])("anuncia lo que se publicará: %s", (_case, changes) => {
    const form = { ...blank, ...changes };
    expect(announced(form)).toEqual(published(form));
  });

  it("no anuncia datos de la instalación en un bloque del Ayuntamiento ya empezado", () => {
    const placeholders = identityPlaceholders(
      { ...blank, town_hall_name: "Ayto. Prueba" },
      identityFallbacks(build),
    );
    expect(placeholders.town_hall_address).toBe("");
    expect(placeholders.town_hall_website).toBe("");
  });
});

describe("mensajes de error de la identidad", () => {
  it.each([
    [{ code: "PGRST205" }, /migración/],
    [{ code: "42501" }, /permiso/],
    [{ code: "PGRST303" }, /sesión/],
    [{ code: "23514", message: "Zona horaria no válida: X" }, /zona horaria/],
    [{ code: "23514", message: "violates check constraint" }, /formato admitido/],
    [{}, /conexión/],
  ])("%j", (error, expected) => {
    expect(identityErrorMessage(error)).toMatch(expected);
  });
});
