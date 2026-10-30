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
      "Puedes consultar el directorio de comercios y profesionales, localizar servicios públicos, descubrir lugares de interés, conocer actividades y eventos o consultar anuncios de compraventa, alquiler y empleo.",
      "La información se organiza para facilitar las búsquedas y permitir que cualquier persona pueda acceder a ella sin registros ni complicaciones.",
      "Los contenidos son revisados antes de su publicación para procurar que la información sea útil, clara y fiable.",
    ],
  },
  {
    title: "¿Cómo aparecer en Aquí Bonela?",
    paragraphs: [
      "Si tienes un comercio, eres profesional o formas parte de una asociación o colectivo, puedes solicitar que tu información aparezca en la plataforma.",
      "También puedes enviarnos información sobre lugares de interés, actividades, eventos, noticias o cualquier otro contenido que pueda resultar útil para Casarabonela.",
      "Las propuestas se revisan antes de publicarse y, cuando corresponde, solicitamos la autorización necesaria a sus responsables.",
      "La inclusión básica en el directorio es gratuita.",
    ],
  },
];

const AREAS = [
  "Comercios",
  "Profesionales",
  "Servicios públicos",
  "Asociaciones",
  "Lugares de interés",
  "Actividades",
  "Noticias",
  "Clasificados",
];

function Sobre() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        {/* Cabecera */}
        <section className="border-b">
          <div className="mx-auto max-w-3xl px-5 pb-12 pt-14 sm:pt-20">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Casarabonela</p>
            <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight text-pretty sm:text-5xl">
              Sobre Aquí Bonela
            </h1>
            <div className="mt-6 h-1 w-16 bg-primary" />
            <div className="mt-8 grid gap-5 text-lg leading-relaxed text-foreground/90 sm:text-xl">
              <p>
                Aquí Bonela es una plataforma digital dedicada a Casarabonela, creada para reunir en un mismo lugar la
                información útil del municipio.
              </p>
              <p className="text-muted-foreground">
                Un espacio donde encontrar comercios, profesionales, servicios públicos, asociaciones, lugares de
                interés, actividades, noticias y mucho más.
              </p>
            </div>
            <ul className="mt-8 flex flex-wrap gap-2">
              {AREAS.map((a) => (
                <li key={a} className="rounded-sm border bg-secondary/40 px-3 py-1.5 text-sm font-medium">
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Cita */}
        <section className="bg-secondary/40">
          <div className="mx-auto max-w-3xl px-5 py-12">
            <blockquote className="border-l-4 border-primary pl-5 font-display text-xl font-semibold leading-snug text-pretty sm:text-2xl">
              Nace de una idea sencilla: hacer que la información de nuestro pueblo sea más accesible, esté mejor
              organizada y resulte fácil de encontrar desde cualquier dispositivo.
            </blockquote>
          </div>
        </section>

        {/* Secciones numeradas */}
        <div className="mx-auto max-w-3xl px-5 py-12">
          {SECTIONS.map((s, i) => (
            <section key={s.title} className="grid gap-4 border-t py-10 first:border-t-0 first:pt-0 sm:grid-cols-[5rem_1fr]">
              <span className="font-display text-3xl font-extrabold text-primary/70" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h2 className="font-display text-2xl font-bold">{s.title}</h2>
                <div className="mt-4 grid gap-3 text-base leading-relaxed text-foreground/85 sm:text-lg">
                  {s.paragraphs.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* Llamada a participar */}
        <section className="bg-primary text-primary-foreground">
          <div className="mx-auto max-w-3xl px-5 py-14">
            <h2 className="font-display text-3xl font-extrabold">¿Nos ayudas a crecer?</h2>
            <div className="mt-5 grid gap-3 text-lg leading-relaxed opacity-95">
              <p>
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
              className="mt-8 inline-flex min-h-12 items-center rounded-sm bg-background px-6 font-semibold text-foreground hover:bg-background/90"
            >
              Enviar información
            </Link>
          </div>
        </section>

        {/* Independencia */}
        <section className="mx-auto max-w-3xl px-5 py-12">
          <div className="rounded-sm border p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Una iniciativa independiente
            </p>
            <p className="mt-3 leading-relaxed">
              Aquí Bonela es una iniciativa privada e independiente, creada para reunir y facilitar el acceso a
              información de interés sobre Casarabonela.
            </p>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              No es una web oficial del Ayuntamiento ni representa a ninguna administración pública.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
