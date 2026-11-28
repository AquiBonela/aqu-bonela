import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import instance from "@instance";
import {
  brand,
  brandParams,
  getBuildMunicipality,
  getMunicipality,
  getSiteConfigSnapshot,
  setSiteConfig,
  unbrand,
} from "./municipality";

afterEach(() => {
  setSiteConfig({ identity: {} });
  delete window.__SITE_CONFIG__;
});

describe("identidad en tiempo de ejecución", () => {
  // Primera prueba del archivo: el módulo aún no ha recibido configuración.
  it("en el navegador toma la configuración inyectada en el HTML", () => {
    window.__SITE_CONFIG__ = {
      identity: { appName: "Plataforma Prueba", name: "Villa de Prueba" },
    };
    expect(getMunicipality().appName).toBe("Plataforma Prueba");
    expect(getSiteConfigSnapshot()).toEqual({
      identity: { appName: "Plataforma Prueba", name: "Villa de Prueba" },
      branding: {},
      pageHeaders: {},
    });
  });

  it("sin configuración usa la instancia compilada", () => {
    expect(getMunicipality()).toEqual(instance);
    expect(getBuildMunicipality()).toBe(instance);
  });

  it("las variables de marca usan la identidad aplicada, campo a campo", () => {
    setSiteConfig({
      identity: { appName: "Plataforma Prueba", name: "Villa de Prueba", shortName: "Prueba" },
    });
    expect(brandParams()).toEqual({
      app: "Plataforma Prueba",
      municipio: "Villa de Prueba",
      nombreCorto: "Prueba",
      provincia: instance.province,
    });
    expect(brand("{app} · {municipio}")).toBe("Plataforma Prueba · Villa de Prueba");
    expect(unbrand("Bienvenido a Villa de Prueba con Plataforma Prueba")).toBe(
      "Bienvenido a {municipio} con {app}",
    );
    // Lo compilado ya no se reconoce como nombre de la instalación.
    expect(unbrand(`Bienvenido a ${instance.name}`)).toBe(`Bienvenido a ${instance.name}`);
    expect(getMunicipality().storagePrefix).toBe(instance.storagePrefix);
    expect(getBuildMunicipality().appName).toBe(instance.appName);
  });

  it("volver a una configuración vacía restaura los valores compilados", () => {
    setSiteConfig({ identity: { appName: "Plataforma Prueba" } });
    setSiteConfig({ identity: {} });
    expect(getMunicipality().appName).toBe(instance.appName);
  });
});

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) &&
      !/\.test\.tsx?$/.test(entry.name) &&
      entry.name !== "routeTree.gen.ts"
      ? [path]
      : [];
  });
}

describe("ningún módulo congela la identidad al cargarse", () => {
  // Una constante de módulo se calcula antes de leer Supabase: solo se permiten campos que siguen en el build.
  it("las constantes de módulo solo leen campos técnicos de getMunicipality()", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles("src")) {
      readFileSync(file, "utf8")
        .split(/\r?\n/)
        .forEach((line, i) => {
          if (!/^(export\s+)?(const|let|var)\s/.test(line)) return;
          if (
            /getMunicipality\(\)/.test(line) &&
            !/getMunicipality\(\)\.(assets|theme|storagePrefix|id)\b/.test(line)
          )
            offenders.push(`${file}:${i + 1}`);
          if (
            /^(export\s+)?(const|let|var)\s+[\w{}\s,:]+=\s*(brand|brandParams|unbrand)\(/.test(line)
          )
            offenders.push(`${file}:${i + 1}`);
        });
    }
    expect(offenders).toEqual([]);
  });
});
