import { CheckCircle2, ExternalLink, Info, Clock } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { ProcedureText } from './ProcedureText';
import { useI18n } from '@/lib/i18n';
import { euroAmount, hasProcedureLink, hasPlaceDetail } from '@/lib/procedure-display';
import { readSections, elementHasContent, type ProcedureElement } from '@/lib/procedure-sections';

function Text({ value }: { value: string }) {
  const { tr } = useI18n();
  return <ProcedureText text={tr(value)} />;
}
function LinkText({ link }: { link: { label: string; url: string } | undefined }) {
  if (!hasProcedureLink(link)) return null;
  return <a href={link.url} target={link.url.startsWith('/') ? undefined : '_blank'} rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1.5 font-semibold text-primary underline underline-offset-4"><span className="min-w-0 break-words"><Text value={link.label} /></span><ExternalLink className="h-4 w-4 shrink-0" aria-hidden /></a>;
}
function Element({ element }: { element: ProcedureElement }) {
  const { tr } = useI18n();
  if (!elementHasContent(element)) return null;
  switch (element.kind) {
    case 'text': return <p><Text value={element.text} /></p>;
    case 'list': return <div className="space-y-3">
      {element.title.trim() && <h3 className="font-display text-lg font-bold"><Text value={element.title} /></h3>}
      <ul className="space-y-3">{element.items.filter((v) => v.title.trim() || v.description.trim()).map((item, i) => <li key={i} className="flex gap-2"><CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden /><div className="min-w-0"><Text value={item.title} />{item.description.trim() && <p className="mt-1 text-sm text-muted-foreground"><Text value={item.description} /></p>}</div></li>)}</ul>
    </div>;
    case 'steps': {
      let number = 0;
      return <ol className="space-y-5">{element.items.filter((v) => v.t.trim() || v.d.some((p) => p.trim()) || hasProcedureLink(v.link)).map((step, i) => {
        if (step.grupo.trim()) number = 0;
        number++;
        return <li key={i}>{step.grupo.trim() && <h3 className="mb-4 border-b pb-2 font-display text-lg font-bold"><Text value={step.grupo} /></h3>}<div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-display text-lg font-bold text-primary-foreground">{number}</span><div className="min-w-0 flex-1"><h3 className="font-bold"><Text value={step.t} /></h3><div className="mt-2 space-y-2 text-sm">{step.d.filter((v) => v.trim()).map((p, j) => <p key={j}><Text value={p} /></p>)}</div>{hasProcedureLink(step.link) && <div className="mt-3"><LinkText link={step.link} /></div>}</div></div></li>;
      })}</ol>;
    }
    case 'places': return <div className="space-y-4">{element.items.filter((v) => v.title.trim() || v.subtitle.trim() || v.description.some((p) => p.trim()) || v.details.some(hasPlaceDetail) || v.note.trim() || hasProcedureLink(v.link)).map((place, i) => <article key={i} className="border bg-muted/30 p-4">
      {place.title.trim() && <h3 className="font-display text-lg font-bold"><Text value={place.title} /></h3>}
      {place.subtitle.trim() && <p className="mt-1 text-sm font-semibold text-primary"><Text value={place.subtitle} /></p>}
      <div className="mt-3 space-y-2 text-sm">{place.description.filter((v) => v.trim()).map((p, j) => <p key={j}><Text value={p} /></p>)}</div>
      {place.details.some(hasPlaceDetail) && <dl className="mt-4 space-y-2 border-t pt-3 text-sm">{place.details.filter(hasPlaceDetail).map((detail, j) => <div key={j}>{detail.label.trim() && <dt className="inline font-bold"><Text value={detail.label} />: </dt>}<dd className="inline break-words">{detail.href ? <a href={detail.href} className="text-primary underline"><Text value={detail.value} /></a> : <Text value={detail.value} />}</dd></div>)}</dl>}
      {hasProcedureLink(place.link) && <div className="mt-3"><LinkText link={place.link} /></div>}
      {place.note.trim() && <p className="mt-3 text-sm text-muted-foreground"><Text value={place.note} /></p>}
    </article>)}</div>;
    case 'value': return <div className="border-l-4 border-primary bg-muted/50 p-4">{element.title.trim() && <h3 className="font-semibold"><Text value={element.title} /></h3>}{element.amount.trim() && <p className="mt-1 break-words font-display text-3xl font-bold text-primary"><Text value={euroAmount(tr(element.amount))} /></p>}{element.explanation.trim() && <p className="mt-2 text-sm"><Text value={element.explanation} /></p>}</div>;
    case 'sources': return <ul className="space-y-3">{element.items.filter(hasProcedureLink).map((link, i) => <li key={i}><LinkText link={link} /></li>)}</ul>;
    case 'notice': return <aside className="flex gap-3 border-l-4 border-primary bg-muted/50 p-4"><Info className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden /><div className="min-w-0">{element.title.trim() && <h3 className="mb-2 font-bold"><Text value={element.title} /></h3>}{element.text.trim() && <p><Text value={element.text} /></p>}</div></aside>;
    case 'timing': return <div className="flex gap-3 border-l-4 border-primary bg-muted/30 p-4"><Clock className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden /><div className="min-w-0 space-y-2">{element.title.trim() && <h3 className="font-bold"><Text value={element.title} /></h3>}<dl className="space-y-3">{element.resolution.trim() && <div><dt className="text-sm text-muted-foreground">{tr('Tiempo de resolución')}</dt><dd className="font-semibold"><Text value={element.resolution} /></dd></div>}{element.validity.trim() && <div><dt className="text-sm text-muted-foreground">{tr('Vigencia / validez')}</dt><dd className="font-semibold"><Text value={element.validity} /></dd></div>}</dl>{element.explanation.trim() && <p className="text-sm"><Text value={element.explanation} /></p>}</div></div>;
  }
}
export function ProcedureSections({ sections, notes }: { sections: unknown; notes?: string | undefined }) {
  const visible = readSections(sections).filter((s) => s.visible !== false && s.elements.some(elementHasContent));
  return <>
    {visible.length > 0 && <Accordion type="multiple" className="mt-8">{visible.map((section) => <AccordionItem key={section.id} value={section.id} className="border-b"><AccordionTrigger className="py-4 font-display text-lg font-bold text-foreground hover:no-underline"><Text value={section.title} /></AccordionTrigger><AccordionContent className="space-y-5 break-words pb-5 text-base leading-relaxed">{section.elements.map((element) => <Element key={element.id} element={element} />)}</AccordionContent></AccordionItem>)}</Accordion>}
    {notes?.trim() && <aside className="mt-6 border-l-4 border-primary bg-muted/50 p-4 text-sm leading-relaxed"><Text value={notes} /></aside>}
  </>;
}