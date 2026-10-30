import { Link } from "@tanstack/react-router";
import { SiteFooter } from "@/components/SiteFooter";
import { AppHeader, type HeaderItem } from "@/components/AppHeader";
import logo from "@/assets/logo-2.webp";

const MENU_ITEMS: HeaderItem[] = [
  { to: "/", search: { q: "", cat: "", of: "" }, label: "Directorio" },
  { label: "Servicios públicos", soon: true },
  { label: "Descubre Bonela", soon: true },
  { label: "Actualidad", soon: true },
  { label: "Clasificados", soon: true },
  { to: "/sobre", label: "Sobre Aquí Bonela" },

  {
    to: "/sugerir",
    label: "Enviar información",
    description: "Ayúdanos a mantener Casarabonela conectado y actualizado.",
  },
];

export function SiteHeader() {
  return (
    <AppHeader
      navLabel="Menú principal"
      footnote={<SiteFooter inMenu />}
      brand={
        <Link to="/" search={{ q: "", cat: "", of: "" }} className="inline-flex items-center" aria-label="Aquí Bonela, inicio">
          <img src={logo} alt="Aquí Bonela" className="h-10 w-auto sm:h-11" />
        </Link>
      }
      items={MENU_ITEMS}
    />
  );
}
