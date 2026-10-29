import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";

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
  footnote?: string;
};

const SMALL_CLASS = "hover:text-terracotta";
const BIG_CLASS = "block font-display text-3xl font-extrabold tracking-tight hover:text-terracotta";

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
        className={big ? BIG_CLASS : SMALL_CLASS}
      >
        {item.label}
      </Link>
    ) : (
      <button key={item.label} type="button" onClick={item.onClick} className={big ? BIG_CLASS : SMALL_CLASS}>
        {item.label}
      </button>
    );

  return (
    <>
      <header className="border-b bg-background">
        <div className="mx-auto flex min-h-14 max-w-5xl items-center justify-between gap-x-4 px-4 py-2">
          {brand}
          {/* Escritorio: menú siempre visible */}
          <nav aria-label={navLabel} className="hidden items-center gap-4 text-sm font-medium sm:flex sm:gap-5">
            {items.map((item) => renderItem(item, false))}
          </nav>
          {/* Móvil: menú a pantalla completa */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-label="Abrir menú"
            className="inline-flex min-h-11 min-w-11 items-center justify-center sm:hidden hover:text-terracotta"
          >
            <Menu className="h-6 w-6" aria-hidden />
          </button>
        </div>
      </header>
      {open && (
        <div id="menu-principal" className="animate-menu-full fixed inset-0 z-50 flex flex-col bg-primary text-primary-foreground sm:hidden">
          <div className="flex min-h-14 items-center justify-between px-4 py-2">
            {brand}
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
              className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-terracotta"
            >
              <X className="h-6 w-6" aria-hidden />
            </button>
          </div>
          <nav aria-label="Menú móvil" className="flex flex-1 flex-col justify-center px-6 pb-16">
            <ul className="flex flex-col gap-6">
              {items.map((item, i) => (
                <li key={item.label} className="animate-menu-item" style={{ animationDelay: `${0.06 * i}s` }}>
                  {renderItem(item, true)}
                </li>
              ))}
            </ul>
            {footnote && (
              <p className="mt-10 text-xs font-semibold uppercase tracking-wide opacity-80">{footnote}</p>
            )}
          </nav>
        </div>
      )}
    </>
  );
}
