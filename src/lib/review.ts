/** Utilidades puras del flujo de revisión por enlace privado. */
import { brand } from "@/config/municipality";

export const TOKEN_RE = /^[A-Za-z0-9_-]{40,90}$/;

export type Hour = { weekday: number; opens: string; closes: string };

export type ReviewListing = {
  id: string;
  slug: string;
  type: "comercio" | "profesional" | "publico" | "asociacion";
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
  categorySlug: string | null;
  short_description: string;
  featured_until: string | null;
  tags: string[];
  public_website: string | null;
  category_id: string | null;
  photos: { url: string; alt: string }[];
};

export type ReviewContact = {
  phone: string | null;
  phone_2: string | null;
  whatsapp: string | null;
  address: string | null;
  email: string | null;
  linkedin: string | null;
  facebook: string | null;
  youtube: string | null;
  x_twitter: string | null;
  instagram: string | null;
  tiktok: string | null;
  show_phone: boolean;
  show_phone_2: boolean;
  show_whatsapp: boolean;
  show_address: boolean;
  show_email: boolean;
  show_linkedin: boolean;
  show_facebook: boolean;
  show_youtube: boolean;
  show_x_twitter: boolean;
  show_instagram: boolean;
  show_tiktok: boolean;
  owner_name: string | null;
};

export type ReviewVisibility = Pick<ReviewContact,
  "show_phone" | "show_phone_2" | "show_whatsapp" | "show_address" | "show_email" |
  "show_linkedin" | "show_facebook" | "show_youtube" | "show_x_twitter" | "show_instagram" | "show_tiktok"
> & { show_hours: boolean };

/** Campos que quedan registrados en el consentimiento del titular. */
export function authorizedContactFields(show: ReviewVisibility) {
  return [
    show.show_phone ? "teléfono" : null,
    show.show_phone_2 ? "segundo teléfono" : null,
    show.show_whatsapp ? "whatsapp" : null,
    show.show_address ? "dirección" : null,
    show.show_email ? "email" : null,
    show.show_linkedin ? "linkedin" : null,
    show.show_facebook ? "facebook" : null,
    show.show_youtube ? "youtube" : null,
    show.show_x_twitter ? "x_twitter" : null,
    show.show_instagram ? "instagram" : null,
    show.show_tiktok ? "tiktok" : null,
    show.show_hours ? "horario" : null,
  ].filter((field): field is string => field !== null);
}

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
  return brand(`Hola${ownerName ? ` ${ownerName}` : ""}: este es tu enlace privado para revisar y autorizar la publicación de tu ficha en {app} (válido 30 días): ${url}`);
}

export function whatsappShareUrl(message: string, phone?: string | null) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  const base = digits.length >= 9 ? `https://wa.me/${digits}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(message)}`;
}
