import { Text, useI18n } from "@/lib/i18n";
import { CheckCircle2, Phone, ExternalLink, ArrowRight } from "lucide-react";
import { dailyLifeCategories, dailyLifeItems, type DailyLifeItem } from "@/lib/vida-diaria";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/vida-diaria/$categoria")({
  loader: ({ params }) => {
    const cat = dailyLifeCategories().find((c) => c.id === params.categoria);
    if (!cat) throw notFound();
    return cat;
  },
  head: ({ params, loaderData }) => {
    const t = loaderData ? `${loaderData.title} — Vida diaria en Casarabonela` : "Vida diaria en Casarabonela";
    const d = loaderData?.text ?? "Información práctica de Casarabonela.";
    const url = `https://bonela-local-finds.lovable.app/vida-diaria/${params.categoria}`;
    return {
      meta: [{ title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }, { property: "og:type", content: "article" }, { property: "og:url", content: url }, { name: "twitter:card", content: "summary" }],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: VidaDiaria,
});

type Item = DailyLifeItem;

function Actions({ i, compact }: { i: Item; compact?: boolean }) {
  const { tr } = useI18n();
  if (!i.tel && !i.link && !i.link2) return null;
  const ext = (h: string) => (h.startsWith("/") ? {} : { target: "_blank", rel: "noopener noreferrer" });
  return (
    <div className={`mt-auto flex flex-wrap gap-2 ${compact ? "pt-3" : "pt-4"}`}>
      {i.tel && (
        <a href={`tel:${i.tel}`} className="inline-flex min-h-11 items-center gap-2 bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90">
          <Phone className="h-4 w-4" aria-hidden /> <Text text="Llamar" />
        </a>
      )}
      {[i.link, i.link2].map((l) => l && (
        <a key={l.href} href={l.href} {...ext(l.href)} className="inline-flex min-h-11 items-center gap-2 border px-4 text-sm font-bold hover:bg-muted">
          {tr(l.label)} {l.href.startsWith("/") ? <ArrowRight className="h-4 w-4" aria-hidden /> : <ExternalLink className="h-4 w-4" aria-hidden />}
        </a>
      ))}
    </div>
  );
}

