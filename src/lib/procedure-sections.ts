import { z } from "zod";
import { mapContent, record, type Content } from "./content-translations";

const url = z
  .string()
  .refine((v) => !v || /^(https?:\/\/|tel:|mailto:|\/[^/])/.test(v), "Enlace no válido");
const link = z.object({ label: z.string(), url });
const base = { id: z.string() };
export const procedureElementSchema = z.discriminatedUnion("kind", [
  z.object({ ...base, kind: z.literal("text"), text: z.string() }),
  z.object({
    ...base,
    kind: z.literal("list"),
    title: z.string(),
    items: z.array(z.object({ title: z.string(), description: z.string() })),
  }),
  z.object({
    ...base,
    kind: z.literal("steps"),
    items: z.array(
      z.object({ grupo: z.string(), t: z.string(), d: z.array(z.string()), link: link.optional() }),
    ),
  }),
  z.object({
    ...base,
    kind: z.literal("places"),
    items: z.array(
      z.object({
        title: z.string(),
        subtitle: z.string(),
        description: z.array(z.string()),
        details: z.array(z.object({ label: z.string(), value: z.string(), href: url.optional() })),
        note: z.string(),
        link: link.optional(),
      }),
    ),
  }),
  z.object({
    ...base,
    kind: z.literal("value"),
    title: z.string(),
    amount: z.string(),
    explanation: z.string(),
  }),
  z.object({ ...base, kind: z.literal("sources"), items: z.array(link) }),
  z.object({ ...base, kind: z.literal("notice"), title: z.string(), text: z.string() }),
  z.object({
    ...base,
    kind: z.literal("timing"),
    title: z.string(),
    resolution: z.string(),
    validity: z.string(),
    explanation: z.string(),
  }),
  z.object({
    ...base,
    kind: z.literal("image"),
    storagePath: z
      .string()
      .refine((v) => !v || /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.webp$/.test(v), "Imagen no válida"),
    alt: z.string(),
    caption: z.string(),
  }),
]);
export const procedureSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  visible: z.boolean().optional(),
  elements: z.array(procedureElementSchema),
});
export type ProcedureElement = z.infer<typeof procedureElementSchema>;
export type ProcedureSection = z.infer<typeof procedureSectionSchema>;
export type ElementKind = ProcedureElement["kind"];
export const ELEMENT_LABELS: Record<ElementKind, string> = {
  text: "Cuadro de texto",
  list: "Listado",
  steps: "Pasos",
  places: "Lugares",
  value: "Valor",
  sources: "Fuentes / enlaces",
  notice: "Aviso destacado",
  timing: "Plazos y vigencia",
  image: "Imagen",
};
export function newElement(kind: ElementKind, id: string = crypto.randomUUID()): ProcedureElement {
  switch (kind) {
    case "text":
      return { id, kind, text: "" };
    case "list":
      return { id, kind, title: "", items: [] };
    case "steps":
    case "places":
    case "sources":
      return { id, kind, items: [] };
    case "value":
      return { id, kind, title: "", amount: "", explanation: "" };
    case "notice":
      return { id, kind, title: "", text: "" };
    case "timing":
      return { id, kind, title: "", resolution: "", validity: "", explanation: "" };
    case "image":
      return { id, kind, storagePath: "", alt: "", caption: "" };
  }
}
export function readSections(value: unknown): ProcedureSection[] {
  const result = z.array(procedureSectionSchema).safeParse(value);
  return result.success ? result.data : [];
}
const text = (v: unknown) => (typeof v === "string" ? v : "");
const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];
const objects = (v: unknown): Content[] => (Array.isArray(v) ? v.map(record) : []);
const readLink = (v: unknown) => ({ label: text(record(v)["label"]), url: text(record(v)["url"]) });
export function elementHasContent(element: ProcedureElement): boolean {
  const filled = (...values: string[]) => values.some((v) => v.trim());
  switch (element.kind) {
    case "text":
      return filled(element.text);
    case "list":
      return element.items.some((v) => filled(v.title, v.description));
    case "steps":
      return element.items.some((v) => filled(v.t, ...v.d, v.link?.label ?? "", v.link?.url ?? ""));
    case "places":
      return element.items.some((v) =>
        filled(
          v.title,
          v.subtitle,
          ...v.description,
          v.note,
          ...v.details.flatMap((d) => [d.value, d.href ?? ""]),
        ),
      );
    case "value":
      return filled(element.title, element.amount, element.explanation);
    case "sources":
      return element.items.some((v) => Boolean(v.label.trim() && v.url.trim()));
    case "notice":
      return filled(element.title, element.text);
    case "timing":
      return filled(element.title, element.resolution, element.validity, element.explanation);
    case "image":
      return filled(element.storagePath);
  }
}

