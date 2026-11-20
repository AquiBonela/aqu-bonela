import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, ExternalLink, Laptop, Mail, Phone } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/punto-vuela")({
  head: () => ({
    meta: [
      { title: "Punto Vuela Casarabonela — Aquí Bonela" },
      { name: "description", content: "Ayuda y acompañamiento digital gratuito en el Punto Vuela de Casarabonela." },
      { property: "og:title", content: "Punto Vuela Casarabonela — Aquí Bonela" },
      { property: "og:description", content: "Ayuda y acompañamiento digital gratuito en el Punto Vuela de Casarabonela." },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://bonela-local-finds.lovable.app/punto-vuela" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://bonela-local-finds.lovable.app/punto-vuela" }],
  }),
  component: PuntoVuelaPage,
});

function PuntoVuelaPage() {
  const { tr } = useI18n();
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link to="/servicios-publicos" className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden />{tr("Servicios públicos")}
        </Link>
        <div className="mt-6 flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><Laptop className="h-6 w-6" aria-hidden /></span>
          <h1 className="font-display text-3xl font-extrabold text-balance sm:text-4xl">{tr("Punto Vuela Casarabonela")}</h1>
        </div>
        <p className="mt-4 text-lg text-muted-foreground">{tr("Servicio gratuito de apoyo digital para vecinos de todas las edades.")}</p>

        <dl className="mt-6 space-y-3 border-y py-5 text-sm sm:text-base">
          <div><dt className="inline font-bold">{tr("Dónde")}: </dt><dd className="inline">{tr("C/ Cuatro Esquinas, 10")}</dd></div>
          <div><dt className="inline font-bold">{tr("Horario")}: </dt><dd className="inline">{tr("Lunes a viernes, 9:00–14:00; martes y jueves, 17:00–20:00")}</dd></div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <dt className="inline font-bold">{tr("Teléfono")}:</dt>
            <dd className="inline-flex flex-wrap gap-x-3 gap-y-1">
              <a href="tel:952456140" className="inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2"><Phone className="h-4 w-4" aria-hidden />952 456 140</a>
              <a href="tel:652805763" className="font-semibold text-primary underline underline-offset-2">652 805 763</a>
            </dd>
          </div>
          <div><dt className="inline font-bold">{tr("Correo")}: </dt><dd className="inline break-words"><a href="mailto:casarabonela@puntosvuela.es" className="inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2"><Mail className="h-4 w-4" aria-hidden />casarabonela@puntosvuela.es</a></dd></div>
        </dl>

        <ul className="mt-6 space-y-3 font-semibold text-[clamp(13px,4vw,1.25rem)] sm:text-xl">
          {["Asesoramiento y acompañamiento digital", "Ayuda con gestiones online", "Formación y competencias digitales"].map((item) => (
            <li key={item} className="flex items-center gap-2 whitespace-nowrap sm:gap-3"><CheckCircle2 className="h-4 w-4 shrink-0 text-primary sm:h-5 sm:w-5" aria-hidden />{tr(item)}</li>
          ))}
        </ul>
        <p className="mt-6 bg-muted/50 p-4 text-sm font-semibold">{tr("Si no te manejas con el certificado digital, Cl@ve o los trámites por internet, aquí te ayudan paso a paso.")}</p>
        <a href="https://puntosvuela.es/centros" target="_blank" rel="noopener noreferrer" className="press mt-6 inline-flex min-h-12 items-center gap-2 bg-primary px-5 py-3 text-sm font-bold text-primary-foreground">
          {tr("Consultar información del Punto Vuela")} <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      </main>
    </div>
  );
}
