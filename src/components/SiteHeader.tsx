import { SiteFooter } from "@/components/SiteFooter";
import { AppHeader, type HeaderItem } from "@/components/AppHeader";
import { WeatherNow } from "@/components/WeatherNow";
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
  const brand = null;
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
