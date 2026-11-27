import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Car,
  Footprints,
  Clock,
  CalendarDays,
  MessageCircle,
  Hourglass,
  Lightbulb,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { useI18n } from "@/lib/i18n";
import { brand, getInstanceContent } from "@/config/municipality";

// Guía turística propia de la instancia; sin ella la página no existe.
const discover = getInstanceContent().discover;

export const Route = createFileRoute("/descubre")({
  beforeLoad: () => {
    if (!discover) throw notFound();
  },
  head: () =>
    !discover
      ? {}
      : {
          meta: [
            { title: brand("Descubre {nombreCorto} — Guía para visitar {municipio}") },
            {
              name: "description",
              content: brand(
                "Guía de {municipio}: historia andalusí, Sierra de las Nieves, rincones, Fiesta de los Rondeles, gastronomía y consejos de vecino.",
              ),
            },
            {
              property: "og:title",
              content: brand("Descubre {nombreCorto} — Guía de {municipio}"),
            },
            {
              property: "og:description",
              content:
                "Historia, naturaleza, rincones, fiestas, sabores y consejos para tu visita.",
            },
            { property: "og:type", content: "website" },
            { name: "twitter:card", content: "summary_large_image" },
          ],
        },
  component: Descubre,
});

const NAV = [
  ["historia", "descubre.nav1"],
  ["entorno", "descubre.nav2"],
  ["rincones", "descubre.nav3"],
  ["fiestas", "descubre.nav4"],
  ["sabores", "descubre.nav5"],
  ["consejos", "descubre.nav6"],
] as const;

