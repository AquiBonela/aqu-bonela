import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Phone, ExternalLink, Siren, Lightbulb, Truck, ShoppingBasket, Stethoscope, FileText,
  Laptop, Bus, Scale, Dumbbell, ArrowRight, Search, Moon, ChevronDown, type LucideIcon,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
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

type Cat = "salud" | "tramites" | "diario" | "movilidad";
const CATS: { id: Cat | "todos"; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "salud", label: "Salud" },
  { id: "tramites", label: "Trámites" },
  { id: "diario", label: "Día a día" },
  { id: "movilidad", label: "Transporte y deporte" },
];

type Badge = { text: string; tone: "ok" | "warn" | "info" | "pending" };
type Bloque = {
  Icon: LucideIcon;
  cat: Cat;
  title: string;
  text: string;
  badges?: Badge[];
  steps?: string[];
  tel?: string;
  link?: { label: string; href: string };
  dir?: string;
  featured?: boolean;
  keywords?: string;
};

const BLOQUES: Bloque[] = [
  { Icon: Stethoscope, cat: "salud", featured: true, title: "Pedir cita médica", text: "Cita con tu médico de familia en el consultorio del pueblo.", badges: [{ text: "Online: ClicSalud+", tone: "ok" }, { text: "Por teléfono", tone: "info" }], steps: ["Ten a mano tu tarjeta sanitaria.", "Pide cita en ClicSalud+ o llamando a Salud Responde."], tel: "955545060", link: { label: "ClicSalud+", href: "https://www.sspa.juntadeandalucia.es/servicioandaluzdesalud/clicsalud/" }, dir: "consultorio", keywords: "medico salud consultorio" },
  { Icon: FileText, cat: "tramites", title: "Certificado de empadronamiento", text: "Lo puedes pedir en el Ayuntamiento o por internet.", badges: [{ text: "Online con Cl@ve", tone: "ok" }, { text: "Presencial", tone: "info" }, { text: "Horario por confirmar", tone: "pending" }], steps: ["Lleva tu DNI o NIE.", "Acude al Ayuntamiento o entra en la Sede Electrónica."], link: { label: "Sede Electrónica", href: "https://www.casarabonela.es" }, dir: "ayuntamiento", keywords: "padron padrón" },
  { Icon: Laptop, cat: "tramites", title: "Ayuda con trámites digitales", text: "En Guadalinfo te ayudan con el certificado digital, Cl@ve, vida laboral o cita del DNI.", badges: [{ text: "Gratuito", tone: "ok" }, { text: "Horario por confirmar", tone: "pending" }], dir: "guadalinfo", keywords: "internet certificado dni" },
  { Icon: Scale, cat: "tramites", title: "Juzgado de Paz y Registro Civil", text: "Partidas de nacimiento, fe de vida y matrimonios.", badges: [{ text: "Días por confirmar", tone: "pending" }], steps: ["Lleva tu DNI y el libro de familia si lo tienes.", "Pregunta antes los días de atención."], dir: "juzgado", keywords: "registro nacimiento boda" },
  { Icon: ShoppingBasket, cat: "diario", title: "Mercadillo", text: "Mercadillo ambulante semanal.", badges: [{ text: "De mañana", tone: "info" }, { text: "Día y lugar por confirmar", tone: "pending" }], keywords: "mercado" },
  { Icon: Truck, cat: "diario", title: "Muebles, enseres y punto limpio", text: "Los trastos grandes no se dejan junto al contenedor sin avisar.", badges: [{ text: "Requiere aviso previo", tone: "warn" }, { text: "Punto limpio por confirmar", tone: "pending" }], keywords: "basura residuos trastos" },
  { Icon: Bus, cat: "movilidad", title: "Autobús y taxi", text: "Conexión con Pizarra y Málaga por el Consorcio de Transporte.", badges: [{ text: "Consorcio de Málaga", tone: "info" }, { text: "Taxi por confirmar", tone: "pending" }], link: { label: "Horarios", href: "https://www.ctmam.es" }, keywords: "transporte bus" },
  { Icon: Dumbbell, cat: "movilidad", title: "Instalaciones deportivas", text: "Pabellón, pistas y polideportivo: cómo reservar y a quién pedir las llaves.", badges: [{ text: "Reservas por confirmar", tone: "pending" }], dir: "deport", keywords: "deporte padel pabellon" },
];

const TONE: Record<Badge["tone"], string> = {
  ok: "bg-primary/10 text-primary",
  info: "bg-secondary text-secondary-foreground",
  warn: "bg-destructive/10 text-destructive",
  pending: "border border-dashed border-muted-foreground/40 italic text-muted-foreground",
};

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

