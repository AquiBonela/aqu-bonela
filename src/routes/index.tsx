import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Store, Compass, Landmark, Phone, Zap, ArrowRight, MessageSquarePlus } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-casarabonela.jpg";
import directorioImg from "@/assets/descubre/calles.jpg";
import descubreImg from "@/assets/descubre/castillo.jpg";
import serviciosImg from "@/assets/descubre/fuentes.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aquí Bonela — Descubre, conoce y vive Casarabonela" },
      { name: "description", content: "La plataforma de vida local de Casarabonela: directorio de comercios y profesionales, rincones para descubrir y servicios útiles." },
      { property: "og:title", content: "Aquí Bonela — Descubre, conoce y vive Casarabonela" },
      { property: "og:description", content: "Todo lo que necesitas para descubrir, conocer y vivir Casarabonela." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/directorio", search: { q: text.trim(), cat: "", of: "", tipo: "", urg: false } });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="relative w-full overflow-hidden">
        <div className="relative h-[26rem] w-full sm:h-[32rem]">
          <img src={heroImg} alt="Panorámica del pueblo blanco de Casarabonela y la Sierra de las Nieves" className="absolute inset-0 h-full w-full object-cover" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/30 to-transparent" />
          <div className="relative mx-auto flex h-full max-w-5xl flex-col items-center justify-end px-4 pb-16 text-center">
            <h1 className="max-w-3xl font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-primary-foreground sm:text-6xl">Aquí Bonela</h1>
            <p className="mt-3 max-w-xl text-lg text-primary-foreground/90 sm:text-xl">Todo lo que necesitas para descubrir, conocer y vivir Casarabonela.</p>
          </div>
        </div>
        <div className="relative z-10 mx-auto -mt-7 w-full max-w-5xl px-4">
          <form onSubmit={submit} role="search" className="mx-auto flex max-w-xl items-center gap-1 rounded-soft border-2 bg-card p-1.5">
            <label htmlFor="buscar-portada" className="sr-only">¿Qué necesitas hoy?</label>
            <Search className="ml-2 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <input id="buscar-portada" type="text" enterKeyHint="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="¿Qué necesitas? Farmacia, fontanero…" className="h-12 min-w-0 flex-1 bg-transparent text-lg text-foreground outline-none placeholder:text-muted-foreground" />
            <Button type="submit" className="h-11 rounded-soft-inner bg-terracotta px-3.5 font-display text-sm font-semibold text-terracotta-foreground shadow-none hover:bg-terracotta/90">Buscar</Button>
          </form>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 pb-16">
        <section aria-labelledby="puertas" className="pt-12">
          <h2 id="puertas" className="font-display text-3xl font-extrabold text-foreground">¿Por dónde empezamos?</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Door to="/directorio" img={directorioImg} Icon={Store} title="Directorio local" text="Comercios, oficios, profesionales y asociaciones del municipio." />
            <Door to="/descubre" img={descubreImg} Icon={Compass} title="Descubre Bonela" text="Patrimonio, rincones con encanto, naturaleza y consejos de vecino." />
            <Door img={serviciosImg} Icon={Landmark} title="Servicios públicos" text="Ayuntamiento, salud, dependencias y teléfonos útiles." soon />
          </div>
        </section>

        <section aria-labelledby="urgencias" className="mt-12 rounded-soft border-2 bg-card p-5 sm:p-6">
          <h2 id="urgencias" className="font-display text-2xl font-extrabold text-foreground">¿Una urgencia?</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <a href="tel:112" className="flex min-h-14 items-center gap-3 rounded-soft bg-destructive px-4 font-bold text-destructive-foreground hover:opacity-90">
              <Phone className="h-5 w-5" aria-hidden /> Emergencias · 112
            </a>
            <Link to="/directorio" search={{ q: "", cat: "", of: "", tipo: "", urg: true }} className="flex min-h-14 items-center gap-3 rounded-soft border-2 px-4 font-bold text-foreground hover:bg-secondary">
              <Zap className="h-5 w-5 text-terracotta" aria-hidden /> Servicios de urgencia del pueblo
            </Link>
          </div>
        </section>

        <section className="mt-12 bg-primary px-5 py-8 text-primary-foreground sm:px-8">
          <h2 className="font-display text-2xl font-extrabold">¿Tienes un negocio, una asociación o algo que compartir?</h2>
          <p className="mt-2 max-w-2xl opacity-90">Ayúdanos a que Casarabonela esté completa y al día. Revisamos cada aportación.</p>
          <Link to="/sugerir" className="mt-5 inline-flex min-h-12 items-center gap-3 bg-background px-5 font-bold text-foreground hover:bg-beige">
            <MessageSquarePlus className="h-5 w-5" aria-hidden /> Enviar información
          </Link>
        </section>
      </main>
    </div>
  );
}

function Door({ to, img, Icon, title, text, soon }: { to?: "/directorio" | "/descubre"; img: string; Icon: typeof Store; title: string; text: string; soon?: boolean }) {
  const body = (
    <>
      <div className="relative h-40 overflow-hidden">
        <img src={img} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        {soon && <span className="absolute right-2 top-2 bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">Próximamente</span>}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="flex items-center gap-2 font-display text-xl font-extrabold text-foreground"><Icon className="h-5 w-5 text-primary" aria-hidden />{title}</p>
        <p className="mt-1 flex-1 text-base text-muted-foreground">{text}</p>
        {!soon && <span className="mt-3 inline-flex items-center gap-1 font-semibold text-primary">Entrar <ArrowRight className="h-4 w-4" aria-hidden /></span>}
      </div>
    </>
  );
  const cls = "group flex flex-col overflow-hidden rounded-soft border-2 bg-card";
  return to ? <Link to={to} className={`${cls} hover:border-primary`}>{body}</Link> : <div className={`${cls} opacity-80`}>{body}</div>;
}