const mapa = (q: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${q}, ${discover?.mapsSuffix ?? ""}`)}`;

const CONSEJOS = [
  { Icon: Footprints, title: "descubre.t1Title", text: "descubre.t1Text" },
  { Icon: Car, title: "descubre.t2Title", text: "descubre.t2Text" },
  { Icon: Hourglass, title: "descubre.t3Title", text: "descubre.t3Text" },
  { Icon: Clock, title: "descubre.t4Title", text: "descubre.t4Text" },
  { Icon: MessageCircle, title: "descubre.t5Title", text: "descubre.t5Text" },
  { Icon: CalendarDays, title: "descubre.t6Title", text: "descubre.t6Text" },
] as const;

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 space-y-2">
      {items.map((t) => (
        <li key={t} className="flex gap-3 text-lg leading-relaxed text-muted-foreground">
          <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function Kicker({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
      {n}. {children}
    </p>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{children}</p>;
}

function Closing({ children }: { children: React.ReactNode }) {
  return <p className="mt-5 font-display text-lg font-bold italic text-foreground">{children}</p>;
}

function DirLink({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <Link
      to="/directorio"
      search={{ q, cat: "", of: "" }}
      className="mt-6 inline-flex min-h-12 items-center gap-2 border-b-2 border-primary font-bold text-foreground hover:text-primary"
    >
      {children} <ArrowRight className="h-4 w-4" aria-hidden />
    </Link>
  );
}

function Descubre() {
  const { t } = useI18n();
  const images = discover?.images;
  const places = discover?.places ?? [];
  const [active, setActive] = useState<string>("");
  useEffect(() => {
    const onScroll = () => {
      let cur = "";
      for (const [id] of NAV) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 140) cur = id;
      }
      setActive(cur);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    if (!active) return;
    const a = document.querySelector<HTMLElement>(`[data-nav="${active}"]`);
    const box = a?.parentElement;
    if (a && box)
      box.scrollTo({
        left: a.offsetLeft - box.clientWidth / 2 + a.clientWidth / 2,
        behavior: "smooth",
      });
  }, [active]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        {/* Introducción */}
        <section className="relative">
          <img
            src={images?.hero}
            alt={t("descubre.heroAlt")}
            width={1280}
            height={864}
            className="h-[64vh] min-h-80 w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 mx-auto max-w-5xl px-4 pb-10 text-background">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] opacity-90">
              {t("descubre.kicker")}
            </p>
            <h1 className="mt-2 max-w-2xl font-display text-4xl font-extrabold leading-tight text-balance sm:text-5xl">
              {t("descubre.title")}
            </h1>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-12">
          <P>{t("descubre.intro1")}</P>
          <P>{t("descubre.intro2")}</P>
          <P>{t("descubre.intro3")}</P>
          <Closing>{t("descubre.introClosing")}</Closing>
        </section>

        <nav
          aria-label={t("descubre.navLabel")}
          className="sticky top-[3.75rem] z-20 border-y border-border bg-background/95 backdrop-blur"
        >
          <div className="mx-auto max-w-5xl px-2 sm:px-4">
            <div className="flex gap-1 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {NAV.map(([id, key]) => (
                <a
                  key={id}
                  href={`#${id}`}
                  data-nav={id}
                  aria-current={active === id ? "location" : undefined}
                  className={`shrink-0 rounded-full px-3 py-2 text-sm font-semibold transition-colors sm:px-4 ${active === id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  {t(key)}
                </a>
              ))}
            </div>
          </div>
        </nav>

        {/* 01. Historia */}
        <section
          id="historia"
          className="mx-auto grid max-w-5xl scroll-mt-16 gap-8 px-4 py-14 sm:grid-cols-2"
        >
          <img
            src={images?.history}
            alt={t("descubre.castilloAlt")}
            loading="lazy"
            width={1280}
            height={864}
            className="aspect-[4/3] w-full object-cover sm:aspect-auto sm:h-full"
          />
          <div>
            <Kicker n="01">{t("descubre.k1")}</Kicker>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-balance">
              {t("descubre.h1")}
            </h2>
            <P>{t("descubre.p1a")}</P>
            <P>{t("descubre.p1b")}</P>
            <Bullets
              items={[t("descubre.b1a"), t("descubre.b1b"), t("descubre.b1c"), t("descubre.b1d")]}
            />
            <Closing>{t("descubre.c1")}</Closing>
            <a
              href={mapa(discover?.historicCentre ?? "")}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-12 items-center gap-2 border-b-2 border-primary font-bold text-foreground hover:text-primary"
            >
              <MapPin className="h-4 w-4" aria-hidden /> {t("descubre.map1")}
            </a>
          </div>
        </section>

        {/* 02. Entorno */}
        <section id="entorno" className="scroll-mt-16">
          <img
            src={images?.nature}
            alt={t("descubre.sierraAlt")}
            loading="lazy"
            width={1600}
            height={800}
            className="h-[55vh] min-h-72 w-full object-cover"
          />
          <div className="mx-auto max-w-3xl px-4 py-12">
            <Kicker n="02">{t("descubre.k2")}</Kicker>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-balance">
              {t("descubre.h2")}
            </h2>
            <P>{t("descubre.p2a")}</P>
            <P>{t("descubre.p2b")}</P>
            <Bullets
              items={[
                t("descubre.b2a"),
                t("descubre.b2b"),
                t("descubre.b2c"),
                t("descubre.b2d"),
                t("descubre.b2e"),
              ]}
            />
            <p className="mt-6 border-l-4 border-primary bg-muted/60 p-4 text-base text-muted-foreground">
              <strong className="text-foreground">{t("descubre.routesLabel")}</strong>{" "}
              {t("descubre.routesText")}
            </p>
            <Closing>{t("descubre.c2")}</Closing>
          </div>
        </section>

        {/* 03. Rincones */}
        <section id="rincones" className="scroll-mt-16 bg-muted/50">
          <div className="mx-auto max-w-5xl px-4 py-14">
            <Kicker n="03">{t("descubre.k3")}</Kicker>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-balance">
              {t("descubre.h3")}
            </h2>
            <P>{t("descubre.p3")}</P>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {places.map((r) => (
                <article key={r.q} className="overflow-hidden bg-background shadow-sm">
                  <img
                    src={r.img}
                    alt={t(r.name)}
                    loading="lazy"
                    width={1280}
                    height={864}
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-display text-lg font-extrabold">{t(r.name)}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{t(r.text)}</p>
                    <a
                      href={mapa(r.q)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex min-h-10 items-center gap-1 text-sm font-bold text-primary hover:underline"
                    >
                      <MapPin className="h-4 w-4" aria-hidden /> {t("descubre.viewMap")}
                    </a>
                  </div>
                </article>
              ))}
            </div>
            <Closing>{t("descubre.c3")}</Closing>
          </div>
        </section>

        {/* 04. Fiestas */}
        <section
          id="fiestas"
          className="mx-auto grid max-w-5xl scroll-mt-16 gap-8 px-4 py-14 sm:grid-cols-2"
        >
          <img
            src={images?.festivals}
            alt={t("descubre.fiestasAlt")}
            loading="lazy"
            width={1280}
            height={864}
            className="aspect-[4/3] w-full object-cover sm:order-2 sm:aspect-auto sm:h-full"
          />
          <div>
            <Kicker n="04">{t("descubre.k4")}</Kicker>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-balance">
              {t("descubre.h4")}
            </h2>
            <P>{t("descubre.p4a")}</P>
            <P>
              {t("descubre.p4bA")}
              <strong className="text-foreground">{t("descubre.p4bStrong")}</strong>
              {t("descubre.p4bB")}
            </P>
            <Bullets
              items={[t("descubre.b4a"), t("descubre.b4b"), t("descubre.b4c"), t("descubre.b4d")]}
            />
            <Closing>{t("descubre.c4")}</Closing>
          </div>
        </section>

        {/* 05. Sabores */}
        <section id="sabores" className="scroll-mt-16 bg-beige">
          <div className="mx-auto grid max-w-5xl gap-8 px-4 py-14 sm:grid-cols-2">
            <img
              src={images?.food}
              alt={t("descubre.foodAlt")}
              loading="lazy"
              width={1280}
              height={864}
              className="aspect-[4/3] w-full object-cover sm:aspect-auto sm:h-full"
            />
            <div>
              <Kicker n="05">{t("descubre.k5")}</Kicker>
              <h2 className="mt-2 font-display text-3xl font-extrabold text-balance">
                {t("descubre.h5")}
              </h2>
              <P>{t("descubre.p5")}</P>
              <Bullets
                items={[
                  t("descubre.b5a"),
                  t("descubre.b5b"),
                  t("descubre.b5c"),
                  t("descubre.b5d"),
                  t("descubre.b5e"),
                ]}
              />
              <Closing>{t("descubre.c5")}</Closing>
              <div className="flex flex-wrap gap-x-6">
                <DirLink q="restaurante">{t("descubre.whereEat")}</DirLink>
                <DirLink q="alimentación">{t("descubre.whereBuy")}</DirLink>
              </div>
            </div>
          </div>
        </section>

        {/* 06. Consejos */}
        <section id="consejos" className="scroll-mt-16 bg-sand">
          <div className="mx-auto max-w-5xl px-4 py-14">
            <Kicker n="06">{t("descubre.k6")}</Kicker>
            <div className="mt-2 flex items-center gap-3">
              <Lightbulb className="h-7 w-7 text-primary" aria-hidden />
              <h2 className="font-display text-3xl font-extrabold text-balance">
                {t("descubre.h6")}
              </h2>
            </div>
            <ul className="mt-8 grid gap-x-10 sm:grid-cols-2">
              {CONSEJOS.map(({ Icon, title, text }) => (
                <li key={title} className="flex gap-3 border-t border-foreground/10 py-5">
                  <Icon className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <div>
                    <p className="font-display text-lg font-extrabold">{t(title)}</p>
                    <p className="mt-1 text-base text-muted-foreground">{t(text)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <DirLink q="">{t("descubre.practical")}</DirLink>
          </div>
        </section>

        {/* Cierre */}
        <section className="bg-primary text-primary-foreground">
          <div className="mx-auto max-w-3xl px-4 py-14 text-center">
            <h2 className="font-display text-3xl font-extrabold">{t("descubre.endTitle")}</h2>
            <p className="mt-4 text-lg opacity-95">{t("descubre.endText")}</p>
            <p className="mt-4 font-display text-xl font-bold">{t("descubre.endWait")}</p>
            <Link
              to="/directorio"
              search={{ q: "", cat: "", of: "" }}
              className="mt-6 inline-flex min-h-12 items-center gap-2 bg-background px-6 font-bold text-foreground hover:opacity-90"
            >
              {t("descubre.endBtn")} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
