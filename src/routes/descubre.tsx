import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Car, Footprints, Clock, CalendarDays, MessageCircle, Hourglass, Lightbulb, type LucideIcon } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import calles from "@/assets/descubre/calles.jpg";
import castillo from "@/assets/descubre/castillo.jpg";
import cactus from "@/assets/descubre/cactus.jpg";
import molino from "@/assets/descubre/molino.jpg";
import fuentes from "@/assets/descubre/fuentes.jpg";
import sierra from "@/assets/descubre/sierra.jpg";
import fiestas from "@/assets/descubre/fiestas.jpg";
import gastronomia from "@/assets/descubre/gastronomia.jpg";

export const Route = createFileRoute("/descubre")({
  head: () => ({
    meta: [
      { title: "Descubre Bonela — Guía para visitar Casarabonela" },
      {
        name: "description",
        content:
          "Guía de Casarabonela: historia andalusí, Sierra de las Nieves, rincones, Fiesta de los Rondeles, gastronomía y consejos de vecino.",
      },
      { property: "og:title", content: "Descubre Bonela — Guía de Casarabonela" },
      { property: "og:description", content: "Historia, naturaleza, rincones, fiestas, sabores y consejos para tu visita." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Descubre,
});

const NAV = [
  ["historia", "Historia"],
  ["entorno", "Entorno"],
  ["rincones", "Rincones"],
  ["fiestas", "Fiestas"],
  ["sabores", "Sabores"],
  ["consejos", "Consejos"],
] as const;

const RINCONES = [
  { img: castillo, name: "Castillo y mirador", text: "Los vestigios de su pasado fortificado permiten conocer la historia del pueblo y disfrutar de las vistas del entorno." },
  { img: cactus, name: "Jardín de Cactus", text: "Un espacio singular para descubrir una interesante colección de cactus y otras plantas suculentas." },
  { img: fuentes, name: "Fuentes y caños", text: "Forman parte de la identidad de Casarabonela y recuerdan la importancia del agua en la vida del pueblo." },
  { img: molino, name: "Molino de Albaiva", text: "Ligado a la tradición y al aprovechamiento de los recursos del entorno." },
  { img: calles, name: "Jardín Andalusí", text: "Vegetación, agua y tradición que evocan la herencia cultural andalusí." },
];

const CONSEJOS: { Icon: LucideIcon; title: string; text: string }[] = [
  { Icon: Footprints, title: "Ven con calzado cómodo", text: "El casco histórico tiene calles estrechas, empinadas y con tramos empedrados." },
  { Icon: Car, title: "Aparca y descubre el pueblo caminando", text: "La mejor manera de conocer sus rincones es recorrerlos a pie." },
  { Icon: Hourglass, title: "Tómate tu tiempo", text: "No intentes verlo todo deprisa. Disfruta de sus calles, sus plazas y sus miradores." },
  { Icon: Clock, title: "Consulta los horarios antes de visitar", text: "Algunos espacios y monumentos pueden tener horarios de apertura específicos." },
  { Icon: MessageCircle, title: "Pregunta a los vecinos", text: "Siempre hay una historia, un rincón o una recomendación que no aparece en las guías." },
  { Icon: CalendarDays, title: "Consulta la agenda local", text: "Si tu visita coincide con alguna fiesta, tendrás una oportunidad especial para conocer sus tradiciones." },
];

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 space-y-2">
      {items.map((t) => (
        <li key={t} className="flex gap-3 text-lg leading-relaxed text-muted-foreground">
          <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function Kicker({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
      {n}. {children}
    </p>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{children}</p>;
}

function Closing({ children }: { children: React.ReactNode }) {
  return <p className="mt-5 font-display text-lg font-bold italic text-foreground">{children}</p>;
}

function DirLink({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <Link
      to="/directorio"
      search={{ q, cat: "", of: "" }}
      className="mt-6 inline-flex min-h-12 items-center gap-2 border-b-2 border-primary font-bold text-foreground hover:text-primary"
    >
      {children} <ArrowRight className="h-4 w-4" aria-hidden />
    </Link>
  );
}

function Descubre() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        {/* Introducción */}
        <section className="relative">
          <img src={calles} alt="Calles encaladas de Casarabonela" width={1280} height={864} className="h-[64vh] min-h-80 w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-5xl px-4 pb-10 text-background">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] opacity-90">Descubre Bonela</p>
            <h1 className="mt-2 max-w-2xl font-display text-4xl font-extrabold leading-tight text-balance sm:text-5xl">
              Casarabonela, un pueblo por descubrir
            </h1>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-12">
          <P>
            Entre las montañas de Málaga, en las estribaciones de la Sierra de las Nieves, se encuentra Casarabonela, un pueblo blanco que conserva el encanto de la Andalucía más auténtica.
          </P>
          <P>
            Sus calles estrechas, sus casas encaladas, sus antiguas fuentes y su herencia andalusí cuentan historias que han pasado de generación en generación.
          </P>
          <P>Un lugar para pasear sin prisas, disfrutar de sus paisajes, descubrir sus tradiciones y dejarse sorprender por cada rincón.</P>
          <Closing>Ven a descubrir Bonela. Aquí cada calle tiene una historia y cada visita, algo especial.</Closing>
        </section>

        <nav aria-label="Secciones de la guía" className="sticky top-0 z-20 border-y bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 py-2">
            {NAV.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold hover:bg-muted">
                {label}
              </a>
            ))}
          </div>
        </nav>

        {/* 01. Historia */}
        <section id="historia" className="mx-auto grid max-w-5xl scroll-mt-16 gap-8 px-4 py-14 sm:grid-cols-2 sm:items-center">
          <img src={castillo} alt="Castillo de Casarabonela" loading="lazy" width={1280} height={864} className="aspect-[4/3] w-full object-cover" />
          <div>
            <Kicker n="01">Historia y patrimonio</Kicker>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-balance">Un pasado que sigue vivo</h2>
            <P>El origen andalusí de Casarabonela todavía se reconoce en sus calles, su arquitectura y la disposición de su casco histórico.</P>
            <P>Conocida en época musulmana como Qasr Bunayra, la localidad conserva huellas de un pasado que ha dejado una profunda identidad en el pueblo. Paseando por sus calles descubrirás:</P>
            <Bullets
              items={[
                "Los vestigios de su antiguo recinto fortificado.",
                "La Iglesia de Santiago Apóstol, uno de sus edificios más representativos.",
                "Calles estrechas y empinadas que conservan su trazado tradicional.",
                "Hornacinas, fuentes y rincones que forman parte de su patrimonio popular.",
              ]}
            />
            <Closing>Un paseo por Casarabonela es también un viaje a través de su historia.</Closing>
          </div>
        </section>

        {/* 02. Entorno */}
        <section id="entorno" className="scroll-mt-16">
          <img src={sierra} alt="Sierra de las Nieves" loading="lazy" width={1600} height={800} className="h-[55vh] min-h-72 w-full object-cover" />
          <div className="mx-auto max-w-3xl px-4 py-12">
            <Kicker n="02">Naturaleza y entorno</Kicker>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-balance">Un pueblo entre montañas</h2>
            <P>Casarabonela disfruta de un entorno natural privilegiado, rodeado de montañas, pinares, olivares y paisajes que invitan a salir a explorar.</P>
            <P>Su proximidad a la Sierra de las Nieves y la presencia de enclaves como Sierra Prieta ofrecen numerosas posibilidades para disfrutar del aire libre. Aquí encontrarás:</P>
            <Bullets
              items={[
                "Paisajes de montaña y espectaculares vistas del valle del Guadalhorce.",
                "Caminos y senderos para descubrir el entorno.",
                "Rincones naturales ideales para la fotografía.",
                "Espacios donde disfrutar de la tranquilidad y desconectar.",
              ]}
            />
            <Closing>Tanto si buscas una ruta por la montaña como un paseo tranquilo, el entorno de Bonela merece ser descubierto.</Closing>
          </div>
        </section>

        {/* 03. Rincones */}
        <section id="rincones" className="scroll-mt-16 bg-muted/50">
          <div className="mx-auto max-w-5xl px-4 py-14">
            <Kicker n="03">Rincones que descubrir</Kicker>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-balance">Pequeños lugares con mucho que contar</h2>
            <P>Más allá de sus calles blancas, Casarabonela esconde lugares que merecen una visita.</P>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {RINCONES.map((r) => (
                <article key={r.name} className="overflow-hidden bg-background shadow-sm">
                  <img src={r.img} alt={r.name} loading="lazy" width={1280} height={864} className="aspect-[4/3] w-full object-cover" />
                  <div className="p-4">
                    <h3 className="font-display text-lg font-extrabold">{r.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{r.text}</p>
                  </div>
                </article>
              ))}
            </div>
            <Closing>No tengas prisa. A veces, los mejores descubrimientos aparecen al doblar una esquina.</Closing>
          </div>
        </section>

        {/* 04. Fiestas */}
        <section id="fiestas" className="mx-auto grid max-w-5xl scroll-mt-16 gap-8 px-4 py-14 sm:grid-cols-2 sm:items-center">
          <div className="sm:order-2">
            <img src={fiestas} alt="Fiesta de los Rondeles" loading="lazy" width={1280} height={864} className="aspect-[4/3] w-full object-cover" />
          </div>
          <div>
            <Kicker n="04">Fiestas y tradiciones</Kicker>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-balance">Una identidad que se celebra</h2>
            <P>Las tradiciones forman parte del carácter de Casarabonela. A lo largo del año, sus calles se llenan de encuentros y celebraciones que mantienen viva la identidad del pueblo.</P>
            <P>
              Una de las más singulares es la <strong className="text-foreground">Fiesta de los Rondeles</strong>, cada 12 de diciembre: los capachos de esparto de los antiguos molinos de aceite se convierten en antorchas que iluminan las calles.
            </P>
            <Bullets
              items={[
                "Las celebraciones de Semana Santa.",
                "Las fiestas patronales.",
                "Las ferias y encuentros populares.",
                "Actividades culturales y tradicionales durante el año.",
              ]}
            />
            <Closing>Venir durante sus fiestas es una oportunidad para conocer de cerca sus costumbres y compartirlas con sus vecinos.</Closing>
          </div>
        </section>

        {/* 05. Sabores */}
        <section id="sabores" className="scroll-mt-16 bg-beige">
          <div className="mx-auto grid max-w-5xl gap-8 px-4 py-14 sm:grid-cols-2 sm:items-center">
            <img src={gastronomia} alt="Productos típicos de Casarabonela" loading="lazy" width={1280} height={864} className="aspect-[4/3] w-full object-cover" />
            <div>
              <Kicker n="05">Sabores de nuestra tierra</Kicker>
              <h2 className="mt-2 font-display text-3xl font-extrabold text-balance">Tradición que también se disfruta en la mesa</h2>
              <P>La gastronomía de Casarabonela está ligada a su historia, su entorno rural y los productos de la tierra, con recetas transmitidas de generación en generación.</P>
              <Bullets
                items={[
                  "Aceitunas y aceite de oliva.",
                  "Productos del cerdo y chacinas tradicionales.",
                  "Miel y productos locales.",
                  "Repostería tradicional.",
                  "Platos caseros de la cocina malagueña.",
                ]}
              />
              <Closing>Una buena forma de conocer un pueblo es sentarse a su mesa.</Closing>
              <DirLink q="restaurante">Dónde disfrutarlo</DirLink>
            </div>
          </div>
        </section>

        {/* 06. Consejos */}
        <section id="consejos" className="mx-auto max-w-5xl scroll-mt-16 px-4 py-14">
          <div className="border-2 border-primary bg-primary/5 p-6 sm:p-10">
            <Kicker n="06">Consejos de vecino</Kicker>
            <div className="mt-2 flex items-center gap-3">
              <Lightbulb className="h-8 w-8 text-primary" aria-hidden />
              <h2 className="font-display text-3xl font-extrabold text-balance">Para disfrutar Bonela como alguien de aquí</h2>
            </div>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {CONSEJOS.map(({ Icon, title, text }) => (
                <li key={title} className="flex gap-4 border border-primary/20 bg-card p-5 shadow-sm">
                  <Icon className="h-6 w-6 shrink-0 text-primary" aria-hidden />
                  <div>
                    <p className="text-lg font-bold">{title}</p>
                    <p className="mt-1 text-base text-muted-foreground">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Cierre */}
        <section className="bg-primary text-primary-foreground">
          <div className="mx-auto max-w-3xl px-4 py-14 text-center">
            <h2 className="font-display text-3xl font-extrabold">Hay mucho más por descubrir</h2>
            <p className="mt-4 text-lg opacity-95">
              Casarabonela es un pueblo que se disfruta caminando, conversando, descubriendo sus rincones y compartiendo sus tradiciones. Descubre sus comercios, conoce su gastronomía y encuentra lugares donde disfrutar de tu visita.
            </p>
            <p className="mt-4 font-display text-xl font-bold">Bonela te espera.</p>
            <Link
              to="/directorio"
              search={{ q: "", cat: "", of: "" }}
              className="mt-6 inline-flex min-h-12 items-center gap-2 bg-background px-6 font-bold text-foreground hover:opacity-90"
            >
              Explorar el directorio <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
