import { Text, useI18n } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Laptop, CheckCircle2, Phone, ExternalLink, Lightbulb, ShoppingBasket, Stethoscope, Bus, ArrowRight, MapPin,
  Recycle, Pill, Car, Mail, Landmark, Trees, Dumbbell, Waves, Building2, School, Baby, BookOpen, GraduationCap, Cross, type LucideIcon,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/vida-diaria")({
  head: () => ({
    meta: [
      { title: "Vida diaria en Casarabonela — Aquí Bonela" },
      { name: "description", content: "Transporte, residuos, espacios públicos, Ayuntamiento, educación y otros servicios de Casarabonela, ordenados por categorías." },
      { property: "og:title", content: "Vida diaria en Casarabonela" },
      { property: "og:description", content: "Autobuses, punto limpio, piscina, colegio, biblioteca y más: lo práctico del pueblo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://bonela-local-finds.lovable.app/vida-diaria" }],
  }),
  component: VidaDiaria,
});


type Item = {
  Icon: LucideIcon;
  title: string;
  text: string;
  facts?: { k: string; v: string }[];
  timetable?: { columns: string[]; rows: { days: string; cells: string[][] }[]; note?: string };
  list?: string[];
  blocks?: { k: string; v: string; tel?: string }[];
  note?: string;
  wide?: boolean;
  full?: boolean;
  span?: boolean;
  group?: string;
  tel?: string;
  link?: { label: string; href: string };
  link2?: { label: string; href: string };
};

