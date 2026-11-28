import { describe, expect, it, vi } from "vitest";
import {
  automaticShortcuts,
  isPageVisible,
  isSectionVisible,
  isValidShortcutHref,
  MENU_ENTRIES,
  PAGE_SECTIONS,
  parseSiteStructure,
  productAvailability,
  visibleMenuEntries,
  visibleSections,
  type SiteStructure,
} from "./site-structure";
import { parseSiteConfig, readBrowserSiteConfig, siteConfigScript } from "./site-identity";

const EMPTY: SiteStructure = { menu: {}, sections: {}, shortcuts: [] };
const FULL = productAvailability({ hasDiscover: true, hasDailyLife: true });
const DEMO = productAvailability({ hasDiscover: false, hasDailyLife: false });
const entry = (enabled: boolean, sortOrder = 0) => ({ enabled, sortOrder });

describe("catálogo común", () => {
  it("tiene las páginas configurables y las secciones aprobadas, con diez en Descubre", () => {
    expect(MENU_ENTRIES.map((e) => e.key)).toEqual([
      "servicios-publicos",
      "guia-tramites",
      "actualidad",
      "descubre",
    ]);
    expect(PAGE_SECTIONS["servicios-publicos"]).toEqual([
      "emergencias",
      "vida-cotidiana",
      "tramites",
      "transporte",
    ]);
    expect(PAGE_SECTIONS.actualidad).toEqual(["noticias", "avisos", "agenda", "fiestas"]);
    expect(PAGE_SECTIONS.descubre).toHaveLength(10);
    expect(PAGE_SECTIONS.descubre).toContain("entorno");
    expect(PAGE_SECTIONS.descubre).toContain("rutas-senderos");
  });

  it("ni el Directorio ni la portada son configurables", () => {
    const keys: string[] = MENU_ENTRIES.map((e) => e.key);
    expect(keys).not.toContain("directorio");
    expect(keys).not.toContain("inicio");
    expect(Object.keys(PAGE_SECTIONS)).not.toContain("inicio");
  });
});

describe("valores por defecto (sin configuración publicada)", () => {
  it("la demo muestra Servicios públicos y la Guía de trámites, como hoy, sin Actualidad", () => {
    expect(visibleMenuEntries(EMPTY, DEMO)).toEqual(["servicios-publicos", "guia-tramites"]);
    expect(automaticShortcuts(EMPTY, DEMO)).toEqual(["directorio", "servicios-publicos"]);
  });

  it("con contenido de Descubre, también aparece Descubre", () => {
    expect(visibleMenuEntries(EMPTY, FULL)).toEqual([
      "servicios-publicos",
      "guia-tramites",
      "descubre",
    ]);
    expect(automaticShortcuts(EMPTY, FULL)).toEqual([
      "directorio",
      "servicios-publicos",
      "descubre",
    ]);
  });

  it("Actualidad y Transporte no se muestran aunque estén activos: aún no están disponibles", () => {
    const structure: SiteStructure = {
      ...EMPTY,
      menu: { actualidad: entry(true, 0) },
      sections: { "servicios-publicos": { transporte: entry(true, 0) } },
    };
    expect(visibleMenuEntries(structure, FULL)).not.toContain("actualidad");
    expect(isSectionVisible(structure, FULL, "servicios-publicos", "transporte")).toBe(false);
  });
});

describe("Directorio permanente", () => {
  it("siempre se ve y siempre es el primer acceso directo", () => {
    const structure = parseSiteStructure({
      menu: {
        directorio: { enabled: false, sort_order: 9 },
        "servicios-publicos": { enabled: false, sort_order: 0 },
      },
    });
    expect(structure.menu).toEqual({ "servicios-publicos": entry(false, 0) });
    expect(isPageVisible(structure, FULL, "directorio")).toBe(true);
    expect(automaticShortcuts(structure, FULL)[0]).toBe("directorio");
  });
});

describe("páginas y secciones configuradas", () => {
  it("una página desactivada pierde su entrada y su acceso, y los recupera al reactivarla", () => {
    const off: SiteStructure = { ...EMPTY, menu: { descubre: entry(false, 3) } };
    expect(isPageVisible(off, FULL, "descubre")).toBe(false);
    expect(automaticShortcuts(off, FULL)).not.toContain("descubre");
    const on: SiteStructure = { ...EMPTY, menu: { descubre: entry(true, 3) } };
    expect(automaticShortcuts(on, FULL)).toContain("descubre");
  });

  it("el orden configurado manda en el menú y en los accesos automáticos", () => {
    const structure: SiteStructure = {
      ...EMPTY,
      menu: {
        descubre: entry(true, 0),
        "servicios-publicos": entry(true, 1),
        "guia-tramites": entry(true, 2),
      },
    };
    expect(visibleMenuEntries(structure, FULL)).toEqual([
      "descubre",
      "servicios-publicos",
      "guia-tramites",
    ]);
    expect(automaticShortcuts(structure, FULL)).toEqual([
      "directorio",
      "descubre",
      "servicios-publicos",
    ]);
  });

  it("las secciones se ocultan y se ordenan sin salirse de lo disponible", () => {
    const structure: SiteStructure = {
      ...EMPTY,
      sections: {
        descubre: {
          entorno: entry(true, 0),
          "historia-patrimonio": entry(false, 1),
          miradores: entry(true, 2),
        },
      },
    };
    const sections = visibleSections(structure, FULL, "descubre");
    expect(sections[0]).toBe("entorno");
    expect(sections).not.toContain("historia-patrimonio");
    expect(sections).not.toContain("miradores");
  });

  it("si la página no se ve, ninguna de sus secciones se ve", () => {
    const structure: SiteStructure = { ...EMPTY, menu: { "servicios-publicos": entry(false, 0) } };
    expect(isSectionVisible(structure, FULL, "servicios-publicos", "tramites")).toBe(false);
  });
});

