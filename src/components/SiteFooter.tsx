import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export function SiteFooter({ inMenu = false }: { inMenu?: boolean }) {
  const { t } = useI18n();


  return (
    <footer className={inMenu ? "text-center text-xs text-primary-foreground/85 [&_*]:!text-primary-foreground" : "mt-8 border-t bg-secondary/40 px-4 py-8 text-center text-xs text-muted-foreground"}>
      <div className="mx-auto max-w-2xl [&_nav]:justify-center [&_p]:justify-center">
        <div className="flex flex-col items-center gap-1.5 font-display text-xs font-bold uppercase tracking-wide text-foreground sm:flex-row sm:justify-center sm:gap-2.5">
          <span className="font-display text-sm font-extrabold normal-case tracking-tight">Aquí Bonela</span>
          <span aria-hidden className="hidden sm:inline">·</span>
          <span>{t("footer.tagline")}</span>
        </div>
        <p className="mt-2 text-xs leading-snug text-foreground/80">
          {t("footer.about")}
        </p>
        <nav aria-label={t("footer.legalNav")} className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-semibold">
          <Link to="/aviso-legal" className="underline-offset-4 hover:underline">{t("footer.aviso")}</Link>
          <span aria-hidden>·</span>
          <Link to="/privacidad" className="underline-offset-4 hover:underline">{t("footer.privacidad")}</Link>
          <span aria-hidden>·</span>
          <Link to="/cookies" className="underline-offset-4 hover:underline">{t("footer.cookies")}</Link>
        </nav>
        <p className="mt-4 font-semibold">Groundwork · Casarabonela · {new Date().getFullYear()} ®</p>
      </div>
    </footer>
  );
}