const DIARIO: Item[] = [
  { group: "transporte", Icon: Bus, full: true, title: "Transporte público y autobús", text: "Autobuses Sierra de las Nieves (Grupo Paco Pepe): conexión diaria con Málaga.", timetable: { columns: ["Hacia Málaga", "Desde Málaga"], rows: [{ days: "Lunes a sábado", cells: [["7:50", "9:45", "17:00"], ["8:00", "14:00", "17:00"]] }, { days: "Domingos", cells: [["18:50"], ["20:00"]] }, { days: "Festivos", cells: [["7:50", "17:00"], ["8:00", "17:00"]] }], note: "Del 16/04 al 15/09, la vuelta de las 17:00 sale a las 18:00." }, tel: "952355490", link: { label: "Horario completo", href: "https://www.casarabonela.es/7643/autobuses-sierra-de-las-nieves" } },
  { group: "transporte", Icon: Car, title: "Taxi", text: "Servicio de taxi local para trayectos al centro de salud, a la estación o a Málaga.", facts: [{ k: "Reserva", v: "Por teléfono, con antelación" }, { k: "Teléfono", v: "Pendiente de confirmar" }] },
  { group: "residuos", Icon: Recycle, span: true, title: "Basura, enseres y punto limpio", text: "Cómo separar la basura, dónde llevar los enseres y cuándo abre el Punto limpio.", blocks: [{ k: "Contenedores", v: "Cada residuo, dentro del contenedor que le corresponde. No dejes bolsas ni muebles fuera." }, { k: "Muebles y enseres", v: "Primer martes de cada mes, avisando antes del lunes anterior", tel: "952456005" }, { k: "Punto limpio", v: "Sábados, 10:00–13:00 · Polígono industrial" }] },
  { group: "espacios", Icon: Dumbbell, title: "Polideportivo municipal", text: "Pistas deportivas para fútbol sala, baloncesto y pádel.", facts: [{ k: "Reservas", v: "En el Ayuntamiento o por teléfono" }, { k: "Horario", v: "Todos los días, 9:00–22:00" }], tel: "952456561" },
  { group: "espacios", Icon: Waves, title: "Piscina municipal", text: "Abierta en temporada de verano, con bono y entrada diaria.", facts: [{ k: "Temporada", v: "De mediados de junio a principios de septiembre" }, { k: "Horario", v: "11:00–20:00" }] },
  { group: "espacios", Icon: Trees, title: "Parques y zonas de juego", text: "Parques infantiles y zonas verdes para pasear y descansar en el pueblo.", facts: [{ k: "Incidencias", v: "Avisa por Línea Verde" }] },
  { group: "municipales", Icon: Building2, span: true, title: "Ayuntamiento de Casarabonela", text: "Atención al público, registro, padrón y dependencias municipales.", facts: [{ k: "Horario", v: "Lunes a viernes, 9:00–14:00" }, { k: "Dónde", v: "Plaza de Casarabonela" }], tel: "952456561", link: { label: "Web municipal", href: "https://www.casarabonela.es/" } },
  { group: "educacion", Icon: School, title: "Colegio de Primaria", text: "Educación Infantil (3–5 años) y Primaria en el pueblo.", facts: [{ k: "Matrícula", v: "Plazo de solicitud en marzo" }] },
  { group: "educacion", Icon: Baby, title: "Escuela infantil", text: "Guardería para niños y niñas de 0 a 3 años.", facts: [{ k: "Plazas", v: "Consulta en el Ayuntamiento" }] },
  { group: "educacion", Icon: GraduationCap, title: "Educación de adultos", text: "Clases para obtener titulaciones y cursos para personas adultas.", facts: [{ k: "Información", v: "En el Ayuntamiento" }] },
  { group: "otros", Icon: Laptop, wide: true, title: "Punto Vuela", text: "Servicio gratuito de apoyo digital para vecinos de todas las edades.", facts: [{ k: "Dónde", v: "C/ Cuatro Esquinas, 10" }, { k: "Horario", v: "Lunes a viernes, 9:00–14:00; martes y jueves, 17:00–20:00" }], list: ["Asesoramiento y acompañamiento digital", "Ayuda con gestiones online con la Administración", "Formación y competencias digitales"], note: "Si no te manejas con el certificado digital, Cl@ve o los trámites por internet, aquí te ayudan paso a paso.", tel: "952456140" },
  { group: "otros", Icon: Stethoscope, title: "Consultorio médico", text: "Atención primaria del Servicio Andaluz de Salud en el centro del pueblo.", facts: [{ k: "Horario", v: "Lunes a viernes, 8:00–15:00" }, { k: "Dónde", v: "Avda. Fernando Díaz" }], tel: "952456559", link: { label: "Cita en ClicSalud+", href: "https://www.sspa.juntadeandalucia.es/servicioandaluzdesalud/clicsalud/" } },
  { group: "otros", Icon: Pill, title: "Farmacia", text: "Farmacia Bonela atiende en el pueblo. Las guardias de la zona se consultan en el calendario oficial.", link: { label: "Ver en el Directorio", href: "/comercios/farmacia-bonela" }, link2: { label: "Farmacias de guardia", href: "https://www.cofmalaga.com/farmacias-de-guardia/" } },
  { group: "otros", Icon: BookOpen, title: "Biblioteca municipal", text: "Préstamo de libros, sala de lectura y actividades culturales.", facts: [{ k: "Horario", v: "Lunes a viernes, 16:00–20:00" }] },
  { group: "otros", Icon: Cross, title: "Cementerio municipal", text: "Información sobre horarios y gestiones de nichos en el Ayuntamiento.", facts: [{ k: "Horario", v: "Todos los días, 9:00–18:00" }] },
  { group: "otros", Icon: Mail, title: "Oficina de Correos", text: "Envío y recogida de cartas y paquetes, certificados y giros.", facts: [{ k: "Horario", v: "Lunes a viernes, 9:00–11:30" }, { k: "Dónde", v: "Calle Real (junto al Ayuntamiento)" }] },
  { group: "otros", Icon: Landmark, title: "Cajeros automáticos", text: "Hay cajero automático en el centro del pueblo. Consulta las entidades y sus horarios en el Directorio.", link: { label: "Ver en el Directorio", href: "/directorio" } },
  { group: "otros", Icon: ShoppingBasket, title: "Mercadillo semanal", text: "Fruta y verdura, ropa y productos del campo cada semana.", facts: [{ k: "Cuándo", v: "Todos los viernes de 9:00 a 14:00" }, { k: "Dónde", v: "Plaza de Casarabonela" }] },
];