/** Adapt in memory only; retain legacy fields until the administrator saves. */
export function modularContent(
  input: Content,
  visibility: Record<string, boolean> = {},
  localize: (s: string) => string = (s) => s,
): Content {
  if (Array.isArray(input["sections"])) return input;
  const g = record(input["guia"]);
  const sections: ProcedureSection[] = [];
  const add = (key: string, title: string, elements: ProcedureElement[]) => {
    const populated = elements.filter(elementHasContent);
    if (populated.length)
      sections.push({
        id: `legacy-${key}`,
        title: localize(title),
        visible: visibility[key] !== false,
        elements: populated,
      });
  };
  const paragraph = (id: string, value: unknown): ProcedureElement => ({
    id,
    kind: "text",
    text: Array.isArray(value) ? strings(value).join("\n\n") : text(value),
  });
  const list = (id: string, value: unknown, title = ""): ProcedureElement => ({
    id,
    kind: "list",
    title,
    items: strings(value).map((v) => ({ title: v, description: "" })),
  });
  add("para", "¿Para qué sirve?", [
    paragraph("para-intro", g["paraIntro"]),
    list("para-list", input["para"]),
    paragraph("para-note", g["paraNota"]),
  ]);
  add("quien", "¿Quién puede solicitarlo?", [
    paragraph("quien-intro", g["quienIntro"]),
    list("quien-list", input["quien"]),
    paragraph("quien-note", g["quienNota"]),
  ]);
  add("necesitas", "¿Qué necesitas?", [
    paragraph("necesitas-intro", g["necesitasIntro"]),
    list("necesitas-list", input["necesitas"]),
    ...objects(input["requisitosGrupos"]).map((v, i) =>
      list(`requisitos-${i}`, v["requisitos"], text(v["title"])),
    ),
    paragraph("necesitas-note", g["necesitasNota"]),
  ]);
  const steps = objects(g["pasos"] ?? input["pasos"]).map((v) => ({
    grupo: text(v["grupo"]),
    t: text(v["t"]),
    d: Array.isArray(v["d"]) ? strings(v["d"]) : [text(v["d"])],
    link: readLink(v["link"]),
  }));
  add("pasos", "¿Cómo hacerlo paso a paso?", [{ id: "pasos-list", kind: "steps", items: steps }]);
  const places = objects(g["lugares"]).map((v) => ({
    title: text(v["title"]),
    subtitle: text(v["subtitle"]),
    description: strings(v["description"]),
    details: objects(v["details"]).map((d) => ({
      label: text(d["label"]),
      value: text(d["value"]),
      href: text(d["href"]),
    })),
    note: text(v["note"]),
    link: readLink(v["link"]),
  }));
  if (!places.length && text(input["donde"]))
    places.push({
      title: text(input["donde"]),
      subtitle: "",
      description: [],
      details: [],
      note: "",
      link: readLink(null),
    });
  add("lugares", "¿Dónde puedo realizarlo?", [
    { id: "lugares-list", kind: "places", items: places },
  ]);
  add("coste", "¿Cuánto cuesta?", [
    {
      id: "coste-value",
      kind: "value",
      title: text(g["costeTitulo"]),
      amount: text(g["costeImporte"] ?? input["coste"]),
      explanation: text(g["costeTexto"]),
    },
  ]);
  add("ayuda", "Ayuda y acompañamiento", [paragraph("ayuda-text", g["ayuda"] ?? input["ayuda"])]);
  const a = record(g["aclaracion"]);
  add("aclaracion", text(a["titulo"]) || "Aclaración importante", [
    paragraph("aclaracion-intro", a["introduccion"]),
    list("aclaracion-list", a["puntos"]),
    paragraph("aclaracion-note", a["nota"]),
  ]);
  add("seguridad", "Consejo de seguridad", [
    { id: "seguridad-notice", kind: "notice", title: "", text: text(g["seguridad"]) },
  ]);
  add("fuentes", "Fuentes oficiales", [
    { id: "fuentes-links", kind: "sources", items: objects(g["fuentes"]).map(readLink) },
  ]);
  add("links", "Otros enlaces", [
    { id: "otros-links", kind: "sources", items: objects(input["links"]).map(readLink) },
  ]);
  add("revision", "Información revisada", [paragraph("revision-text", g["revision"])]);
  return { ...input, sections, notes: text(input["notes"]) };
}

/** Structure is owned by Spanish; translated text follows persistent element IDs. */
export function alignedModuleContent(source: Content, target: Content): Content {
  const original = readSections(source["sections"]),
    translated = readSections(target["sections"]);
  return {
    ...target,
    sections: original.map((section) => {
      const match = translated.find((v) => v.id === section.id);
      return {
        ...section,
        title: match?.title ?? "",
        elements: section.elements.map((element) => {
          const version = match?.elements.find(
            (v) => v.id === element.id && v.kind === element.kind,
          );
          if (element.kind === "image")
            return {
              ...element,
              alt: version?.kind === "image" ? version.alt : "",
              caption: version?.kind === "image" ? version.caption : "",
            };
          return version ?? mapContent(element, () => "");
        }),
      };
    }),
    notes: text(target["notes"]),
  };
}
