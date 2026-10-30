import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Store, Compass, Landmark, Phone, Zap, ArrowRight, MessageSquarePlus } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import logoMenu from "@/assets/logo-menu.webp";
import heroImg from "@/assets/hero-casarabonela.jpg";
import directorioImg from "@/assets/descubre/calles.jpg";
import descubreImg from "@/assets/descubre/castillo.jpg";
import serviciosImg from "@/assets/descubre/fuentes.jpg";
import cactusImg from "@/assets/descubre/cactus.jpg";

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
  const { t } = useI18n();
  const [text, setText] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ to: "/directorio", search: { q: text.trim(), cat: "", of: "", tipo: "", urg: false } });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader hideBrand />

      <section className="relative w-full overflow-hidden">
        <div className="relative h-[34rem] w-full sm:h-[40rem]">
          <img src={heroImg} alt={t("home.heroAlt")} className="absolute inset-0 h-full w-full object-cover" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/35 to-foreground/10" />
          <div className="relative mx-auto flex h-full max-w-5xl flex-col justify-end px-4 pb-16">
            <p className="font-display text-sm font-bold uppercase tracking-[0.25em] text-accent">{t("home.kicker")}</p>
            <h1 className="mt-3"><img src={logoMenu} alt="Aquí Bonela" className="h-auto w-56 sm:w-72" /></h1>
          </div>
        </div>
        <div className="relative z-10 mx-auto -mt-7 w-full max-w-5xl px-4">
          <form onSubmit={submit} role="search" className="flex max-w-xl items-center gap-1 rounded-soft border-2 bg-card p-1.5">
            <label htmlFor="buscar-portada" className="sr-only">{t("home.searchLabel")}</label>
            <Search className="ml-2 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <input id="buscar-portada" type="text" enterKeyHint="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("home.searchPh")} className="h-12 min-w-0 flex-1 bg-transparent text-lg text-foreground outline-none placeholder:text-muted-foreground" />
            <Button type="submit" className="h-11 rounded-soft-inner bg-terracotta px-3.5 font-display text-sm font-semibold text-terracotta-foreground shadow-none hover:bg-terracotta/90">{t("home.searchBtn")}</Button>
          </form>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 pb-16">
        <section aria-labelledby="puertas" className="pt-14">
          <h2 id="puertas" className="font-display text-3xl font-extrabold text-foreground sm:text-4xl">{t("home.exploreTitle")}</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-3 sm:grid-rows-2">
            <Link to="/descubre" className="group relative block min-h-[22rem] overflow-hidden rounded-soft sm:col-span-2 sm:row-span-2">
              <img src={descubreImg} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <p className="flex items-center gap-2 font-display text-3xl font-extrabold text-primary-foreground sm:text-4xl"><Compass className="h-7 w-7 text-accent" aria-hidden />{t("home.descTitle")}</p>
                <p className="mt-2 max-w-md text-primary-foreground/90">{t("home.descText")}</p>
                <span className="mt-3 inline-flex items-center gap-1 font-semibold text-accent">{t("home.enter")} <ArrowRight className="h-4 w-4" aria-hidden /></span>
              </div>
            </Link>
            <SmallDoor to="/directorio" img={directorioImg} Icon={Store} title={t("home.dirTitle")} text={t("home.dirText")} />
            <SmallDoor img={serviciosImg} Icon={Landmark} title={t("home.servTitle")} text={t("home.servText")} soon />
          </div>
        </section>

        <section aria-labelledby="rincones" className="pt-16">
          <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-terracotta">{t("home.rinconesKicker")}</p>
          <h2 id="rincones" className="mt-1 font-display text-3xl font-extrabold text-foreground sm:text-4xl">{t("home.rinconesTitle")}</h2>
          <div className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2">
            {RINCONES.map((r, i) => (
              <Link key={r.t} to="/descubre" className={`group block ${i % 2 === 1 ? "sm:mt-16" : ""}`}>
                <div className="relative aspect-[4/5] overflow-hidden rounded-soft">
                  <img src={r.img} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <span className="absolute left-3 top-3 bg-background px-2 py-0.5 font-display text-sm font-extrabold text-foreground">0{i + 1}</span>
                </div>
                <h3 className="mt-3 font-display text-2xl font-extrabold text-foreground group-hover:text-primary">{t(r.t)}</h3>
                <p className="mt-1 text-muted-foreground">{t(r.d)}</p>
              </Link>
            ))}
          </div>
          <Link to="/descubre" className="mt-10 inline-flex items-center gap-2 font-display text-lg font-bold text-primary hover:underline">{t("home.rinconesAll")} <ArrowRight className="h-5 w-5" aria-hidden /></Link>
        </section>

        <section aria-labelledby="urgencias" className="mt-16 rounded-soft border-2 bg-card p-5 sm:p-6">
          <h2 id="urgencias" className="font-display text-2xl font-extrabold text-foreground">{t("home.urgTitle")}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <a href="tel:112" className="flex min-h-14 items-center gap-3 rounded-soft bg-destructive px-4 font-bold text-destructive-foreground hover:opacity-90">
              <Phone className="h-5 w-5" aria-hidden /> {t("home.urg112")}
            </a>
            <Link to="/directorio" search={{ q: "", cat: "", of: "", tipo: "", urg: true }} className="flex min-h-14 items-center gap-3 rounded-soft border-2 px-4 font-bold text-foreground hover:bg-secondary">
              <Zap className="h-5 w-5 text-terracotta" aria-hidden /> {t("home.urgLocal")}
            </Link>
          </div>
        </section>

        <section className="mt-12 bg-primary px-5 py-8 text-primary-foreground sm:px-8">
          <h2 className="font-display text-2xl font-extrabold">{t("home.shareTitle")}</h2>
          <p className="mt-2 max-w-2xl opacity-90">{t("home.shareText")}</p>
          <Link to="/sugerir" className="mt-5 inline-flex min-h-12 items-center gap-3 bg-background px-5 font-bold text-foreground hover:bg-beige">
            <MessageSquarePlus className="h-5 w-5" aria-hidden /> {t("home.shareBtn")}
          </Link>
        </section>
      </main>
    </div>
  );
}

const RINCONES = [
  { img: directorioImg, t: "home.r1t", d: "home.r1d" },
  { img: cactusImg, t: "home.r2t", d: "home.r2d" },
  { img: serviciosImg, t: "home.r3t", d: "home.r3d" },
  { img: descubreImg, t: "home.r4t", d: "home.r4d" },
] as const;

function SmallDoor({ to, img, Icon, title, text, soon }: { to?: "/directorio"; img: string; Icon: typeof Store; title: string; text: string; soon?: boolean }) {
  const { t } = useI18n();
  const body = (
    <>
      <img src={img} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/30 to-transparent" />
      {soon && <span className="absolute right-2 top-2 bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">{t("home.soon")}</span>}
      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="flex items-center gap-2 font-display text-xl font-extrabold text-primary-foreground"><Icon className="h-5 w-5 text-accent" aria-hidden />{title}</p>
        <p className="mt-1 text-sm text-primary-foreground/85">{text}</p>
      </div>
    </>
  );
  const cls = "group relative block min-h-[11rem] overflow-hidden rounded-soft";
  return to ? <Link to={to} className={cls}>{body}</Link> : <div className={`${cls} opacity-90`}>{body}</div>;
}
