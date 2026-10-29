export const AVAILABILITY_OPTIONS = ["Guardia fin de semana", "Atención en festivos"] as const;

/** Etiqueta reservada: el titular eligió no mostrar el horario en la ficha pública. */
export const HIDE_HOURS_TAG = "__ocultar_horario";

export function availabilityTags(tags: string[]) {
  return AVAILABILITY_OPTIONS.filter((option) => tags.includes(option));
}

export function hoursHidden(tags: string[]) {
  return tags.includes(HIDE_HOURS_TAG);
}

/** Entradas reservadas (distinciones + preferencias del titular) que no son palabras de búsqueda. */
export function reservedTags(tags: string[]) {
  return tags.filter((t) => t === HIDE_HOURS_TAG || AVAILABILITY_OPTIONS.some((o) => o === t));
}

export function searchTags(tags: string[]) {
  return tags.filter((tag) => tag !== HIDE_HOURS_TAG && !AVAILABILITY_OPTIONS.some((option) => option === tag));
}

export function withAvailability(tags: string[], selected: string[]) {
  return [...new Set([...searchTags(tags), ...reservedTags(selected)])];
}

export function withHoursVisibility(tags: string[], show: boolean) {
  const rest = tags.filter((t) => t !== HIDE_HOURS_TAG);
  return show ? rest : [...rest, HIDE_HOURS_TAG];
}

export function hashtag(label: string) {
  return `#${label.replace(/^#+/, "").replace(/\s+/g, "")}`;
}
/** Urgencias y guardias: 24h o cualquier distinción de disponibilidad. */
export function isEmergencyService(l: { urgent_24h: boolean; tags: string[] }) {
  return l.urgent_24h || availabilityTags(l.tags).length > 0;
}
