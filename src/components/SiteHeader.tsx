import { Link } from "@tanstack/react-router";
import { SiteFooter } from "@/components/SiteFooter";
import { AppHeader, type HeaderItem } from "@/components/AppHeader";
import { WeatherNow } from "@/components/WeatherNow";
import logo from "@/assets/logo-2.webp";
import { useI18n } from "@/lib/i18n";

const menuItems = (t: ReturnType<typeof useI18n>["t"]): HeaderItem[] => [
  { to: "/directorio", search: { q: "", cat: "", of: "" }, label: t("menu.directorio") },
  { label: t("menu.servicios"), soon: true },
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

export function SiteHeader() {
  const { t } = useI18n();
  return (
    <AppHeader
      navLabel={t("menu.label")}
      footnote={<SiteFooter inMenu />}
      left={<WeatherNow />}
      brand={
        <Link to="/" className="inline-flex items-center" aria-label="Aquí Bonela, inicio">
          <img src={logo} alt="Aquí Bonela" className="h-10 w-auto sm:h-11" />
        </Link>
      }
      items={menuItems(t)}
    />
  );
}
