import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";

const MENU_ITEMS = [
  { to: "/", search: { q: "", cat: "", of: "" }, label: "Directorio" },
  { to: "/sugerir", search: undefined, label: "Sugerir" },
  { to: "/admin", search: undefined, label: "Administración" },
] as const;

const linkClass = "hover:text-terracotta";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex min-h-14 max-w-5xl items-center justify-between gap-x-4 px-4 py-2">
        <Link to="/" search={{ q: "", cat: "", of: "" }} className="font-display text-xl font-bold tracking-tight">
          Aquí <span className="text-terracotta">Bonela</span>
        </Link>
        {/* Escritorio: menú siempre visible */}
        <nav aria-label="Menú principal" className="hidden items-center gap-4 text-sm font-medium sm:flex sm:gap-5">
          {MENU_ITEMS.map((item) => (
            <Link key={item.to} to={item.to} {...("search" in item && item.search ? { search: item.search } : {})} className={linkClass}>
              {item.label}
            </Link>
          ))}
        </nav>
        {/* Móvil: menú hamburguesa */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="menu-principal"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          className="inline-flex min-h-11 min-w-11 items-center justify-center sm:hidden hover:text-terracotta"
        >
          {open ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
        </button>
      </div>
      {open && (
        <nav id="menu-principal" aria-label="Menú móvil" className="animate-menu-drop border-t sm:hidden">
          <ul className="mx-auto flex max-w-5xl flex-col px-4 py-2 text-base font-medium">
            {MENU_ITEMS.map((item) => (
              <li key={item.to} className="border-b last:border-b-0">
                <Link
                  to={item.to}
                  {...("search" in item && item.search ? { search: item.search } : {})}
                  className="flex min-h-12 items-center py-3 hover:text-terracotta"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
