import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/SiteHeader";
import { useI18n, type TKey } from "@/lib/i18n";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre Aquí Bonela — Aquí Bonela" },
      {
        name: "description",
        content:
          "Aquí Bonela reúne la información útil de Casarabonela: comercios, profesionales, servicios públicos, asociaciones, lugares, actividades y noticias.",
      },
      { property: "og:title", content: "Sobre Aquí Bonela" },
      {
        property: "og:description",
        content: "Una plataforma independiente que reúne en un mismo lugar la información útil de Casarabonela.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Sobre,
});

const SECTIONS: { title: TKey; paragraphs: TKey[] }[] = [
  {
    title: "sobre.audienceTitle",
    paragraphs: ["sobre.aud1", "sobre.aud2", "sobre.aud3"],
  },
  {
    title: "sobre.howTitle",
    paragraphs: ["sobre.how1", "sobre.how2", "sobre.how3", "sobre.how4", "sobre.how5"],
  },
  {
    title: "sobre.joinTitle",
    paragraphs: ["sobre.join1", "sobre.join2", "sobre.join3"],
  },
];

function Sobre() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-3xl font-extrabold text-pretty">{t("sobre.title")}</h1>

        <section className="mt-6 grid gap-2 text-base leading-relaxed">
          <h2 className="font-display text-xl font-bold">{t("sobre.whatTitle")}</h2>
          <p className="font-medium">{t("sobre.what1")}</p>
          <p>{t("sobre.what2")}</p>
          <p>{t("sobre.what3")}</p>
        </section>

        {SECTIONS.map((s) => (
          <section key={s.title} className="mt-8 grid gap-2 border-t pt-8 text-base leading-relaxed">
            <h2 className="font-display text-xl font-bold">{t(s.title)}</h2>
            {s.paragraphs.map((p, i) => (
              <p key={p} className={i === 0 ? "font-medium" : undefined}>
                {t(p)}
              </p>
            ))}
          </section>
        ))}

        <section className="mt-8 border-t pt-8">
          <div className="border bg-secondary/40 p-5">
            <h2 className="font-display text-xl font-bold">{t("sobre.growTitle")}</h2>
            <div className="mt-2 grid gap-2 text-base leading-relaxed">
              <p className="font-medium">{t("sobre.grow1")}</p>
              <p>{t("sobre.grow2")}</p>
              <p>{t("sobre.grow3")}</p>
            </div>
            <Link
              to="/sugerir"
              className="mt-4 inline-flex min-h-12 items-center bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {t("menu.enviar")}
            </Link>
          </div>
        </section>

        <section className="mt-8 grid gap-2 border-t pt-8 text-base leading-relaxed">
          <h2 className="font-display text-xl font-bold">{t("sobre.indepTitle")}</h2>
          <p className="font-medium">{t("sobre.indep1")}</p>
          <p>{t("sobre.indep2")}</p>
        </section>
      </main>
    </div>
  );
}
