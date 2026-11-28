/**
 * Circuito de publicación del contenido municipal (etapa 2B). Apto para navegador.
 *
 *   borrador → presentado al Ayuntamiento → conformidad registrada → publicado
 *
 * El Ayuntamiento no usa el panel: da su conformidad fuera de la plataforma y Groundwork la
 * registra (quién, fecha, medio y referencia). Publicar exige esa conformidad y la revisión final de
 * Groundwork. Las reglas se aplican en la base de datos (submit_content_draft,
 * record_content_conformity, publish_content_draft…); aquí solo se llaman y se explican sus
 * respuestas. El Directorio tiene su propio circuito (aceptación del titular) y no pasa por aquí.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { setSiteConfig } from "@/config/municipality";
import { CONFIGURABLE_PAGES, type ConfigurablePage } from "./site-structure";
import { PAGE_KEYS, parseSiteConfig, type PageKey } from "./site-identity";

export type DraftStatus = "borrador" | "presentado" | "conforme";

/** Pantallas de contenido municipal con borrador (las mismas claves que admite la base). */
export type DraftKey =
  | "menu"
  | "accesos"
  | "portada"
  | "aviso-cabecera"
  | "identidad"
  | "datos-legales"
  | `secciones:${ConfigurablePage}`
  | `cabecera:${PageKey}`;

export const CONFORMITY_CHANNELS = [
  { value: "correo", label: "Correo electrónico" },
  { value: "reunion", label: "Reunión" },
  { value: "telefono", label: "Llamada telefónica" },
  { value: "documento", label: "Documento firmado" },
  { value: "otro", label: "Otro medio" },
] as const;
export type ConformityChannel = (typeof CONFORMITY_CHANNELS)[number]["value"];

export interface Conformity {
  by: string;
  on: string;
  channel: ConformityChannel;
  reference: string | null;
  recordedAt: string;
}

