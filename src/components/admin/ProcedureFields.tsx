import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";

export type Field = { key: string; label: string; multiline?: boolean; url?: boolean; items?: Field[]; object?: Field[] };
const action: Field[] = [{ key: "label", label: "Texto del enlace" }, { key: "url", label: "Enlace", url: true }];
export const SECTION_FIELDS: Record<string, Field[]> = {
  short: [{ key: "short", label: "Descripción completa", multiline: true }],
  primaryAction: [{ key: "primaryAction", label: "Botón principal", object: action }],
  para: [{ key: "guia.paraIntro", label: "Introducción", multiline: true }, { key: "para", label: "Usos", items: [{ key: "", label: "Texto", multiline: true }] }, { key: "guia.paraNota", label: "Nota final", multiline: true }],
  quien: [{ key: "guia.quienIntro", label: "Introducción", multiline: true }, { key: "quien", label: "Personas destinatarias", items: [{ key: "", label: "Texto", multiline: true }] }, { key: "guia.quienNota", label: "Nota final", multiline: true }],
  necesitas: [{ key: "guia.necesitasIntro", label: "Introducción", multiline: true }, { key: "necesitas", label: "Requisitos y documentos", items: [{ key: "", label: "Texto", multiline: true }] }, { key: "guia.necesitasNota", label: "Nota final", multiline: true }],
  pasos: [{ key: "guia.pasos", label: "Pasos", items: [
    { key: "grupo", label: "Modalidad / grupo" }, { key: "t", label: "Título del paso" },
    { key: "d", label: "Explicación", items: [{ key: "", label: "Párrafo", multiline: true }] },
    { key: "link", label: "Enlace del paso", object: action },
  ] }],
  lugares: [{ key: "guia.lugares", label: "Lugares de atención", items: [
    { key: "title", label: "Nombre del lugar" }, { key: "subtitle", label: "Subtítulo" },
    { key: "description", label: "Descripción", items: [{ key: "", label: "Párrafo", multiline: true }] },
    { key: "details", label: "Datos de contacto", items: [{ key: "label", label: "Etiqueta del dato" }, { key: "value", label: "Valor" }, { key: "href", label: "Enlace", url: true }] },
    { key: "note", label: "Nota final", multiline: true }, { key: "link", label: "Enlace del lugar", object: action },
  ] }],
  coste: [{ key: "guia.costeTitulo", label: "Título" }, { key: "guia.costeImporte", label: "Importe" }, { key: "guia.costeTexto", label: "Explicación", multiline: true }],
  ayuda: [{ key: "guia.ayuda", label: "Ayuda y acompañamiento", items: [{ key: "", label: "Párrafo", multiline: true }] }],
  aclaracion: [{ key: "guia.aclaracion", label: "Aclaración importante", object: [
    { key: "titulo", label: "Título" }, { key: "introduccion", label: "Introducción", multiline: true },
    { key: "puntos", label: "Puntos", items: [{ key: "", label: "Texto", multiline: true }] }, { key: "nota", label: "Nota final", multiline: true },
  ] }],
  seguridad: [{ key: "guia.seguridad", label: "Consejo de seguridad", multiline: true }],
  fuentes: [{ key: "guia.fuentes", label: "Fuentes oficiales", items: action }],
  links: [{ key: "links", label: "Otros enlaces", items: action }],
  revision: [{ key: "guia.revision", label: "Fecha y fuente de revisión" }],
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export function fieldValue(value: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>((result, k) => record(result)[k], value);
}
export function setField(value: Record<string, unknown>, key: string, next: unknown): Record<string, unknown> {
  const [first, ...rest] = key.split('.');
  if (!first) return value;
  return { ...value, [first]: rest.length ? setField(record(value[first]), rest.join('.'), next) : next };
}
function seed(fields: Field[]): unknown {
  if (fields.length === 1 && fields[0]?.key === "") return "";
  return Object.fromEntries(fields.map((f) => [f.key, f.items ? [] : f.object ? seed(f.object) : ""]));
}

export function ProcedureFields({ fields, value, onChange, prefix = "" }: {
  fields: Field[]; value: Record<string, unknown>; onChange: (value: Record<string, unknown>) => void; prefix?: string;
}) {
  const { tr } = useI18n();
  return <div className="space-y-4">{fields.map((field) => {
    const current = fieldValue(value, field.key);
    const update = (v: unknown) => onChange(setField(value, field.key, v));
    const label = `${prefix}${tr(field.label)}`;
    if (field.object) return <fieldset key={field.key} className="min-w-0 space-y-3">
      <legend className="mb-2 text-sm font-semibold">{tr(field.label)}</legend>
      <ProcedureFields fields={field.object} value={record(current)} onChange={update} prefix={`${label} · `} />
    </fieldset>;
    if (field.items) {
      const values = Array.isArray(current) ? current : [];
      const itemFields = field.items;
      const move = (index: number, direction: number) => {
        const next = [...values];
        const target = index + direction;
        if (target < 0 || target >= next.length) return;
        [next[index], next[target]] = [next[target], next[index]];
        update(next);
      };
      return <fieldset key={field.key} className="min-w-0">
        <legend className="text-sm font-semibold">{tr(field.label)}</legend>
        {values.map((v, index) => <div key={index} className="mt-3 border-b py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted-foreground">{tr(field.label)} {index + 1}</span>
            <div className="flex shrink-0 gap-1">
              <Button type="button" variant="ghost" size="icon" aria-label={`${tr("Subir")} ${label} ${index + 1}`} title={tr("Subir")} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp /></Button>
              <Button type="button" variant="ghost" size="icon" aria-label={`${tr("Bajar")} ${label} ${index + 1}`} title={tr("Bajar")} disabled={index === values.length - 1} onClick={() => move(index, 1)}><ArrowDown /></Button>
              <Button type="button" variant="ghost" size="icon" aria-label={`${tr("Eliminar")} ${label} ${index + 1}`} title={tr("Eliminar")} onClick={() => update(values.filter((_, i) => i !== index))}><Trash2 /></Button>
            </div>
          </div>
          {itemFields.length === 1 && itemFields[0]?.key === "" ?
            <Textarea aria-label={`${label} ${index + 1}`} value={typeof v === "string" ? v : ""} onChange={(e) => update(values.map((old, i) => i === index ? e.target.value : old))} /> :
            <ProcedureFields fields={itemFields} value={record(v)} prefix={`${label} ${index + 1} · `} onChange={(next) => update(values.map((old, i) => i === index ? next : old))} />}
        </div>)}
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => update([...values, seed(itemFields)])}><Plus />{tr("Añadir")} {tr(field.label).toLowerCase()}</Button>
      </fieldset>;
    }
    return <label key={field.key} className="block text-sm font-medium">
      <span className="mb-1 block">{tr(field.label)}</span>
      {field.multiline ? <Textarea aria-label={label} value={typeof current === "string" ? current : ""} onChange={(e) => update(e.target.value)} className="min-h-24" /> :
        <Input aria-label={label} value={typeof current === "string" ? current : ""} onChange={(e) => update(e.target.value)} inputMode={field.url ? "url" : "text"} />}
    </label>;
  })}</div>;
}