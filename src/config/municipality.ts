/**
 * Configuración municipal de la instalación.
 * Datos públicos, sin secretos. Seguro para SSR y navegador (solo lee VITE_MUNICIPALITY_ID).
 * Los datos operativos editables (avisos, titular legal, contacto) siguen en site_settings.
 */
export interface MunicipalityConfig {
  id: string;
  name: string;
  appName: string;
  demonym: { masculine: string; feminine: string };
  province: string;
  region: string;
  autonomousCommunity: string;
  siteUrl: string;
  coordinates: { lat: number; lng: number; timezone: string };
  institutional: {
    townHallName: string;
    address: string;
    phone: string;
    website: string;
  };
  assets: {
    logo: string;
    logoMenu: string;
    logoText: string;
    heroImage: string;
    favicon: string;
  };
}

export const DEFAULT_MUNICIPALITY_ID = "casarabonela";

const casarabonela: MunicipalityConfig = {
  id: "casarabonela",
  name: "Casarabonela",
  appName: "Aquí Bonela",
  demonym: { masculine: "morisco", feminine: "morisca" },
  province: "Málaga",
  region: "Sierra de las Nieves",
  autonomousCommunity: "Andalucía",
  siteUrl: "https://bonela-local-finds.lovable.app",
  coordinates: { lat: 36.786, lng: -4.843, timezone: "Europe/Madrid" },
  institutional: {
    townHallName: "Ayuntamiento de Casarabonela",
    address: "Plaza de Buenavista, 1, 29566 Casarabonela (Málaga)",
    phone: "952456561",
    website: "https://www.casarabonela.es/",
  },
  assets: {
    logo: "src/assets/logo.png.asset.json",
    logoMenu: "src/assets/logo-menu.webp",
    logoText: "src/assets/logo-texto.webp",
    heroImage: "src/assets/hero-casarabonela.jpg",
    favicon: "/favicon.png",
  },
};

/** Registro de municipios. Añadir uno nuevo = añadir una entrada aquí. */
export const MUNICIPALITIES: Readonly<Record<string, MunicipalityConfig>> = Object.freeze({
  [casarabonela.id]: casarabonela,
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
