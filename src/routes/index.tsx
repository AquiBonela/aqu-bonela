import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Store, Compass, Landmark, Newspaper, Tag, Info, MessageSquarePlus, Phone, ArrowUpRight } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { useI18n, type TKey } from "@/lib/i18n";
import logo from "@/assets/logo-2.webp";
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

type Section = { key: TKey; text: TKey; Icon: typeof Store; to?: "/directorio" | "/descubre" | "/sobre" | "/sugerir" };
const SECTIONS: Section[] = [
  { key: "menu.directorio", text: "home.dirText", Icon: Store, to: "/directorio" },
  { key: "menu.servicios", text: "home.servText", Icon: Landmark },
  { key: "menu.descubre", text: "home.descText", Icon: Compass, to: "/descubre" },
  { key: "menu.actualidad", text: "home2.actText", Icon: Newspaper },
  { key: "menu.clasificados", text: "home2.clasText", Icon: Tag },
  { key: "menu.sobre", text: "home2.sobreText", Icon: Info, to: "/sobre" },
  { key: "menu.enviar", text: "home2.enviarText", Icon: MessageSquarePlus, to: "/sugerir" },
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

      {/* Portada: logo + buscador */}
      <section className="bg-beige">
        <div className="mx-auto flex max-w-3xl flex-col items-center px-4 pb-14 pt-10 text-center sm:pt-16">
          <img src={logo} alt="Aquí Bonela" className="h-20 w-auto sm:h-24" />
          <p className="mt-6 font-display text-xs font-bold uppercase tracking-[0.25em] text-terracotta">{t("home.kicker")}</p>
          <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight text-foreground sm:text-5xl">{t("home2.searchKicker")}</h1>
          <form onSubmit={submit} role="search" className="mt-8 flex w-full items-center gap-1 rounded-soft border-2 border-foreground bg-card p-1.5">
            <label htmlFor="buscar-portada" className="sr-only">{t("home.searchLabel")}</label>
            <Search className="ml-2 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <input id="buscar-portada" type="text" enterKeyHint="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("home.searchPh")} className="h-12 min-w-0 flex-1 bg-transparent text-lg text-foreground outline-none placeholder:text-muted-foreground" />
            <Button type="submit" className="h-11 rounded-soft-inner bg-terracotta px-4 font-display text-sm font-semibold text-terracotta-foreground shadow-none hover:bg-terracotta/90">{t("home.searchBtn")}</Button>
          </form>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
            <a href="tel:112" className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-3 py-1.5 font-bold text-destructive-foreground hover:opacity-90">
              <Phone className="h-4 w-4" aria-hidden /> {t("home.urg112")}
            </a>
            <Link to="/directorio" search={{ q: "", cat: "", of: "", tipo: "", urg: true }} className="inline-flex items-center rounded-full border-2 border-foreground/20 bg-card px-3 py-1.5 font-semibold text-foreground hover:bg-secondary">
              {t("home.urgLocal")}
            </Link>
          </div>
        </div>
      </section>

      <main>
        {/* Introducción del pueblo */}
        <section aria-labelledby="pueblo" className="mx-auto grid max-w-5xl gap-8 px-4 py-14 md:grid-cols-[1fr_1.1fr] md:items-center">
          <div className="relative">
            <img src={heroImg} alt={t("home.heroAlt")} loading="lazy" className="aspect-[4/5] w-full rounded-soft object-cover" />
            <div className="absolute -bottom-5 left-4 right-4 grid grid-cols-3 divide-x divide-border rounded-soft border-2 bg-card py-3 text-center">
              {([["500", "home2.f1"], ["2.500", "home2.f2"], ["40", "home2.f3"]] as const).map(([n, k]) => (
                <div key={k} className="px-1">
                  <p className="font-display text-2xl font-extrabold text-primary">{n}</p>
                  <p className="text-xs text-muted-foreground">{t(k)}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-6 md:pt-0">
            <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-terracotta">{t("home2.introKicker")}</p>
            <h2 id="pueblo" className="mt-2 font-display text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">{t("home2.introTitle")}</h2>
            <div className="mt-5 space-y-4 text-base leading-relaxed text-foreground/85">
              <p>{t("home2.intro1")}</p>
              <p>{t("home2.intro2")}</p>
              <p>{t("home2.intro3")}</p>
            </div>
          </div>
        </section>

        {/* Secciones del menú */}
        <section aria-labelledby="secciones" className="bg-primary text-primary-foreground">
          <div className="mx-auto max-w-5xl px-4 py-14">
            <h2 id="secciones" className="font-display text-3xl font-extrabold sm:text-4xl">{t("home2.sectionsTitle")}</h2>
            <ul className="mt-8 grid gap-px overflow-hidden rounded-soft bg-primary-foreground/15 sm:grid-cols-2">
              {SECTIONS.map(({ key, text, Icon, to }, i) => {
                const inner = (
                  <>
                    <span className="font-display text-sm font-bold text-accent">{String(i + 1).padStart(2, "0")}</span>
                    <Icon className="h-6 w-6 shrink-0 text-accent" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 font-display text-xl font-extrabold">
                        {t(key)}
                        {!to && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase text-accent-foreground">{t("home.soon")}</span>}
                      </span>
                      <span className="mt-0.5 block text-sm text-primary-foreground/80">{t(text)}</span>
                    </span>
                    {to && <ArrowUpRight className="h-5 w-5 shrink-0 opacity-60 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden />}
                  </>
                );
                const cls = "group flex h-full items-center gap-4 bg-primary p-5";
                return (
                  <li key={key} className={i === SECTIONS.length - 1 ? "sm:col-span-2" : ""}>
                    {to ? (
                      <Link to={to} {...(to === "/directorio" ? { search: { q: "", cat: "", of: "", tipo: "", urg: false } } : {})} className={`${cls} hover:bg-primary-foreground/10`}>{inner}</Link>
                    ) : (
                      <div className={`${cls} opacity-75`}>{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