const GRUPOS: { id: string; title: string }[] = [
  { id: "transporte", title: "Transporte" },
  { id: "residuos", title: "Residuos y limpieza" },
  { id: "espacios", title: "Espacios públicos" },
  { id: "municipales", title: "Servicios municipales" },
  { id: "educacion", title: "Educación" },
  { id: "otros", title: "Otros servicios" },
];

function Actions({ i, compact }: { i: Item; compact?: boolean }) {
  const { tr } = useI18n();
  if (!i.tel && !i.link && !i.link2) return null;
  const ext = (h: string) => (h.startsWith("/") ? {} : { target: "_blank", rel: "noopener noreferrer" });
  return (
    <div className={`mt-auto flex flex-wrap gap-2 ${compact ? "pt-3" : "pt-4"}`}>
      {i.tel && (
        <a href={`tel:${i.tel}`} className="inline-flex min-h-11 items-center gap-2 bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90">
          <Phone className="h-4 w-4" aria-hidden /> <Text text="Llamar" />
        </a>
      )}
      {[i.link, i.link2].map((l) => l && (
        <a key={l.href} href={l.href} {...ext(l.href)} className="inline-flex min-h-11 items-center gap-2 border px-4 text-sm font-bold hover:bg-muted">
          {tr(l.label)} {l.href.startsWith("/") ? <ArrowRight className="h-4 w-4" aria-hidden /> : <ExternalLink className="h-4 w-4" aria-hidden />}
        </a>
      ))}
    </div>
  );
}

