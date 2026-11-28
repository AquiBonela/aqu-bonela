/**
 * Detalle de las fichas (navegador y servidor): dirección estructurada, ubicación, web, periodos
 * de horario y qué horario rige un día concreto. Las reglas coinciden con las de la base
 * (listing_details): lo que aquí no pasa, la base tampoco lo admite.
 */
export type Hour = { weekday: number; opens: string; closes: string };
export type PeriodKind = "cierre" | "vacaciones" | "temporada";
export type HourPeriod = {
  kind: PeriodKind;
  starts_on: string;
  ends_on: string;
  label: string;
  /** Solo en temporada: su horario semanal. */
  hours: Hour[];
};

export const PERIOD_LABELS: Record<PeriodKind, string> = {
  cierre: "Cierre excepcional",
  vacaciones: "Vacaciones",
  temporada: "Horario de temporada",
};

export const MAX_PERIODS = 20;

/** Dirección exacta tal como la publica la base: calle y número, código postal y localidad. */
export function composeAddress(a: {
  street?: string | null;
  street_number?: string | null;
  postal_code?: string | null;
  locality?: string | null;
  address?: string | null;
}): string {
  const street = [a.street?.trim(), a.street_number?.trim()].filter(Boolean).join(" ");
  const locality = [a.postal_code?.trim(), a.locality?.trim()].filter(Boolean).join(" ");
  if (!street) return a.address?.trim() ?? "";
  return [street, locality].filter(Boolean).join(", ");
}

export function parseCoordinate(value: string, limit: number): number | null | "invalid" {
  const text = value.trim().replace(",", ".");
  if (!text) return null;
  if (!/^-?\d+(\.\d+)?$/.test(text)) return "invalid";
  const n = Number(text);
  if (Math.abs(n) > limit) return "invalid";
  return Math.round(n * 100_000) / 100_000;
}

const WEBSITE = /^https?:\/\/[^\s<>"{}]+$/i;

/** Añade https:// si falta; vacío si no hay web. */
export function normalizeWebsite(value: string): string {
  const t = value.trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

export type DetailErrors = Partial<
  Record<
    "postal_code" | "latitude" | "longitude" | "website" | "cover_alt" | "hours_note" | "periods",
    string
  >
>;

/** Comprueba los datos nuevos de la ficha antes de guardar. */
export function validateListingDetails(f: {
  postal_code: string;
  latitude: string;
  longitude: string;
  website: string;
  cover_alt: string;
  hours_note: string;
  periods: HourPeriod[];
}): DetailErrors {
  const errors: DetailErrors = {};
  if (f.postal_code.trim() && !/^[0-9]{5}$/.test(f.postal_code.trim()))
    errors.postal_code = "Escribe las cinco cifras del código postal.";
  const lat = parseCoordinate(f.latitude, 90);
  const lng = parseCoordinate(f.longitude, 180);
  if (lat === "invalid") errors.latitude = "Escribe un número entre -90 y 90.";
  if (lng === "invalid") errors.longitude = "Escribe un número entre -180 y 180.";
  if (lat !== "invalid" && lng !== "invalid" && (lat === null) !== (lng === null))
    errors[lat === null ? "latitude" : "longitude"] =
      "Indica latitud y longitud, o deja las dos vacías.";
  const website = normalizeWebsite(f.website);
  if (website && (website.length > 300 || !WEBSITE.test(website)))
    errors.website = "Escribe una dirección web válida, por ejemplo https://ejemplo.es";
  if (f.cover_alt.length > 200) errors.cover_alt = "Máximo 200 caracteres.";
  if (f.hours_note.length > 300) errors.hours_note = "Máximo 300 caracteres.";
  const periodError = validatePeriods(f.periods);
  if (periodError) errors.periods = periodError;
  return errors;
}

const DAY_MS = 86_400_000;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function validatePeriods(periods: HourPeriod[]): string | null {
  if (periods.length > MAX_PERIODS) return `Como máximo ${MAX_PERIODS} periodos.`;
  for (const p of periods) {
    const name = p.label.trim() || PERIOD_LABELS[p.kind];
    if (!ISO_DATE.test(p.starts_on) || !ISO_DATE.test(p.ends_on))
      return `«${name}»: indica las fechas.`;
    const days = (Date.parse(p.ends_on) - Date.parse(p.starts_on)) / DAY_MS;
    if (days < 0) return `«${name}»: la fecha final es anterior a la inicial.`;
    if (days > 366) return `«${name}»: un periodo dura como máximo un año.`;
    if (p.label.length > 80 || /[<>{}]/.test(p.label)) return `«${name}»: nombre no válido.`;
    if (p.kind === "temporada" && p.hours.length === 0) return `«${name}»: añade su horario.`;
    if (p.kind !== "temporada" && p.hours.length > 0)
      return `«${name}»: un cierre no lleva horario.`;
  }
  return null;
}

/** Fecha local AAAA-MM-DD (los periodos son días completos en la zona del municipio). */
export function isoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export type HoursNow = {
  /** Cierre o vacaciones vigentes hoy: la ficha está cerrada aunque el horario habitual diga otra cosa. */
  closure: HourPeriod | null;
  /** Temporada vigente: su horario sustituye al habitual. */
  season: HourPeriod | null;
  /** Horario semanal que rige hoy. */
  hours: Hour[];
  /** Cierres y temporadas de los próximos 60 días. */
  upcoming: HourPeriod[];
};

/**
 * Horario que rige en una fecha, sin contradicciones: un cierre manda sobre todo, una temporada
 * sustituye al horario habitual y el resto se anuncia como próximo.
 */
export function hoursOn(
  regular: Hour[],
  periods: HourPeriod[],
  today = isoDate(new Date()),
): HoursNow {
  const active = periods.filter((p) => p.starts_on <= today && today <= p.ends_on);
  const closure = active.find((p) => p.kind !== "temporada") ?? null;
  const season = active.find((p) => p.kind === "temporada") ?? null;
  const limit = isoDate(new Date(Date.parse(today) + 60 * DAY_MS));
  const upcoming = periods
    .filter((p) => p.starts_on > today && p.starts_on <= limit)
    .sort((a, b) => a.starts_on.localeCompare(b.starts_on));
  return { closure, season, hours: season ? season.hours : regular, upcoming };
}

/** «del 1 de julio al 31 de agosto» o «el 24 de diciembre». */
export function periodRange(
  p: Pick<HourPeriod, "starts_on" | "ends_on">,
  locale = "es-ES",
): string {
  const fmt = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString(locale, { day: "numeric", month: "long" });
  return p.starts_on === p.ends_on
    ? `el ${fmt(p.starts_on)}`
    : `del ${fmt(p.starts_on)} al ${fmt(p.ends_on)}`;
}

/** Enlace de mapa: coordenadas si se publican, si no la dirección o la localidad. */
export function mapLink(l: {
  public_latitude?: number | null;
  public_longitude?: number | null;
  public_address?: string | null;
  public_locality?: string | null;
}): string | null {
  if (l.public_latitude != null && l.public_longitude != null)
    return `https://www.google.com/maps/search/?api=1&query=${l.public_latitude},${l.public_longitude}`;
  const q = l.public_address || l.public_locality;
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}
