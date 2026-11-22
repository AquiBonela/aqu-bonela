import { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Type, ListChecks, ListOrdered, MapPin, Euro, Link, Info, Clock, Image } from 'lucide-react';
import { ProcedureImagePicker } from './ProcedureImagePicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProcedureFields, SECTION_FIELDS, type Field } from './ProcedureFields';
import { readSections, newElement, ELEMENT_LABELS, type ElementKind, type ProcedureSection } from '@/lib/procedure-sections';
import type { Content } from '@/lib/content-translations';

const action: Field[] = [{ key: 'label', label: 'Texto del enlace' }, { key: 'url', label: 'Enlace', url: true }];
const ELEMENT_FIELDS: Record<ElementKind, Field[]> = {
  text: [{ key: 'text', label: 'Texto', multiline: true }],
  list: [{ key: 'title', label: 'Título del listado (opcional)' }, { key: 'items', label: 'Elementos', items: [{ key: 'title', label: 'Texto del elemento', multiline: true }, { key: 'description', label: 'Descripción (opcional)', multiline: true }] }],
  steps: [{ key: 'items', label: 'Pasos', items: SECTION_FIELDS['pasos']?.[0]?.items ?? [] }],
  places: [{ key: 'items', label: 'Lugares', items: SECTION_FIELDS['lugares']?.[0]?.items ?? [] }],
  value: [{ key: 'title', label: 'Título' }, { key: 'amount', label: 'Importe', euro: true }, { key: 'explanation', label: 'Explicación', multiline: true }],
  sources: [{ key: 'items', label: 'Enlaces', items: action }],
  notice: [{ key: 'title', label: 'Título (opcional)' }, { key: 'text', label: 'Aviso o consejo', multiline: true }],
  timing: [{ key: 'title', label: 'Título (opcional)' }, { key: 'resolution', label: 'Tiempo de resolución' }, { key: 'validity', label: 'Vigencia / validez' }, { key: 'explanation', label: 'Explicación (opcional)', multiline: true }],
  image: [{ key: 'alt', label: 'Descripción de la imagen (opcional)' }, { key: 'caption', label: 'Pie de imagen (opcional)', multiline: true }],
};
const ICONS = { text: Type, list: ListChecks, steps: ListOrdered, places: MapPin, value: Euro, sources: Link, notice: Info, timing: Clock, image: Image };
function reordered<T>(items: T[], index: number, direction: number): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  const first = items[index], second = items[target];
  if (first === undefined || second === undefined) return items;
  next[index] = second; next[target] = first;
  return next;
}

