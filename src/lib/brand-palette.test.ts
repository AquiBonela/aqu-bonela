import { describe, expect, it } from "vitest";
import { getMunicipalityThemeCss } from "@/config/municipality";
import demo from "../../instances/demo/config";
import {
  AA_CONTRAST,
  buildPalette,
  contrastRatio,
  hexToOklch,
  oklchToHex,
  paletteContrasts,
  parseOklch,
  themeFromColors,
} from "./brand-palette";

const SAMPLES = [
  "#1f4e79", // azul institucional
  "#ffff00", // amarillo puro: debe oscurecerse
  "#ffffff", // blanco
  "#000000", // negro
  "#7fd1ae", // verde pastel
  "#e30613", // rojo intenso
  "#8a2be2", // violeta
];

describe("paleta municipal a partir de dos colores", () => {
  it("convierte hexadecimal y OKLCH sin perder el color", () => {
    for (const hex of ["#1f4e79", "#b5562a", "#336699"])
      expect(oklchToHex(hexToOklch(hex))).toBe(hex);
  });

  it.each(SAMPLES.flatMap((p) => SAMPLES.map((a) => [p, a])))(
    "principal %s y acento %s cumplen WCAG AA en todas las combinaciones",
    (primary, accent) => {
      const theme = buildPalette({ primary: hexToOklch(primary), accent: hexToOklch(accent) });
      for (const { label, ratio } of paletteContrasts(theme))
        expect(ratio, `${label}: ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(AA_CONTRAST);
      // Los valores son los que acepta el tema municipal (OKLCH y #rrggbb).
      expect(() => getMunicipalityThemeCss(theme)).not.toThrow();
    },
  );

  it("conserva el tono elegido y solo oscurece cuando hace falta", () => {
    const dark = hexToOklch("#1f4e79");
    const theme = buildPalette({ primary: dark, accent: dark });
    const primary = parseOklch(theme.light.primary)!;
    expect(Math.abs(primary.h - dark.h)).toBeLessThan(1);
    expect(Math.abs(primary.l - dark.l)).toBeLessThan(0.01);
    const yellow = parseOklch(
      buildPalette({ primary: hexToOklch("#ffff00"), accent: dark }).light.primary,
    )!;
    expect(yellow.l).toBeLessThan(hexToOklch("#ffff00").l);
  });

  it("sin colores en Supabase usa el tema compilado tal cual", () => {
    expect(themeFromColors(demo.theme, undefined, "")).toBe(demo.theme);
  });

  it("con un solo color toma el otro del tema compilado", () => {
    const theme = themeFromColors(demo.theme, "#e30613", undefined);
    expect(theme.light.primary).not.toBe(demo.theme.light.primary);
    const accent = parseOklch(theme.light.terracotta)!;
    const baseAccent = parseOklch(demo.theme.light.terracotta)!;
    expect(Math.abs(accent.h - baseAccent.h)).toBeLessThan(1);
  });

  it("calcula el contraste como WCAG (negro sobre blanco = 21)", () => {
    expect(contrastRatio(hexToOklch("#000000"), hexToOklch("#ffffff"))).toBeCloseTo(21, 0);
  });
});
