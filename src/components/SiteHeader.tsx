import { SiteFooter } from "@/components/SiteFooter";
import { AppHeader, type HeaderItem } from "@/components/AppHeader";
import { WeatherNow } from "@/components/WeatherNow";
import { useI18n } from "@/lib/i18n";
import { useState } from "react";
import { SiteBanner } from "@/components/SiteBanner";
import { BusinessSignupDialog } from "@/components/BusinessSignupDialog";
import { getMunicipality } from "@/config/municipality";
import { menuEntries } from "@/lib/site-availability";
import type { MenuEntryKey } from "@/lib/site-structure";

type Translate = ReturnType<typeof useI18n>["t"];
type TranslateText = ReturnType<typeof useI18n>["tr"];

/** Enlace de cada entrada configurable. Actualidad aún no tiene página: no está disponible. */
function entryItem(key: MenuEntryKey, t: Translate, tr: TranslateText): HeaderItem | null {
  if (key === "servicios-publicos")
    return { to: "/servicios-publicos", label: t("menu.servicios") };
  if (key === "guia-tramites") return { to: "/tramites", label: tr("Guía de trámites") };
  if (key === "descubre") return { to: "/descubre", label: t("menu.descubre") };
  return null;
}

/**
 * Menú público: Portada y Directorio siempre primero; después, las entradas que la instalación
 * tiene activas y disponibles, en su orden; «Sobre» y «Sugerir o corregir» en su sitio de siempre.
 */
const menuItems = (t: Translate, tr: TranslateText, onSend: () => void): HeaderItem[] => [
  { to: "/", label: getMunicipality().appName, activeOptions: { exact: true } },
  { to: "/directorio", search: { q: "", cat: "", of: "" }, label: t("menu.directorio") },
  ...menuEntries()
    .map((key) => entryItem(key, t, tr))
    .filter((item): item is HeaderItem => item !== null),
  { to: "/sobre", label: t("menu.sobre") },

  {
    onClick: onSend,
    label: t("menu.enviar"),
    description: t("menu.enviarDesc"),
  },
];

export function SiteHeader({
  hideBrand = false,
  overlay = false,
}: { hideBrand?: boolean; overlay?: boolean } = {}) {
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
