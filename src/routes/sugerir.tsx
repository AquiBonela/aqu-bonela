import { createFileRoute } from "@tanstack/react-router";
import { SuggestionForm } from "@/components/SuggestionForm";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/sugerir")({
  head: () => ({
    meta: [
      { title: "Enviar información — Aquí Bonela" },
      { name: "description", content: "Ayúdanos a mantener Casarabonela conectado y actualizado: envíanos negocios, lugares, eventos, noticias o correcciones." },
      { property: "og:title", content: "Enviar información — Aquí Bonela" },
      { property: "og:description", content: "Ayúdanos a mantener Casarabonela conectado y actualizado." },
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
        <h1 className="font-display text-3xl font-extrabold text-pretty">¿Conoces algo que debería estar en Aquí Bonela?</h1>

        <div className="mt-5 grid gap-3 text-base leading-relaxed">
          <p>
            Puedes enviarnos información sobre comercios, profesionales, lugares de interés, eventos, noticias o
            cualquier otro contenido que consideres útil para Casarabonela.
          </p>
          <p>
            También puedes comunicarnos errores, sugerir cambios o contarnos cómo podemos mejorar Aquí Bonela.
          </p>
          <p>Toda aportación es bienvenida. Revisaremos la información antes de publicarla.</p>
        </div>

        <SuggestionForm />
      </main>
    </div>
  );
}
