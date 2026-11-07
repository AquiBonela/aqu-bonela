import { SiteFooter } from "@/components/SiteFooter";
import { AppHeader, type HeaderItem } from "@/components/AppHeader";
import { WeatherNow } from "@/components/WeatherNow";
import { useI18n } from "@/lib/i18n";
import { useState } from "react";
import { SiteBanner } from "@/components/SiteBanner";
import { BusinessSignupDialog } from "@/components/BusinessSignupDialog";

const menuItems = (t: ReturnType<typeof useI18n>["t"], onSend: () => void): HeaderItem[] => [
  { to: "/", label: "Aquí Bonela", activeOptions: { exact: true } },
  { to: "/directorio", search: { q: "", cat: "", of: "" }, label: t("menu.directorio") },
  { to: "/servicios-publicos", label: t("menu.servicios") },
  { to: "/descubre", label: t("menu.descubre") },
  { label: t("menu.actualidad"), soon: true },
  { label: t("menu.clasificados"), soon: true },
  { to: "/sobre", label: t("menu.sobre") },

  {
    onClick: onSend,
    label: t("menu.enviar"),
    description: t("menu.enviarDesc"),
  },
];

export function SiteHeader({ hideBrand = false, overlay = false }: { hideBrand?: boolean; overlay?: boolean } = {}) {
  const { t } = useI18n();
  const [sendOpen, setSendOpen] = useState(false);
  const brand = null;
  const left = overlay ? (
    <span className="[&_button]:!text-primary-foreground [&_svg]:!text-primary-foreground">
      <WeatherNow />
    </span>
  ) : (
    <WeatherNow />
  );
  return (
    <>
    {overlay && <SiteBanner />}
    <div className={overlay ? "relative" : undefined}>
    <AppHeader
      navLabel={t("menu.label")}
      footnote={<SiteFooter inMenu />}
      left={left}
      overlay={overlay}
      brand={brand}
      items={menuItems(t, () => setSendOpen(true))}
    />
    </div>
    {!overlay && <SiteBanner />}
    <BusinessSignupDialog business={false} open={sendOpen} onOpenChange={setSendOpen} />
    </>
  );
}
