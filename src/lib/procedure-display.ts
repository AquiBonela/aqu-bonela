import { externalTextUrl } from "./description";

/** Older guides retain their card excerpt until an independent description is entered. */
export function procedureCardDescription(value: {
  cardDescription?: string;
  summary?: string;
  short: string;
}): string {
  return value.cardDescription ?? value.summary ?? value.short;
}

export function hasPlaceDetail(detail: { value: string }): boolean {
  return Boolean(detail.value.trim());
}

export function hasProcedureLink(value: unknown): value is { label: string; url: string } {
  if (!value || typeof value !== "object") return false;
  const link = value as Record<string, unknown>;
  if (
    typeof link["label"] !== "string" ||
    !link["label"].trim() ||
    typeof link["url"] !== "string" ||
    !link["url"].trim()
  )
    return false;
  const url = link["url"].trim();
  return Boolean(externalTextUrl(url) || /^tel:\+?[\d\s()-]+$/.test(url));
}

/** Keep descriptive prices and previously entered euro signs intact. */
export function euroAmount(value: string): string {
  const amount = value.trim();
  return /^\d+(?:[.,]\d+)*$/.test(amount) ? `${amount} €` : amount;
}
