import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ExternalLink, CheckCircle2, LifeBuoy, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useI18n } from "@/lib/i18n";
import { getCategoria, getTramite, type Tramite, type TramiteLink } from "@/lib/tramites";
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
  return <div className="p-10 text-center"><p>{tr("Este trámite no existe.")}</p><Link to="/servicios-publicos" hash="tramites" className="mt-4 inline-block font-semibold text-primary underline">{tr("Volver a Trámites")}</Link></div>;
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

function GuideSection({ value, title, children }: { value: string; title: string; children: ReactNode }) {
  const { tr } = useI18n();
  return (
    <AccordionItem value={value} className="border-b">
      <AccordionTrigger className="py-4 font-display text-lg font-extrabold text-foreground hover:no-underline">{tr(title)}</AccordionTrigger>
      <AccordionContent className="pb-5 text-base leading-relaxed">{children}</AccordionContent>
    </AccordionItem>
  );
}

function GuideList({ items }: { items?: string[] | undefined }) {
  if (!items?.length) return null;
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <span><PuntoVuelaText text={item} /></span>
        </li>
      ))}
    </ul>
  );
}

function PuntoVuelaText({ text }: { text: string }) {
  const { tr } = useI18n();
  return (
    <>
      {tr(text).split(/(Punto Vuela)/g).map((part, index) => part === "Punto Vuela" ? (
        <Link key={index} to="/punto-vuela" className="font-semibold text-primary underline underline-offset-2">{part}</Link>
      ) : part)}
    </>
  );
}

function GuideLink({ link, prominent = false }: { link: TramiteLink; prominent?: boolean }) {
  const { tr } = useI18n();
  const className = prominent
    ? "press mt-4 inline-flex min-h-11 items-center gap-2 bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
    : "mt-3 inline-flex items-center gap-1.5 font-semibold text-primary underline underline-offset-4";
  if (link.url === "/punto-vuela") {
    return <Link to="/punto-vuela" className={className}>{tr(link.label)} <ArrowRight className="h-4 w-4 shrink-0" aria-hidden /></Link>;
  }
  return (
    <a href={link.url} target="_blank" rel="noopener noreferrer" className={className}>
      {tr(link.label)} <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
    </a>
  );
}