function SectionTitle({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <div className="mb-5">
      <p className="text-sm font-bold uppercase tracking-[0.15em] text-primary">{n}</p>
      <h2 className="mt-1 font-display text-2xl font-extrabold sm:text-3xl"><Text text={title} /></h2>
      <p className="mt-1 text-muted-foreground"><Text text={text} /></p>
    </div>
  );
}
function VidaDiaria() {
  const { tr } = useI18n();
  const cat = Route.useLoaderData();
  const items = dailyLifeItems().filter((i) => i.group === cat.id);
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="pb-14">
        <section className="mx-auto max-w-5xl px-4 pt-8">
          <Link to="/servicios-publicos" hash="vida-diaria" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">← <Text text="Vida diaria en el pueblo" /></Link>
          <h1 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">{tr(cat.title)}</h1>
          <p className="mt-2 max-w-2xl text-lg text-muted-foreground">{tr(cat.text)}</p>
        </section>
            <div className="pt-4">
{items.filter((i) => i.full).map((i) => (
          <section key={i.title} className="mx-auto max-w-5xl px-4 pt-5">
            <article className="border bg-card p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-beige text-primary"><i.Icon className="h-5 w-5" aria-hidden /></span>
                <h3 className="font-display text-lg font-extrabold leading-tight">{tr(i.title)}</h3>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{tr(i.text)}</p>
              {i.timetable && (
                <div className="mt-4 grid gap-x-10 gap-y-5 border-t pt-4 sm:grid-cols-2">
                  {i.timetable.columns.map((c, ci) => (
                    <div key={c}>
                      <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-primary">{tr(c)}</h4>
                      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[13px] min-[380px]:text-sm">
                        {i.timetable?.rows.map((r) => (
                          <div key={r.days} className="contents">
                            <dt className="font-semibold">{tr(r.days)}</dt>
                            <dd className="whitespace-nowrap tabular-nums">{(r.cells[ci] ?? []).join(" · ")}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              )}
              {i.timetable?.note && <p className="mt-3 text-xs text-muted-foreground">{tr(i.timetable.note)}</p>}
              <Actions i={i} />
            </article>
          </section>
        ))}

        
                      {items.some((i) => !i.wide && !i.full) && (
                <section className="mx-auto max-w-5xl px-4 pt-5">
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 animate-results-in">
                    {items.filter((i) => !i.wide && !i.full).map((i) => (
                      <article key={i.title} className={`flex flex-col border bg-card p-5 ${i.wide ? "border-primary/40 sm:col-span-2 lg:col-span-3" : i.span ? "sm:col-span-2 lg:col-span-3" : ""}`}>
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-beige text-primary"><i.Icon className="h-5 w-5" aria-hidden /></span>
                  <h3 className="font-display text-lg font-extrabold leading-tight">{tr(i.title)}</h3>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{tr(i.text)}</p>
                {i.blocks && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {i.blocks.map((b) => (
                      <div key={b.k} className="flex flex-col border bg-muted/40 p-4">
                        <h4 className="font-bold">{tr(b.k)}</h4>
                        <p className="mt-1 text-sm">{tr(b.v)}</p>
                        <div className="mt-auto pt-3">
                          {b.tel && (
                            <a href={`tel:${b.tel}`} className="inline-flex min-h-11 items-center gap-2 bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90">
                              <Phone className="h-4 w-4" aria-hidden /> <Text text="Llamar" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {i.facts && (
                  <dl className="mt-3 space-y-1 border-t pt-3 text-sm">
                    {i.facts.map((f) => (
                      <div key={f.k} className="flex gap-2"><dt className="font-bold">{tr(f.k)}:</dt><dd>{tr(f.v)}</dd></div>
                    ))}
                  </dl>
                )}
                {i.list && (
                  <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                    {i.list.map((x) => (
                      <li key={x} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{tr(x)}</li>
                    ))}
                  </ul>
                )}
                {i.note && <p className="mt-3 bg-beige p-3 text-sm font-semibold">{tr(i.note)}</p>}
                <Actions i={i} />
              </article>
                    ))}
                  </div>
                </section>
              )}
        {items.filter((i) => i.wide).map((i) => (
          <section key={i.title} className="mt-6 bg-primary text-primary-foreground">
            <div className="mx-auto max-w-5xl px-4 py-10">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-foreground text-primary"><i.Icon className="h-6 w-6" aria-hidden /></span>
                <h3 className="font-display text-2xl font-extrabold leading-tight">{tr(i.title)}</h3>
              </div>
              <p className="mt-3 opacity-90">{tr(i.text)}</p>
              {i.facts && (
                <dl className="mt-4 space-y-1 border-t border-primary-foreground/30 pt-4 text-sm">
                  {i.facts.map((f) => (
                    <div key={f.k} className="flex gap-2"><dt className="font-bold">{tr(f.k)}:</dt><dd>{tr(f.v)}</dd></div>
                  ))}
                </dl>
              )}
              {i.list && (
                <ul className="mt-5 flex flex-col gap-3 text-lg font-semibold sm:text-xl">
                  {i.list.map((x) => (
                    <li key={x} className="flex gap-3"><CheckCircle2 className="mt-1 h-5 w-5 shrink-0" aria-hidden />{tr(x)}</li>
                  ))}
                </ul>
              )}
              {i.note && <p className="mt-4 bg-primary-foreground/15 p-3 text-sm font-semibold">{tr(i.note)}</p>}
              {i.tel && (
                <a href={`tel:${i.tel}`} className="mt-5 inline-flex items-center gap-2 bg-primary-foreground px-5 py-3 text-sm font-bold text-primary">
                  <Phone className="h-4 w-4" aria-hidden /> <Text text="Llamar" /> {i.tel.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")}
                </a>
              )}
            </div>
          </section>
        ))}

            </div>
      </main>
    </div>
  );
}
