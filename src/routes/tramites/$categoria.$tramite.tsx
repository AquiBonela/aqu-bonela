import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, CheckCircle2, LifeBuoy } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { useI18n } from "@/lib/i18n";
import { getCategoria, getTramite } from "@/lib/tramites";
import { Tags } from "@/components/TramitesUI";

export const Route = createFileRoute("/tramites/$categoria/$tramite")({
  loader: ({ params }) => {
    const t = getTramite(params.categoria, params.tramite);
    const c = getCategoria(params.categoria);
    if (!t || !c) throw notFound();
    return { t, c };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.t.title ?? "Trámite"} — Aquí Bonela` },
      { name: "description", content: loaderData?.t.short ?? "Guía de trámites de Aquí Bonela." },
      { property: "og:title", content: loaderData?.t.title ?? "Trámite" },
      { property: "og:description", content: loaderData?.t.short ?? "Guía de trámites." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TramitePage,
  notFoundComponent: () => <Missing />,
  errorComponent: () => <Missing />,
});

function Missing() {
  const { tr } = useI18n();
  return <div className="p-10 text-center"><p>{tr("Este trámite no existe.")}</p><Link to="/tramites" className="mt-4 inline-block font-semibold text-primary underline">{tr("Volver a Trámites")}</Link></div>;
}

function Block({ title, items }: { title: string; items?: string[] | undefined }) {
  const { tr } = useI18n();
  if (!items?.length) return null;
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-extrabold">{tr(title)}</h2>
      <ul className="mt-3 space-y-2">
        {items.map((i) => <li key={i} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden /><span>{tr(i)}</span></li>)}
      </ul>
    </section>
  );
}

function TramitePage() {
  const { t, c } = Route.useLoaderData();
  const { tr } = useI18n();
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link to="/tramites/$categoria" params={{ categoria: c.slug }} className="inline-flex items-center gap-1 text-sm font-semibold text-primary"><ArrowLeft className="h-4 w-4" aria-hidden />{tr(c.title)}</Link>
        <h1 className="mt-4 font-display text-3xl font-extrabold text-balance sm:text-4xl">{tr(t.title)}</h1>
        <p className="mt-2 text-lg text-muted-foreground">{tr(t.short)}</p>
        <div className="mt-4"><Tags tags={t.tags} /></div>

        {t.pasos?.length ? (
          <>
            <Block title="¿Para qué sirve?" items={t.para} />
            <Block title="¿Quién puede solicitarlo?" items={t.quien} />
            <Block title="¿Qué necesitas?" items={t.necesitas} />
            <section className="mt-8">
              <h2 className="font-display text-xl font-extrabold">{tr("¿Cómo hacerlo paso a paso?")}</h2>
              <ol className="mt-4 space-y-4">
                {t.pasos.map((p, n) => (
                  <li key={p.t} className="flex gap-4 border-l-4 border-primary bg-muted/50 p-4">
                    <span className="font-display text-2xl font-extrabold text-primary">{n + 1}</span>
                    <div><h3 className="font-bold">{tr(p.t)}</h3><p className="mt-1 text-sm">{tr(p.d)}</p></div>
                  </li>
                ))}
              </ol>
            </section>
            {t.coste && <section className="mt-8"><h2 className="font-display text-xl font-extrabold">{tr("¿Cuánto cuesta?")}</h2><p className="mt-2">{tr(t.coste)}</p></section>}
            {t.donde && <section className="mt-8"><h2 className="font-display text-xl font-extrabold">{tr("¿Dónde realizarlo?")}</h2><p className="mt-2">{tr(t.donde)}</p></section>}
            {t.ayuda && (
              <section className="mt-8 flex gap-3 bg-primary p-5 text-primary-foreground">
                <LifeBuoy className="h-6 w-6 shrink-0" aria-hidden />
                <div><h2 className="font-display text-xl font-extrabold">{tr("¿Necesitas ayuda?")}</h2><p className="mt-1 opacity-95">{tr(t.ayuda)}</p></div>
              </section>
            )}
          </>
        ) : (
          <p className="mt-8 border bg-muted/50 p-5">{tr("Estamos preparando la guía paso a paso de este trámite. Mientras tanto, puedes consultar la información oficial.")}</p>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          {t.links.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="press inline-flex min-h-12 items-center gap-2 border-2 border-primary px-5 font-bold text-primary hover:bg-primary hover:text-primary-foreground">
              {tr(l.label)} <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          ))}
        </div>
        <p className="mt-8 text-xs text-muted-foreground">{tr("Aquí Bonela es una guía de orientación. Los trámites se realizan siempre ante el organismo oficial correspondiente.")}</p>
      </main>
    </div>
  );
}
