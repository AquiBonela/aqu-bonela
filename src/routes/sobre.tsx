import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre Aquí Bonela — Aquí Bonela" },
      {
        name: "description",
        content:
          "El directorio de comercios, profesionales, servicios públicos y asociaciones de Casarabonela. Un proyecto local, gratuito y pensado para el móvil.",
      },
      { property: "og:title", content: "Sobre Aquí Bonela" },
      {
        property: "og:description",
        content: "El directorio de Casarabonela: comercios, profesionales, servicios públicos y asociaciones, a un toque del móvil.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Sobre,
});

const SECTIONS = [
  {
    title: "¿Qué es Aquí Bonela?",
    body: (
      <>
        <p>
          Aquí Bonela es el directorio de Casarabonela: un lugar donde encontrar de forma rápida, desde el móvil, los
          comercios, profesionales, servicios públicos y asociaciones del pueblo.
        </p>
        <p>
          Nace de una idea sencilla: que la información de nuestro municipio esté ordenada, actualizada y disponible
          para cualquiera que la necesite, sin registros ni complicaciones.
        </p>
      </>
    ),
  },
  {
    title: "¿Para quién es?",
    body: (
      <>
        <p>
          Para vecinos y vecinas que buscan un oficio, un horario o un teléfono; para visitantes que descubren el
          pueblo; y para los propios negocios y colectivos, que así se dan a conocer sin coste.
        </p>
      </>
    ),
  },
  {
    title: "¿Cómo funciona?",
    body: (
      <>
        <p>
          Cada ficha muestra lo esencial: descripción, dirección, teléfono, WhatsApp, horario y fotos. Puedes llamar,
          escribir o ver cómo llegar con un solo toque, y compartir la ficha con quien la necesite.
        </p>
        <p>
          Las fichas se organizan por tipo —comercios, profesionales, servicios públicos y asociaciones— y por
          categoría, para que encontrar algo sea cuestión de segundos.
        </p>
      </>
    ),
  },
  {
    title: "¿Cómo aparecer en el directorio?",
    body: (
      <>
        <p>
          No hace falta registrarse ni tener cuenta en ningún sitio. Envíanos la información del negocio, profesional
          o colectivo, la revisamos y el titular autoriza su publicación desde un enlace privado que le llega por
          WhatsApp.
        </p>
        <p>La ficha básica es gratuita. Mantener los datos al día es lo único que pedimos.</p>
      </>
    ),
  },
];

function Sobre() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-3xl font-extrabold text-pretty">Sobre Aquí Bonela</h1>
        <div className="mt-6 grid gap-8">
          {SECTIONS.map((s) => (
            <section key={s.title} className="grid gap-2 text-base leading-relaxed">
              <h2 className="font-display text-xl font-bold">{s.title}</h2>
              {s.body}
            </section>
          ))}
          <section className="border bg-secondary/40 p-5">
            <h2 className="font-display text-xl font-bold">¿Nos ayudas a crecer?</h2>
            <p className="mt-2 text-base leading-relaxed">
              Si conoces un comercio, un profesional o un colectivo que falte, o ves algún dato que no es correcto,
              cuéntanoslo. Toda aportación hace el directorio más útil para el pueblo.
            </p>
            <Link
              to="/sugerir"
              className="mt-4 inline-flex min-h-12 items-center bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Enviar información
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}
