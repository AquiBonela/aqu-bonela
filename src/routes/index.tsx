import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Search, X, Zap } from "lucide-react";
import { isEmergencyService } from "@/lib/listing-availability";
import { useEffect, useMemo, useState } from "react";
import { activitiesFor, directoryQuery, filterListings, isFeatured } from "@/lib/directory";
import { ListingCard } from "@/components/ListingCard";
import { SiteHeader } from "@/components/SiteHeader";
import heroImg from "@/assets/hero-casarabonela.jpg";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  cat: fallback(z.string(), "").default(""),
  of: fallback(z.string(), "").default(""),
  tipo: fallback(z.enum(["", "comercio", "profesional"]), "").default(""),
  urg: fallback(z.boolean(), false).default(false),
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
  const { q, cat, of, tipo, urg } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const { data } = useSuspenseQuery(directoryQuery);
  const [text, setText] = useState(q);

  useEffect(() => setText(q), [q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (text !== q) navigate({ search: (p) => ({ ...p, q: text, ...(text ? { cat: "", of: "", urg: false } : {}) }), replace: true });
    }, 250);
    return () => clearTimeout(t);
  }, [text, q, navigate]);

  const catName = useMemo(() => new Map(data.categories.map((c) => [c.id, c.name])), [data.categories]);
  const activeCat = data.categories.find((c) => c.slug === cat);
  const activities = activitiesFor(data.listings.filter((l) => !tipo || l.type === tipo), activeCat?.id);
  const results = urg
    ? filterListings(data.listings, data.categories, "", "", new Date(), "", "").filter(isEmergencyService)
    : filterListings(data.listings, data.categories, q, cat, new Date(), of, tipo);
  const browsingHome = !q && !cat && !tipo && !urg;
  const collaborators = data.listings.filter((l) => isFeatured(l));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ search: (p) => ({ ...p, q: text, cat: "", of: "", urg: false }) });
    document.getElementById("resultados")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      {data.banner && (
        <div role="status" className="border-b bg-accent/15 px-4 py-2.5 text-center text-sm font-medium text-foreground">
          {data.banner}
        </div>
      )}

      <section className="relative w-full overflow-hidden">
        <div className="relative h-[24rem] w-full sm:h-[30rem]">
          <img
            src={heroImg}
            alt="Panorámica del pueblo blanco de Casarabonela y la Sierra de las Nieves"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/30 to-transparent" />
          <div className="relative mx-auto flex h-full max-w-5xl flex-col items-center justify-end px-4 pb-16 text-center">
            <h1 className="max-w-xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-primary-foreground sm:text-5xl">
              {data.heroTitle}
            </h1>
            {data.heroSubtitle && (
              <p className="mt-3 max-w-xl text-base text-primary-foreground/85 sm:text-lg">{data.heroSubtitle}</p>
            )}
          </div>
        </div>
        <div className="relative z-10 mx-auto -mt-7 w-full max-w-5xl px-4">
          <form onSubmit={submit} role="search" className="mx-auto flex max-w-xl items-center gap-1 rounded-soft border-2 bg-card p-1.5">
            <label htmlFor="buscar" className="sr-only">Buscar comercios y profesionales</label>
            <Search className="ml-2 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <input
              id="buscar"
              type="search"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Panadería, fontanero, tapas…"
              className="h-12 min-w-0 flex-1 bg-transparent text-lg text-foreground outline-none placeholder:text-muted-foreground"
            />
            {text && (
              <Button
                variant="ghost" size="icon"
                type="button"
                onClick={() => setText("")}
                aria-label="Borrar búsqueda"
                className="flex h-12 w-12 items-center justify-center rounded-soft-inner text-muted-foreground hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </Button>
            )}
            <Button type="submit" className="h-11 rounded-soft-inner bg-terracotta px-3.5 font-display text-sm font-semibold text-terracotta-foreground shadow-none hover:bg-terracotta/90">
              Buscar
            </Button>
          </form>
        </div>
      </section>

      <nav aria-label="Filtros" className="sticky top-0 z-10 mt-4 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto grid max-w-3xl gap-3 px-4 py-3 sm:grid-cols-3">
          <label className="grid min-w-0 gap-1.5 text-sm font-semibold">Mostrar
            <select aria-label="Tipo de ficha" value={tipo} onChange={(e) => {
              const value = e.target.value;
              if (value !== "" && value !== "comercio" && value !== "profesional") return;
              navigate({ search: (p) => ({ ...p, tipo: value, of: "", urg: false }) });
            }} className="h-12 w-full min-w-0 rounded-soft border-2 bg-card px-3 text-base">
              <option value="">Todos</option><option value="comercio">Comercios</option><option value="profesional">Profesionales</option>
            </select>
          </label>
          <label className="grid min-w-0 gap-1.5 text-sm font-semibold">Categoría
            <select aria-label="Categoría" value={cat} onChange={(e) => { setText(""); navigate({ search: (p) => ({ ...p, cat: e.target.value, of: "", q: "", urg: false }) }); }} className="h-12 w-full min-w-0 rounded-soft border-2 bg-card px-3 text-base">
              <option value="">Todas las categorías</option>
              {data.categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
          </label>
          {activeCat && <label className="grid min-w-0 gap-1.5 text-sm font-semibold">Oficio / actividad
            <select aria-label="Oficio / actividad" value={of} onChange={(e) => navigate({ search: (p) => ({ ...p, of: e.target.value }) })} className="h-12 w-full min-w-0 rounded-soft border-2 bg-card px-3 text-base">
              <option value="">Todos los oficios</option>
              {activities.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>}
        </div>
        <div className="mx-auto flex max-w-5xl justify-center px-4 pb-3">
          <button
            type="button"
            aria-pressed={urg}
            onClick={() => { setText(""); navigate({ search: (p) => ({ ...p, urg: !urg, q: "", cat: "", of: "", tipo: "" }) }); }}
            className={cn(
              "inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-availability-border px-5 font-display text-base font-bold",
              urg ? "bg-availability-foreground text-card" : "bg-availability text-availability-foreground",
            )}
          >
            <Zap className="h-5 w-5" aria-hidden /> Urgencias y guardias{urg ? " · quitar" : ""}
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {browsingHome && collaborators.length > 0 && (
          <section aria-label="Colaboradores" className="mb-6 border-b pb-6">
            <div className="grid gap-4">
              {collaborators.map((l) => (
                <ListingCard key={l.id} listing={l} collaborator categoryName={catName.get(l.category_id ?? "")} />
              ))}
            </div>
          </section>
        )}

        <section aria-label="Directorio">
          {!browsingHome && (
            <h2 className="text-center font-display text-2xl font-bold">
              {urg ? "Urgencias y guardias" : activeCat ? (of ? `${activeCat.name} · ${of}` : activeCat.name) : "Resultados"}
            </h2>
          )}
          <p className={browsingHome ? "sr-only" : "text-center text-sm text-muted-foreground"} aria-live="polite">
            {results.length} {results.length === 1 ? "resultado" : "resultados"}
          </p>
          {results.length === 0 ? (
            <p className="mt-6 border bg-card p-6 text-center">No hay resultados. Prueba con otra palabra o elige "Todo".</p>
          ) : (
            <div className={cn("grid gap-4", !browsingHome && "mt-3")}>
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

    </div>
  );
}
