import { Text, useI18n } from "@/lib/i18n";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Phone, ExternalLink, Lightbulb, Stethoscope, ArrowRight, MapPin, Info } from "lucide-react";
import { CATEGORIAS_VIDA } from "@/lib/vida-diaria";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { EmergencyPhonesList } from "@/components/EmergencyPhones";
import hero from "@/assets/plaza-buenavista-casarabonela.webp.asset.json";
import puntoVuelaLogo from "@/assets/punto-vuela-logo.svg.asset.json";
import { useQuery } from "@tanstack/react-query";
import { listingDetailQuery } from "@/lib/listing-detail";

const PUNTO_VUELA_SLUG = "punto-vuela-casarabonela";

function PuntoVuelaInfo() {
  const { data } = useQuery(listingDetailQuery("publico", PUNTO_VUELA_SLUG));
  return (
    <dl className="mt-4 space-y-1 border-t border-vuela-foreground/25 pt-4 text-sm">
      <div className="flex gap-2"><dt className="font-bold"><Text text="Dónde" />:</dt><dd>{data?.public_address ?? "Calle Cuatro Esquinas, 10"}</dd></div>
      <div className="flex gap-2"><dt className="font-bold"><Text text="Horario" />:</dt><dd><Text text="Consultar en ficha" /></dd></div>
    </dl>
  );
}

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
          <img src={hero.url} alt={tr("Plaza de la Buena Vista, Casarabonela")} width={1920} height={1280} className="h-[40vh] min-h-64 w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/30 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-5xl px-4 pb-10">
            <h1 className="font-display text-4xl font-extrabold text-balance sm:text-5xl"><Text text="Servicios públicos" /></h1>
            <p className="mt-3 max-w-2xl text-lg opacity-95"><Text text="Información práctica sobre servicios, gestiones y recursos de Casarabonela." /></p>
          </div>
        </section>

        {/* 1. Urgente */}
        <section className="mx-auto max-w-5xl px-4 pt-10">
          <SectionTitle n="01" title="Urgente y en la calle" text="Lo que puedes necesitar ahora mismo, a un toque." />
          <EmergencyPhonesList mainOnly />
          <a href="tel:061" className="press-feedback mt-3 flex items-center justify-between gap-4 border-2 border-destructive/30 bg-destructive/5 p-4 hover:bg-destructive/10">
            <span>
              <span className="block font-bold"><Text text="Emergencias sanitarias" /></span>
              <span className="mt-0.5 block text-sm text-muted-foreground"><Text text="Alternativa directa para urgencias médicas graves y ambulancias." /></span>
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap font-display text-2xl font-extrabold text-destructive"><Phone className="h-5 w-5" aria-hidden /> 061</span>
          </a>
          <h3 className="mt-8 text-sm font-bold uppercase tracking-[0.15em] text-muted-foreground"><Text text="Seguridad ciudadana" /></h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {[
              { title: "Guardia Civil — Puesto de Casarabonela", tel: "952456665", description: "Avda. Federico Muñoz, 16." },
              { title: "Policía Local", tel: "669291300", description: "Edificio de Usos Múltiples, Avda. Fernando Díaz. Atención según turnos." },
            ].map((contact) => (
              <article key={contact.tel} className="flex flex-col gap-3 border bg-card p-5">
                <h3 className="font-bold">{tr(contact.title)}</h3>
                <p className="text-sm">{tr(contact.description)}</p>
                <Button asChild className="mt-auto min-h-11">
                  <a href={`tel:${contact.tel}`}><Phone className="h-4 w-4" aria-hidden />{contact.tel.length === 9 ? contact.tel.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3") : contact.tel}</a>
                </Button>
              </article>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground"><Text text="Encontrarás todas las líneas de ayuda en el botón SOS de la cabecera." /></p>
          <h3 className="mt-8 text-sm font-bold uppercase tracking-[0.15em] text-muted-foreground"><Text text="Urgencias sanitarias" /></h3>
          <article className="mt-3 border-l-4 border-primary bg-muted p-5 sm:p-6">
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
          <p className="mt-3 text-sm text-muted-foreground"><Text text="El consultorio del pueblo atiende consultas habituales en su horario, no es un servicio de urgencias. Encontrarás sus datos en «Vida diaria en el pueblo»." /></p>
        </section>

        <section className="mt-10 bg-primary text-primary-foreground">
          <div className="mx-auto max-w-5xl px-4 py-10">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-foreground text-primary"><Lightbulb className="h-6 w-6" aria-hidden /></span>
              <h3 className="font-display text-2xl font-extrabold leading-tight"><Text text="¿Una farola rota, un bache o una avería?" /></h3>
            </div>
            <p className="mt-3 opacity-90"><Text text="Avísalo por Línea Verde, el canal oficial del Ayuntamiento para avisos de la vía pública." /></p>
            <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              {["Alumbrado público averiado", "Desperfectos en calles y aceras", "Mobiliario urbano deteriorado", "Limpieza viaria", "Incidencias en parques y espacios públicos", "Otros problemas de mantenimiento municipal"].map((x) => (
                <li key={x} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />{tr(x)}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm opacity-90"><Text text="Para problemas que no son una emergencia. Si hay peligro inmediato, llama al 112." /></p>
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
        <section id="vida-diaria" className="scroll-mt-24 mx-auto max-w-5xl px-4 pt-14">
          <SectionTitle n="02" title="Vida diaria en el pueblo" text="Información práctica para organizarte y usar los servicios municipales." />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIAS_VIDA.map((c) => (
              <Link key={c.id} to="/vida-diaria/$categoria" params={{ categoria: c.id }} className="press flex flex-col gap-2 border-l-4 border-primary bg-muted/50 p-5 transition-colors hover:bg-muted">
                <h3 className="font-display text-lg font-extrabold leading-tight">{tr(c.title)}</h3>
                <p className="text-sm text-muted-foreground">{tr(c.text)}</p>
                <span className="mt-auto inline-flex items-center gap-1 pt-1 text-sm font-semibold text-primary"><Text text="Ver información" /> <ArrowRight className="h-4 w-4" aria-hidden /></span>
              </Link>
            ))}
          </div>
        </section>


        {/* Punto Vuela */}
        <section aria-labelledby="punto-vuela-title" className="mt-10 bg-vuela text-vuela-foreground">
          <div className="mx-auto max-w-5xl px-4 py-10">
            <h3 id="punto-vuela-title">
              <img src={puntoVuelaLogo.url} alt="Punto Vuela" width={1619} height={528} className="block h-auto w-52 max-w-full" />
            </h3>
            <p className="mt-3 opacity-90"><Text text="Servicio gratuito de apoyo digital para vecinos de todas las edades." /></p>
            <PuntoVuelaInfo />
            <ul className="mt-5 flex flex-col gap-3 font-semibold text-[clamp(13px,4vw,1.25rem)] sm:text-xl">
              {["Asesoramiento y acompañamiento digital", "Ayuda con gestiones online", "Formación y competencias digitales"].map((x) => (
                <li key={x} className="flex items-center gap-2 whitespace-nowrap sm:gap-3"><CheckCircle2 className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" aria-hidden />{tr(x)}</li>
              ))}
            </ul>
            <p className="mt-4 bg-vuela-surface p-3 text-sm font-semibold"><Text text="Si no te manejas con el certificado digital, Cl@ve o los trámites por internet, aquí te ayudan paso a paso." /></p>
            <Button asChild variant="vuela" className="mt-5 min-h-12 px-5 font-bold">
              <Link to="/servicios/$slug" params={{ slug: PUNTO_VUELA_SLUG }}>
                <Text text="Ver ficha de Punto Vuela" /> <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </section>

        {/* 3. Trámites */}
        <section id="tramites" className="scroll-mt-24 mx-auto max-w-5xl px-4 py-14">
          <SectionTitle n="03" title="Guía de trámites" text="¿Necesitas realizar un trámite y no sabes por dónde empezar?" />
          <p className="max-w-2xl"><Text text="Consulta nuestras guías paso a paso para conocer los requisitos, la documentación necesaria, dónde realizar cada gestión y cómo solicitarla." /></p>
          <div className="mt-5 flex max-w-2xl items-start gap-3 border-l-4 border-primary bg-muted p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <p className="text-sm"><Text text="Aquí Bonela no realiza trámites. Te explicamos cómo hacerlos y te facilitamos el acceso a los organismos oficiales." /></p>
          </div>
          <Button asChild className="mt-6 min-h-12">
            <Link to="/tramites"><Text text="Explorar guía de trámites" /><ArrowRight className="h-4 w-4" aria-hidden /></Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
