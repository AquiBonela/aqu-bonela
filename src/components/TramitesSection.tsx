import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, ArrowRight, MessageSquarePlus } from "lucide-react";
import { BusinessSignupDialog } from "@/components/BusinessSignupDialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useSuspenseQuery } from '@tanstack/react-query';
import { publicProceduresQuery, procedureTranslationMap } from '@/lib/public-procedures';
import { normalize } from '@/lib/directory';
import { TramiteCard } from "@/components/TramitesUI";

export function TramitesSection() {
  const { tr, lang } = useI18n();
  const { data } = useSuspenseQuery(publicProceduresQuery);
  const [q, setQ] = useState('');
  const results = data.procedures.filter((t) => {
    const map = procedureTranslationMap(t, lang);
    return normalize([t.title, t.short, t.summary ?? '', map[t.title] ?? tr(t.title), map[t.short] ?? tr(t.short)].join(' ')).includes(normalize(q));
  });
  return (
    <div>
      <label className="relative block">
        <span className="sr-only">{tr("¿Qué trámite necesitas consultar?")}</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("¿Qué trámite necesitas consultar?")} className="h-14 w-full border bg-card pl-12 pr-4 text-base outline-none focus:border-primary" />
      </label>
      {q.trim() ? (
        <section className="mt-6">
          <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-muted-foreground">{tr("Resultados")} ({results.length})</h3>
          {results.length ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">{results.map((t) => <TramiteCard key={t.slug} t={t} />)}</div>
          ) : (
            <p className="mt-3 text-muted-foreground">{tr("No hemos encontrado ese trámite. Puedes sugerirlo más abajo.")}</p>
          )}
        </section>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.categories.map((c) => (
            <Link key={c.slug} to="/tramites/$categoria" params={{ categoria: c.slug }} className="press flex flex-col gap-2 border-l-4 border-primary bg-muted/50 p-5 transition-colors hover:bg-muted">
              <h3 className="font-display text-lg font-extrabold leading-tight">{tr(c.title)}</h3>
              <p className="text-sm text-muted-foreground">{tr(c.text)}</p>
              <span className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-semibold text-primary">{data.procedures.filter((t) => t.cat === c.slug).length} {tr("trámites")} <ArrowRight className="h-4 w-4" aria-hidden /></span>
            </Link>
          ))}
        </div>
      )}
      <section className="mt-8 flex flex-col gap-4 border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-xl font-extrabold">{tr("¿No encuentras el trámite que buscas?")}</h3>
          <p className="mt-1 text-muted-foreground">{tr("Sugiérenos qué gestión te gustaría que incorporásemos a la guía.")}</p>
        </div>
        <BusinessSignupDialog business={false}>
          <Button className="min-h-12 shrink-0"><MessageSquarePlus className="h-4 w-4" aria-hidden />{tr("Sugerir un trámite")}</Button>
        </BusinessSignupDialog>
      </section>
    </div>
  );
}
