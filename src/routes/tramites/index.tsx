import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, ArrowRight, MessageSquarePlus } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { BusinessSignupDialog } from "@/components/BusinessSignupDialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { CATEGORIAS, DESTACADOS, TRAMITES, buscarTramites, tramitesDe } from "@/lib/tramites";
import { CAT_ICON, Hero, TramiteCard } from "@/components/TramitesUI";

export const Route = createFileRoute("/tramites/")({
  head: () => ({
    meta: [
      { title: "Trámites en Casarabonela — Guía práctica | Aquí Bonela" },
      { name: "description", content: "Guías sencillas para documentación, salud, empleo, ayudas, vehículos y gestiones municipales, con enlaces a los organismos oficiales." },
      { property: "og:title", content: "Guía de trámites — Aquí Bonela" },
      { property: "og:description", content: "Todo lo que necesitas saber para realizar tus gestiones." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TramitesPage,
});

function TramitesPage() {
  const { tr } = useI18n();
  const [q, setQ] = useState("");
  const results = buscarTramites(q, tr);
  const destacados = DESTACADOS.map((s) => TRAMITES.find((t) => t.slug === s)!).filter(Boolean);
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main>
        <Hero kicker="Servicios públicos" title="Trámites" text="Guías prácticas para realizar tus gestiones sin complicaciones: documentación, salud, empleo, ayudas y administraciones públicas." />
        <div className="mx-auto max-w-5xl px-4 py-10">
          <label className="relative block">
            <span className="sr-only">{tr("¿Qué trámite necesitas realizar?")}</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("¿Qué trámite necesitas realizar?")} className="h-14 w-full border bg-card pl-12 pr-4 text-base outline-none focus:border-primary" />
          </label>

          {q.trim() ? (
            <section className="mt-8">
              <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-muted-foreground">{tr("Resultados")} ({results.length})</h2>
              {results.length ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">{results.map((t) => <TramiteCard key={t.slug} t={t} />)}</div>
              ) : (
                <p className="mt-3 text-muted-foreground">{tr("No hemos encontrado ese trámite. Puedes sugerirlo más abajo.")}</p>
              )}
            </section>
          ) : (
            <>
              <section className="mt-10">
                <h2 className="font-display text-2xl font-extrabold">{tr("Trámites más consultados")}</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">{destacados.map((t) => <TramiteCard key={t.slug} t={t} />)}</div>
              </section>
              <section className="mt-12">
                <h2 className="font-display text-2xl font-extrabold">{tr("Categorías")}</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {CATEGORIAS.map((c) => {
                    const Icon = CAT_ICON[c.icon];
                    return (
                      <Link key={c.slug} to="/tramites/$categoria" params={{ categoria: c.slug }} className="press flex flex-col gap-2 border-l-4 border-primary bg-muted/50 p-5 transition-colors hover:bg-muted">
                        <Icon className="h-7 w-7 text-primary" aria-hidden />
                        <h3 className="font-display text-lg font-extrabold leading-tight">{tr(c.title)}</h3>
                        <p className="text-sm text-muted-foreground">{tr(c.text)}</p>
                        <span className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-semibold text-primary">{tramitesDe(c.slug).length} {tr("trámites")} <ArrowRight className="h-4 w-4" aria-hidden /></span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          <section className="mt-12 flex flex-col gap-4 border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-xl font-extrabold">{tr("¿No encuentras el trámite que buscas?")}</h2>
              <p className="mt-1 text-muted-foreground">{tr("Sugiérenos qué gestión te gustaría que incorporásemos a la guía.")}</p>
            </div>
            <BusinessSignupDialog business={false}>
              <Button className="min-h-12 shrink-0"><MessageSquarePlus className="h-4 w-4" aria-hidden />{tr("Sugerir un trámite")}</Button>
            </BusinessSignupDialog>
          </section>
          <p className="mt-6 text-xs text-muted-foreground">{tr("Aquí Bonela es una guía de orientación. Los trámites se realizan siempre ante el organismo oficial correspondiente.")}</p>
        </div>
      </main>
    </div>
  );
}
