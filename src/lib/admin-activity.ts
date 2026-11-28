/**
 * Actividad reciente del panel a partir de public.admin_audit_log (quién, cuándo y qué operación;
 * nunca valores). Convierte cada operación en una frase y descarta las que son parte de otra (por
 * ejemplo, los cambios en las tablas publicadas que hace una publicación). Apto para navegador.
 */
import { draftScreen } from "./content-workflow";

export type AuditEntry = {
  id: number;
  occurred_at: string;
  operation: "insert" | "update" | "delete" | string;
  table_name: string;
  record_key: string;
  changed_columns: string[];
  state: string | null;
  actor: string | null;
  actor_role: string;
};

export type ActivityItem = {
  id: number;
  at: string;
  text: string;
  to?: string;
  params?: Record<string, string>;
};

const INTERNAL_SETTINGS = new Set([
  "contact_email",
  "admin_whatsapp",
  "collaborator_months",
  "whatsapp_template",
  "common_labels",
  "publish_on_owner_approval",
]);

const LISTING_STATUS: Record<string, string> = {
  borrador: "borrador",
  pendiente: "pendiente de aprobación",
  publicada: "publicada",
  rechazada: "rechazada",
  oculta: "oculta",
};

/**
 * Frases de la actividad, de la más reciente a la más antigua, sin las operaciones internas de una
 * publicación ni las de la instalación (sin autor). Las del servidor (service_role) son las del
 * titular de una ficha al aceptar su revisión. `listingName` da el nombre de una ficha.
 */
export function describeActivity(
  entries: AuditEntry[],
  listingName: (id: string) => string | undefined = () => undefined,
): ActivityItem[] {
  const publications = new Set(
    entries
      .filter((e) => e.table_name === "content_publications" && e.operation === "insert")
      .map((e) => `${e.occurred_at}|${e.state ?? ""}`),
  );
  const items: ActivityItem[] = [];
  for (const e of entries) {
    if (!e.actor && e.actor_role !== "service_role") continue;
    const item = describe(e, publications, listingName);
    if (item) items.push({ id: e.id, at: e.occurred_at, ...item });
  }
  return items;
}

function describe(
  e: AuditEntry,
  publications: Set<string>,
  listingName: (id: string) => string | undefined,
): Omit<ActivityItem, "id" | "at"> | null {
  switch (e.table_name) {
    case "content_publications": {
      if (e.operation !== "insert") return null;
      const screen = draftScreen(e.state ?? "");
      return {
        text: `Publicado: ${screen?.label ?? e.state ?? ""}`,
        ...(screen ? { to: screen.to } : {}),
      };
    }
    case "content_drafts": {
      const screen = draftScreen(e.record_key);
      const label = screen?.label ?? e.record_key;
      const link = screen ? { to: screen.to } : {};
      if (e.operation === "insert") return { text: `Borrador nuevo: ${label}`, ...link };
      if (e.operation === "delete")
        // Publicar borra el borrador en la misma operación: ya consta como publicación.
        return publications.has(`${e.occurred_at}|${e.record_key}`)
          ? null
          : { text: `Borrador descartado: ${label}`, ...link };
      if (e.changed_columns.includes("content"))
        return { text: `Borrador guardado: ${label}`, ...link };
      if (e.state === "presentado")
        return { text: `Presentado al Ayuntamiento: ${label}`, ...link };
      if (e.state === "conforme") return { text: `Conformidad registrada: ${label}`, ...link };
      if (e.state === "borrador") return { text: `Vuelve a borrador: ${label}`, ...link };
      return null;
    }
    case "site_settings": {
      // Los textos públicos cambian al publicar (ya consta); aquí solo los ajustes internos.
      if (e.operation !== "update" || !e.changed_columns.some((c) => INTERNAL_SETTINGS.has(c)))
        return null;
      return { text: "Ajustes generales guardados", to: "/admin/configuracion/ajustes" };
    }
    case "listings": {
      const name = listingName(e.record_key) ?? "una ficha";
      const link =
        e.operation === "delete" ? {} : { to: "/admin/fichas/$id", params: { id: e.record_key } };
      if (e.operation === "insert") return { text: `Ficha creada: ${name}`, ...link };
      if (e.operation === "delete") return { text: "Ficha eliminada" };
      if (e.changed_columns.includes("status"))
        return {
          text: `Ficha ${LISTING_STATUS[e.state ?? ""] ?? "actualizada"}: ${name}`,
          ...link,
        };
      return { text: `Ficha modificada: ${name}`, ...link };
    }
    case "consents":
      return e.operation === "insert"
        ? {
            text: `El titular aceptó la revisión: ${listingName(e.record_key.split(":")[0] ?? "") ?? "una ficha"}`,
          }
        : null;
    case "approval_tokens":
      return e.operation === "insert"
        ? {
            text: `Enlace de revisión creado: ${listingName(e.record_key.split(":")[0] ?? "") ?? "una ficha"}`,
          }
        : null;
    case "user_roles":
      return { text: "Permisos de administración modificados" };
    case "procedures":
      return {
        text:
          e.operation === "insert"
            ? "Trámite creado"
            : e.operation === "delete"
              ? "Trámite eliminado"
              : "Trámite modificado",
        to: "/admin/tramites",
      };
    case "categories":
    case "activities":
      return { text: "Clasificación del Directorio modificada", to: "/admin/directorio" };
    default:
      return null;
  }
}
