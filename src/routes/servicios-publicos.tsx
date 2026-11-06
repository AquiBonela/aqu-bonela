import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Phone, ExternalLink, Siren, Lightbulb, Truck, ShoppingBasket, Stethoscope, FileText,
  Laptop, Bus, Scale, Dumbbell, ArrowRight, type LucideIcon,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import hero from "@/assets/servicios-publicos.jpg";

export const Route = createFileRoute("/servicios-publicos")({
  head: () => ({
    meta: [
      { title: "Servicios públicos de Casarabonela — Aquí Bonela" },
      { name: "description", content: "Teléfonos útiles, trámites habituales, mercadillo, punto limpio, transporte y más: la chuleta práctica de Casarabonela." },
      { property: "og:title", content: "Servicios públicos de Casarabonela" },
      { property: "og:description", content: "Lo que necesitas resolver en el pueblo, a un toque." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ServiciosPublicos,
});

const URGENCIAS = [
  { label: "Emergencias", tel: "112" },
  { label: "Guardia Civil", tel: "062" },
  { label: "Salud Responde", tel: "955545060", show: "955 54 50 60" },
];

type Bloque = {
  Icon: LucideIcon;
  title: string;
  text: string;
  lines?: string[];
  tel?: string;
  link?: { label: string; href: string };
  dir?: string;
};

const BLOQUES: Bloque[] = [
  { Icon: Stethoscope, title: "Pedir cita médica", text: "Cita con tu médico de familia en el consultorio.", lines: ["Por internet o app ClicSalud+", "Por teléfono: Salud Responde"], tel: "955545060", link: { label: "ClicSalud+", href: "https://www.sspa.juntadeandalucia.es/servicioandaluzdesalud/clicsalud/" }, dir: "consultorio" },
  { Icon: FileText, title: "Certificado de empadronamiento", text: "Se pide en el Ayuntamiento o en la Sede Electrónica con certificado digital o Cl@ve.", lines: ["Horario de atención: por confirmar"], link: { label: "Sede Electrónica", href: "https://www.casarabonela.es" }, dir: "ayuntamiento" },
  { Icon: Laptop, title: "Ayuda con trámites digitales", text: "En el centro Guadalinfo te ayudan con el certificado digital, Cl@ve, vida laboral o cita del DNI.", lines: ["Horario: por confirmar"], dir: "guadalinfo" },
  { Icon: ShoppingBasket, title: "Mercadillo", text: "Mercadillo ambulante semanal.", lines: ["Día: por confirmar", "Lugar: por confirmar", "Horario: de mañana"] },
  { Icon: Truck, title: "Muebles, enseres y punto limpio", text: "Los trastos grandes no se dejan sin avisar junto al contenedor.", lines: ["Recogida de enseres: aviso previo al Ayuntamiento", "Punto limpio: ubicación y horario por confirmar"] },
  { Icon: Bus, title: "Autobús y taxi", text: "Conexión con Pizarra y Málaga por el Consorcio de Transporte.", lines: ["Taxi local: por confirmar"], link: { label: "Horarios del Consorcio", href: "https://www.ctmam.es" } },
  { Icon: Scale, title: "Juzgado de Paz y Registro Civil", text: "Partidas de nacimiento, fe de vida, matrimonios.", lines: ["Días de atención: por confirmar"], dir: "juzgado" },
  { Icon: Dumbbell, title: "Instalaciones deportivas", text: "Pabellón, pistas y polideportivo: cómo reservar y a quién pedir las llaves.", lines: ["Reservas: por confirmar"], dir: "deport" },
];

function ServiciosPublicos() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="relative text-primary-foreground">
          <img src={hero} alt="Plaza del Ayuntamiento de Casarabonela" width={1600} height={800} className="h-[50vh] min-h-72 w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-5xl px-4 pb-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] opacity-90">Página de ejemplo</p>
            <h1 className="mt-2 font-display text-4xl font-extrabold text-balance sm:text-5xl">¿Qué necesitas resolver?</h1>
            <p className="mt-3 max-w-2xl text-lg opacity-95">Teléfonos, trámites y datos prácticos de Casarabonela, a un toque.</p>
          </div>
        </section>

        {/* Urgencias */}
        <section className="mx-auto max-w-5xl px-4 pt-8">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.15em] text-destructive">
            <Siren className="h-5 w-5" aria-hidden /> Urgencias
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {URGENCIAS.map((u) => (
              <a key={u.tel} href={`tel:${u.tel}`} className="flex min-h-16 items-center justify-between border-2 border-destructive/30 bg-destructive/5 px-4 hover:bg-destructive/10">
                <span className="font-semibold">{u.label}</span>
                <span className="flex items-center gap-2 font-display text-2xl font-extrabold text-destructive">
                  <Phone className="h-5 w-5" aria-hidden /> {u.show ?? u.tel}
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* Línea Verde */}
        <section className="mx-auto max-w-5xl px-4 pt-8">
          <div className="flex flex-col gap-4 bg-beige p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <Lightbulb className="mt-1 h-6 w-6 shrink-0 text-primary" aria-hidden />
              <div>
                <h2 className="font-display text-xl font-extrabold">¿Una farola rota, un bache o una avería?</h2>
                <p className="mt-1 text-muted-foreground">Las incidencias y avisos del pueblo se comunican por Línea Verde, el canal oficial del Ayuntamiento.</p>
              </div>
            </div>
            <a href="https://www.casarabonela.es" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 shrink-0 items-center gap-2 bg-primary px-5 font-bold text-primary-foreground hover:opacity-90">
              Abrir Línea Verde <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          </div>
        </section>

        {/* Bloques */}
        <section className="mx-auto max-w-5xl px-4 py-10">
          <div className="grid gap-5 sm:grid-cols-2">
            {BLOQUES.map((b) => (
              <article key={b.title} className="flex flex-col border bg-card p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <b.Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="font-display text-lg font-extrabold">{b.title}</h3>
                </div>
                <p className="mt-3 text-muted-foreground">{b.text}</p>
                {b.lines && (
                  <ul className="mt-3 space-y-1 text-sm">
                    {b.lines.map((l) => (
                      <li key={l} className={l.includes("por confirmar") ? "italic text-muted-foreground" : ""}>· {l}</li>
                    ))}
                  </ul>
                )}
                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  {b.tel && (
                    <a href={`tel:${b.tel}`} className="inline-flex min-h-11 items-center gap-2 bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90">
                      <Phone className="h-4 w-4" aria-hidden /> Llamar
                    </a>
                  )}
                  {b.link && (
                    <a href={b.link.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 border px-4 text-sm font-bold hover:bg-muted">
                      {b.link.label} <ExternalLink className="h-4 w-4" aria-hidden />
                    </a>
                  )}
                  {b.dir && (
                    <Link to="/directorio" search={{ q: b.dir, cat: "", of: "" }} className="inline-flex min-h-11 items-center gap-2 px-2 text-sm font-bold text-primary hover:underline">
                      Ver ficha <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
