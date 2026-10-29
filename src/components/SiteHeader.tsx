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

  // Evita desplazar la página de fondo mientras el menú cubre la pantalla
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
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
            <span className="font-display text-xl font-bold tracking-tight">
              Aquí <span className="text-terracotta">Bonela</span>
            </span>
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
              {MENU_ITEMS.map((item, i) => (
                <li key={item.to} className="animate-menu-item" style={{ animationDelay: `${0.06 * i}s` }}>
                  <Link
                    to={item.to}
                    {...("search" in item && item.search ? { search: item.search } : {})}
                    className="block font-display text-3xl font-extrabold tracking-tight hover:text-terracotta"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-10 text-xs font-semibold uppercase tracking-wide opacity-80">Comercios y profesionales de Casarabonela</p>
          </nav>
        </div>
      )}
    </>
  );
}
