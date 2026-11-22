import { z } from "zod";
import { TRAMITES, type Tramite } from "@/lib/tramites";
import { englishText } from "@/lib/i18n-extra";
import { hasProcedureLink } from './procedure-display';
import { procedureSectionSchema } from './procedure-sections';

const url = z.string().refine((v) => !v || /^(https?:\/\/|tel:|\/[^/])/.test(v), "Enlace no válido");
const link = z.object({ label: z.string(), url });
export const procedureContentSchema = z.object({
  title: z.string(), short: z.string(), summary: z.string().optional(),
  sections: z.array(procedureSectionSchema).optional(), notes: z.string().optional(),
  slug: z.string(), cat: z.string(), tags: z.array(z.enum(["gratis", "online", "presencial"])).optional(),
  primaryAction: link.optional(), para: z.array(z.string()).optional(), quien: z.array(z.string()).optional(),
  necesitas: z.array(z.string()).optional(), requisitosGrupos: z.array(z.object({ title: z.string(), requisitos: z.array(z.string()) })).optional(), pasos: z.array(z.object({ t: z.string(), d: z.string() })).optional(),
  coste: z.string().optional(), donde: z.string().optional(), ayuda: z.string().optional(), links: z.array(link),
  guia: z.object({
    paraIntro: z.string().optional(), paraNota: z.string().optional(), necesitasIntro: z.string().optional(),
    quienIntro: z.string(), quienNota: z.string(), necesitasNota: z.string(),
    pasos: z.array(z.object({ t: z.string(), d: z.array(z.string()), link: link.optional(), grupo: z.string().optional() })),
    lugares: z.array(z.object({ title: z.string(), subtitle: z.string(), description: z.array(z.string()),
      details: z.array(z.object({ label: z.string(), value: z.string(), href: url.optional() })).optional(),
      note: z.string().optional(), link: link.optional() })),
    fuentes: z.array(link), costeTitulo: z.string(), costeImporte: z.string(), costeTexto: z.string(),
    ayuda: z.array(z.string()).optional(),
    aclaracion: z.object({ titulo: z.string(), introduccion: z.string(), puntos: z.array(z.string()), nota: z.string() }).optional(),
    seguridad: z.string().optional(), revision: z.string(),
  }).optional(),
}).passthrough();

export const PROCEDURE_SECTIONS = [
  { key: "short", title: "Descripción completa" },
  { key: "primaryAction", title: "Botón principal" },
  { key: "tags", title: "Etiquetas" },
  { key: "para", title: "¿Para qué sirve?" },
  { key: "quien", title: "¿Quién puede solicitarlo?" },
  { key: "necesitas", title: "¿Qué necesitas?" },
  { key: "pasos", title: "¿Cómo hacerlo paso a paso?" },
  { key: "lugares", title: "¿Dónde puedo realizarlo?" },
  { key: "coste", title: "¿Cuánto cuesta?" },
  { key: "ayuda", title: "Ayuda y acompañamiento" },
  { key: "aclaracion", title: "Aclaración importante" },
  { key: "seguridad", title: "Consejo de seguridad" },
  { key: "fuentes", title: "Fuentes oficiales" },
  { key: "links", title: "Otros enlaces" },
  { key: "revision", title: "Información revisada" },
] as const;
export type Visibility = Record<string, boolean>;
export const defaultVisibility = (): Visibility => Object.fromEntries(PROCEDURE_SECTIONS.map((s) => [s.key, true]));
export function readVisibility(value: unknown): Visibility {
  const parsed = z.record(z.boolean()).safeParse(value);
  return { ...defaultVisibility(), ...(parsed.success ? parsed.data : {}) };
}

