import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/sugerir")({
  head: () => ({
    meta: [
      { title: "Sugerir un comercio o profesional — Aquí Bonela" },
      { name: "description", content: "¿Conoces un comercio o profesional de Casarabonela que debería estar en Aquí Bonela? Cuéntanoslo." },
      { property: "og:title", content: "Sugerir un comercio o profesional — Aquí Bonela" },
      { property: "og:description", content: "Ayúdanos a completar el directorio local de Casarabonela." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Sugerir,
});

function Sugerir() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-3xl font-extrabold">Sugerir un comercio o profesional</h1>
        <p className="mt-4 text-base leading-relaxed">
          Durante el piloto preparamos cada ficha en persona con su titular. Si conoces un comercio o profesional de
          Casarabonela que debería aparecer aquí, coméntaselo o háblanos directamente y nos pondremos en contacto.
        </p>
      </main>
    </div>
  );
}
