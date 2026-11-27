/**
 * Estados de las fichas para el panel y el enlace de revisión (navegador y servidor).
 * La publicación (listings.status) y la revisión del titular (deducida del registro de la base)
 * se combinan en un único estado legible. La base de datos aplica la misma regla de publicación:
 * esto solo evita ofrecer opciones que la base rechazaría.
 */
import type { Status } from "./admin";

export type ReviewState =
  "sin_enviar" | "en_revision" | "enlace_caducado" | "correcciones" | "aprobada" | "retirada";

/** Versión de las condiciones que acepta el titular. Cambiarla exige revisar REVIEW_TERMS. */
export const REVIEW_TERMS_VERSION = "2026-12-v2";
export const REVIEW_TERMS = [
  "Los datos de esta ficha son correctos y puedo publicarlos.",
  "Autorizo a {app} a mostrar en su web los datos de contacto que he marcado como visibles.",
  "Puedo pedir que se corrijan o retirar esta autorización en cualquier momento escribiendo a {app}.",
];

export type DisplayState = {
  key: string;
  label: string;
  tone: "neutral" | "info" | "warning" | "success" | "muted";
};

export function displayState(status: Status, review: ReviewState): DisplayState {
  if (status === "publicada")
    return review === "correcciones"
      ? { key: "publicada", label: "Publicada · el titular pide cambios", tone: "warning" }
      : review === "en_revision"
        ? { key: "publicada", label: "Publicada · en nueva revisión", tone: "info" }
        : { key: "publicada", label: "Publicada", tone: "success" };
  if (status === "oculta")
    return review === "retirada"
      ? { key: "oculta", label: "Oculta · consentimiento retirado", tone: "muted" }
      : { key: "oculta", label: "Oculta", tone: "muted" };
  if (status === "rechazada") return { key: "rechazada", label: "Rechazada", tone: "muted" };
  if (review === "aprobada")
    return { key: "aprobada", label: "Aprobada · lista para publicar", tone: "success" };
  if (review === "correcciones")
    return { key: "correcciones", label: "Pendiente de correcciones", tone: "warning" };
  if (review === "en_revision")
    return { key: "en_revision", label: "En revisión por el titular", tone: "info" };
  if (review === "enlace_caducado")
    return { key: "en_revision", label: "Enlace de revisión caducado", tone: "warning" };
  if (review === "retirada")
    return { key: "borrador", label: "Borrador · consentimiento retirado", tone: "muted" };
  return status === "pendiente"
    ? { key: "en_revision", label: "En revisión", tone: "info" }
    : { key: "borrador", label: "Borrador", tone: "neutral" };
}

/** ¿Permite la base publicar esta ficha ahora? (misma regla que listings_publish_rule) */
export function canPublish(l: {
  status: Status;
  type: string;
  review: ReviewState;
  publishedBefore: boolean;
}): boolean {
  if (l.status === "publicada" || l.type === "publico" || l.review === "aprobada") return true;
  return l.status === "oculta" && l.publishedBefore && l.review !== "retirada";
}

export const OWNER_APPROVAL_REQUIRED =
  "Esta ficha necesita la aprobación de su titular antes de publicarse. Genera un enlace de revisión y envíaselo.";

const RELEVANT: { key: string; label: string; from: "listing" | "contact" }[] = [
  { key: "name", label: "Nombre", from: "listing" },
  { key: "short_description", label: "Descripción corta", from: "listing" },
  { key: "description", label: "Descripción", from: "listing" },
  { key: "service_area", label: "Zona de servicio", from: "listing" },
  { key: "phone", label: "Teléfono", from: "contact" },
  { key: "phone_2", label: "Segundo teléfono", from: "contact" },
  { key: "whatsapp", label: "WhatsApp", from: "contact" },
  { key: "email", label: "Correo", from: "contact" },
  { key: "address", label: "Dirección", from: "contact" },
  { key: "street", label: "Calle", from: "contact" },
  { key: "street_number", label: "Número", from: "contact" },
  { key: "locality", label: "Localidad", from: "contact" },
  { key: "website", label: "Página web", from: "contact" },
];

const norm = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

/**
 * Datos relevantes que han cambiado desde lo que aprobó el titular (la copia guardada con su
 * aprobación). Si hay cambios, conviene enviarle un enlace nuevo.
 */
export function relevantChanges(
  snapshot: unknown,
  current: { listing: Record<string, unknown>; contact: Record<string, unknown> },
): string[] {
  if (!snapshot || typeof snapshot !== "object") return [];
  const s = snapshot as {
    listing?: Record<string, unknown>;
    contact?: Record<string, unknown> | null;
  };
  return RELEVANT.filter(({ key, from }) => {
    const before = from === "listing" ? s.listing?.[key] : s.contact?.[key];
    const now = from === "listing" ? current.listing[key] : current.contact[key];
    return norm(before) !== norm(now);
  }).map((r) => r.label);
}

export const EVENT_LABELS: Record<string, string> = {
  estado: "Cambio de estado",
  enlace: "Enlace de revisión enviado",
  aprobacion: "Aprobada por el titular",
  correcciones: "El titular pidió correcciones",
  retirada: "Consentimiento retirado",
};
