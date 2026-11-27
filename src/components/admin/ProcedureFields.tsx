import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";

import { SECTION_FIELDS, type Field } from "./procedure-fields";

export type { Field };

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function fieldValue(value: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>((result, k) => record(result)[k], value);
}
function setField(value: Record<string, unknown>, key: string, next: unknown): Record<string, unknown> {
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
      {field.euro ? <div className="relative"><Input aria-label={label} className="pr-9" inputMode="decimal" value={typeof current === 'string' ? current : ''} onChange={(e) => update(e.target.value)} />{(!current || typeof current === 'string' && /^\d+(?:[.,]\d+)*$/.test(current.trim())) && <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>}</div> : field.multiline ? <Textarea aria-label={label} value={typeof current === "string" ? current : ""} onChange={(e) => update(e.target.value)} className="min-h-24" /> :
        <Input aria-label={label} value={typeof current === "string" ? current : ""} onChange={(e) => update(e.target.value)} inputMode={field.url ? "url" : "text"} />}
    </label>;
  })}</div>;
}