import { Link } from "@tanstack/react-router";
import { SiteFooter } from "@/components/SiteFooter";
import { AppHeader, type HeaderItem } from "@/components/AppHeader";
import { WeatherNow } from "@/components/WeatherNow";
import logo from "@/assets/logo-2.webp";
import logoLinea from "@/assets/logo-texto-linea.webp";
import { useI18n } from "@/lib/i18n";

const menuItems = (t: ReturnType<typeof useI18n>["t"]): HeaderItem[] => [
  { to: "/directorio", search: { q: "", cat: "", of: "" }, label: t("menu.directorio") },
  { to: "/servicios-publicos", label: t("menu.servicios") },
  { to: "/descubre", label: t("menu.descubre") },
  { label: t("menu.actualidad"), soon: true },
  { label: t("menu.clasificados"), soon: true },
  { to: "/sobre", label: t("menu.sobre") },

  {
    to: "/sugerir",
    label: t("menu.enviar"),
    description: t("menu.enviarDesc"),
  },
];

export function SiteHeader({ hideBrand = false, overlay = false }: { hideBrand?: boolean; overlay?: boolean } = {}) {
  const { t } = useI18n();
  const brand = overlay ? null : hideBrand ? null : (
    <Link to="/" className="inline-flex min-w-0 items-center" aria-label="Aquí Bonela, inicio">
      <img src={logoLinea} alt="Aquí Bonela" className="h-7 w-auto max-w-full object-contain sm:hidden" />
      <img src={logo} alt="Aquí Bonela" className="hidden h-10 w-auto sm:block sm:h-11" />
    </Link>
  );
  const left = overlay ? (
    <span className="[&_button]:!text-primary-foreground [&_svg]:!text-primary-foreground">
      <WeatherNow />
    </span>
  ) : (
    <WeatherNow />
  );
  return (
    <AppHeader
      navLabel={t("menu.label")}
      footnote={<SiteFooter inMenu />}
      left={left}
      overlay={overlay}
      brand={brand}
      items={menuItems(t)}
    />
  );
}