function DetailedGuide({ t }: { t: Tramite }) {
  const { tr } = useI18n();
  const guide = t.guia;
  if (!guide) return null;

  return (
    <>
      <Accordion type="multiple" className="mt-8">
        <GuideSection value="para" title="¿Para qué sirve?">
          {guide.paraIntro && <p className="mb-4">{tr(guide.paraIntro)}</p>}
          <GuideList items={t.para} />
          {guide.paraNota && <p className="mt-4">{tr(guide.paraNota)}</p>}
        </GuideSection>

        <GuideSection value="quien" title="¿Quién puede solicitarlo?">
          <p className="mb-4">{tr(guide.quienIntro)}</p>
          <GuideList items={t.quien} />
          <p className="mt-4 border-l-4 border-primary bg-muted/50 p-3 text-sm">{tr(guide.quienNota)}</p>
        </GuideSection>

        <GuideSection value="necesitas" title="¿Qué necesitas?">
          {guide.necesitasIntro && <p className="mb-4">{tr(guide.necesitasIntro)}</p>}
          <GuideList items={t.necesitas} />
          <p className="mt-4 bg-muted/50 p-3 text-sm font-semibold"><PuntoVuelaText text={guide.necesitasNota} /></p>
        </GuideSection>

        <GuideSection value="pasos" title="¿Cómo hacerlo paso a paso?">
          <ol className="space-y-5">
            {guide.pasos.map((step, index) => (
              <li key={step.t}>
                {step.grupo && <h3 className="mb-4 border-b pb-2 font-display text-lg font-extrabold">{tr(step.grupo)}</h3>}
                <div className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-display text-lg font-extrabold text-primary-foreground">{index + 1 - guide.pasos.slice(0, index + 1).reduce((start, item, position) => item.grupo ? position : start, 0)}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold"><PuntoVuelaText text={step.t} /></h3>
                  <div className="mt-2 space-y-2 text-sm">
                    {step.d.map((paragraph) => <p key={paragraph}><PuntoVuelaText text={paragraph} /></p>)}
                  </div>
                  {step.link && <GuideLink link={step.link} prominent />}
                </div>
                </div>
              </li>
            ))}
          </ol>
        </GuideSection>

        <GuideSection value="donde" title="¿Dónde puedo realizarlo?">
          <div className="space-y-4">
            {guide.lugares.map((place) => (
              <article key={place.title} className="border bg-muted/30 p-4">
                <h3 className="font-display text-lg font-extrabold"><PuntoVuelaText text={place.title} /></h3>
                <p className="mt-0.5 text-sm font-semibold text-primary">{tr(place.subtitle)}</p>
                <div className="mt-3 space-y-2 text-sm">
                  {place.description.map((paragraph) => <p key={paragraph}><PuntoVuelaText text={paragraph} /></p>)}
                </div>
                {place.details && (
                  <dl className="mt-4 space-y-2 border-t pt-3 text-sm">
                    {place.details.map((detail) => (
                      <div key={detail.label}>
                        <dt className="inline font-bold">{tr(detail.label)}: </dt>
                        <dd className="inline break-words">
                          {detail.href
                            ? <a href={detail.href} className="text-primary underline underline-offset-2">{tr(detail.value)}</a>
                            : tr(detail.value)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
                {place.link && <div><GuideLink link={place.link} /></div>}
                {place.note && <p className="mt-3 text-sm text-muted-foreground">{tr(place.note)}</p>}
              </article>
            ))}
          </div>
          <div className="mt-5 border-t pt-4 text-sm">
            <p className="font-semibold">{tr("También puedes consultar el procedimiento oficial en:")}</p>
            <ul className="mt-2 space-y-2">
              {guide.fuentes.map((link) => <li key={link.url}><GuideLink link={link} /></li>)}
            </ul>
          </div>
        </GuideSection>

        <GuideSection value="coste" title="¿Cuánto cuesta?">
          <div className="border-l-4 border-primary bg-muted/50 p-4">
            <p className="font-semibold">{tr(guide.costeTitulo)}</p>
            <p className="mt-1 font-display text-4xl font-extrabold text-primary">{tr(guide.costeImporte)}</p>
            <p className="mt-2 text-sm">{tr(guide.costeTexto)}</p>
          </div>
        </GuideSection>

        {guide.ayuda?.length ? (
          <GuideSection value="ayuda" title="¿Necesitas ayuda?">
            <GuideList items={guide.ayuda} />
          </GuideSection>
        ) : null}

        {guide.aclaracion && (
          <GuideSection value="aclaracion" title={guide.aclaracion.titulo}>
            <p className="mb-4">{tr(guide.aclaracion.introduccion)}</p>
            <GuideList items={guide.aclaracion.puntos} />
            <p className="mt-4 border-l-4 border-primary bg-muted/50 p-3 text-sm">{tr(guide.aclaracion.nota)}</p>
          </GuideSection>
        )}

        {guide.seguridad && (
          <GuideSection value="seguridad" title="Consejo de seguridad">
            <div className="flex gap-3 bg-muted/50 p-4">
              <ShieldCheck className="h-6 w-6 shrink-0 text-primary" aria-hidden />
              <p>{tr(guide.seguridad ?? "")}</p>
            </div>
          </GuideSection>
        )}
      </Accordion>
      <p className="mt-5 text-xs text-muted-foreground">{tr(guide.revision)}</p>
    </>
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
        <div className="mt-4"><Tags tags={t.tags} /></div>
        <h1 className="mt-3 whitespace-pre-line font-display text-3xl font-extrabold text-balance sm:text-4xl">{tr(t.title)}</h1>
        <p className="mt-2 whitespace-pre-line text-lg text-muted-foreground">{tr(t.short)}</p>

        {t.primaryAction && (
          <a href={t.primaryAction.url} target="_blank" rel="noopener noreferrer" className="press mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-primary px-6 py-3 font-bold text-primary-foreground sm:w-auto">
            {tr(t.primaryAction.label)} <ExternalLink className="h-5 w-5" aria-hidden />
          </a>
        )}

        {t.guia ? <DetailedGuide t={t} /> : t.pasos?.length ? (
          <>
            <Block title="¿Para qué sirve?" items={t.para} />
            <Block title="¿Quién puede solicitarlo?" items={t.quien} />
            <Block title="¿Qué necesitas?" items={t.necesitas} />
            <section className="mt-8">
              <h2 className="font-display text-xl font-extrabold">{tr("¿Cómo hacerlo paso a paso?")}</h2>
              <ol className="mt-4 space-y-4">
                {t.pasos.map((p, n) => (
                  <li key={p.t} className="flex gap-4 border-l-4 border-primary bg-muted/50 p-4">
                    <span className="w-6 shrink-0 font-display text-2xl font-extrabold text-primary">{n + 1}</span>
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

        {t.links.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-3">
            {t.links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="press inline-flex min-h-12 items-center gap-2 border-2 border-primary px-5 font-bold text-primary hover:bg-primary hover:text-primary-foreground">
                {tr(l.label)} <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            ))}
          </div>
        )}
        <p className="mt-8 text-xs text-muted-foreground">{tr("Aquí Bonela es una guía de orientación. Los trámites se realizan siempre ante el organismo oficial correspondiente.")}</p>
      </main>
    </div>
  );
}
