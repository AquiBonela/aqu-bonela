import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { useI18n } from "@/lib/i18n";
import { useSuspenseQuery } from "@tanstack/react-query";
import { publicProceduresQuery } from "@/lib/public-procedures";
import { Hero, TramiteCard } from "@/components/TramitesUI";
import { brand } from "@/config/municipality";
import { pageHeaderImage } from "@/lib/page-headers";

export const Route = createFileRoute("/tramites/$categoria/")({
  loader: async ({ params, context }) => {
    const data = await context.queryClient.ensureQueryData(publicProceduresQuery);
    const c = data.categories.find((c) => c.slug === params.categoria);
    if (!c) throw notFound();
    return c;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: brand(`${loaderData?.title ?? "Trámites"} — Guía de trámites | {app}`) },
      { name: "description", content: loaderData?.text ?? brand("Guía de trámites de {app}.") },
      { property: "og:title", content: brand(`${loaderData?.title ?? "Trámites"} — {app}`) },
      { property: "og:description", content: loaderData?.text ?? "Guía de trámites." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CategoriaPage,
  notFoundComponent: () => <NotFoundMsg />,
  errorComponent: () => <NotFoundMsg />,
});

function NotFoundMsg() {
  const { tr } = useI18n();
  return (
    <div className="p-10 text-center">
      <p>{tr("Esta categoría no existe.")}</p>
      <Link to="/tramites" className="mt-4 inline-block font-semibold text-primary underline">
        {tr("Volver a Trámites")}
      </Link>
    </div>
  );
}

function CategoriaPage() {
  const { categoria } = Route.useParams();
  const { data } = useSuspenseQuery(publicProceduresQuery);
  const c = data.categories.find((c) => c.slug === categoria);
  const { tr } = useI18n();
  if (!c) return <NotFoundMsg />;
  const list = data.procedures.filter((t) => t.cat === c.slug);
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main>
        <Hero
          image={pageHeaderImage("tramites")}
          kicker="Guía de trámites"
          title={c.title}
          text={c.text}
        />
        <div className="mx-auto max-w-5xl px-4 py-10">
          <Link
            to="/tramites"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {tr("Todos los trámites")}
          </Link>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {list.map((t) => (
              <TramiteCard key={t.slug} t={t} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
