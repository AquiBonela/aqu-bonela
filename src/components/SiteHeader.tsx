import { SiteFooter } from "@/components/SiteFooter";
import { AppHeader, type HeaderItem } from "@/components/AppHeader";
import { WeatherNow } from "@/components/WeatherNow";
import { useI18n } from "@/lib/i18n";
import { useState } from "react";
import { SiteBanner } from "@/components/SiteBanner";
import { BusinessSignupDialog } from "@/components/BusinessSignupDialog";
import { getInstanceContent, getMunicipality } from "@/config/municipality";

const menuItems = (t: ReturnType<typeof useI18n>["t"], tr: ReturnType<typeof useI18n>["tr"], onSend: () => void): HeaderItem[] => [
  { to: "/", label: getMunicipality().appName, activeOptions: { exact: true } },
  { to: "/directorio", search: { q: "", cat: "", of: "" }, label: t("menu.directorio") },
  ...(getInstanceContent().discover ? [{ to: "/descubre" as const, label: t("menu.descubre") }] : []),
  { label: t("menu.actualidad"), soon: true },
  { label: t("menu.clasificados"), soon: true },
  { to: "/servicios-publicos", label: t("menu.servicios") },
  { to: "/tramites", label: tr("Guía de trámites") },
  { to: "/sobre", label: t("menu.sobre") },

  {
    onClick: onSend,
    label: t("menu.enviar"),
    description: t("menu.enviarDesc"),
  },
];

export function SiteHeader({ hideBrand = false, overlay = false }: { hideBrand?: boolean; overlay?: boolean } = {}) {
  const { t, tr } = useI18n();
  const [sendOpen, setSendOpen] = useState(false);
  const brand = null;
  const left = <WeatherNow />;
  return (
    <>
    {overlay && <SiteBanner />}
    <div className={overlay ? "relative" : "contents"}>
    <AppHeader
      navLabel={t("menu.label")}
      footnote={<SiteFooter inMenu />}
      left={left}
      overlay={overlay}
      brand={brand}
      items={menuItems(t, tr, () => setSendOpen(true))}
    />
    </div>
    {!overlay && <SiteBanner />}
    <BusinessSignupDialog business={false} open={sendOpen} onOpenChange={setSendOpen} />
    </>
  );
}
