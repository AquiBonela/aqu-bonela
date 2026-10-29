import { Link } from "@tanstack/react-router";
import { AppHeader, type HeaderItem } from "@/components/AppHeader";

const MENU_ITEMS: HeaderItem[] = [
  { to: "/", search: { q: "", cat: "", of: "" }, label: "Directorio" },
  { to: "/sugerir", label: "Sugerir" },
  { to: "/admin", label: "Administración" },
];

export function SiteHeader() {
  return (
    <AppHeader
      navLabel="Menú principal"
      footnote="Comercios y profesionales de Casarabonela"
      brand={
        <Link to="/" search={{ q: "", cat: "", of: "" }} className="font-display text-xl font-bold tracking-tight">
          Aquí <span className="text-terracotta">Bonela</span>
        </Link>
      }
      items={MENU_ITEMS}
    />
  );
}
