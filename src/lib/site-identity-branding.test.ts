import { afterEach, describe, expect, it, vi } from "vitest";
import demo from "../../instances/demo/config";
import {
  isServableAssetPath,
  mergeSiteConfig,
  parseSiteConfig,
  readBrowserSiteConfig,
  siteConfigScript,
} from "./site-identity";

const UUID = "11111111-1111-4111-8111-111111111111";

afterEach(() => {
  vi.restoreAllMocks();
  delete window.__SITE_CONFIG__;
});

describe("identidad visual desde Supabase", () => {
  it("lee código postal, colores y rutas de recursos válidos", () => {
    const config = parseSiteConfig({
      identity: {
        postal_code: "12345",
        primary_color: "#1f4e79",
        accent_color: "#b5562a",
        logo_path: `identidad/${UUID}/logo.webp`,
        logo_light_path: "",
        icon_path: `identidad/${UUID}/icono-512.png`,
        icon_small_path: `identidad/${UUID}/icono-192.png`,
      },
    });
    expect(config.identity.postalCode).toBe("12345");
    expect(config.branding).toEqual({
      primaryColor: "#1f4e79",
      accentColor: "#b5562a",
      logoPath: `identidad/${UUID}/logo.webp`,
      iconPath: `identidad/${UUID}/icono-512.png`,
      iconSmallPath: `identidad/${UUID}/icono-192.png`,
    });
  });

  it("descarta valores que la base no admitiría", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const config = parseSiteConfig({
      identity: {
        postal_code: "1234",
        primary_color: "red",
        logo_path: "../../otro/logo.webp",
        icon_path: "https://otro.example.org/icono.png",
      },
    });
    expect(config.identity.postalCode).toBeUndefined();
    expect(config.branding).toEqual({});
  });

  it("lee las cabeceras de página válidas y descarta las ajenas", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const config = parseSiteConfig({
      identity: {},
      page_headers: {
        directorio: {
          image_path: `cabeceras/directorio/${UUID}.webp`,
          image_small_path: `cabeceras/directorio/${UUID}-movil.webp`,
          alt: "Calle principal",
          focal_x: 30,
          focal_y: 200,
        },
        // Ruta de otra página: no se acepta.
        tramites: {
          image_path: `cabeceras/directorio/${UUID}.webp`,
          image_small_path: `cabeceras/directorio/${UUID}-movil.webp`,
        },
        otra: { image_path: "x" },
      },
    });
    expect(config.pageHeaders).toEqual({
      directorio: {
        imagePath: `cabeceras/directorio/${UUID}.webp`,
        imageSmallPath: `cabeceras/directorio/${UUID}-movil.webp`,
        alt: "Calle principal",
        focalX: 30,
        focalY: 50,
      },
    });
  });

  it("sin datos visuales en Supabase conserva los recursos y el tema compilados", () => {
    const merged = mergeSiteConfig(demo, { identity: {}, branding: {}, pageHeaders: {} });
    expect(merged.assets).toEqual(demo.assets);
    expect(merged.theme).toBe(demo.theme);
  });

  it("con logotipo e iconos los sirve desde el propio dominio y calcula el tema", () => {
    const merged = mergeSiteConfig(demo, {
      identity: { appName: "Plataforma" },
      branding: {
        primaryColor: "#1f4e79",
        logoPath: `identidad/${UUID}/logo.webp`,
        iconPath: `identidad/${UUID}/icono-512.png`,
        iconSmallPath: `identidad/${UUID}/icono-192.png`,
      },
    });
    expect(merged.appName).toBe("Plataforma");
    expect(merged.assets.logoAdmin).toBe(`/marca/identidad/${UUID}/logo.webp`);
    expect(merged.assets.logoHome).toBeUndefined();
    expect(merged.assets.favicon).toBe(`/marca/identidad/${UUID}/icono-192.png`);
    expect(merged.assets.pwaIcons).toEqual({
      icon192: `/marca/identidad/${UUID}/icono-192.png`,
      icon512: `/marca/identidad/${UUID}/icono-512.png`,
    });
    expect(merged.theme).not.toBe(demo.theme);
    expect(merged.theme.themeColor).toBe("#1f4e79");
  });

  it("solo sirve desde /marca/ las rutas que genera el panel", () => {
    expect(isServableAssetPath(`identidad/${UUID}/logo.webp`)).toBe(true);
    expect(isServableAssetPath(`cabeceras/inicio/${UUID}-movil.webp`)).toBe(true);
    expect(isServableAssetPath("identidad/../../secreto.webp")).toBe(false);
    expect(isServableAssetPath(`otro-bucket/${UUID}.webp`)).toBe(false);
    expect(isServableAssetPath(`cabeceras/otra/${UUID}.webp`)).toBe(false);
  });

  it("entrega al navegador la identidad, los colores y las cabeceras", () => {
    const config = {
      identity: { appName: "P" },
      branding: { primaryColor: "#1f4e79" },
      pageHeaders: {
        inicio: {
          imagePath: `cabeceras/inicio/${UUID}.webp`,
          imageSmallPath: `cabeceras/inicio/${UUID}-movil.webp`,
          alt: "Plaza",
          focalX: 50,
          focalY: 40,
        },
      },
    };
    new Function(siteConfigScript(config))();
    // La estructura viaja también; sin ella en la configuración, la vacía.
    expect(readBrowserSiteConfig()).toEqual({
      ...config,
      structure: { menu: {}, sections: {}, shortcuts: [] },
    });
  });
});
