import { createFileRoute } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { TramitesSection } from "@/components/TramitesSection";
import { Hero } from "@/components/TramitesUI";
import { publicProceduresQuery } from "@/lib/public-procedures";
import heroImage from "@/assets/hero-casarabonela.jpg";

export const Route = createFileRoute("/tramites/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(publicProceduresQuery),
  head: () => ({
    meta: [
      { title: "Guía de trámites — Aquí Bonela" },
      { name: "description", content: "Encuentra guías de trámites y gestiones en Casarabonela: documentación personal, requisitos, pasos y enlaces oficiales." },
      { property: "og:title", content: "Guía de trámites — Aquí Bonela" },
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
        <Hero image={heroImage} title="Guía de trámites" text="Encuentra cómo realizar tus gestiones paso a paso. Te explicamos qué necesitas, qué documentación preparar y dónde debes solicitar cada trámite." />
        <div className="mx-auto max-w-5xl px-4 pt-6">
          <div className="flex max-w-2xl items-start gap-3 border-l-4 border-primary bg-muted p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <p className="text-sm">Aquí Bonela es una guía informativa. No realizamos trámites ni gestionamos documentación en nombre de los usuarios.</p>
          </div>
        </div>
        <div className="mx-auto max-w-5xl px-4 py-10">
          <TramitesSection />
        </div>
      </main>
    </div>
  );
}
