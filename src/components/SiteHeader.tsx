import { Link } from "@tanstack/react-router";
import { SiteFooter } from "@/components/SiteFooter";
import { AppHeader, type HeaderItem } from "@/components/AppHeader";
import logo from "@/assets/logo-2.png.asset.json";

const MENU_ITEMS: HeaderItem[] = [
  { to: "/", search: { q: "", cat: "", of: "" }, label: "Directorio" },
  { to: "/sugerir", label: "Sugerir" },
  { to: "/admin", label: "Administración" },
];

export function SiteHeader() {
  return (
    <AppHeader
      navLabel="Menú principal"
      footnote={<SiteFooter inMenu />}
      brand={
        <Link to="/" search={{ q: "", cat: "", of: "" }} className="inline-flex items-center" aria-label="Aquí Bonela, inicio">
          <img src={logo.url} alt="Aquí Bonela" className="h-10 w-auto sm:h-11" />
        </Link>
      }
      items={MENU_ITEMS}
    />
  );
}