describe("Guía de trámites en el menú", () => {
  it("se puede ocultar del menú sin ocultar la guía", () => {
    const structure: SiteStructure = { ...EMPTY, menu: { "guia-tramites": entry(false, 1) } };
    expect(visibleMenuEntries(structure, FULL)).not.toContain("guia-tramites");
    expect(isSectionVisible(structure, FULL, "servicios-publicos", "tramites")).toBe(true);
  });

  it("desaparece del menú si su sección está desactivada", () => {
    const structure: SiteStructure = {
      ...EMPTY,
      sections: { "servicios-publicos": { tramites: entry(false, 2) } },
    };
    expect(visibleMenuEntries(structure, FULL)).not.toContain("guia-tramites");
  });

  it("nunca genera acceso directo: no es una página principal", () => {
    expect(automaticShortcuts(EMPTY, FULL)).not.toContain("guia-tramites");
  });
});

describe("lectura de site_config()", () => {
  it("sin estructura o con datos rotos usa los valores por defecto", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(parseSiteStructure(null)).toEqual(EMPTY);
    expect(parseSiteStructure({ identity: {} })).toEqual(EMPTY);
    expect(
      parseSiteStructure({ menu: { descubre: { enabled: "sí" } }, sections: "x", shortcuts: {} }),
    ).toEqual(EMPTY);
    warn.mockRestore();
  });

  it("descarta secciones fuera del catálogo y páginas no configurables", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const structure = parseSiteStructure({
      sections: {
        descubre: {
          entorno: { enabled: false, sort_order: 1 },
          clasificados: { enabled: true, sort_order: 0 },
        },
        inicio: { "accesos-directos": { enabled: false, sort_order: 0 } },
      },
    });
    expect(structure.sections).toEqual({ descubre: { entorno: entry(false, 1) } });
    warn.mockRestore();
  });

  it("solo admite accesos adicionales con destino válido, imagen propia y texto seguro", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const ok = {
      id: "aa000000-0000-4000-8000-000000000001",
      title: "Piscina",
      description: "Horario de verano",
      image_path: "accesos/aa000000-0000-4000-8000-000000000001.webp",
      image_alt: "Piscina municipal",
      href: "/servicios-publicos#vida-diaria",
    };
    const structure = parseSiteStructure({
      shortcuts: [
        ok,
        { ...ok, id: "2", href: "javascript:alert(1)" },
        { ...ok, id: "3", href: "//otro.example.org" },
        { ...ok, id: "4", title: "<b>x</b>" },
        { ...ok, id: "5", image_path: "../secreto.webp" },
        { ...ok, id: "6", href: "https://example.org/feria" },
      ],
    });
    expect(structure.shortcuts.map((s) => s.id)).toEqual([ok.id, "6"]);
    expect(structure.shortcuts[0]).toEqual({
      id: ok.id,
      title: "Piscina",
      description: "Horario de verano",
      imagePath: ok.image_path,
      imageAlt: "Piscina municipal",
      href: ok.href,
    });
    warn.mockRestore();
  });

  it("valida los destinos con el mismo criterio que la base", () => {
    expect(isValidShortcutHref("/tramites")).toBe(true);
    expect(isValidShortcutHref("https://example.org/a?b=c")).toBe(true);
    expect(isValidShortcutHref("http://example.org")).toBe(false);
    expect(isValidShortcutHref("//example.org")).toBe(false);
    expect(isValidShortcutHref("mailto:a@example.org")).toBe(false);
    expect(isValidShortcutHref("")).toBe(false);
  });
});

describe("configuración publicada entre servidor y navegador", () => {
  it("site_config() lleva la estructura y el navegador recibe la misma", () => {
    const config = parseSiteConfig({
      identity: {},
      menu: { descubre: { enabled: false, sort_order: 2 } },
      sections: { "servicios-publicos": { tramites: { enabled: true, sort_order: 0 } } },
      shortcuts: [],
    });
    expect(config.structure).toEqual({
      menu: { descubre: entry(false, 2) },
      sections: { "servicios-publicos": { tramites: entry(true, 0) } },
      shortcuts: [],
    });
    new Function(siteConfigScript(config))();
    expect(readBrowserSiteConfig()?.structure).toEqual(config.structure);
  });

  it("una base sin migrar (sin estructura) sigue funcionando con los valores por defecto", () => {
    expect(parseSiteConfig({ identity: {}, page_headers: {} }).structure).toEqual(EMPTY);
  });
});
