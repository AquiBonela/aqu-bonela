import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre Aquí Bonela — Aquí Bonela" },
      {
        name: "description",
        content:
          "Aquí Bonela reúne la información útil de Casarabonela: comercios, profesionales, servicios públicos, asociaciones, lugares, actividades y noticias.",
      },
      { property: "og:title", content: "Sobre Aquí Bonela" },
      {
        property: "og:description",
        content: "Una plataforma independiente que reúne en un mismo lugar la información útil de Casarabonela.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Sobre,
});

const SECTIONS: { title: string; paragraphs: string[] }[] = [
  {
    title: "¿Para quién es?",
    paragraphs: [
      "Para los vecinos y vecinas que necesitan encontrar un servicio, consultar un teléfono, conocer una actividad o estar al día de lo que ocurre en el municipio.",
      "Para quienes visitan Casarabonela y quieren descubrir sus lugares, rutas, comercios y propuestas.",
      "Y también para los negocios, profesionales, asociaciones y colectivos que quieren dar a conocer lo que hacen y formar parte de un espacio común.",
    ],
  },
  {
    title: "¿Cómo funciona?",
    paragraphs: [
      "Aquí Bonela reúne diferentes contenidos del municipio para que puedas encontrar lo que necesitas de forma sencilla.",
      "El objetivo es que no tengas que buscar en diferentes páginas, redes sociales o grupos para encontrar información sobre Casarabonela: Aquí Bonela trabaja para reunirla y organizarla en un espacio común.",
      "Puedes consultar comercios y profesionales, localizar servicios públicos, descubrir lugares de interés, conocer actividades y eventos o consultar clasificados.",
      "La información se organiza para facilitar las búsquedas y permitir que cualquier persona acceda sin registros ni complicaciones.",
      "Los contenidos se revisan antes de su publicación para procurar que la información sea útil, clara y fiable.",
    ],
  },
  {
    title: "¿Cómo aparecer en Aquí Bonela?",
    paragraphs: [
      "Cualquier persona puede participar. Si conoces un lugar de interés, organizas una actividad, quieres compartir un evento, una noticia o tienes un anuncio que pueda resultar útil para el pueblo, puedes enviárnoslo.",
      "Si además tienes un comercio, eres profesional o formas parte de una asociación o colectivo, puedes solicitar tu ficha en la plataforma.",
      "Las propuestas se revisan antes de publicarse y la inclusión básica en el directorio es siempre gratuita.",
    ],
  },
];


function Sobre() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-3xl font-extrabold text-pretty">Sobre Aquí Bonela</h1>

        <section className="mt-6 grid gap-2 text-base leading-relaxed">
          <h2 className="font-display text-xl font-bold">¿Qué es?</h2>
          <p className="font-medium">
            Aquí Bonela es una plataforma digital dedicada a Casarabonela, creada para reunir en un mismo lugar la
            información útil del municipio.
          </p>
          <p>
            Un espacio donde encontrar comercios, profesionales, servicios públicos, asociaciones, lugares de interés,
            actividades, noticias y mucho más.
          </p>
          <p>
            Nace de una idea sencilla: hacer que la información de nuestro pueblo sea más accesible, esté mejor
            organizada y resulte fácil de encontrar desde cualquier dispositivo.
          </p>
        </section>

        {SECTIONS.map((s) => (
          <section key={s.title} className="mt-8 grid gap-2 border-t pt-8 text-base leading-relaxed">
            <h2 className="font-display text-xl font-bold">{s.title}</h2>
            {s.paragraphs.map((p, i) => (
              <p key={p} className={i === 0 ? "font-medium" : undefined}>
                {p}
              </p>
            ))}
          </section>
        ))}

        <section className="mt-8 border-t pt-8">
          <div className="border bg-secondary/40 p-5">
            <h2 className="font-display text-xl font-bold">¿Nos ayudas a crecer?</h2>
            <div className="mt-2 grid gap-2 text-base leading-relaxed">
              <p className="font-medium">
                Aquí Bonela es un proyecto que se construye y mejora con el conocimiento y la participación de quienes
                viven, trabajan o tienen relación con Casarabonela.
              </p>
              <p>
                Si conoces un negocio que falta, sabes de un lugar que merece la pena descubrir, quieres dar a conocer
                una actividad o has detectado algún dato incorrecto, puedes contárnoslo.
              </p>
              <p>Toda aportación ayuda a que Aquí Bonela sea cada día más útil para el municipio.</p>
            </div>
            <Link
              to="/sugerir"
              className="mt-4 inline-flex min-h-12 items-center bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Enviar información
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-2 border-t pt-8 text-base leading-relaxed">
          <h2 className="font-display text-xl font-bold">Una iniciativa independiente</h2>
          <p className="font-medium">
            Aquí Bonela es una iniciativa privada e independiente, creada para reunir y facilitar el acceso a
            información de interés sobre Casarabonela.
          </p>
          <p>No es una web oficial del Ayuntamiento ni representa a ninguna administración pública.</p>
        </section>
      </main>
    </div>
  );
}
