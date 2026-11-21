import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { TramitesSection } from "@/components/TramitesSection";
import { Hero } from "@/components/TramitesUI";
import { publicProceduresQuery } from "@/lib/public-procedures";

export const Route = createFileRoute("/tramites/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(publicProceduresQuery),
  head: () => ({
    meta: [
      { title: "Trámites y gestiones — Aquí Bonela" },
      { name: "description", content: "Encuentra guías de trámites y gestiones en Casarabonela: documentación personal, requisitos, pasos y enlaces oficiales." },
      { property: "og:title", content: "Trámites y gestiones — Aquí Bonela" },
      { property: "og:description", content: "Busca tu trámite y consulta sus requisitos, pasos y enlaces oficiales en la guía de Casarabonela." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TramitesPage,
});

function TramitesPage() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main>
        <Hero title="Trámites y gestiones" text="Información útil para realizar algunas de las gestiones más habituales en Casarabonela." />
        <div className="mx-auto max-w-5xl px-4 py-10">
          <TramitesSection />
        </div>
      </main>
    </div>
  );
}
