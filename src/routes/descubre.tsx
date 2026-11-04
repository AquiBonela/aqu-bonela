import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Car, Footprints, Droplets, Info, Lightbulb, Sun, type LucideIcon } from "lucide-react";
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
          "Guía de Casarabonela: historia andalusí, Sierra de las Nieves, rincones imprescindibles, fiestas, gastronomía y consejos de vecino.",
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
  { img: castillo, kicker: "Siglo IX · Mirador", name: "Castillo y mirador", text: "Restos de Qasr Bunayra con vistas al Valle del Guadalhorce." },
  { img: cactus, kicker: "Jardín botánico", name: "Jardín de Cactus", text: "Una de las mayores colecciones de cactus y suculentas de España." },
  { img: fuentes, kicker: "Cultura del agua", name: "Fuentes y caños", text: "Azulejos pintados a mano que cuentan la historia del pueblo." },
  { img: molino, kicker: "Patrimonio", name: "Molino de Albaiva", text: "Antiguo molino de rodezno de harina y aceite." },
];

const CONSEJOS: { Icon: LucideIcon; title: string; text: string }[] = [
  { Icon: Car, title: "Aparca a la entrada", text: "Las calles del centro son estrechas y empinadas. Deja el coche en los accesos y sube andando." },
  { Icon: Footprints, title: "Calzado cómodo", text: "Bonela se disfruta a pie, pero sus cuestas tienen encanto… y pendiente." },
  { Icon: Droplets, title: "Agua de la sierra", text: "Encontrarás fuentes por el camino. Lleva tu botella." },
  { Icon: Sun, title: "Mejor a primera hora", text: "En verano, sube al castillo temprano o al atardecer: la luz es mejor y hace menos calor." },
  { Icon: Info, title: "Oficina de turismo", text: "En la calle Real, 5 (antiguo matadero). Pregunta por las visitas guiadas." },
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

function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{children}</p>;
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
        {/* 1. Introducción */}
        <section className="relative">
          <img src={calles} alt="Calles encaladas de Casarabonela" width={1280} height={864} className="h-[64vh] min-h-80 w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-5xl px-4 pb-10 text-background">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] opacity-90">Descubre Bonela</p>
            <h1 className="mt-2 max-w-2xl font-display text-4xl font-extrabold leading-tight text-balance sm:text-5xl">
              Casarabonela, un pueblo por descubrir
            </h1>
            <p className="mt-3 max-w-xl text-lg opacity-95">
              Pueblo blanco andaluz a las puertas de la Sierra de las Nieves. Una pequeña guía para recorrerlo sin prisa.
            </p>
          </div>
        </section>

        <nav aria-label="Secciones de la guía" className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 py-2">
            {NAV.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold hover:bg-muted">
                {label}
              </a>
            ))}
          </div>
        </nav>

        {/* 2. Historia */}
        <section id="historia" className="mx-auto grid max-w-5xl scroll-mt-16 gap-8 px-4 py-14 sm:grid-cols-2 sm:items-center">
          <img src={castillo} alt="Castillo de Casarabonela" loading="lazy" width={1280} height={864} className="aspect-[4/3] w-full object-cover" />
          <div>
            <Kicker>Historia y patrimonio</Kicker>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-balance">Un paseo por nuestro pasado andalusí</h2>
            <Bullets
              items={[
                "Fortaleza de Qasr Bunayra, del siglo IX, vigilando el valle.",
                "Casco antiguo de trazado andalusí: cuestas, adarves y hornacinas.",
                "La iglesia de Santiago se levanta sobre la antigua mezquita.",
              ]}
            />
          </div>
        </section>

        {/* 3. Entorno — panorámica */}
        <section id="entorno" className="scroll-mt-16">
          <img src={sierra} alt="Sierra de las Nieves" loading="lazy" width={1600} height={800} className="h-[55vh] min-h-72 w-full object-cover" />
          <div className="mx-auto max-w-3xl px-4 py-12 text-center">
            <Kicker>Entorno natural</Kicker>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-balance">La puerta a la Sierra de las Nieves</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Pinares, olivares y miradores sobre el Valle del Guadalhorce. Senderos para todos los niveles que salen del propio pueblo.
            </p>
          </div>
        </section>

        {/* 4. Rincones — tarjetas */}
        <section id="rincones" className="scroll-mt-16 bg-muted/50">
          <div className="mx-auto max-w-5xl px-4 py-14">
            <Kicker>Qué visitar</Kicker>
            <h2 className="mt-2 font-display text-3xl font-extrabold">Rincones imprescindibles</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {RINCONES.map((r) => (
                <article key={r.name} className="overflow-hidden bg-background shadow-sm">
                  <img src={r.img} alt={r.name} loading="lazy" width={1280} height={864} className="aspect-[4/3] w-full object-cover" />
                  <div className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">{r.kicker}</p>
                    <h3 className="mt-1 font-display text-lg font-extrabold">{r.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{r.text}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 5. Fiestas */}
        <section id="fiestas" className="mx-auto grid max-w-5xl scroll-mt-16 gap-8 px-4 py-14 sm:grid-cols-2 sm:items-center">
          <div className="sm:order-2">
            <img src={fiestas} alt="Fiesta de los Rondeles" loading="lazy" width={1280} height={864} className="aspect-[4/3] w-full object-cover" />
          </div>
          <div>
            <Kicker>Fiestas y tradiciones</Kicker>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-balance">Una cultura popular que sigue viva</h2>
            <Bullets
              items={[
                "Fiesta de los Rondeles, cada 12 de diciembre: el pueblo se ilumina con fuego.",
                "Semana Santa en sus calles empinadas.",
                "Feria de verano y romerías a lo largo del año.",
              ]}
            />
          </div>
        </section>

        {/* 6. Sabores */}
        <section id="sabores" className="scroll-mt-16 bg-beige">
          <div className="mx-auto grid max-w-5xl gap-8 px-4 py-14 sm:grid-cols-2 sm:items-center">
            <img src={gastronomia} alt="Productos típicos de Casarabonela" loading="lazy" width={1280} height={864} className="aspect-[4/3] w-full object-cover" />
            <div>
              <Kicker>Sabores de nuestra tierra</Kicker>
              <h2 className="mt-2 font-display text-3xl font-extrabold text-balance">Gastronomía y productos locales</h2>
              <Bullets
                items={[
                  "Aceite de oliva y aceitunas aliñadas de la zona.",
                  "Queso de cabra, chacinas y pan de pueblo.",
                  "Dulces tradicionales de horno y almendra.",
                ]}
              />
              <DirLink q="restaurante">Dónde comer en Casarabonela</DirLink>
            </div>
          </div>
        </section>

        {/* 7. Consejos de vecino */}
        <section id="consejos" className="mx-auto max-w-5xl scroll-mt-16 px-4 py-14">
          <div className="border-2 border-primary bg-primary/5 p-6 sm:p-10">
            <div className="flex items-center gap-3">
              <Lightbulb className="h-8 w-8 text-primary" aria-hidden />
              <h2 className="font-display text-3xl font-extrabold">Consejos de vecino</h2>
            </div>
            <p className="mt-2 text-muted-foreground">Lo que no viene en los folletos.</p>
            <ul className="mt-6 grid gap-6 sm:grid-cols-2">
              {CONSEJOS.map(({ Icon, title, text }) => (
                <li key={title} className="flex gap-4">
                  <Icon className="h-6 w-6 shrink-0 text-primary" aria-hidden />
                  <div>
                    <p className="text-lg font-bold">{title}</p>
                    <p className="mt-1 text-base text-muted-foreground">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-x-8">
              <DirLink q="alojamiento">Dónde dormir</DirLink>
              <DirLink q="">Ver todo el directorio</DirLink>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
