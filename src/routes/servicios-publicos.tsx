import { Text, useI18n } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import {
  Laptop, CheckCircle2, Phone, ExternalLink, Lightbulb, Truck, ShoppingBasket, Stethoscope, FileText, Bus, ArrowRight, MapPin,
  Recycle, Trash2, Home, PenLine, Hammer, HeartHandshake, MessageSquare, type LucideIcon,
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


type Item = {
  Icon: LucideIcon;
  title: string;
  text: string;
  facts?: { k: string; v: string }[];
  timetable?: { columns: string[]; rows: { days: string; cells: string[][] }[]; note?: string };
  list?: string[];
  note?: string;
  wide?: boolean;
  full?: boolean;
  tel?: string;
  link?: { label: string; href: string };
};

const SEDE = "https://casarabonela.sedelectronica.es";

const DIARIO: Item[] = [
  { Icon: Stethoscope, title: "Consultorio médico", text: "Atención primaria del Servicio Andaluz de Salud en el centro del pueblo.", facts: [{ k: "Horario", v: "Lunes a viernes, 8:00–15:00" }, { k: "Dónde", v: "Calle Málaga, s/n" }], tel: "951062980", link: { label: "Cita en ClicSalud+", href: "https://www.sspa.juntadeandalucia.es/servicioandaluzdesalud/clicsalud/" } },
  { Icon: ShoppingBasket, title: "Mercadillo semanal", text: "Fruta y verdura, ropa y productos del campo cada semana.", facts: [{ k: "Cuándo", v: "Todos los viernes de 9:00 a 14:00" }, { k: "Dónde", v: "Plaza de Casarabonela" }] },
  { Icon: Truck, title: "Recogida de muebles y enseres", text: "Servicio gratuito de recogida en la puerta de casa, con aviso previo.", facts: [{ k: "Cuándo", v: "Primer martes de cada mes" }, { k: "Aviso", v: "Llamar antes del lunes anterior" }], tel: "952456005" },
  { Icon: Recycle, title: "Punto limpio", text: "Para escombros pequeños, aceite, electrodomésticos, pilas y podas.", facts: [{ k: "Horario", v: "Sábados, 10:00–13:00" }, { k: "Dónde", v: "Polígono industrial" }] },
  { Icon: Bus, full: true, title: "Transporte público y autobús", text: "Autobuses Sierra de las Nieves (Grupo Paco Pepe): conexión diaria con Málaga.", timetable: { columns: ["Hacia Málaga", "Desde Málaga"], rows: [{ days: "Lunes a sábado", cells: [["7:50", "9:45", "17:00"], ["8:00", "14:00", "17:00"]] }, { days: "Domingos", cells: [["18:50"], ["20:00"]] }, { days: "Festivos", cells: [["7:50", "17:00"], ["8:00", "17:00"]] }], note: "Del 16/04 al 15/09, la vuelta de las 17:00 sale a las 18:00." }, tel: "952355490", link: { label: "Horario completo", href: "https://www.casarabonela.es/7643/autobuses-sierra-de-las-nieves" } },
  { Icon: Trash2, title: "Basura y reciclaje", text: "Separa los residuos y deposítalos dentro del contenedor correspondiente.", facts: [{ k: "Amarillo", v: "Envases de plástico, latas y briks." }, { k: "Azul", v: "Papel y cartón. Pliega las cajas." }, { k: "Verde", v: "Botellas y tarros de vidrio, sin tapas. No cristales ni cerámica." }, { k: "Resto", v: "Residuos no reciclables. La materia orgánica va al marrón si está disponible." }], note: "No dejes bolsas, muebles ni objetos fuera de los contenedores. Lleva los residuos voluminosos o especiales al Punto Limpio y consulta qué materiales admite." },
  { Icon: Laptop, wide: true, title: "Punto Vuela", text: "Servicio gratuito de apoyo digital para vecinos de todas las edades.", facts: [{ k: "Dónde", v: "Calle Real, 12 (junto al Ayuntamiento)" }, { k: "Horario", v: "Lunes a viernes, 9:00–14:00; martes y jueves, 17:00–20:00" }], list: ["Asesoramiento y acompañamiento digital", "Ayuda con gestiones online con la Administración", "Formación y competencias digitales"], note: "Si no te manejas con el certificado digital, Cl@ve o los trámites por internet, aquí te ayudan paso a paso.", tel: "952456120" },
];

const TRAMITES: Item[] = [
  { Icon: Home, title: "Empadronamiento", text: "Alta, cambio de domicilio o baja en el padrón municipal. Necesitas DNI o NIE y contrato o escritura de la vivienda.", facts: [{ k: "Dónde", v: "Ayuntamiento (sin cita previa)" }], link: { label: "Información oficial", href: SEDE } },
  { Icon: FileText, title: "Certificados y volantes", text: "El volante sirve para colegios o ayudas; el certificado, para juzgados, herencias o extranjería.", facts: [{ k: "Dónde", v: "Ayuntamiento o Sede Electrónica" }], link: { label: "Solicitar", href: SEDE } },
  { Icon: PenLine, title: "Instancia general", text: "El escrito oficial para cualquier solicitud o comunicación al Ayuntamiento que no tenga un trámite propio.", facts: [{ k: "Dónde", v: "Registro municipal u online" }], link: { label: "Presentar", href: SEDE } },
  { Icon: Hammer, title: "Licencias de obras", text: "Antes de reformar, pintar fachadas o construir, consulta si necesitas licencia o declaración responsable.", facts: [{ k: "Dónde", v: "Oficina técnica, martes y jueves" }], tel: "952456005", link: { label: "Requisitos", href: SEDE } },
  { Icon: HeartHandshake, title: "Ayudas y servicios sociales", text: "Orientación sobre ayudas, dependencia y atención a familias con la trabajadora social.", facts: [{ k: "Dónde", v: "Ayuntamiento, miércoles con cita" }], tel: "952456005" },
  { Icon: MessageSquare, title: "Quejas y sugerencias", text: "Comunica una queja o propuesta al Ayuntamiento.\nPara averías en la calle, usa Línea Verde.", facts: [{ k: "Dónde", v: "Registro municipal u online" }], link: { label: "Enviar", href: SEDE } },
];

function Actions({ i, compact }: { i: Item; compact?: boolean }) {
  const { tr } = useI18n();
  if (!i.tel && !i.link) return null;
  return (
    <div className={`mt-auto flex flex-wrap gap-2 ${compact ? "pt-3" : "pt-4"}`}>
      {i.tel && (
        <a href={`tel:${i.tel}`} className="inline-flex min-h-11 items-center gap-2 bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90">
          <Phone className="h-4 w-4" aria-hidden /> <Text text="Llamar" />
        </a>
      )}
      {i.link && (
        <a href={i.link.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 border px-4 text-sm font-bold hover:bg-muted">
          {tr(i.link.label)} <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      )}
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

function ServiciosPublicos() {
  const { tr } = useI18n();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="relative text-primary-foreground">
          <img src={hero} alt={tr("Plaza del Ayuntamiento de Casarabonela")} width={1600} height={800} className="h-[40vh] min-h-64 w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-5xl px-4 pb-10">
            <h1 className="font-display text-4xl font-extrabold text-balance sm:text-5xl"><Text text="Servicios públicos" /></h1>
            <p className="mt-3 max-w-2xl text-lg opacity-95"><Text text="Información práctica sobre servicios, gestiones y recursos de Casarabonela." /></p>
          </div>
        </section>

        {/* 1. Urgente */}
        <section className="mx-auto max-w-5xl px-4 pt-10">
          <SectionTitle n="01" title="Urgente y en la calle" text="Lo que puedes necesitar ahora mismo, a un toque." />
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { title: "Emergencias generales", tel: "112", description: "Ante una emergencia grave, llama al 112.", urgent: true },
              { title: "Guardia Civil — Puesto de Casarabonela", tel: "952456665", description: "Avda. Federico Muñoz, 16.", urgent: false },
              { title: "Policía Local", tel: "669291300", description: "Edificio de Usos Múltiples, Avda. Fernando Díaz. Atención según turnos.", urgent: false },
            ].map((contact) => (
              <article key={contact.tel} className={`flex flex-col gap-3 p-5 ${contact.urgent ? "bg-destructive text-destructive-foreground" : "border bg-card"}`}>
                <h3 className="font-bold">{tr(contact.title)}</h3>
                <p className="text-sm">{tr(contact.description)}</p>
                <Button asChild variant={contact.urgent ? "secondary" : "default"} className="mt-auto min-h-11">
                  <a href={`tel:${contact.tel}`}><Phone className="h-4 w-4" aria-hidden />{contact.tel.length === 9 ? contact.tel.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3") : contact.tel}</a>
                </Button>
              </article>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground"><Text text="Encontrarás todas las líneas de ayuda en el botón SOS de la cabecera." /></p>
          <article className="mt-6 border-l-4 border-primary bg-muted p-5 sm:p-6">
            <div className="flex items-center gap-3"><Stethoscope className="h-6 w-6 shrink-0 text-primary" aria-hidden /><h3 className="font-display text-xl font-extrabold"><Text text="Centro de Salud de Alozaina" /></h3></div>
            <p className="mt-3 text-sm"><Text text="Si el consultorio está cerrado, acude a Urgencias de Alozaina. Para pediatría, llama antes y confirma la disponibilidad y el horario." /></p>
            <p className="mt-2 text-sm"><Text text="Urbanización La Pasadilla, s/n — Alozaina." /></p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild className="min-h-11"><a href="tel:951031437"><Phone className="h-4 w-4" aria-hidden /><Text text="Urgencias" /> · 951 03 14 37</a></Button>
              <Button asChild variant="outline" className="min-h-11"><a href="tel:951504564"><Phone className="h-4 w-4" aria-hidden /><Text text="Información" /> · 951 50 45 64</a></Button>
              <Button asChild variant="outline" className="min-h-11"><a href="https://www.google.com/maps/dir/?api=1&destination=Centro+de+Salud+de+Alozaina+Urbanizacion+La+Pasadilla" target="_blank" rel="noopener noreferrer"><MapPin className="h-4 w-4" aria-hidden /><Text text="Cómo llegar" /></a></Button>
            </div>
            <a href="https://www.sspa.juntadeandalucia.es/servicioandaluzdesalud/el-sas/servicios-y-centros/informacion-por-centros/23967" target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary underline"><Text text="Información oficial del centro" /><ExternalLink className="h-4 w-4" aria-hidden /></a>
          </article>
        </section>

        <section className="mt-10 bg-primary text-primary-foreground">
          <div className="mx-auto max-w-5xl px-4 py-10">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-foreground text-primary"><Lightbulb className="h-6 w-6" aria-hidden /></span>
              <h3 className="font-display text-2xl font-extrabold leading-tight"><Text text="¿Una farola rota, un bache o una avería?" /></h3>
            </div>
            <p className="mt-3 opacity-90"><Text text="Avísalo por Línea Verde, el canal oficial del Ayuntamiento para avisos de la vía pública." /></p>
            <a
              href="https://www.lineaverde.app/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                const ua = navigator.userAgent;
                const play = "https://play.google.com/store/apps/details?id=lineaVerde.App";
                if (/android/i.test(ua)) {
                  e.preventDefault();
                  window.location.href = `intent://#Intent;package=lineaVerde.App;S.browser_fallback_url=${encodeURIComponent(play)};end`;
                } else if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) {
                  e.preventDefault();
                  window.location.href = "https://apps.apple.com/es/app/l%C3%ADnea-verde/id556432672";
                }
              }}
              className="mt-5 inline-flex min-h-12 items-center gap-2 bg-primary-foreground px-5 font-bold text-primary hover:opacity-90">
              <Text text="Abrir Línea Verde" /> <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          </div>
        </section>

        {/* 2. Vida diaria */}
        <section className="mx-auto max-w-5xl px-4 pt-14">
          <SectionTitle n="02" title="Vida diaria en el pueblo" text="Información práctica para organizarte y usar los servicios municipales." />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 animate-results-in">
            {DIARIO.filter((i) => !i.wide && !i.full).map((i) => (
              <article key={i.title} className={`flex flex-col border bg-card p-5 ${i.wide ? "border-primary/40 sm:col-span-2 lg:col-span-3" : ""}`}>
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-beige text-primary"><i.Icon className="h-5 w-5" aria-hidden /></span>
                  <h3 className="font-display text-lg font-extrabold leading-tight">{tr(i.title)}</h3>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{tr(i.text)}</p>
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

        {DIARIO.filter((i) => i.full).map((i) => (
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

        {DIARIO.filter((i) => i.wide).map((i) => (
          <section key={i.title} className="mt-10 bg-primary text-primary-foreground">
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

        {/* 3. Trámites */}
        <section className="mx-auto max-w-5xl px-4 py-14">
          <SectionTitle n="03" title="Trámites y gestiones" text="Información útil para realizar algunas de las gestiones más habituales en Casarabonela." />
          <div className="grid gap-3 sm:grid-cols-2">
            {TRAMITES.map((i) => (
              <article key={i.title} className="flex flex-col border-l-4 border-primary bg-muted/50 p-4">
                <div className="flex items-center gap-2">
                  <i.Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <h3 className="font-bold">{tr(i.title)}</h3>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{tr(i.text)}</p>
                {i.facts?.map((f) => (
                  <p key={f.k} className="mt-2 text-xs"><span className="font-bold">{tr(f.k)}:</span> {tr(f.v)}</p>
                ))}
                <Actions i={i} compact />
              </article>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-4 bg-primary p-6 text-primary-foreground sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-display text-xl font-extrabold"><Text text="¿Necesitas realizar otro trámite?" /></h3>
              <p className="mt-1 opacity-90"><Text text="Consulta el catálogo completo en la Sede Electrónica del Ayuntamiento." /></p>
            </div>
            <a href={SEDE} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 shrink-0 items-center gap-2 bg-primary-foreground px-5 font-bold text-primary hover:opacity-90">
              <Text text="Acceder a la Sede Electrónica" /> <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
