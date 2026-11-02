import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { useI18n, type TKey } from "@/lib/i18n";
import logoWhite from "@/assets/logo-menu.webp";
import imgDir from "@/assets/descubre/calles.jpg";
import imgServ from "@/assets/descubre/fuentes.jpg";
import imgDesc from "@/assets/descubre/castillo.jpg";
import imgAct from "@/assets/descubre/molino.jpg";
import imgClas from "@/assets/descubre/cactus.jpg";
import heroImg from "@/assets/hero-casarabonela.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aquí Bonela — Descubre, conoce y vive Casarabonela" },
      { name: "description", content: "Busca comercios, profesionales y servicios de Casarabonela, y conoce la historia del pueblo blanco de la Sierra de las Nieves." },
      { property: "og:title", content: "Aquí Bonela — Descubre, conoce y vive Casarabonela" },
      { property: "og:description", content: "Todo lo que necesitas para descubrir, conocer y vivir Casarabonela." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

type Section = { key: TKey; text: TKey; img: string; to?: "/directorio" | "/descubre" };
const SECTIONS: Section[] = [
  { key: "menu.directorio", text: "home.dirText", img: imgDir, to: "/directorio" },
  { key: "menu.descubre", text: "home.descText", img: imgDesc, to: "/descubre" },
  { key: "menu.servicios", text: "home.servText", img: imgServ },
  { key: "menu.actualidad", text: "home2.actText", img: imgAct },
  { key: "menu.clasificados", text: "home2.clasText", img: imgClas },
];

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

      <section className="relative overflow-hidden">
        <img src={heroImg} alt={t("home.heroAlt")} className="absolute inset-0 h-full w-full object-cover" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-foreground/50 via-foreground/40 to-foreground/85" />
        <div className="relative mx-auto flex min-h-[36rem] max-w-3xl flex-col items-center justify-center px-4 py-14 text-center">
          <img src={logoWhite} alt="Aquí Bonela" className="h-auto w-44 sm:w-56" />
          <h1 className="mt-6 font-display text-3xl font-extrabold leading-tight text-primary-foreground sm:text-5xl">{t("home2.searchKicker")}</h1>
          <form onSubmit={submit} role="search" className="mt-8 flex w-full items-center gap-1 rounded-soft bg-card p-1.5 shadow-lg">
            <label htmlFor="buscar-portada" className="sr-only">{t("home.searchLabel")}</label>
            <Search className="ml-2 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <input id="buscar-portada" type="text" enterKeyHint="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("home.searchPh")} className="h-12 min-w-0 flex-1 bg-transparent text-lg text-foreground outline-none placeholder:text-muted-foreground" />
            <Button type="submit" className="h-11 rounded-soft-inner bg-terracotta px-4 font-display text-sm font-semibold text-terracotta-foreground shadow-none hover:bg-terracotta/90">{t("home.searchBtn")}</Button>
          </form>
          <div className="mt-8 grid w-full max-w-md grid-cols-3 divide-x divide-primary-foreground/30 text-primary-foreground">
            {([["500", "home2.f1"], ["2.500", "home2.f2"], ["40", "home2.f3"]] as const).map(([n, k]) => (
              <div key={k} className="px-1">
                <p className="font-display text-2xl font-extrabold sm:text-3xl">{n}</p>
                <p className="text-xs opacity-85">{t(k)}</p>
              </div>
            ))}
          </div>
          <a href="https://www.google.com/maps/dir/?api=1&destination=Casarabonela%2C%20M%C3%A1laga" target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary-foreground/60 px-4 py-2 font-semibold text-primary-foreground hover:bg-primary-foreground/10">
            <MapPin className="h-4 w-4" aria-hidden /> {t("home2.howTo")}
          </a>
        </div>
      </section>

      <main>
        <section aria-labelledby="pueblo" className="mx-auto max-w-3xl px-4 py-14">
          <h2 id="pueblo" className="font-display text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">{t("home2.introTitle")}</h2>
          <div className="mt-5 space-y-4 text-base leading-relaxed text-foreground/85 sm:text-lg">
            <p>{t("home2.intro1")}</p>
            <p>{t("home2.intro2")}</p>
            <p>{t("home2.intro3")}</p>
            <p>{t("home2.intro4")}</p>
            <p className="font-semibold text-foreground">{t("home2.intro5")}</p>
          </div>
        </section>

        <section aria-label={t("home2.sectionsTitle")} className="mx-auto max-w-5xl px-4 pb-16">
          <ul className="grid gap-4 sm:grid-cols-2">
            {SECTIONS.map(({ key, text, img, to }, i) => {
              const inner = (
                <>
                  <img src={img} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/30 to-transparent" />
                  {!to && <span className="absolute right-3 top-3 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-foreground">{t("home.soon")}</span>}
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className="font-display text-2xl font-extrabold text-primary-foreground">{t(key)}</p>
                    <p className="mt-1 max-w-sm text-sm text-primary-foreground/85">{t(text)}</p>
                  </div>
                </>
              );
              const cls = `group relative block overflow-hidden rounded-soft ${i === 0 ? "aspect-[4/3] sm:col-span-2 sm:aspect-[21/9]" : "aspect-[4/3]"}`;
              return (
                <li key={key} className={i === 0 ? "sm:col-span-2" : ""}>
                  {to ? <Link to={to} className={cls}>{inner}</Link> : <div className={cls}>{inner}</div>}
                </li>
              );
            })}
          </ul>
        </section>
      </main>
    </div>
  );
}
