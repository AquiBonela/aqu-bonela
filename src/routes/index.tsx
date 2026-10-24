import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { directoryQuery, filterListings, isFeatured } from "@/lib/directory";
import { ListingCard } from "@/components/ListingCard";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  cat: fallback(z.string(), "").default(""),
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

function Index() {
  const { q, cat } = Route.useSearch();
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
  const results = filterListings(data.listings, data.categories, q, cat);
  const browsingHome = !q && !cat;
  const featured = data.listings.filter((l) => isFeatured(l));
  const activeCat = data.categories.find((c) => c.slug === cat);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary px-4 pb-8 pt-6 text-primary-foreground">
        <div className="mx-auto max-w-3xl">
          <p className="font-display text-sm font-bold uppercase tracking-wider opacity-90">Aquí Bonela</p>
          <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight sm:text-5xl">
            ¿Qué buscas en Casarabonela?
          </h1>
          <label htmlFor="buscar" className="sr-only">Buscar comercios y profesionales</label>
          <div className="relative mt-5">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              id="buscar"
              type="search"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Pan, fontanero, farmacia…"
              className="h-14 w-full rounded-[var(--radius)] border-0 bg-card pl-12 pr-12 text-base text-foreground shadow-sm outline-none ring-terracotta focus:ring-2"
            />
            {text && (
              <button
                type="button"
                onClick={() => setText("")}
                aria-label="Borrar búsqueda"
                className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      <nav aria-label="Categorías" className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl gap-2 overflow-x-auto px-4 py-3">
          {[{ slug: "", name: "Todo" }, ...data.categories].map((c) => (
            <button
              key={c.slug || "all"}
              type="button"
              aria-pressed={cat === c.slug}
              onClick={() => navigate({ search: (p) => ({ ...p, cat: c.slug }) })}
              className={cn(
                "min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors",
                cat === c.slug ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-secondary",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {browsingHome && featured.length > 0 && (
          <section aria-labelledby="destacados" className="mb-8">
            <h2 id="destacados" className="font-display text-xl font-bold">Destacados</h2>
            <div className="mt-3 grid gap-3">
              {featured.map((l) => (
                <ListingCard key={l.id} listing={l} featured categoryName={catName.get(l.category_id ?? "")} />
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="resultados">
          <h2 id="resultados" className="font-display text-xl font-bold">
            {activeCat ? activeCat.name : browsingHome ? "Todo el directorio" : "Resultados"}
          </h2>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {results.length} {results.length === 1 ? "resultado" : "resultados"}
          </p>
          {results.length === 0 ? (
            <p className="mt-6 rounded-[var(--radius)] border bg-card p-6 text-center">
              No hay resultados. Prueba con otra palabra o elige "Todo".
            </p>
          ) : (
            <div className="mt-3 grid gap-3">
              {(browsingHome ? results.filter((l) => !isFeatured(l)) : results).map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  featured={!browsingHome && isFeatured(l)}
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
