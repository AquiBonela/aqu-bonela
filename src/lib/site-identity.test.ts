import { afterEach, describe, expect, it, vi } from "vitest";
import instance from "@instance";
import {
  mergeIdentity,
  parseSiteConfig,
  readBrowserSiteConfig,
  siteConfigScript,
} from "./site-identity";

const row = {
  app_name: "Plataforma Prueba",
  short_name: "Prueba",
  municipality_name: "Villa de Prueba",
  province: "Provincia Prueba",
  region: "Comarca Prueba",
  autonomous_community: "Comunidad Prueba",
  demonym_masculine: "villano",
  demonym_feminine: "villana",
  site_url: "https://villa-prueba.example.org",
  town_hall_name: "Ayuntamiento de Villa de Prueba",
  town_hall_address: "Plaza Mayor, 1",
  town_hall_phone: "+34 900 000 000",
  town_hall_website: "https://ayuntamiento.example.org/",
  latitude: 40.4168,
  longitude: -3.7038,
  timezone: "Europe/Madrid",
  updated_at: "2026-11-27T10:00:00Z",
};

afterEach(() => {
  vi.restoreAllMocks();
  delete window.__SITE_CONFIG__;
});

describe("parseSiteConfig", () => {
  it("convierte todos los campos de site_config()", () => {
    expect(parseSiteConfig({ identity: row }).identity).toEqual({
      appName: "Plataforma Prueba",
      shortName: "Prueba",
      name: "Villa de Prueba",
      province: "Provincia Prueba",
      region: "Comarca Prueba",
      autonomousCommunity: "Comunidad Prueba",
      siteUrl: "https://villa-prueba.example.org",
      demonym: { masculine: "villano", feminine: "villana" },
      institutional: {
        townHallName: "Ayuntamiento de Villa de Prueba",
        address: "Plaza Mayor, 1",
        phone: "+34 900 000 000",
        website: "https://ayuntamiento.example.org/",
      },
      coordinates: { lat: 40.4168, lng: -3.7038, timezone: "Europe/Madrid" },
    });
  });

  it("una fila recién creada (todo vacío) no sustituye nada", () => {
    const empty = Object.fromEntries(
      Object.keys(row).map((k) => [k, k === "latitude" || k === "longitude" ? null : ""]),
    );
    expect(parseSiteConfig({ identity: empty }).identity).toEqual({});
  });

  it("respuestas ausentes o con otra forma equivalen a «sin configurar»", () => {
    for (const raw of [null, undefined, [], "x", { identity: null }, { identity: [] }, {}]) {
      expect(parseSiteConfig(raw).identity).toEqual({});
    }
  });

  it("descarta valores no válidos y avisa, sin perder el resto", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { identity } = parseSiteConfig({
      identity: {
        ...row,
        app_name: "<b>Hola</b>",
        short_name: "Pueblo {app}",
        municipality_name: "x".repeat(81),
        province: "Línea\nnueva",
        site_url: "https://villa-prueba.example.org/ruta",
        town_hall_phone: "llamar",
        latitude: 200,
      },
    });
    expect(identity.appName).toBeUndefined();
    expect(identity.shortName).toBeUndefined();
    expect(identity.name).toBeUndefined();
    expect(identity.province).toBeUndefined();
    expect(identity.siteUrl).toBeUndefined();
    expect(identity.coordinates).toBeUndefined();
    expect(identity.institutional?.phone).toBe("");
    expect(identity.region).toBe("Comarca Prueba");
    expect(warn).toHaveBeenCalledOnce();
    expect(String(warn.mock.calls[0]?.[0])).toMatch(
      /app_name.*short_name.*municipality_name.*province.*site_url.*town_hall_phone.*latitude/,
    );
  });

  it("rechaza URLs sin https, con barra final o con mayúsculas", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const site_url of [
      "http://villa.example.org",
      "https://villa.example.org/",
      "https://Villa.example.org",
      "https://localhost",
    ]) {
      expect(parseSiteConfig({ identity: { site_url } }).identity.siteUrl).toBeUndefined();
    }
    expect(
      parseSiteConfig({ identity: { site_url: "https://villa.example.org:8443" } }).identity
        .siteUrl,
    ).toBe("https://villa.example.org:8443");
  });

  it("las coordenadas necesitan latitud, longitud y zona horaria; admite numéricos en texto", () => {
    expect(
      parseSiteConfig({ identity: { latitude: 40, longitude: -3 } }).identity.coordinates,
    ).toBeUndefined();
    expect(
      parseSiteConfig({ identity: { latitude: 40, timezone: "Europe/Madrid" } }).identity
        .coordinates,
    ).toBeUndefined();
    expect(
      parseSiteConfig({
        identity: { latitude: "40.5", longitude: "-3.25", timezone: "Europe/Madrid" },
      }).identity.coordinates,
    ).toEqual({ lat: 40.5, lng: -3.25, timezone: "Europe/Madrid" });
  });

  it("un gentilicio incompleto se completa con el otro; el Ayuntamiento necesita nombre", () => {
    expect(
      parseSiteConfig({ identity: { demonym_masculine: "villano" } }).identity.demonym,
    ).toEqual({ masculine: "villano", feminine: "villano" });
    expect(
      parseSiteConfig({ identity: { town_hall_address: "Plaza Mayor, 1" } }).identity.institutional,
    ).toBeUndefined();
  });

  it("recorta espacios", () => {
    expect(parseSiteConfig({ identity: { app_name: "  Plataforma  " } }).identity.appName).toBe(
      "Plataforma",
    );
  });
});

describe("mergeIdentity", () => {
  it("sustituye solo la identidad: id, claves técnicas, tema y recursos siguen siendo los del build", () => {
    const merged = mergeIdentity(instance, parseSiteConfig({ identity: row }).identity);
    expect(merged.appName).toBe("Plataforma Prueba");
    expect(merged.name).toBe("Villa de Prueba");
    expect(merged.id).toBe(instance.id);
    expect(merged.storagePrefix).toBe(instance.storagePrefix);
    expect(merged.theme).toBe(instance.theme);
    expect(merged.assets).toBe(instance.assets);
  });

  it("sin sustituciones devuelve los valores compilados", () => {
    expect(mergeIdentity(instance, {})).toEqual(instance);
  });
});

describe("script de configuración", () => {
  it("no permite cerrar el <script> ni romper la línea", () => {
    const script = siteConfigScript({
      identity: { appName: "</script><script>alert(1)</script>\u2028" },
    });
    expect(script).not.toContain("</script>");
    expect(script).not.toContain("\u2028");
    expect(script.startsWith("window.__SITE_CONFIG__=")).toBe(true);
  });

  it("el navegador recupera exactamente lo que serializó el servidor", () => {
    const config = parseSiteConfig({ identity: row });
    new Function(siteConfigScript(config))();
    expect(readBrowserSiteConfig()).toEqual(config);
  });

  it("sin script en la página no hay configuración del navegador", () => {
    expect(readBrowserSiteConfig()).toBeUndefined();
    window.__SITE_CONFIG__ = "x" as never;
    expect(readBrowserSiteConfig()).toBeUndefined();
  });
});