/** Estado de una pantalla: lo publicado y, si existe, su borrador. */
export interface DraftState<T = unknown> {
  published: T;
  draft: null | {
    content: T;
    status: DraftStatus;
    updatedAt: string;
    createdAt: string;
    submittedAt: string | null;
    /** Lo publicado cambió después de empezar el borrador: hay que descartarlo y empezar otro. */
    stale: boolean;
    conformity: Conformity | null;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
const str = (value: unknown) => (typeof value === "string" ? value : "");

const STATUSES: readonly DraftStatus[] = ["borrador", "presentado", "conforme"];
const CHANNELS = CONFORMITY_CHANNELS.map((c) => c.value) as readonly string[];

/** Convierte la respuesta de content_draft_state(). Nunca lanza. */
export function parseDraftState(raw: unknown): DraftState {
  if (!isRecord(raw)) return { published: null, draft: null };
  if (raw["exists"] !== true) return { published: raw["published"] ?? null, draft: null };
  const status = STATUSES.includes(raw["status"] as DraftStatus)
    ? (raw["status"] as DraftStatus)
    : "borrador";
  const c = raw["conformity"];
  const conformity =
    isRecord(c) && CHANNELS.includes(str(c["channel"]))
      ? {
          by: str(c["by"]),
          on: str(c["on"]),
          channel: c["channel"] as ConformityChannel,
          reference: typeof c["reference"] === "string" ? c["reference"] : null,
          recordedAt: str(c["recorded_at"]),
        }
      : null;
  return {
    published: raw["published"] ?? null,
    draft: {
      content: raw["content"] ?? null,
      status,
      updatedAt: str(raw["updated_at"]),
      createdAt: str(raw["created_at"]),
      submittedAt: typeof raw["submitted_at"] === "string" ? raw["submitted_at"] : null,
      stale: raw["stale"] === true,
      conformity: status === "conforme" ? conformity : null,
    },
  };
}

/** Qué se puede hacer con el borrador en su estado actual. */
export function draftActions(state: DraftState, dirty: boolean) {
  const draft = state.draft;
  const status = draft?.status;
  const blocked = Boolean(draft?.stale);
  return {
    /** Guardar crea el borrador o lo actualiza; si estaba presentado, vuelve a «borrador». */
    save: dirty,
    submit: !dirty && status === "borrador" && !blocked,
    recordConformity: !dirty && status === "presentado" && !blocked,
    returnToDraft: !dirty && (status === "presentado" || status === "conforme"),
    publish: !dirty && status === "conforme" && !blocked,
    discard: Boolean(draft) || dirty,
  };
}

export const STATUS_LABELS: Record<DraftStatus | "publicado", string> = {
  publicado: "Publicado, sin cambios pendientes",
  borrador: "Borrador",
  presentado: "Presentado al Ayuntamiento",
  conforme: "Conformidad registrada",
};

/** Siguiente paso, para que cada estado diga qué falta. */
export const STATUS_HINTS: Record<DraftStatus | "publicado", string> = {
  publicado: "Lo que ves es lo que está publicado. Cualquier cambio se guarda como borrador.",
  borrador:
    "Cuando el borrador esté listo, preséntalo al Ayuntamiento. Mientras tanto, la web sigue mostrando lo publicado.",
  presentado:
    "Pendiente de la conformidad del Ayuntamiento. Cuando la recibas, regístrala; si piden cambios, vuelve a borrador.",
  conforme:
    "El Ayuntamiento ha dado su conformidad. Revisa la versión final y publícala. Si cambias algo, habrá que volver a presentarla.",
};

// ---------- Errores de la base ----------

export interface DbError {
  code?: string | undefined;
  hint?: string | null | undefined;
  message?: string | undefined;
}

export class WorkflowError extends Error {
  constructor(
    readonly kind:
      | "draft_changed"
      | "draft_exists"
      | "published_changed"
      | "conformity_required"
      | "invalid_state"
      | "invalid_conformity"
      | "invalid_content"
      | "missing_asset"
      | "forbidden"
      | "network",
    message: string,
  ) {
    super(message);
  }
}

/** Explica en lenguaje del panel la respuesta de la base. */
export function workflowError(error: DbError | null | undefined): WorkflowError {
  const hint = error?.hint ?? "";
  const detail = error?.message ?? "";
  if (error?.code === "42501")
    return new WorkflowError("forbidden", "Esta cuenta no tiene permisos de administración.");
  switch (hint) {
    case "draft_changed":
      return new WorkflowError(
        "draft_changed",
        "El borrador cambió en otra sesión mientras lo tenías abierto. Recarga para ver la versión actual.",
      );
    case "draft_exists":
      return new WorkflowError(
        "draft_exists",
        "Ya hay un borrador de esta pantalla, empezado en otra sesión. Recarga para continuarlo.",
      );
    case "published_changed":
      return new WorkflowError(
        "published_changed",
        "Lo publicado cambió después de empezar este borrador. Descártalo y empieza uno nuevo sobre la versión actual.",
      );
    case "conformity_required":
      return new WorkflowError(
        "conformity_required",
        "Para publicar hace falta la conformidad municipal registrada y tu revisión final.",
      );
    case "invalid_state":
      return new WorkflowError(
        "invalid_state",
        "El borrador ya no está en ese paso. Recarga para ver su estado.",
      );
    case "invalid_conformity":
      return new WorkflowError(
        "invalid_conformity",
        detail || "Revisa los datos de la conformidad.",
      );
    case "invalid_content":
      return new WorkflowError(
        "invalid_content",
        "El contenido tiene algún valor que no se puede publicar. Revisa los campos y guarda de nuevo.",
      );
    case "missing_asset":
      return new WorkflowError(
        "missing_asset",
        "Falta alguna imagen del borrador en el almacenamiento. Vuelve a subirla.",
      );
  }
  return new WorkflowError(
    "network",
    "No se pudo completar. Comprueba tu conexión y vuelve a intentarlo.",
  );
}

// ---------- Llamadas ----------

async function rpc<T extends string>(
  name: T,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  // Las funciones existen en la base; el cliente tipado no admite nombres dinámicos.
  const { data, error } = await (
    supabase.rpc as unknown as (
      fn: string,
      params: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: DbError | null }>
  )(name, args);
  if (error) throw workflowError(error);
  return isRecord(data) ? data : {};
}

export async function loadDraftState(key: DraftKey): Promise<DraftState> {
  return parseDraftState(await rpc("content_draft_state", { p_key: key }));
}

/** Guarda el borrador. Sin versión, lo crea; con ella, lo actualiza si nadie lo cambió. */
export async function saveDraft(
  key: DraftKey,
  content: Json,
  expectedUpdatedAt: string | null,
): Promise<string> {
  const data = await rpc("save_content_draft", {
    p_key: key,
    p_content: content,
    ...(expectedUpdatedAt ? { p_expected_updated_at: expectedUpdatedAt } : {}),
  });
  return str(data["updated_at"]);
}

export async function submitDraft(key: DraftKey, expectedUpdatedAt: string): Promise<string> {
  const data = await rpc("submit_content_draft", {
    p_key: key,
    p_expected_updated_at: expectedUpdatedAt,
  });
  return str(data["updated_at"]);
}

export interface ConformityInput {
  by: string;
  on: string;
  channel: ConformityChannel | "";
  reference: string;
}

/** Validación de la conformidad en el panel (la base vuelve a comprobarla). */
export function validateConformity(
  input: ConformityInput,
  submittedAt: string | null,
  today = new Date(),
): Partial<Record<keyof ConformityInput, string>> {
  const errors: Partial<Record<keyof ConformityInput, string>> = {};
  const by = input.by.replace(/\s+/g, " ").trim();
  if (by.length < 2 || by.length > 120)
    errors.by = "Indica quién dio la conformidad (de 2 a 120 caracteres).";
  else if (/[<>{}]/.test(by)) errors.by = "No uses los símbolos < > { }.";
  if (!CHANNELS.includes(input.channel)) errors.channel = "Elige el medio por el que se recibió.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.on)) errors.on = "Indica la fecha.";
  else {
    const day = (iso: string) => iso.slice(0, 10);
    const local = new Date(today.getTime() - today.getTimezoneOffset() * 60_000).toISOString();
    if (input.on > day(local)) errors.on = "La fecha no puede ser futura.";
    else if (submittedAt && input.on < day(submittedAt))
      errors.on = "La fecha no puede ser anterior a la presentación al Ayuntamiento.";
  }
  const reference = input.reference.trim();
  if (reference.length > 200) errors.reference = "Máximo 200 caracteres.";
  else if (/[<>{}]/.test(reference)) errors.reference = "No uses los símbolos < > { }.";
  return errors;
}

export async function recordConformity(
  key: DraftKey,
  expectedUpdatedAt: string,
  input: ConformityInput,
): Promise<string> {
  const data = await rpc("record_content_conformity", {
    p_key: key,
    p_expected_updated_at: expectedUpdatedAt,
    p_by: input.by.trim(),
    p_on: input.on,
    p_channel: input.channel,
    p_reference: input.reference.trim() || null,
  });
  return str(data["updated_at"]);
}

export async function returnDraft(key: DraftKey, expectedUpdatedAt: string): Promise<string> {
  const data = await rpc("return_content_draft", {
    p_key: key,
    p_expected_updated_at: expectedUpdatedAt,
  });
  return str(data["updated_at"]);
}

/** Publica: p_conformity es la revisión final de Groundwork, que el panel pide confirmar. */
export async function publishDraft(
  key: DraftKey,
  expectedUpdatedAt: string,
  reviewed: boolean,
  note: string,
): Promise<string> {
  const data = await rpc("publish_content_draft", {
    p_key: key,
    p_expected_updated_at: expectedUpdatedAt,
    p_conformity: reviewed,
    p_note: note.trim() || null,
  });
  return str(data["published_at"]);
}

export async function discardDraft(key: DraftKey, expectedUpdatedAt: string): Promise<void> {
  await rpc("discard_content_draft", { p_key: key, p_expected_updated_at: expectedUpdatedAt });
}

/**
 * Tras publicar, la sesión del administrador ve lo publicado al momento (los visitantes, al
 * renovarse la caché del servidor, en un minuto como máximo). Si falla, no pasa nada: se verá al
 * recargar.
 */
export async function refreshSessionSiteConfig(): Promise<void> {
  const { data, error } = await supabase.rpc("site_config");
  if (!error && data) setSiteConfig(parseSiteConfig(data));
}

// ---------- Pantallas ----------

/** Nombre y pantalla del panel de cada borrador, para Inicio y la actividad reciente. */
export function draftScreen(key: string): { label: string; to: string } | null {
  const fixed: Record<string, { label: string; to: string }> = {
    identidad: { label: "Identidad municipal", to: "/admin/identidad" },
    portada: { label: "Directorio: textos de presentación", to: "/admin/directorio/presentacion" },
    "aviso-cabecera": { label: "Portada: aviso de cabecera", to: "/admin/portada/aviso" },
    accesos: { label: "Portada: accesos directos", to: "/admin/portada/accesos" },
    menu: { label: "Menú de navegación", to: "/admin/configuracion" },
    "datos-legales": { label: "Datos legales", to: "/admin/configuracion/legal" },
  };
  if (fixed[key]) return fixed[key];
  const [kind, page] = key.split(":");
  if (kind === "secciones" && (CONFIGURABLE_PAGES as readonly string[]).includes(page ?? ""))
    return {
      label: `Secciones: ${SCREEN_PAGE_LABELS[page as ConfigurablePage]}`,
      to: `/admin/${page}`,
    };
  if (kind === "cabecera" && (PAGE_KEYS as readonly string[]).includes(page ?? ""))
    return {
      label: `Cabecera: ${HEADER_PAGE_LABELS[page as PageKey]}`,
      to: HEADER_ROUTES[page as PageKey],
    };
  return null;
}

const SCREEN_PAGE_LABELS: Record<ConfigurablePage, string> = {
  "servicios-publicos": "Servicios públicos",
  actualidad: "Actualidad",
  descubre: "Descubre",
};

const HEADER_PAGE_LABELS: Record<PageKey, string> = {
  inicio: "Portada",
  directorio: "Directorio",
  "servicios-publicos": "Servicios públicos",
  tramites: "Guía de trámites",
  descubre: "Descubre",
  tablon: "Tablón",
  actualidad: "Actualidad",
};

/** Pantalla del panel donde se edita la cabecera de cada página. */
export const HEADER_ROUTES: Record<PageKey, string> = {
  inicio: "/admin/portada",
  directorio: "/admin/directorio/presentacion",
  "servicios-publicos": "/admin/servicios-publicos",
  tramites: "/admin/tramites",
  descubre: "/admin/descubre",
  tablon: "/admin/actualidad",
  actualidad: "/admin/actualidad",
};