function Tarjeta({ b }: { b: Bloque }) {
  const [open, setOpen] = useState(false);
  return (
    <article className={`flex flex-col p-5 ${b.featured ? "bg-primary text-primary-foreground sm:col-span-2" : "border bg-card"}`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${b.featured ? "bg-primary-foreground/15" : "bg-beige text-primary"}`}>
          <b.Icon className="h-6 w-6" aria-hidden />
        </span>
        <h3 className="font-display text-xl font-extrabold">{b.title}</h3>
      </div>
      <p className={`mt-3 ${b.featured ? "opacity-90" : "text-muted-foreground"}`}>{b.text}</p>
      {b.badges && (
        <div className="mt-3 flex flex-wrap gap-2">
          {b.badges.map((x) => (
            <span key={x.text} className={`rounded-full px-3 py-1 text-xs font-semibold ${b.featured ? "bg-primary-foreground/15" : TONE[x.tone]}`}>{x.text}</span>
          ))}
        </div>
      )}
      {b.steps && (
        <div className="mt-3">
          <Button variant="ghost" type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex min-h-11 items-center gap-1 text-sm font-bold underline-offset-4 hover:underline">
            ¿Cómo se hace? <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
          </Button>
          <div className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`} aria-hidden={!open}>
            <div className="overflow-hidden">
            <ol className="mt-1 space-y-2 text-sm">
              {b.steps.map((s, i) => (
                <li key={s} className="flex gap-2">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${b.featured ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"}`}>{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
            </div>
          </div>
        </div>
      )}
      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        {b.tel && (
          <a href={`tel:${b.tel}`} className={`inline-flex min-h-11 items-center gap-2 px-4 text-sm font-bold hover:opacity-90 ${b.featured ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"}`}>
            <Phone className="h-4 w-4" aria-hidden /> Llamar
          </a>
        )}
        {b.link && (
          <a href={b.link.href} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-11 items-center gap-2 border px-4 text-sm font-bold ${b.featured ? "border-primary-foreground/40 hover:bg-primary-foreground/10" : "hover:bg-muted"}`}>
            {b.link.label} <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        )}
        {b.dir && (
          <Link to="/directorio" search={{ q: b.dir, cat: "", of: "" }} className={`inline-flex min-h-11 items-center gap-2 px-2 text-sm font-bold hover:underline ${b.featured ? "" : "text-primary"}`}>
            Ver ficha <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        )}
      </div>
    </article>
  );
}

function ServiciosPublicos() {
  const [cat, setCat] = useState<Cat | "todos">("todos");
  const [q, setQ] = useState("");
  const lista = useMemo(() => {
    const n = norm(q.trim());
    return BLOQUES.filter((b) => (cat === "todos" || b.cat === cat) && (!n || norm(`${b.title} ${b.text} ${b.keywords ?? ""}`).includes(n)));
  }, [cat, q]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="relative text-primary-foreground">
          <img src={hero} alt="Plaza del Ayuntamiento de Casarabonela" width={1600} height={800} className="h-[45vh] min-h-72 w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-5xl px-4 pb-10">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] opacity-90">Servicios públicos</p>
            <h1 className="mt-2 font-display text-4xl font-extrabold text-balance sm:text-5xl">¿Qué necesitas resolver?</h1>
            <p className="mt-3 max-w-2xl text-lg opacity-95">Teléfonos, trámites y datos prácticos de Casarabonela, a un toque.</p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pt-8">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.15em] text-destructive">
            <Siren className="h-5 w-5" aria-hidden /> Urgencias
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {URGENCIAS.map((u) => (
              <a key={u.tel} href={`tel:${u.tel}`} className="flex min-h-16 items-center justify-between border-2 border-destructive/30 bg-destructive/5 px-4 hover:bg-destructive/10">
                <span className="font-semibold">{u.label}</span>
                <span className="flex items-center gap-2 whitespace-nowrap font-display text-2xl font-extrabold text-destructive">
                  <Phone className="h-5 w-5" aria-hidden /> {u.show ?? u.tel}
                </span>
              </a>
            ))}
          </div>
          <div className="mt-3 flex gap-3 bg-muted p-4 text-sm">
            <Moon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <p><strong>¿Consultorio cerrado, de noche o en fin de semana?</strong> Llama al 112 o a Salud Responde. <span className="italic text-muted-foreground">Centro de urgencias de referencia y farmacia de guardia: por confirmar.</span></p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pt-8">
          <div className="flex flex-col gap-4 bg-beige p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <Lightbulb className="mt-1 h-6 w-6 shrink-0 text-primary" aria-hidden />
              <div>
                <h2 className="font-display text-xl font-extrabold">¿Una farola rota, un bache o una avería?</h2>
                <p className="mt-1 text-muted-foreground">Avísalo por Línea Verde, el canal oficial del Ayuntamiento.</p>
              </div>
            </div>
            <a href="https://www.casarabonela.es" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 shrink-0 items-center gap-2 bg-primary px-5 font-bold text-primary-foreground hover:opacity-90">
              Abrir Línea Verde <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-10">
          <label className="flex min-h-12 items-center gap-2 border bg-card px-4 focus-within:ring-2 focus-within:ring-primary">
            <Search className="h-5 w-5 text-muted-foreground" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Escribe lo que buscas: padrón, cita, autobús…" aria-label="Buscar servicio" className="w-full bg-transparent outline-none" />
          </label>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar por tema">
            {CATS.map((c) => (
              <Button variant="ghost" key={c.id} type="button" onClick={() => setCat(c.id)} aria-pressed={cat === c.id}
                className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-bold ${cat === c.id ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-beige"}`}>
                {c.label}
              </Button>
            ))}
          </div>
          <div key={JSON.stringify([cat, q])} className="mt-6 grid gap-5 sm:grid-cols-2 animate-results-in">
            {lista.map((b) => <Tarjeta key={b.title} b={b} />)}
          </div>
          {lista.length === 0 && <p key={q + cat} className="mt-6 text-muted-foreground animate-results-in">No hay resultados. Prueba con otra palabra.</p>}
        </section>
      </main>
    </div>
  );
}
