/**
 * Configuración municipal de la instalación.
 * Datos públicos, sin secretos. Seguro para SSR y navegador (solo lee VITE_MUNICIPALITY_ID).
 * Los datos operativos editables (avisos, titular legal, contacto) siguen en site_settings.
 */
// La instancia se elige al compilar: ver instances/select.ts.
import instance from "@instance";
import type {
  MunicipalityConfig,
  MunicipalityDarkTokens,
  MunicipalityLightTokens,
  MunicipalityTheme,
} from "../../instances/schema";
import { DEFAULT_MUNICIPALITY_ID } from "../../instances/schema";

export { DEFAULT_MUNICIPALITY_ID };
export type {
  MunicipalityAssets,
  MunicipalityConfig,
  MunicipalityDarkTokens,
  MunicipalityLightTokens,
  MunicipalityTheme,
} from "../../instances/schema";

/** Solo la instancia compilada: el resultado no incluye datos de otros municipios. */
export const MUNICIPALITIES: Readonly<Record<string, MunicipalityConfig>> = Object.freeze({
  [instance.id]: instance,
});

export class UnknownMunicipalityError extends Error {
  constructor(id: string, available: string[]) {
    super(
      `Municipio desconocido en VITE_MUNICIPALITY_ID: "${id}". Disponibles: ${available.join(", ")}.`,
    );
    this.name = "UnknownMunicipalityError";
  }
}

/** Resuelve un identificador contra un registro. Vacío → predeterminado; desconocido → error. */
export function resolveMunicipality(
  id: string | undefined | null,
  registry: Readonly<Record<string, MunicipalityConfig>> = MUNICIPALITIES,
): MunicipalityConfig {
  const key = (id ?? "").trim() || DEFAULT_MUNICIPALITY_ID;
  const found = Object.prototype.hasOwnProperty.call(registry, key) ? registry[key] : undefined;
  if (!found) throw new UnknownMunicipalityError(key, Object.keys(registry));
  return found;
}

/** Configuración de la instalación actual. */
export function getMunicipality(): MunicipalityConfig {
  return resolveMunicipality(import.meta.env["VITE_MUNICIPALITY_ID"] as string | undefined);
}


export class InvalidThemeValueError extends Error {
  constructor(token: string, value: unknown) {
    super(`Valor de color no válido en el tema municipal (${token}): ${JSON.stringify(value)}`);
    this.name = "InvalidThemeValueError";
  }
}

const NUM = String.raw`(?:\d+(?:\.\d+)?|\.\d+)`;
const OKLCH_RE = new RegExp(
  String.raw`^oklch\(${NUM}%? ${NUM} ${NUM}(?: \/ ${NUM}%?)?\)$`,
);
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const LIGHT_VARS: ReadonlyArray<[keyof MunicipalityLightTokens, string]> = [
  ["primary", "--primary"],
  ["primaryForeground", "--primary-foreground"],
  ["ring", "--ring"],
  ["accentForeground", "--accent-foreground"],
  ["terracotta", "--terracotta"],
  ["terracottaForeground", "--terracotta-foreground"],
  ["sand", "--sand"],
  ["beige", "--beige"],
  ["chart1", "--chart-1"],
  ["sidebarPrimary", "--sidebar-primary"],
  ["sidebarPrimaryForeground", "--sidebar-primary-foreground"],
  ["sidebarRing", "--sidebar-ring"],
];
const DARK_VARS: ReadonlyArray<[keyof MunicipalityDarkTokens, string]> = [
  ["primary", "--primary"],
  ["primaryForeground", "--primary-foreground"],
  ["ring", "--ring"],
  ["accentForeground", "--accent-foreground"],
  ["chart1", "--chart-1"],
  ["sidebarPrimary", "--sidebar-primary"],
  ["sidebarPrimaryForeground", "--sidebar-primary-foreground"],
  ["sidebarRing", "--sidebar-ring"],
];

function declarations<T extends object>(
  mode: string,
  tokens: T,
  vars: ReadonlyArray<[keyof T, string]>,
): string {
  return vars
    .map(([key, cssVar]) => {
      const value = tokens[key];
      if (typeof value !== "string" || !OKLCH_RE.test(value)) {
        throw new InvalidThemeValueError(`${mode}.${String(key)}`, value);
      }
      return `${cssVar}:${value};`;
    })
    .join("");
}

/** Valida el tema; lanza InvalidThemeValueError ante cualquier valor no OKLCH/hex. */
export function validateMunicipalityTheme(theme: MunicipalityTheme): void {
  getMunicipalityThemeCss(theme);
}

/**
 * CSS de variables municipales. Se inserta tras la hoja principal con mayor
 * especificidad (html:root > :root; html.dark/html .dark > .dark), así que
 * ninguna regla de styles.css lo sobrescribe. Solo admite valores validados.
 */
export function getMunicipalityThemeCss(theme: MunicipalityTheme): string {
  if (typeof theme.themeColor !== "string" || !HEX_RE.test(theme.themeColor)) {
    throw new InvalidThemeValueError("themeColor", theme.themeColor);
  }
  const light = declarations("light", theme.light, LIGHT_VARS);
  const dark = declarations("dark", theme.dark, DARK_VARS);
  return `html:root{${light}}html.dark,html .dark{${dark}}`;
}
