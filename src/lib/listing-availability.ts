export const AVAILABILITY_OPTIONS = ["Guardia fin de semana", "Atención en festivos"] as const;

export function availabilityTags(tags: string[]) {
  return AVAILABILITY_OPTIONS.filter((option) => tags.includes(option));
}

export function searchTags(tags: string[]) {
  return tags.filter((tag) => !AVAILABILITY_OPTIONS.some((option) => option === tag));
}

export function withAvailability(tags: string[], selected: string[]) {
  return [...new Set([...searchTags(tags), ...availabilityTags(selected)])];
}

export function hashtag(label: string) {
  return `#${label.replace(/^#+/, "").replace(/\s+/g, "")}`;
}
/** Urgencias y guardias: 24h o cualquier distinción de disponibilidad. */
export function isEmergencyService(l: { urgent_24h: boolean; tags: string[] }) {
  return l.urgent_24h || availabilityTags(l.tags).length > 0;
}
