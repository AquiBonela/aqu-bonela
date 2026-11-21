import { ProcedureText } from "@/components/ProcedureText";
import { Link } from "@tanstack/react-router";
import { FileText, HeartPulse, Briefcase, Users, Car, Landmark, ArrowRight, type LucideIcon } from "lucide-react";
import { ContentTranslationProvider, useI18n } from "@/lib/i18n";
import { TAG_LABEL, isCompleta, type Categoria, type Tramite, type TramiteTag } from "@/lib/tramites";

import { procedureTranslationMap, type PublicProcedure } from '@/lib/public-procedures';

export const CAT_ICON: Record<Categoria["icon"], LucideIcon> = { doc: FileText, salud: HeartPulse, trabajo: Briefcase, familia: Users, coche: Car, muni: Landmark };

const TAG_CLASS: Record<TramiteTag, string> = {
  gratis: "bg-primary/10 text-primary",
  online: "bg-secondary text-secondary-foreground",
  presencial: "bg-accent text-accent-foreground",
};

export function Tags({ tags }: { tags?: TramiteTag[] | undefined }) {
  const { tr } = useI18n();
  if (!tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => <span key={t} className={`px-2 py-0.5 text-xs font-semibold ${TAG_CLASS[t]}`}>{tr(TAG_LABEL[t])}</span>)}
    </div>
  );
}

export function TramiteCard({ t }: { t: PublicProcedure }) {
  const { lang } = useI18n();
  return <ContentTranslationProvider translations={procedureTranslationMap(t, lang)}><TramiteCardBody t={t} /></ContentTranslationProvider>;
}
function TramiteCardBody({ t }: { t: Tramite }) {
  const { tr } = useI18n();
  return (
    <Link to="/tramites/$categoria/$tramite" params={{ categoria: t.cat, tramite: t.slug }} className="press group flex flex-col gap-2 border bg-card p-4 transition-colors hover:border-primary">
      <h3 className="font-bold leading-snug"><ProcedureText text={tr(t.title)} linkPuntoVuela={false} /></h3>
      <p className="line-clamp-3 text-sm text-muted-foreground"><ProcedureText text={tr(t.summary ?? t.short)} linkPuntoVuela={false} /></p>
      <Tags tags={t.tags} />
      <span className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-semibold text-primary">
        {tr(isCompleta(t) ? "Ver guía paso a paso" : "Ver información")} <ArrowRight className="h-4 w-4" aria-hidden />
      </span>
    </Link>
  );
}

export function Hero({ kicker, title, text }: { kicker?: string; title: string; text: string }) {
  const { tr } = useI18n();
  return (
    <section className="bg-primary px-4 py-12 text-primary-foreground">
      <div className="mx-auto max-w-5xl">
        {kicker && <p className="text-xs font-bold uppercase tracking-[0.15em] opacity-80">{tr(kicker)}</p>}
        <h1 className="mt-1 font-display text-4xl font-extrabold text-balance sm:text-5xl"><ProcedureText text={tr(title)} linkPuntoVuela={false} /></h1>
        <p className="mt-3 max-w-2xl text-lg opacity-95"><ProcedureText text={tr(text)} /></p>
      </div>
    </section>
  );
}
