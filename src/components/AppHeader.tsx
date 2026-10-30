import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import logoMenu from "@/assets/logo-menu.png.asset.json";

export type HeaderRoute =
  | "/"
  | "/sugerir"
  | "/admin"
  | "/admin/avisos"
  | "/admin/sugerencias"
  | "/admin/configuracion";

export type HeaderItem = {
  label: string;
  to?: HeaderRoute;
  search?: { q: string; cat: string; of: string };
  activeOptions?: { exact?: boolean };
  onClick?: () => void | Promise<void>;
};

type AppHeaderProps = {
  brand: ReactNode;
  items: HeaderItem[];
  navLabel?: string;
  footnote?: ReactNode;
};

const SMALL_CLASS = "hover:text-beige";
const BIG_CLASS = "block font-display text-3xl font-extrabold tracking-tight hover:text-beige";

/**
 * Cabecera compartida: menú siempre visible en escritorio y,
 * en móvil, menú a pantalla completa sobre fondo verde principal.
 */
export function AppHeader({ brand, items, navLabel = "Menú principal", footnote }: AppHeaderProps) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => setOpen(false), [pathname]);

  // Evita desplazar la página de fondo mientras el menú cubre la pantalla
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const renderItem = (item: HeaderItem, big: boolean) =>
    item.to ? (
      <Link
        key={item.label}
        to={item.to}
        {...(item.search ? { search: item.search } : {})}
        {...(item.activeOptions ? { activeOptions: item.activeOptions } : {})}
        onClick={() => setOpen(false)}
        className={big ? BIG_CLASS : SMALL_CLASS}
      >
        {item.label}
      </Link>
    ) : (
      <button key={item.label} type="button" onClick={() => { setOpen(false); void item.onClick?.(); }} className={big ? BIG_CLASS : SMALL_CLASS}>
        {item.label}
      </button>
    );

  return (
    <>
      <header className="border-b bg-background">
        <div className="mx-auto flex min-h-14 max-w-5xl items-center justify-between gap-x-4 px-4 py-2">
          {brand}
          {/* Escritorio: menú siempre visible */}
          {/* Móvil: menú a pantalla completa */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-label="Abrir menú"
              className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-beige"
          >
            <Menu className="h-6 w-6" aria-hidden />
          </button>
        </div>
      </header>
      {open && (
        <div id="menu-principal" className="animate-menu-full fixed inset-0 z-50 flex flex-col bg-primary text-primary-foreground">
          <div className="mx-auto flex min-h-14 w-full max-w-5xl items-center justify-end px-4 py-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
              className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-beige"
            >
              <X className="h-6 w-6" aria-hidden />
            </button>
          </div>
          <nav aria-label="Menú móvil" className="mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-y-auto px-6 text-center">
            <div className="flex flex-1 flex-col items-center justify-center gap-10 pb-10">
              <img src={logoMenu.url} alt="Aquí Bonela" className="animate-menu-item h-auto w-40 sm:w-48" />
              <ul className="flex flex-col items-center gap-6">
                {items.map((item, i) => (
                  <li key={item.label} className="animate-menu-item" style={{ animationDelay: `${0.06 * (i + 1)}s` }}>
                    {renderItem(item, true)}
                  </li>
                ))}
              </ul>
            </div>
            {footnote && (
              <div className="mt-auto border-t border-primary-foreground/15 pb-6 pt-6">{footnote}</div>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