export function ProcedureSectionsEditor({ value, onChange, structureEditable, onUploadingChange }: { value: Content; onChange: (v: Content) => void; structureEditable: boolean; onUploadingChange?: ((busy: boolean) => void) | undefined }) {
  const sections = readSections(value['sections']);
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [deletion, setDeletion] = useState<{ section: string; element?: string } | null>(null);
  const update = (next: ProcedureSection[]) => onChange({ ...value, sections: next });
  const changeSection = (id: string, section: ProcedureSection) => update(sections.map((s) => s.id === id ? section : s));
  return <div className="min-w-0 space-y-5">
    <Accordion type="multiple" value={openSections} onValueChange={setOpenSections}>
    {sections.map((section, index) => <AccordionItem key={section.id} value={section.id} className="min-w-0 border-b">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <AccordionTrigger className="min-w-0 flex-1 text-left font-display text-lg font-bold"><span className="min-w-0 break-words">{section.title || `Sección ${index + 1}`}</span></AccordionTrigger>
        {structureEditable && <div className="flex items-center gap-1">
          <Switch aria-label={`Mostrar sección ${index + 1}`} checked={section.visible !== false} onCheckedChange={(visible) => changeSection(section.id, { ...section, visible })} />
          <Button type="button" variant="ghost" size="icon" aria-label={`Subir sección ${index + 1}`} title="Subir sección" disabled={index === 0} onClick={() => update(reordered(sections, index, -1))}><ArrowUp /></Button>
          <Button type="button" variant="ghost" size="icon" aria-label={`Bajar sección ${index + 1}`} title="Bajar sección" disabled={index === sections.length - 1} onClick={() => update(reordered(sections, index, 1))}><ArrowDown /></Button>
          <Button type="button" variant="ghost" size="icon" aria-label={`Eliminar sección ${index + 1}`} title="Eliminar sección" onClick={() => setDeletion({ section: section.id })}><Trash2 /></Button>
        </div>}
      </div>
      <AccordionContent className="px-1 pb-5">
      <label className="block text-sm font-medium">Título de la sección<Input aria-label={`Título de la sección ${index + 1}`} value={section.title} onChange={(e) => changeSection(section.id, { ...section, title: e.target.value })} /></label>
      <div className="mt-4 space-y-5">
        {section.elements.map((element, position) => {
          const Icon = ICONS[element.kind];
          return <fieldset key={element.id} className="min-w-0 border-l-2 border-primary/30 pl-3 sm:pl-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2 text-sm font-bold"><Icon className="h-4 w-4 shrink-0 text-primary" />{ELEMENT_LABELS[element.kind]}</span>
              {structureEditable && <div className="flex shrink-0 gap-1">
                <Button type="button" variant="ghost" size="icon" aria-label={`Subir elemento ${position + 1} de sección ${index + 1}`} title="Subir elemento" disabled={position === 0} onClick={() => changeSection(section.id, { ...section, elements: reordered(section.elements, position, -1) })}><ArrowUp /></Button>
                <Button type="button" variant="ghost" size="icon" aria-label={`Bajar elemento ${position + 1} de sección ${index + 1}`} title="Bajar elemento" disabled={position === section.elements.length - 1} onClick={() => changeSection(section.id, { ...section, elements: reordered(section.elements, position, 1) })}><ArrowDown /></Button>
                <Button type="button" variant="ghost" size="icon" aria-label={`Eliminar elemento ${position + 1} de sección ${index + 1}`} title="Eliminar elemento" onClick={() => setDeletion({ section: section.id, element: element.id })}><Trash2 /></Button>
              </div>}
            </div>
            {element.kind === 'image' && <ProcedureImagePicker element={element} editable={structureEditable} onUploadingChange={onUploadingChange} onChange={(next) => changeSection(section.id, { ...section, elements: section.elements.map((v) => v.id === element.id ? next : v) })} />}
            <ProcedureFields fields={ELEMENT_FIELDS[element.kind]} value={element} onChange={(next) => changeSection(section.id, { ...section, elements: section.elements.map((v) => v.id === element.id ? { ...v, ...next } as typeof element : v) })} prefix={`Sección ${index + 1} · Elemento ${position + 1} · `} />
          </fieldset>;
        })}
      </div>
      {structureEditable && <DropdownMenu><DropdownMenuTrigger asChild><Button type="button" variant="outline" className="mt-4"><Plus />Añadir elemento</Button></DropdownMenuTrigger><DropdownMenuContent align="start">
        {(Object.keys(ELEMENT_LABELS) as ElementKind[]).map((kind) => { const Icon = ICONS[kind]; return <DropdownMenuItem key={kind} onSelect={() => changeSection(section.id, { ...section, elements: [...section.elements, newElement(kind)] })}><Icon />{ELEMENT_LABELS[kind]}</DropdownMenuItem>; })}
      </DropdownMenuContent></DropdownMenu>}
      </AccordionContent>
    </AccordionItem>)}
    </Accordion>
    {structureEditable && <Button type="button" variant="outline" onClick={() => { const id = crypto.randomUUID(); update([...sections, { id, title: '', visible: true, elements: [] }]); setOpenSections((previous) => [...previous, id]); }}><Plus />Añadir sección</Button>}
    <label className="block border-t pt-5 text-sm font-medium">Notas finales (opcional)<Textarea aria-label="Notas finales (opcional)" className="mt-2 min-h-24" value={typeof value['notes'] === 'string' ? value['notes'] : ''} onChange={(e) => onChange({ ...value, notes: e.target.value })} /></label>
    <Dialog open={Boolean(deletion)} onOpenChange={(open) => { if (!open) setDeletion(null); }}><DialogContent><DialogHeader><DialogTitle>{deletion?.element ? 'Eliminar elemento' : 'Eliminar sección'}</DialogTitle></DialogHeader><p>¿Eliminar este contenido del trámite?</p><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDeletion(null)}>Cancelar</Button><Button type="button" variant="destructive" onClick={() => {
      if (deletion) update(deletion.element ? sections.map((s) => s.id === deletion.section ? { ...s, elements: s.elements.filter((e) => e.id !== deletion.element) } : s) : sections.filter((s) => s.id !== deletion.section));
      setDeletion(null);
    }}><Trash2 />Eliminar</Button></div></DialogContent></Dialog>
  </div>;
}