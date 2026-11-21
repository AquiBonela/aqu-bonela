import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { TramitesSection } from "@/components/TramitesSection";
import { Hero } from "@/components/TramitesUI";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/tramites/")({
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
  const { tr } = useI18n();
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main>
        <Hero title="Trámites y gestiones" text="Información útil para realizar algunas de las gestiones más habituales en Casarabonela." />
        <div className="mx-auto max-w-5xl px-4 py-10">
          <Link to="/servicios-publicos" hash="tramites" className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-primary">
            <ArrowLeft className="h-4 w-4" aria-hidden />{tr("Servicios públicos")}
          </Link>
          <TramitesSection />
        </div>
      </main>
    </div>
  );
}
