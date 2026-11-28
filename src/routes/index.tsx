import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { directoryQuery, filterListings, type Listing } from "@/lib/directory";
import { Search, MapPin } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { BusinessSignupDialog } from "@/components/BusinessSignupDialog";
import { Button } from "@/components/ui/button";
import { useI18n, type TKey } from "@/lib/i18n";
import {
  brand,
  getInstanceContent,
  getMunicipality,
  getSiteConfigSnapshot,
} from "@/config/municipality";
import { PageHeaderImage } from "@/components/PageHeaderImage";
import { pageHeaderImage, type HeaderImage } from "@/lib/page-headers";
import { siteAssetUrl, type PageKey } from "@/lib/site-identity";
import { homeAutomaticShortcuts, homeExtraShortcuts } from "@/lib/site-availability";
import { isExternalHref, type ConfigurablePage } from "@/lib/site-structure";
import type { HomeSection, InstanceContent } from "../../instances/schema";

// Cifras, «Cómo llegar» y fotos de las tarjetas solo si la instancia las aporta.
const home: NonNullable<InstanceContent["home"]> = getInstanceContent().home ?? {};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: brand("{app} — Descubre, conoce y vive {municipio}") },
      {
        name: "description",
        content: brand(
          home.metaDescription ?? "Busca comercios, profesionales y servicios de {municipio}.",
        ),
      },
      { property: "og:title", content: brand("{app} — Descubre, conoce y vive {municipio}") },
      {
        property: "og:description",
        content: brand("Todo lo que necesitas para descubrir, conocer y vivir {municipio}."),
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

type PageCard = {
  key: TKey;
  text: TKey;
  /** Imagen compilada de respaldo de la tarjeta. */
  section: HomeSection;
  /** Cabecera de la página, que es la imagen de su tarjeta. */
  page: PageKey;
  to: "/directorio" | "/descubre" | "/servicios-publicos";
};

/**
 * Tarjeta de cada página principal. Actualidad aún no tiene página (etapa 5): sin tarjeta, aunque
 * nunca llega aquí porque no está disponible.
 */
const PAGE_CARDS: Record<"directorio" | ConfigurablePage, PageCard | null> = {
  directorio: {
    key: "menu.directorio",
    text: "home.dirText",
    section: "directorio",
    page: "directorio",
    to: "/directorio",
  },
  "servicios-publicos": {
    key: "menu.servicios",
    text: "home.servText",
    section: "servicios",
    page: "servicios-publicos",
    to: "/servicios-publicos",
  },
  descubre: {
    key: "menu.descubre",
    text: "home.descText",
    section: "descubre",
    page: "descubre",
    to: "/descubre",
  },
  actualidad: null,
};

const CARD_OVERLAY =
  "absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/30 to-transparent";

function CardText({ title, text }: { title: string; text: string }) {
  return (
    <div className="absolute inset-x-0 bottom-0 p-5">
      <p className="font-display text-2xl font-extrabold text-primary-foreground">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-primary-foreground/85">{text}</p>}
    </div>
  );
}

function CardImage({ image }: { image: HeaderImage | null }) {
  if (!image) return null;
  return (
    <PageHeaderImage
      image={image}
      decorative
      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
    />
  );
}

type Card = {
  id: string;
  title: string;
  text: string;
  image: HeaderImage | null;
  to?: PageCard["to"];
  href?: string;
  external?: boolean;
};

/**
 * Accesos directos de la portada: el Directorio siempre primero, después las páginas principales
 * visibles en el orden del menú y, al final, los accesos adicionales publicados.
 */
function useHomeCards(): Card[] {
  const { t } = useI18n();
  const automatic = homeAutomaticShortcuts()
    .map((key) => PAGE_CARDS[key])
    .filter((card): card is PageCard => card !== null)
    .map((card) => ({
      id: card.page,
      title: t(card.key),
      text: t(card.text),
      image: pageHeaderImage(card.page, { src: home.sectionImages?.[card.section] }),
      to: card.to,
    }));
  const extra = homeExtraShortcuts().map((s) => ({
    id: s.id,
    title: s.title,
    text: s.description,
    image: {
      src: siteAssetUrl(s.imagePath),
      alt: s.imageAlt,
      position: "50% 50%",
      configured: true,
    },
    href: s.href,
    external: isExternalHref(s.href),
  }));
  return [...automatic, ...extra];
}

function Home() {
  const cards = useHomeCards();
  const navigate = useNavigate();
  const { t, tr } = useI18n();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const typed = text.trim().length >= 2;
  const { data } = useQuery({ ...directoryQuery, enabled: typed });
  const suggestions = useMemo(
    () =>
      typed && data
        ? filterListings(
            data.listings,
            data.categories,
            text,
            "",
            new Date(),
            "",
            "",
            data.activities,
            tr,
          ).slice(0, 5)
        : [],
    [typed, data, text, tr],
  );
  const goListing = (l: Listing) => {
    const to =
      l.type === "profesional"
        ? "/profesionales/$slug"
        : l.type === "publico"
          ? "/servicios/$slug"
          : l.type === "asociacion"
            ? "/asociaciones/$slug"
            : "/comercios/$slug";
    navigate({ to, params: { slug: l.slug } });
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    }
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (open && active >= 0 && suggestions[active]) return goListing(suggestions[active]);
    navigate({
      to: "/directorio",
      search: { q: text.trim(), cat: "", of: "", tipo: "", urg: false },
    });
  };

  // Identidad aplicada en cada render (Supabase o la instalación compilada).
  const assets = getMunicipality().assets;
  const hero = pageHeaderImage("inicio", { src: assets.heroImage, alt: t("home.heroAlt") });
  const logoLight = assets.logoHome;
  // Logotipo subido sin versión clara: se muestra sobre una pastilla blanca para que se lea.
  const logoBadge =
    !logoLight && getSiteConfigSnapshot().branding?.logoPath ? assets.logoAdmin : undefined;
  return (
    <div className="min-h-screen bg-background">
      <div className="relative z-10">
        <SiteHeader overlay />

        <section className={hero ? "relative" : "relative bg-primary"}>
          {hero && <PageHeaderImage image={hero} priority />}
          {hero && (
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-b from-foreground/50 via-foreground/40 to-foreground/85"
            />
          )}
          <div className="relative mx-auto flex min-h-[36rem] max-w-3xl flex-col items-center justify-center px-4 pb-14 pt-24 text-center">
            {logoLight ? (
              <img
                src={logoLight}
                alt={getMunicipality().appName}
                className="h-auto w-64 sm:w-80"
              />
            ) : logoBadge ? (
              <span className="inline-flex rounded-soft bg-white/95 px-6 py-4 shadow-lg">
                <img
                  src={logoBadge}
                  alt={getMunicipality().appName}
                  className="h-auto max-h-24 w-56 object-contain sm:w-64"
                />
              </span>
            ) : (
              <p className="font-display text-4xl font-extrabold leading-tight text-primary-foreground text-balance sm:text-5xl">
                {getMunicipality().appName}
              </p>
            )}
            <h1 className="mt-6 font-display text-xl font-bold leading-snug text-primary-foreground sm:text-3xl">
              {t("home2.searchKicker")}
            </h1>
            <div className="relative mt-8 w-full">
              <form
                id="form-portada"
                onSubmit={submit}
                role="search"
                className="flex w-full items-center gap-1 rounded-soft bg-card p-1.5 shadow-lg"
              >
                <label htmlFor="buscar-portada" className="sr-only">
                  {t("home.searchLabel")}
                </label>
                <Search className="ml-2 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <input
                  id="buscar-portada"
                  type="text"
                  enterKeyHint="search"
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setOpen(true);
                    setActive(-1);
                  }}
                  onFocus={() => setOpen(true)}
                  onBlur={() => {
                    blurTimer.current = setTimeout(() => setOpen(false), 150);
                  }}
                  onKeyDown={onKey}
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={open && typed}
                  aria-controls="sugerencias-portada"
                  placeholder={t("home.searchPh")}
                  className="h-12 min-w-0 flex-1 bg-transparent text-lg text-foreground outline-none placeholder:text-muted-foreground"
                />
                <Button
                  type="submit"
                  className="h-11 rounded-soft-inner bg-terracotta px-4 font-display text-sm font-semibold text-terracotta-foreground shadow-none hover:bg-terracotta/90"
                >
                  {t("home.searchBtn")}
                </Button>
              </form>
              {open && typed && data && (
                <ul
                  id="sugerencias-portada"
                  role="listbox"
                  className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-soft bg-card text-left shadow-xl animate-suggestions-in"
                >
                  {suggestions.length === 0 ? (
                    <li className="px-4 py-3 text-sm text-muted-foreground">
                      {t("home.suggestNone")}
                    </li>
                  ) : (
                    <>
                      {suggestions.map((l, i) => (
                        <li key={l.id} role="option" aria-selected={i === active}>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => goListing(l)}
                            className={`block w-full px-4 py-2.5 text-left hover:bg-muted ${i === active ? "bg-muted" : ""}`}
                          >
                            <span className="block font-semibold text-foreground">{l.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {tr(l.activity || l.short_description || "")}
                            </span>
                          </button>
                        </li>
                      ))}
                      <li className="border-t border-border">
                        <button
                          type="submit"
                          form="form-portada"
                          onMouseDown={(e) => e.preventDefault()}
                          className="block w-full px-4 py-2.5 text-left text-sm font-semibold text-primary hover:bg-muted"
                        >
                          {t("home.suggestAll")} →
                        </button>
                      </li>
                    </>
                  )}
                </ul>
              )}
            </div>
            {home.stats && home.stats.length > 0 && (
              <div className="mt-8 grid w-full max-w-md grid-cols-3 divide-x divide-primary-foreground/30 text-primary-foreground">
                {home.stats.map(({ value: n, label: k }) => (
                  <div key={k} className="px-1">
                    <p className="font-display text-2xl font-extrabold sm:text-3xl">{n}</p>
                    <p className="text-xs opacity-85">{t(k)}</p>
                  </div>
                ))}
              </div>
            )}
            {home.directionsQuery && (
              <a
                href={
                  "https://www.google.com/maps/dir/?api=1&destination=" +
                  encodeURIComponent(home.directionsQuery)
                }
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary-foreground/60 px-4 py-2 font-semibold text-primary-foreground hover:bg-primary-foreground/10"
              >
                <MapPin className="h-4 w-4" aria-hidden /> {t("home2.howTo")}
              </a>
            )}
          </div>
        </section>
      </div>

      <main>
        <section
          aria-label={t("home2.sectionsTitle")}
          className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:pt-8"
        >
          <ul className="grid gap-4 sm:grid-cols-2">
            {cards.map((card, i) => {
              const cls = `group relative block overflow-hidden rounded-soft${card.image ? "" : " bg-primary"} ${i === 0 ? "aspect-[4/3] sm:col-span-2 sm:aspect-[21/9]" : "aspect-[4/3]"}`;
              const inner = (
                <>
                  <CardImage image={card.image} />
                  <div aria-hidden className={CARD_OVERLAY} />
                  <CardText title={card.title} text={card.text} />
                </>
              );
              return (
                <li key={card.id} className={i === 0 ? "sm:col-span-2" : ""}>
                  {card.to ? (
                    <Link
                      to={card.to}
                      {...(card.to === "/directorio" ? { search: { q: "", cat: "", of: "" } } : {})}
                      className={cls}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <a
                      href={card.href}
                      className={cls}
                      {...(card.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    >
                      {inner}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-16">
          <div className="rounded-soft bg-primary px-6 py-10 text-center text-primary-foreground sm:px-12">
            <h2 className="font-display text-2xl font-extrabold leading-tight sm:text-3xl">
              {t("home.ctaTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-xl opacity-90">{t("home.ctaText")}</p>
            <BusinessSignupDialog>
              <Button className="mt-6 h-11 rounded-full bg-terracotta px-6 font-display font-semibold text-terracotta-foreground hover:bg-terracotta/90">
                {t("home.ctaBtn")}
              </Button>
            </BusinessSignupDialog>
          </div>
        </section>
      </main>
    </div>
  );
}
