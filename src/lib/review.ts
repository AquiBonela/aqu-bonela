/** Utilidades puras del flujo de revisión por enlace privado. */

export const TOKEN_RE = /^[A-Za-z0-9_-]{40,90}$/;

export type Hour = { weekday: number; opens: string; closes: string };

export type ReviewListing = {
  id: string;
  slug: string;
  type: "comercio" | "profesional";
  name: string;
  status: string;
  activity: string | null;
  labels: string[];
  description: string;
  cover_url: string | null;
  gallery_urls: string[];
  featured: boolean;
  urgent_24h: boolean;
  categoryName: string | null;
};

export type ReviewContact = {
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  show_phone: boolean;
  show_whatsapp: boolean;
  show_address: boolean;
  owner_name: string | null;
};

export type ReviewData =
  | { ok: false; reason: "invalid" | "expired" }
  | { ok: true; done: boolean; expiresAt: string; listing: ReviewListing; contact: ReviewContact | null; hours: Hour[] };

export type SubmitResult = { ok: true; url: string | null } | { ok: false; reason: "invalid" | "expired" };

/** Rellena {nombre} y {enlace} en la plantilla configurada; sin plantilla usa el texto por defecto. */
export function reviewMessage(ownerName: string | null, url: string, template?: string | null) {
  if (template && template.trim()) {
    const t = template.includes("{enlace}") ? template : `${template} {enlace}`;
    return t.replace(/\s*\{nombre\}/g, ownerName ? ` ${ownerName}` : "").replace(/\{enlace\}/g, url);
  }
  return `Hola${ownerName ? ` ${ownerName}` : ""}: este es tu enlace privado para revisar y autorizar la publicación de tu ficha en Aquí Bonela (válido 30 días): ${url}`;
}

export function whatsappShareUrl(message: string, phone?: string | null) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  const base = digits.length >= 9 ? `https://wa.me/${digits}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(message)}`;
}
