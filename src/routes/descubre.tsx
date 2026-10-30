import { createFileRoute, Link } from "@tanstack/react-router";
import { Car, Footprints, Droplets, Info, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import calles from "@/assets/descubre/calles.jpg";
import castillo from "@/assets/descubre/castillo.jpg";
import cactus from "@/assets/descubre/cactus.jpg";
import molino from "@/assets/descubre/molino.jpg";
import fuentes from "@/assets/descubre/fuentes.jpg";

export const Route = createFileRoute("/descubre")({
  head: () => ({
    meta: [
      { title: "Descubre Bonela — Qué ver en Casarabonela" },
      {
        name: "description",
        content: "Rincones imprescindibles y consejos prácticos para visitar Casarabonela: castillo, jardín de cactus, molino, fuentes y calles andalusíes.",
      },
      { property: "og:title", content: "Descubre Bonela" },
      { property: "og:description", content: "Qué ver en Casarabonela y consejos de vecino para tu visita." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Descubre,
});

type Rincon = { img: string; kicker: string; title: string; name: string; text: string };

const RINCONES: [Rincon, ...Rincon[]] = [
  {
    img: castillo,
    kicker: "Siglo IX · Mirador",
    title: "Donde el valle parece infinito",
    name: "Castillo y mirador",
    text: "Lo que queda de la fortaleza de Qasr Bunayra vigila el Valle del Guadalhorce. Con el día claro, se intuye el Mediterráneo al fondo.",
  },
  {
    img: calles,
    kicker: "Casco antiguo",
    title: "Perderse también es el plan",
    name: "Calles andalusíes",
    text: "Cuestas, macetas y fachadas encaladas con trazado de origen andalusí. La iglesia se levanta sobre la antigua mezquita.",
  },
  {
    img: cactus,
    kicker: "Jardín botánico",
    title: "Un desierto a los pies de la sierra",
    name: "Jardín de Cactus «Mora i Bravard»",
    text: "Una de las mayores colecciones de cactus y suculentas de España, con miles de especies de todo el mundo.",
  },
  {
    img: fuentes,
    kicker: "Cultura del agua",
    title: "El pueblo suena a agua",
    name: "Fuentes y caños",
    text: "Fuentes recuperadas con azulejos pintados a mano que cuentan historias, usos y costumbres del pueblo.",
  },
  {
    img: molino,
    kicker: "Patrimonio",
    title: "La fuerza de un salto de agua",
    name: "Molino de Albaiva",
    text: "Antiguo molino de rodezno que daba harina y aceite. Su nombre recuerda una de las puertas de la muralla.",
  },
];

const CONSEJOS: { Icon: LucideIcon; title: string; text: string }[] = [
  { Icon: Car, title: "Aparca a la entrada", text: "Las calles del centro son estrechas y empinadas. Deja el coche en los accesos y sube andando." },
  { Icon: Footprints, title: "Calzado cómodo", text: "Bonela se disfruta a pie, pero sus cuestas tienen encanto… y pendiente." },
  { Icon: Droplets, title: "Agua de la sierra", text: "Encontrarás fuentes por el camino. Lleva tu botella." },
  { Icon: Info, title: "Oficina de turismo", text: "En la calle Real, 5 (antiguo matadero). Pregunta por las visitas guiadas de fin de semana." },
];

function Descubre() {
  const [first, ...rest] = RINCONES;
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="relative">
          <img src={first.img} alt={first.name} width={1280} height={864} className="h-[62vh] min-h-80 w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-5xl px-4 pb-8 text-background">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] opacity-90">Descubre Bonela</p>
            <h1 className="mt-2 max-w-xl font-display text-4xl font-extrabold leading-tight text-balance sm:text-5xl">
              ¿Vienes a pasar el día?
            </h1>
            <p className="mt-3 max-w-lg text-lg opacity-95">Lo que no te puedes perder y lo que te contaría un vecino.</p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-10">
          <h2 className="font-display text-2xl font-extrabold">Rincones imprescindibles</h2>
          <article className="mt-6 grid gap-5 border-t pt-6 sm:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-primary">{first.kicker}</p>
              <h3 className="mt-1 font-display text-2xl font-extrabold text-balance">{first.title}</h3>
              <p className="mt-1 font-semibold">{first.name}</p>
              <p className="mt-3 text-lg leading-relaxed text-muted-foreground">{first.text}</p>
            </div>
          </article>

          <div className="mt-10 grid gap-10 sm:grid-cols-2">
            {rest.map((r, i) => (
              <article key={r.name} className={i % 2 === 1 ? "sm:mt-16" : ""}>
                <img src={r.img} alt={r.name} loading="lazy" width={1280} height={864} className="aspect-[4/3] w-full object-cover" />
                <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-primary">{r.kicker}</p>
                <h3 className="mt-1 font-display text-2xl font-extrabold text-balance">{r.title}</h3>
                <p className="mt-1 font-semibold">{r.name}</p>
                <p className="mt-2 text-lg leading-relaxed text-muted-foreground">{r.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-primary text-primary-foreground">
          <div className="mx-auto max-w-5xl px-4 py-12">
            <h2 className="font-display text-2xl font-extrabold">Consejos de vecino</h2>
            <ul className="mt-6 grid gap-6 sm:grid-cols-2">
              {CONSEJOS.map(({ Icon, title, text }) => (
                <li key={title} className="flex gap-4 border-t border-primary-foreground/20 pt-5">
                  <Icon className="h-7 w-7 shrink-0" aria-hidden />
                  <div>
                    <p className="text-lg font-bold">{title}</p>
                    <p className="mt-1 text-base opacity-90">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Link
              to="/directorio"
              search={{ q: "", cat: "", of: "" }}
              className="mt-10 inline-flex min-h-12 items-center gap-3 bg-background px-5 font-bold text-foreground hover:bg-beige"
            >
              <UtensilsCrossed className="h-5 w-5" aria-hidden />
              ¿Y después? Dónde comer o tomar algo
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
