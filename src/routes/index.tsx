import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { activitiesFor, directoryQuery, filterListings, isFeatured } from "@/lib/directory";
import { ListingCard } from "@/components/ListingCard";
import { SiteHeader } from "@/components/SiteHeader";
import heroImg from "@/assets/hero-casarabonela.jpg";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  cat: fallback(z.string(), "").default(""),
  of: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/")({
  validateSearch: zodValidator(searchSchema),
  loader: ({ context }) => context.queryClient.ensureQueryData(directoryQuery),
  head: () => ({
    meta: [
      { title: "Aquí Bonela — Comercios y profesionales de Casarabonela" },
      {
        name: "description",
        content: "Encuentra y contacta con comercios y profesionales de Casarabonela: llama o escribe por WhatsApp en un toque.",
      },
      { property: "og:title", content: "Aquí Bonela — Comercios y profesionales de Casarabonela" },
      { property: "og:description", content: "El directorio local de Casarabonela, pensado para el móvil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
  errorComponent: () => (
    <div role="alert" className="p-8 text-center">No hemos podido cargar el directorio. Inténtalo de nuevo.</div>
  ),
  notFoundComponent: () => <div className="p-8 text-center">No encontrado.</div>,
});

const pill = (active: boolean) =>
  cn(
    "min-h-11 shrink-0 border px-4 text-sm font-semibold transition-colors",
    active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-secondary",
  );

function Index() {
  const { q, cat, of } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const { data } = useSuspenseQuery(directoryQuery);
  const [text, setText] = useState(q);

  useEffect(() => setText(q), [q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (text !== q) navigate({ search: (p) => ({ ...p, q: text }), replace: true });
    }, 250);
    return () => clearTimeout(t);
  }, [text, q, navigate]);

  const catName = useMemo(() => new Map(data.categories.map((c) => [c.id, c.name])), [data.categories]);
  const activeCat = data.categories.find((c) => c.slug === cat);
  const activities = activitiesFor(data.listings, activeCat?.id);
  const results = filterListings(data.listings, data.categories, q, cat, new Date(), of);
  const browsingHome = !q && !cat;
  const collaborators = data.listings.filter((l) => isFeatured(l));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ search: (p) => ({ ...p, q: text }) });
    document.getElementById("resultados")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="relative">
        <img
          src={heroImg}
          alt="Vista de Casarabonela entre olivos"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />
        <div className="relative mx-auto flex min-h-[26rem] max-w-5xl flex-col justify-end px-4 pb-10 pt-24 sm:min-h-[32rem]">
          <p className="text-sm font-medium text-primary-foreground/90">Casarabonela · Málaga</p>
          <h1 className="mt-2 max-w-xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-primary-foreground sm:text-6xl">
            ¿Qué buscas en Casarabonela?
          </h1>
          <form onSubmit={submit} role="search" className="mt-6 flex max-w-xl items-center border bg-card p-1.5">
            <label htmlFor="buscar" className="sr-only">Buscar comercios y profesionales</label>
            <Search className="ml-3 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
            <input
              id="buscar"
              type="search"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Panadería, fontanero, tapas..."
              className="h-11 min-w-0 flex-1 bg-transparent px-3 text-base text-foreground outline-none"
            />
            {text && (
              <button
                type="button"
                onClick={() => setText("")}
                aria-label="Borrar búsqueda"
                className="flex h-10 w-10 items-center justify-center text-muted-foreground hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            )}
            <button type="submit" className="h-11 bg-terracotta px-5 text-sm font-semibold text-terracotta-foreground hover:opacity-90">
              Buscar
            </button>
          </form>
        </div>
      </section>
      <p className="mx-auto max-w-5xl px-4 pt-1 text-xs text-muted-foreground">Imagen provisional</p>

      <nav aria-label="Filtros" className="sticky top-0 z-10 mt-4 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 py-3">
          {[{ slug: "", name: "Todo" }, ...data.categories].map((c) => (
            <button
              key={c.slug || "all"}
              type="button"
              aria-pressed={cat === c.slug}
              onClick={() => navigate({ search: (p) => ({ ...p, cat: c.slug, of: "" }) })}
              className={pill(cat === c.slug)}
            >
              {c.name}
            </button>
          ))}
        </div>
        {activities.length > 0 && (
          <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 pb-3" aria-label="Oficios">
            {["", ...activities].map((a) => (
              <button
                key={a || "all"}
                type="button"
                aria-pressed={of === a}
                onClick={() => navigate({ search: (p) => ({ ...p, of: a }) })}
                className={cn(
                  "min-h-9 shrink-0 border px-3 text-xs font-semibold transition-colors",
                  of === a ? "border-terracotta bg-terracotta text-terracotta-foreground" : "bg-card hover:bg-secondary",
                )}
              >
                {a || "Todos los oficios"}
              </button>
            ))}
          </div>
        )}
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {browsingHome && collaborators.length > 0 && (
          <section aria-labelledby="colaboradores" className="mb-8">
            <h2 id="colaboradores" className="font-display text-2xl font-bold">Colaboradores</h2>
            <p className="text-sm text-muted-foreground">Comercios y profesionales que apoyan el mantenimiento de Aquí Bonela.</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {collaborators.map((l) => (
                <ListingCard key={l.id} listing={l} collaborator categoryName={catName.get(l.category_id ?? "")} />
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="resultados">
          <h2 id="resultados" className="font-display text-2xl font-bold">
            {activeCat ? (of ? `${activeCat.name} · ${of}` : activeCat.name) : browsingHome ? "Todo el directorio" : "Resultados"}
          </h2>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {results.length} {results.length === 1 ? "resultado" : "resultados"}
          </p>
          {results.length === 0 ? (
            <p className="mt-6 border bg-card p-6 text-center">No hay resultados. Prueba con otra palabra o elige "Todo".</p>
          ) : (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {(browsingHome ? results.filter((l) => !isFeatured(l)) : results).map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  collaborator={!browsingHome && isFeatured(l)}
                  categoryName={activeCat ? undefined : catName.get(l.category_id ?? "")}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t px-4 py-6 text-center text-sm text-muted-foreground">
        Aquí Bonela · Directorio local de Casarabonela
      </footer>
    </div>
  );
}
