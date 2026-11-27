/**
 * Paleta municipal a partir de dos colores (principal y acento), común a todas las instalaciones.
 * Calcula los tokens del tema claro y oscuro en OKLCH y ajusta la luminosidad hasta cumplir el
 * contraste WCAG AA (4,5:1) en cada combinación de texto y fondo que usa la web. Apto para
 * navegador y servidor; no depende de ninguna instancia.
 */
import type {
  MunicipalityDarkTokens,
  MunicipalityLightTokens,
  MunicipalityTheme,
} from "../../instances/schema";

export type Oklch = { l: number; c: number; h: number };
type Rgb = { r: number; g: number; b: number };

/** Contraste mínimo de texto normal (WCAG 2.1 AA). */
export const AA_CONTRAST = 4.5;

const HEX = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value);
}

// --- Conversión de color (sRGB ↔ OKLab ↔ OKLCH) ---

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const fromLinear = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

function hexToRgb(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

function rgbToHex({ r, g, b }: Rgb): string {
  const part = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

function rgbToOklch({ r, g, b }: Rgb): Oklch {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)];
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const c = Math.sqrt(A * A + B * B);
  const h = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return { l: L, c, h: c < 1e-4 ? 0 : h };
}

/** Color sin recortar: puede quedar fuera de sRGB. */
function oklchToRawRgb({ l, c, h }: Oklch): Rgb {
  const A = c * Math.cos((h * Math.PI) / 180);
  const B = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m_ = (l - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s_ = (l - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return {
    r: fromLinear(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_),
    g: fromLinear(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_),
    b: fromLinear(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_),
  };
}

const inGamut = ({ r, g, b }: Rgb) =>
  [r, g, b].every((v) => Number.isFinite(v) && v >= -1e-4 && v <= 1 + 1e-4);

/** Lleva el color a sRGB reduciendo el croma y conservando luminosidad y tono. */
function toGamut(color: Oklch): Oklch {
  if (inGamut(oklchToRawRgb(color))) return color;
  let low = 0;
  let high = color.c;
  for (let i = 0; i < 24; i++) {
    const mid = (low + high) / 2;
    if (inGamut(oklchToRawRgb({ ...color, c: mid }))) low = mid;
    else high = mid;
  }
  return { ...color, c: low };
}

export function hexToOklch(hex: string): Oklch {
  return rgbToOklch(hexToRgb(hex));
}

export function oklchToHex(color: Oklch): string {
  return rgbToHex(oklchToRawRgb(toGamut(color)));
}

/** Lee un valor «oklch(L C H)» como los del tema compilado. */
export function parseOklch(value: string): Oklch | null {
  const m = /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/.exec(value);
  if (!m) return null;
  const l = Number(m[1]) / (m[2] ? 100 : 1);
  return { l, c: Number(m[3]), h: Number(m[4]) };
}

export function formatOklch({ l, c, h }: Oklch): string {
  const g = toGamut({ l, c, h });
  const round = (v: number, d: number) => Number(v.toFixed(d));
  return `oklch(${round(g.l, 3)} ${round(g.c, 3)} ${round(g.h, 1)})`;
}

// --- Contraste WCAG ---

function luminance(color: Oklch): number {
  const { r, g, b } = oklchToRawRgb(toGamut(color));
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return 0.2126 * toLinear(clamp(r)) + 0.7152 * toLinear(clamp(g)) + 0.0722 * toLinear(clamp(b));
}

export function contrastRatio(a: Oklch, b: Oklch): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Ajusta la luminosidad del color, conservando su tono, hasta que contraste lo suficiente con
 * todos los fondos indicados. «darker» oscurece (texto sobre fondos claros) y «lighter» aclara.
 */
export function ensureContrast(
  color: Oklch,
  against: Oklch[],
  direction: "darker" | "lighter",
  min = AA_CONTRAST,
): Oklch {
  let current = toGamut(color);
  const ok = (c: Oklch) => against.every((bg) => contrastRatio(c, bg) >= min);
  for (let i = 0; i < 200 && !ok(current); i++) {
    const l = direction === "darker" ? current.l - 0.005 : current.l + 0.005;
    current = toGamut({ ...current, l: Math.min(1, Math.max(0, l)) });
  }
  return current;
}

// --- Fondos fijos de la plataforma (src/styles.css) ---

const WHITE: Oklch = { l: 1, c: 0, h: 0 };
const LIGHT_BACKGROUND: Oklch = { l: 0.973, c: 0.008, h: 91.5 };
const LIGHT_ACCENT_SURFACE: Oklch = { l: 0.924, c: 0.02, h: 58.1 };
const DARK_BACKGROUND: Oklch = { l: 0.129, c: 0.042, h: 264.695 };
const DARK_CARD: Oklch = { l: 0.208, c: 0.042, h: 265.755 };

export type PaletteInput = { primary: Oklch; accent: Oklch };

/** Tokens del tema a partir de los dos colores. Siempre cumplen el contraste AA. */
export function buildPalette({ primary, accent }: PaletteInput): MunicipalityTheme {
  // Botones y enlaces: el color principal lleva texto blanco y se lee como texto sobre el fondo.
  const p = ensureContrast(primary, [WHITE, LIGHT_BACKGROUND], "darker");
  // El acento como fondo de botones y distintivos, con texto blanco.
  const a = ensureContrast(accent, [WHITE, LIGHT_BACKGROUND], "darker");
  // El acento como texto sobre la superficie de acento y sobre el fondo.
  const aText = ensureContrast(accent, [LIGHT_ACCENT_SURFACE, LIGHT_BACKGROUND, WHITE], "darker");
  const tint = (l: number, c: number): Oklch => ({ l, c: Math.min(c, p.c), h: p.h });

  const light: MunicipalityLightTokens = {
    primary: formatOklch(p),
    primaryForeground: formatOklch(WHITE),
    ring: formatOklch(p),
    accentForeground: formatOklch(aText),
    terracotta: formatOklch(a),
    terracottaForeground: formatOklch(WHITE),
    sand: formatOklch(tint(0.965, 0.012)),
    beige: formatOklch(tint(0.93, 0.025)),
    chart1: formatOklch(p),
    sidebarPrimary: formatOklch(p),
    sidebarPrimaryForeground: formatOklch(WHITE),
    sidebarRing: formatOklch(p),
  };

  // Modo oscuro: el principal se aclara para leerse sobre el fondo oscuro y lleva texto oscuro.
  const pDark = ensureContrast(
    { ...p, l: Math.max(p.l, 0.78) },
    [DARK_BACKGROUND, DARK_CARD],
    "lighter",
  );
  const pDarkText = ensureContrast({ l: 0.2, c: Math.min(p.c, 0.04), h: p.h }, [pDark], "darker");
  const aDark = ensureContrast(
    { ...accent, l: Math.max(accent.l, 0.8) },
    [DARK_BACKGROUND, DARK_CARD],
    "lighter",
  );
  const ringDark = ensureContrast({ ...p, l: 0.6 }, [DARK_BACKGROUND], "lighter", 3);
  const dark: MunicipalityDarkTokens = {
    primary: formatOklch(pDark),
    primaryForeground: formatOklch(pDarkText),
    ring: formatOklch(ringDark),
    accentForeground: formatOklch(aDark),
    chart1: formatOklch(ringDark),
    sidebarPrimary: formatOklch(ringDark),
    sidebarPrimaryForeground: formatOklch({ l: 0.984, c: 0.003, h: p.h }),
    sidebarRing: formatOklch(ringDark),
  };

  return { themeColor: oklchToHex(p), light, dark };
}

/**
 * Tema de la instalación: si Supabase tiene colores, la paleta calculada; si solo tiene uno, el
 * otro se toma del tema compilado; si no tiene ninguno, el tema compilado sin cambios.
 */
export function themeFromColors(
  base: MunicipalityTheme,
  primaryHex: string | undefined,
  accentHex: string | undefined,
): MunicipalityTheme {
  const primary = isHexColor(primaryHex) ? hexToOklch(primaryHex) : null;
  const accent = isHexColor(accentHex) ? hexToOklch(accentHex) : null;
  if (!primary && !accent) return base;
  const basePrimary = parseOklch(base.light.primary) ?? { l: 0.45, c: 0.1, h: 250 };
  const baseAccent = parseOklch(base.light.terracotta) ?? basePrimary;
  return buildPalette({ primary: primary ?? basePrimary, accent: accent ?? baseAccent });
}

/** Pares de texto y fondo de la paleta, para mostrar y comprobar su contraste. */
export function paletteContrasts(theme: MunicipalityTheme): { label: string; ratio: number }[] {
  const read = (v: string) => parseOklch(v) ?? WHITE;
  const pairs: [string, string, Oklch][] = [
    ["Texto en botones principales", theme.light.primaryForeground, read(theme.light.primary)],
    ["Enlaces sobre el fondo", theme.light.primary, LIGHT_BACKGROUND],
    ["Texto en botones de acento", theme.light.terracottaForeground, read(theme.light.terracotta)],
    ["Texto de acento sobre su fondo", theme.light.accentForeground, LIGHT_ACCENT_SURFACE],
    ["Botón principal en modo oscuro", theme.dark.primaryForeground, read(theme.dark.primary)],
    ["Enlaces en modo oscuro", theme.dark.primary, DARK_BACKGROUND],
  ];
  return pairs.map(([label, text, bg]) => ({ label, ratio: contrastRatio(read(text), bg) }));
}