/** Keep the existing guide intact while making all optional form sections editable. */
export function editableContent(t?: Tramite): Record<string, unknown> {
  const base = t ?? { title: "", short: "", slug: "", cat: "", links: [] };
  return {
    ...base, summary: base.summary ?? "", tags: base.tags ?? [],
    primaryAction: base.primaryAction ?? { label: "", url: "" },
    para: base.para ?? [], quien: base.quien ?? [], necesitas: base.necesitas ?? [], requisitosGrupos: base.requisitosGrupos ?? [],
    guia: {
      paraIntro: "", paraNota: "", quienIntro: "", quienNota: "", necesitasIntro: "", necesitasNota: "",
      pasos: base.pasos?.map((s) => ({ t: s.t, d: [s.d] })) ?? [],
      lugares: base.donde ? [{ title: base.donde, subtitle: "", description: [] }] : [],
      fuentes: [], costeTitulo: "", costeImporte: base.coste ?? "", costeTexto: "",
      ayuda: base.ayuda ? [base.ayuda] : [], seguridad: "", revision: "",
      aclaracion: { titulo: "", introduccion: "", puntos: [], nota: "" },
      ...base.guia,
    },
  };
}

export function translateContent(value: unknown, key = ""): unknown {
  if (typeof value === "string") return ["slug", "cat", "url", "href", "tags"].includes(key) ? value : englishText[value] ?? value;
  if (Array.isArray(value)) return value.map((v) => translateContent(v, key));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, translateContent(v, k)]));
  return value;
}
export function sourceKey(t: Tramite) { return `${t.cat}/${t.slug}`; }
export const existingProcedure = (key: string) => TRAMITES.find((t) => sourceKey(t) === key || t.slug === key);
export function isDeletedProcedure(row: { visibility: unknown }) {
  return readVisibility(row.visibility)['deleted'] === true;
}
export function matchesProcedureSource(row: { source_key: string | null; slug: string; category_id: string }, template: Tramite, categories: { id: string; slug: string }[]) {
  return row.source_key === sourceKey(template) || (!row.source_key && row.slug === template.slug && categories.find((c) => c.id === row.category_id)?.slug === template.cat);
}

/** A switch hides content in preview without deleting the administrator's text. */
export function visibleContent(input: Record<string, unknown>, visibility: Visibility): Record<string, unknown> {
  const result = structuredClone(input);
  const guide = result['guia'];
  for (const { key } of PROCEDURE_SECTIONS) {
    if (visibility[key] !== false) continue;
    if (key === "short") result['short'] = "";
    else if (key === "links") result['links'] = [];
    else if (["tags", "para", "quien", "necesitas", "pasos"].includes(key)) result[key] = [];
    else delete result[key];
    if (guide && typeof guide === "object" && !Array.isArray(guide)) {
      const g = guide as Record<string, unknown>;
      const guideKeys: Record<string, string[]> = {
        para: ["paraIntro", "paraNota"], quien: ["quienIntro", "quienNota"], necesitas: ["necesitasIntro", "necesitasNota"],
        coste: ["costeTitulo", "costeImporte", "costeTexto"],
      };
      for (const field of guideKeys[key] ?? [key]) g[field] = Array.isArray(g[field]) ? [] : "";
    }
  }
  if (visibility['necesitas'] === false) result['requisitosGrupos'] = [];
  else if (Array.isArray(result['requisitosGrupos'])) result['requisitosGrupos'] = result['requisitosGrupos'].filter((group) => group && typeof group === 'object' && Array.isArray(group.requisitos) && group.requisitos.some((item: unknown) => typeof item === 'string' && item.trim()));
  const prune = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(prune).filter((item) => item !== undefined);
    if (value && typeof value === 'object') {
      const fields = value as Record<string, unknown>;
      if ('url' in fields && 'label' in fields && !hasProcedureLink(fields)) return undefined;
      return Object.fromEntries(Object.entries(fields).map(([key, item]) => [key, prune(item)]).filter(([, item]) => item !== undefined));
    }
    return value;
  };
  return prune(result) as Record<string, unknown>;
}