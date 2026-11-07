import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { directoryQuery, filterListings, type Listing } from "@/lib/directory";
import { Search, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { BusinessSignupDialog } from "@/components/BusinessSignupDialog";
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

type Section = { key: TKey; text: TKey; img: string; to?: "/directorio" | "/descubre" | "/servicios-publicos" };
const SECTIONS: Section[] = [
  { key: "menu.directorio", text: "home.dirText", img: imgDir, to: "/directorio" },
  { key: "menu.descubre", text: "home.descText", img: imgDesc, to: "/descubre" },
  { key: "menu.servicios", text: "home.servText", img: imgServ, to: "/servicios-publicos" },
  { key: "menu.actualidad", text: "home2.actText", img: imgAct },
  { key: "menu.clasificados", text: "home2.clasText", img: imgClas },
];

function Home() {
  const navigate = useNavigate();
  const { t, tr } = useI18n();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const typed = text.trim().length >= 2;
  const { data } = useQuery({ ...directoryQuery, enabled: typed });
  const suggestions = useMemo(
    () => (typed && data ? filterListings(data.listings, data.categories, text, "", new Date(), "", "", data.activities).slice(0, 5) : []),
    [typed, data, text],
  );
  const goListing = (l: Listing) => {
    const to = l.type === "profesional" ? "/profesionales/$slug" : l.type === "publico" ? "/servicios/$slug" : l.type === "asociacion" ? "/asociaciones/$slug" : "/comercios/$slug";
    navigate({ to, params: { slug: l.slug } });
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (open && active >= 0 && suggestions[active]) return goListing(suggestions[active]);
    navigate({ to: "/directorio", search: { q: text.trim(), cat: "", of: "", tipo: "", urg: false } });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="relative">
        <SiteHeader overlay />

        <section className="relative overflow-hidden">
          <img src={heroImg} alt={t("home.heroAlt")} className="absolute inset-0 h-full w-full object-cover" />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-foreground/50 via-foreground/40 to-foreground/85" />
          <div className="relative mx-auto flex min-h-[36rem] max-w-3xl flex-col items-center justify-center px-4 pb-14 pt-24 text-center">
            <img src={logoWhite} alt="Aquí Bonela" className="h-auto w-64 sm:w-80" />
            <h1 className="mt-6 font-display text-xl font-bold leading-snug text-primary-foreground sm:text-3xl">{t("home2.searchKicker")}</h1>
          <div className="relative mt-8 w-full">
          <form id="form-portada" onSubmit={submit} role="search" className="flex w-full items-center gap-1 rounded-soft bg-card p-1.5 shadow-lg">
            <label htmlFor="buscar-portada" className="sr-only">{t("home.searchLabel")}</label>
            <Search className="ml-2 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <input id="buscar-portada" type="text" enterKeyHint="search" value={text} onChange={(e) => { setText(e.target.value); setOpen(true); setActive(-1); }} onFocus={() => setOpen(true)} onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 150); }} onKeyDown={onKey} autoComplete="off" role="combobox" aria-expanded={open && typed} aria-controls="sugerencias-portada" placeholder={t("home.searchPh")} className="h-12 min-w-0 flex-1 bg-transparent text-lg text-foreground outline-none placeholder:text-muted-foreground" />
            <Button type="submit" className="h-11 rounded-soft-inner bg-terracotta px-4 font-display text-sm font-semibold text-terracotta-foreground shadow-none hover:bg-terracotta/90">{t("home.searchBtn")}</Button>
          </form>
          {open && typed && data && (
            <ul id="sugerencias-portada" role="listbox" className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-soft bg-card text-left shadow-xl animate-suggestions-in">
              {suggestions.length === 0 ? (
                <li className="px-4 py-3 text-sm text-muted-foreground">{t("home.suggestNone")}</li>
              ) : (
                <>
                  {suggestions.map((l, i) => (
                    <li key={l.id} role="option" aria-selected={i === active}>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => goListing(l)} className={`block w-full px-4 py-2.5 text-left hover:bg-muted ${i === active ? "bg-muted" : ""}`}>
                        <span className="block font-semibold text-foreground">{l.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{tr(l.activity || l.short_description || "")}</span>
                      </button>
                    </li>
                  ))}
                  <li className="border-t border-border">
                    <button type="submit" form="form-portada" onMouseDown={(e) => e.preventDefault()} className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-primary hover:bg-muted">{t("home.suggestAll")} →</button>
                  </li>
                </>
              )}
            </ul>
          )}
          </div>
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
      </div>

      <main>
        <section aria-label={t("home2.sectionsTitle")} className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:pt-8">
          <ul className="grid gap-4 sm:grid-cols-2">
            {SECTIONS.map(({ key, text, img, to }, i) => {
              const inactive = !to;
              const inner = (
                <>
                  <img src={img} alt="" loading="lazy" className={`absolute inset-0 h-full w-full object-cover ${inactive ? "grayscale" : "transition-transform duration-700 group-hover:scale-105"}`} />
                  <div aria-hidden className={`absolute inset-0 ${inactive ? "bg-muted/85" : "bg-gradient-to-t from-foreground/90 via-foreground/30 to-transparent"}`} />
                  {inactive && <span className="absolute right-3 top-3 rounded-full bg-background/90 px-3 py-1 text-xs font-semibold text-muted-foreground">{t("home.soon")}</span>}
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className={`font-display text-2xl font-extrabold ${inactive ? "text-muted-foreground" : "text-primary-foreground"}`}>{t(key)}</p>
                    <p className={`mt-1 max-w-sm text-sm ${inactive ? "text-muted-foreground/80" : "text-primary-foreground/85"}`}>{t(text)}</p>
                  </div>
                </>
              );
              const cls = `group relative block overflow-hidden rounded-soft ${i === 0 ? "aspect-[4/3] sm:col-span-2 sm:aspect-[21/9]" : "aspect-[4/3]"}`;
              return (
                <li key={key} className={i === 0 ? "sm:col-span-2" : ""}>
                  {to ? <Link to={to} className={cls}>{inner}</Link> : <div className={cls} aria-disabled="true">{inner}</div>}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-16">
          <div className="rounded-soft bg-primary px-6 py-10 text-center text-primary-foreground sm:px-12">
            <h2 className="font-display text-2xl font-extrabold leading-tight sm:text-3xl">{t("home.ctaTitle")}</h2>
            <p className="mx-auto mt-3 max-w-xl opacity-90">{t("home.ctaText")}</p>
            <BusinessSignupDialog>
              <Button className="mt-6 h-11 rounded-full bg-terracotta px-6 font-display font-semibold text-terracotta-foreground hover:bg-terracotta/90">{t("home.ctaBtn")}</Button>
            </BusinessSignupDialog>
          </div>
        </section>
      </main>
    </div>
  );
}
