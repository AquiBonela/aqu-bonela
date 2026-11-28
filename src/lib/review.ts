import type { HourPeriod } from "./listing-details";
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
  home_service?: boolean;
  service_area?: string;
  show_service_area?: boolean;
  cover_alt?: string;
  hours_note?: string;
  periods?: HourPeriod[];
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
  website?: string | null;
  show_website?: boolean;
  street?: string | null;
  street_number?: string | null;
  postal_code?: string | null;
  locality?: string | null;
  show_approximate_location?: boolean;
};

export type ReviewVisibility = Pick<
  ReviewContact,
  | "show_phone"
  | "show_phone_2"
  | "show_whatsapp"
  | "show_address"
  | "show_email"
  | "show_linkedin"
  | "show_facebook"
  | "show_youtube"
  | "show_x_twitter"
  | "show_instagram"
  | "show_tiktok"
> & {
  show_hours: boolean;
  show_website?: boolean;
  show_service_area?: boolean;
  show_approximate_location?: boolean;
};

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
    show.show_website ? "web" : null,
    show.show_service_area ? "zona de servicio" : null,
    !show.show_address && show.show_approximate_location ? "zona aproximada" : null,
  ].filter((field): field is string => field !== null);
}

export type ReviewData =
  | { ok: false; reason: "invalid" | "expired" }
  | {
      ok: true;
      done: boolean;
      expiresAt: string;
      listing: ReviewListing;
      contact: ReviewContact | null;
      hours: Hour[];
    };

/**
 * Resultado de autorizar o enviar correcciones. «used»: el enlace ya se usó y esta vez no se
 * aplicó nada. «error»: la base no completó la operación y no se aplicó ningún cambio.
 */
export type SubmitResult =
  | { ok: true; url: string | null; published?: boolean }
  | { ok: false; reason: "invalid" | "expired" | "used" | "error" | "invalid_message" };

/** Mensaje para el titular cuando su envío no se aplicó. */
export function submitErrorMessage(
  reason: "invalid" | "expired" | "used" | "error" | "invalid_message",
) {
  if (reason === "invalid_message") return "Explica qué hay que corregir (al menos 5 caracteres).";
  if (reason === "expired") return "El enlace ha caducado.";
  if (reason === "used")
    return "Este enlace ya se usó y la ficha ya está autorizada. Si necesitas cambiar algo, contacta con el administrador.";
  if (reason === "error")
    return "No se pudo guardar tu autorización y no se ha aplicado ningún cambio. Inténtalo de nuevo.";
  return "El enlace ya no es válido.";
}

/** Rellena {nombre} y {enlace} en la plantilla configurada; sin plantilla usa el texto por defecto. */
export function reviewMessage(ownerName: string | null, url: string, template?: string | null) {
  if (template && template.trim()) {
    const t = template.includes("{enlace}") ? template : `${template} {enlace}`;
    return t
      .replace(/\s*\{nombre\}/g, ownerName ? ` ${ownerName}` : "")
      .replace(/\{enlace\}/g, url);
  }
  return brand(
    `Hola${ownerName ? ` ${ownerName}` : ""}: este es tu enlace privado para revisar y autorizar la publicación de tu ficha en {app} (válido 30 días): ${url}`,
  );
}

export function whatsappShareUrl(message: string, phone?: string | null) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  const base = digits.length >= 9 ? `https://wa.me/${digits}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(message)}`;
}