function SectionTitle({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <div className="mb-5">
      <p className="text-sm font-bold uppercase tracking-[0.15em] text-primary">{n}</p>
      <h2 className="mt-1 font-display text-2xl font-extrabold sm:text-3xl"><Text text={title} /></h2>
      <p className="mt-1 text-muted-foreground"><Text text={text} /></p>
    </div>
  );
}
function VidaDiaria() {
  const { tr } = useI18n();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="pb-14">
        <section className="mx-auto max-w-5xl px-4 pt-8">
          <Link to="/servicios-publicos" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">← <Text text="Servicios públicos" /></Link>
          <h1 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl"><Text text="Vida diaria en el pueblo" /></h1>
          <p className="mt-2 max-w-2xl text-lg text-muted-foreground"><Text text="Información práctica para organizarte y usar los servicios municipales." /></p>
          <nav className="mt-6 flex flex-wrap gap-2">
            {GRUPOS.map((g) => <a key={g.id} href={`#${g.id}`} className="border px-3 py-2 text-sm font-semibold hover:bg-muted">{tr(g.title)}</a>)}
          </nav>
        </section>
        {GRUPOS.map((g, gi) => {
          const items = DIARIO.filter((i) => i.group === g.id);
          return (
            <div key={g.id} id={g.id} className="scroll-mt-24 pt-10">
              <div className="mx-auto max-w-5xl px-4">
                <div className="flex items-center gap-3 border-b-2 border-primary pb-2">
                  <span className="font-display text-sm font-extrabold tabular-nums text-terracotta">{gi + 1}</span>
                  <h3 className="font-display text-xl font-extrabold leading-tight sm:text-2xl">{tr(g.title)}</h3>
                </div>
              </div>
{items.filter((i) => i.full).map((i) => (
          <section key={i.title} className="mx-auto max-w-5xl px-4 pt-5">
            <article className="border bg-card p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-beige text-primary"><i.Icon className="h-5 w-5" aria-hidden /></span>
                <h3 className="font-display text-lg font-extrabold leading-tight">{tr(i.title)}</h3>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{tr(i.text)}</p>
              {i.timetable && (
                <div className="mt-4 grid gap-x-10 gap-y-5 border-t pt-4 sm:grid-cols-2">
                  {i.timetable.columns.map((c, ci) => (
                    <div key={c}>
                      <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-primary">{tr(c)}</h4>
                      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[13px] min-[380px]:text-sm">
                        {i.timetable?.rows.map((r) => (
                          <div key={r.days} className="contents">
                            <dt className="font-semibold">{tr(r.days)}</dt>
                            <dd className="whitespace-nowrap tabular-nums">{(r.cells[ci] ?? []).join(" · ")}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              )}
              {i.timetable?.note && <p className="mt-3 text-xs text-muted-foreground">{tr(i.timetable.note)}</p>}
              <Actions i={i} />
            </article>
          </section>
        ))}

        
                      {items.some((i) => !i.wide && !i.full) && (
                <section className="mx-auto max-w-5xl px-4 pt-5">
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 animate-results-in">
                    {items.filter((i) => !i.wide && !i.full).map((i) => (
                      <article key={i.title} className={`flex flex-col border bg-card p-5 ${i.wide ? "border-primary/40 sm:col-span-2 lg:col-span-3" : i.span ? "sm:col-span-2 lg:col-span-3" : ""}`}>
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-beige text-primary"><i.Icon className="h-5 w-5" aria-hidden /></span>
                  <h3 className="font-display text-lg font-extrabold leading-tight">{tr(i.title)}</h3>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{tr(i.text)}</p>
                {i.blocks && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {i.blocks.map((b) => (
                      <div key={b.k} className="flex flex-col border bg-muted/40 p-4">
                        <h4 className="font-bold">{tr(b.k)}</h4>
                        <p className="mt-1 text-sm">{tr(b.v)}</p>
                        <div className="mt-auto pt-3">
                          {b.tel && (
                            <a href={`tel:${b.tel}`} className="inline-flex min-h-11 items-center gap-2 bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90">
                              <Phone className="h-4 w-4" aria-hidden /> <Text text="Llamar" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {i.facts && (
                  <dl className="mt-3 space-y-1 border-t pt-3 text-sm">
                    {i.facts.map((f) => (
                      <div key={f.k} className="flex gap-2"><dt className="font-bold">{tr(f.k)}:</dt><dd>{tr(f.v)}</dd></div>
                    ))}
                  </dl>
                )}
                {i.list && (
                  <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                    {i.list.map((x) => (
                      <li key={x} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{tr(x)}</li>
                    ))}
                  </ul>
                )}
                {i.note && <p className="mt-3 bg-beige p-3 text-sm font-semibold">{tr(i.note)}</p>}
                <Actions i={i} />
              </article>
                    ))}
                  </div>
                </section>
              )}
        {items.filter((i) => i.wide).map((i) => (
          <section key={i.title} className="mt-6 bg-primary text-primary-foreground">
            <div className="mx-auto max-w-5xl px-4 py-10">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-foreground text-primary"><i.Icon className="h-6 w-6" aria-hidden /></span>
                <h3 className="font-display text-2xl font-extrabold leading-tight">{tr(i.title)}</h3>
              </div>
              <p className="mt-3 opacity-90">{tr(i.text)}</p>
              {i.facts && (
                <dl className="mt-4 space-y-1 border-t border-primary-foreground/30 pt-4 text-sm">
                  {i.facts.map((f) => (
                    <div key={f.k} className="flex gap-2"><dt className="font-bold">{tr(f.k)}:</dt><dd>{tr(f.v)}</dd></div>
                  ))}
                </dl>
              )}
              {i.list && (
                <ul className="mt-5 flex flex-col gap-3 text-lg font-semibold sm:text-xl">
                  {i.list.map((x) => (
                    <li key={x} className="flex gap-3"><CheckCircle2 className="mt-1 h-5 w-5 shrink-0" aria-hidden />{tr(x)}</li>
                  ))}
                </ul>
              )}
              {i.note && <p className="mt-4 bg-primary-foreground/15 p-3 text-sm font-semibold">{tr(i.note)}</p>}
              {i.tel && (
                <a href={`tel:${i.tel}`} className="mt-5 inline-flex items-center gap-2 bg-primary-foreground px-5 py-3 text-sm font-bold text-primary">
                  <Phone className="h-4 w-4" aria-hidden /> <Text text="Llamar" /> {i.tel.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")}
                </a>
              )}
            </div>
          </section>
        ))}

            </div>
          );
        })}
      </main>
    </div>
  );
}
