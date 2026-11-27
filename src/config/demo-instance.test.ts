import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import demo from "../../instances/demo/config";
import demoContent from "../../instances/demo/content";
import { DEFAULT_MUNICIPALITY_ID } from "../../instances/schema";
import casarabonelaContent from "../../instances/casarabonela/content";
import { emergencyGroupsFor } from "@/lib/emergency-phones";
import { dailyLifeCategories } from "@/lib/vida-diaria";
import { brand, unbrand, validateMunicipalityTheme } from "./municipality";

/** Términos que identifican al municipio piloto y nunca deben aparecer en la demo. */
const PILOT_TERMS =
  /casarabonela|bonela|m[aá]laga|alozaina|sierra de las nieves|guadalhorce|punto vuela|l[ií]nea verde|buenavista|952\s?\d{3}/i;

function filesIn(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? filesIn(join(dir, e.name)) : [join(dir, e.name)],
  );
}

describe("instancia demo", () => {
  it("es la instancia predeterminada", () => {
    expect(DEFAULT_MUNICIPALITY_ID).toBe("demo");
  });

  it("no contiene datos del municipio piloto", () => {
    expect(JSON.stringify(demo)).not.toMatch(PILOT_TERMS);
    expect(JSON.stringify(demoContent)).not.toMatch(PILOT_TERMS);
    for (const file of filesIn("instances/demo").filter((f) => /\.(ts|webmanifest|txt)$/.test(f))) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(PILOT_TERMS);
    }
  });

  it("no tiene coordenadas, datos institucionales ni imágenes propias de un lugar", () => {
    expect(demo.coordinates).toBeUndefined();
    expect(demo.institutional).toBeUndefined();
    expect(demo.assets.heroImage).toBeUndefined();
    expect(demo.assets.logoHome).toBeUndefined();
  });

  it("tiene un tema válido y sus iconos públicos", () => {
    expect(() => validateMunicipalityTheme(demo.theme)).not.toThrow();
    const a = demo.assets;
    for (const path of [a.favicon, a.appleTouchIcon, a.pwaIcons.icon192, a.pwaIcons.icon512]) {
      expect(existsSync(`instances/demo/public${path}`), path).toBe(true);
    }
  });

  it("su contenido está vacío: las secciones se ocultan", () => {
    expect(demoContent).toEqual({});
  });

  it("en SOS solo muestra teléfonos nacionales", () => {
    const phones = emergencyGroupsFor(demoContent).flatMap((g) => g.phones.map((p) => p.tel));
    expect(phones).toEqual(["062", "061", "016", "024", "915620420"]);
  });

  it("Casarabonela conserva su lista SOS con los teléfonos locales y regionales", () => {
    const phones = emergencyGroupsFor(casarabonelaContent).flatMap((g) =>
      g.phones.map((p) => p.tel),
    );
    expect(phones).toEqual([
      "062",
      "952456665",
      "061",
      "955545060",
      "016",
      "024",
      "900845040",
      "915620420",
    ]);
  });

  it("oculta Vida diaria, Descubre, servicios locales y plantillas de trámites", () => {
    expect(dailyLifeCategories(demoContent)).toEqual([]);
    expect(demoContent.discover).toBeUndefined();
    expect(demoContent.publicServices).toBeUndefined();
    expect(demoContent.procedures).toBeUndefined();
    expect(demoContent.home).toBeUndefined();
  });

  it("Casarabonela conserva su contenido", () => {
    expect(dailyLifeCategories(casarabonelaContent).map((c) => c.id)).toEqual([
      "transporte",
      "residuos",
      "espacios",
      "municipales",
      "educacion",
      "otros",
    ]);
    expect(casarabonelaContent.discover?.places).toHaveLength(6);
    expect(casarabonelaContent.publicServices?.puntoVuela?.slug).toBe("punto-vuela-casarabonela");
    expect(casarabonelaContent.procedures?.templates.length).toBeGreaterThan(0);
    expect(casarabonelaContent.home?.stats).toHaveLength(3);
  });

  it("personaliza y recupera los textos con su propio nombre", () => {
    const text = "{app} no realiza trámites en {municipio} ({provincia}). Únete a {nombreCorto}.";
    const branded = brand(text, demo);
    expect(branded).toBe(
      "Conecta tu Pueblo Demo no realiza trámites en Municipio de ejemplo (Provincia de ejemplo). Únete a Conecta tu Pueblo.",
    );
    expect(unbrand(branded, demo)).toBe(text);
  });
});
