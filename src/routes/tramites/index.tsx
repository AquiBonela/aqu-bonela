import { createFileRoute, notFound } from "@tanstack/react-router";
import { sectionVisible } from "@/lib/site-availability";
import { Info } from "lucide-react";
import { Text } from "@/lib/i18n";
import { SiteHeader } from "@/components/SiteHeader";
import { TramitesSection } from "@/components/TramitesSection";
import { Hero } from "@/components/TramitesUI";
import { publicProceduresQuery } from "@/lib/public-procedures";
import { brand } from "@/config/municipality";
import { pageHeaderImage } from "@/lib/page-headers";

export const Route = createFileRoute("/tramites/")({
  // Sin su página o su sección en la configuración publicada, la ruta no existe.
  beforeLoad: () => {
    if (!sectionVisible("servicios-publicos", "tramites")) throw notFound();
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(publicProceduresQuery),
  head: () => ({
    meta: [
      { title: brand("Guía de trámites — {app}") },
      {
        name: "description",
        content: brand(
          "Encuentra guías de trámites y gestiones en {municipio}: documentación personal, requisitos, pasos y enlaces oficiales.",
        ),
      },
      { property: "og:title", content: brand("Guía de trámites — {app}") },
      {
        property: "og:description",
        content: brand(
          "Busca tu trámite y consulta sus requisitos, pasos y enlaces oficiales en la guía de {municipio}.",
        ),
      },
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
        <Hero
          image={pageHeaderImage("tramites")}
          title="Guía de trámites"
          text="¿Necesitas realizar una gestión y no sabes por dónde empezar? Encuentra guías sencillas para conocer los requisitos, preparar la documentación y saber dónde y cómo solicitar cada trámite."
        />
        <div className="mx-auto max-w-5xl px-4 pt-6">
          <div className="flex max-w-2xl items-start gap-3 border-l-4 border-primary bg-muted p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <p className="text-sm">
              <Text text="{app} no realiza trámites. Te explicamos cómo hacerlos y te facilitamos el acceso a los organismos oficiales." />
            </p>
          </div>
        </div>
        <div className="mx-auto max-w-5xl px-4 py-10">
          <TramitesSection />
        </div>
      </main>
    </div>
  );
}
