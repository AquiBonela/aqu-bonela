import { describe, expect, it } from "vitest";
import {
  bannerCodec,
  headerCodec,
  homeTextsCodec,
  legalCodec,
  menuCodec,
  sectionsCodec,
  shortcutsCodec,
  validateBanner,
  validateHeader,
  validateHomeTexts,
  validateLegal,
  validateShortcut,
} from "./content-codecs";
import { identityCodec } from "./identity-draft";
import { MENU_ENTRIES, PAGE_SECTIONS } from "./site-structure";

describe("borradores de textos", () => {
  it("escriben exactamente las claves que valida la base, sin espacios sobrantes", () => {
    expect(homeTextsCodec.write({ hero_title: " Título ", hero_subtitle: "" })).toEqual({
      hero_title: "Título",
      hero_subtitle: "",
    });
    expect(bannerCodec.write({ banner_enabled: true, banner_text: " Aviso " })).toEqual({
      banner_enabled: true,
      banner_text: "Aviso",
    });
    expect(Object.keys(legalCodec.write(legalCodec.read({})) as object).sort()).toEqual([
      "legal_address",
      "legal_email",
      "legal_name",
      "legal_nif",
    ]);
  });

  it("leen lo que falta como vacío y nunca fallan", () => {
    expect(homeTextsCodec.read(null)).toEqual({ hero_title: "", hero_subtitle: "" });
    expect(bannerCodec.read({ banner_enabled: "sí" }).banner_enabled).toBe(false);
  });

  it("validan como la base: obligatorios, longitudes, HTML y correo", () => {
    expect(validateHomeTexts({ hero_title: "", hero_subtitle: "" }).hero_title).toBeDefined();
    expect(validateHomeTexts({ hero_title: "Hola {municipio}", hero_subtitle: "" })).toEqual({});
    expect(
      validateHomeTexts({ hero_title: "<b>x</b>", hero_subtitle: "" }).hero_title,
    ).toBeDefined();
    expect(validateBanner({ banner_enabled: true, banner_text: " " }).banner_text).toBeDefined();
    expect(validateBanner({ banner_enabled: false, banner_text: "" })).toEqual({});
    expect(
      validateLegal({ legal_name: "", legal_nif: "", legal_address: "", legal_email: "no" })
        .legal_email,
    ).toBeDefined();
    expect(
      validateLegal({ legal_name: "A {b}", legal_nif: "", legal_address: "", legal_email: "" })
        .legal_name,
    ).toBeDefined();
  });
});

describe("menú y secciones", () => {
  it("el menú lista siempre todas las entradas, en el orden publicado, y numera al escribir", () => {
    const menu = menuCodec.read({
      entries: [
        { key: "descubre", enabled: false, sort_order: 0 },
        { key: "servicios-publicos", enabled: true, sort_order: 1 },
        { key: "guia-tramites", enabled: true, sort_order: 5 },
      ],
    });
    // Como la web: sin fila, cada entrada conserva su posición por defecto.
    expect(menu.map((e) => e.key)).toEqual([
      "descubre",
      "servicios-publicos",
      "actualidad",
      "guia-tramites",
    ]);
    expect(menu).toHaveLength(MENU_ENTRIES.length);
    expect(menu.find((e) => e.key === "descubre")?.enabled).toBe(false);
    expect(menuCodec.write(menu)).toEqual({
      entries: menu.map((e, i) => ({ key: e.key, enabled: e.enabled, sort_order: i })),
    });
  });

  it("nunca escribe el Directorio ni la Portada", () => {
    const written = JSON.stringify(
      menuCodec.write(menuCodec.read({ entries: [{ key: "directorio", enabled: false }] })),
    );
    expect(written).not.toContain("directorio");
  });

  it("las secciones de cada página son las del catálogo común", () => {
    const sections = sectionsCodec("descubre").read({
      sections: [{ key: "otra", enabled: false }],
    });
    expect(sections.map((s) => s.key).sort()).toEqual([...PAGE_SECTIONS.descubre].sort());
  });
});

describe("accesos directos", () => {
  const base = {
    id: "",
    localId: "nuevo-1",
    title: "Piscina",
    description: "",
    image_path: "accesos/bb000000-0000-4000-8000-000000000001.webp",
    image_alt: "Piscina municipal",
    href: "/servicios-publicos",
    visible: true,
  };

  it("un acceso nuevo no envía identificador; los existentes, sí; el orden es la posición", () => {
    const written = shortcutsCodec.write([
      base,
      { ...base, id: "bb000000-0000-4000-8000-000000000009" },
    ]) as {
      shortcuts: Record<string, unknown>[];
    };
    expect(written.shortcuts[0]).not.toHaveProperty("id");
    expect(written.shortcuts[1]).toMatchObject({
      id: "bb000000-0000-4000-8000-000000000009",
      sort_order: 1,
    });
    expect(written.shortcuts[0]).not.toHaveProperty("localId");
  });

  it("valida destino, imagen y texto alternativo", () => {
    expect(validateShortcut(base)).toEqual({});
    expect(validateShortcut({ ...base, href: "//otra.web" }).href).toBeDefined();
    expect(validateShortcut({ ...base, href: "http://inseguro.es" }).href).toBeDefined();
    expect(validateShortcut({ ...base, href: "https://ejemplo.es/feria" })).toEqual({});
    expect(validateShortcut({ ...base, image_path: "" }).image_path).toBeDefined();
    // Una imagen elegida que se subirá al guardar cuenta como imagen, y pide su texto alternativo.
    expect(validateShortcut({ ...base, image_path: "", image_alt: "" }, true)).toEqual({
      image_alt: "Campo obligatorio.",
    });
  });
});

describe("cabecera de página", () => {
  it("sin imagen publicada, el borrador es «quitar»; con imagen, su encuadre y texto", () => {
    expect(headerCodec.read({})).toEqual({ remove: true });
    expect(headerCodec.write({ remove: true })).toEqual({ remove: true });
    const header = headerCodec.read({
      image_path: "cabeceras/inicio/a.webp",
      image_small_path: "cabeceras/inicio/a-movil.webp",
      alt: "Plaza",
      focal_x: 30.4,
      focal_y: 200,
    });
    expect(header).toMatchObject({ focal_x: 30, focal_y: 50 });
    expect(validateHeader({ ...(header as object), alt: "" } as never)).toBeDefined();
  });
});

describe("identidad", () => {
  const published = {
    app_name: "Mi Pueblo",
    municipality_name: "Villaprueba",
    site_url: "https://ejemplo.es",
    latitude: 40.4,
    longitude: -3.7,
    timezone: "Europe/Madrid",
    logo_path: "identidad/x/logo.webp",
  };

  it("lee lo publicado y lo vuelve a escribir igual (sin cambios aparentes)", () => {
    const value = identityCodec.read(published);
    expect(value.form.latitude).toBe("40.4");
    expect(identityCodec.write(value)).toMatchObject({
      app_name: "Mi Pueblo",
      latitude: 40.4,
      logo_path: "identidad/x/logo.webp",
    });
    expect(JSON.stringify(identityCodec.write(identityCodec.read(published)))).toBe(
      JSON.stringify(identityCodec.write(value)),
    );
  });

  it("normaliza como al publicar: dirección sin barra final y colores en minúsculas", () => {
    const value = identityCodec.read(published);
    value.form.site_url = "https://EJEMPLO.es/";
    value.form.primary_color = "#1F4E79";
    expect(identityCodec.write(value)).toMatchObject({
      site_url: "https://ejemplo.es",
      primary_color: "#1f4e79",
    });
  });
});
