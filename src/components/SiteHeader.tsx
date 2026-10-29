import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex min-h-14 max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <Link to="/" search={{ q: "", cat: "", of: "" }} className="font-display text-xl font-bold tracking-tight">
          Aquí <span className="text-terracotta">Bonela</span>
        </Link>
        <nav aria-label="Menú principal" className="flex flex-wrap gap-4 text-sm font-medium sm:gap-5">
          <Link to="/" search={{ q: "", cat: "", of: "" }} className="hover:text-terracotta">Directorio</Link>
          <Link to="/sugerir" className="hover:text-terracotta">Sugerir</Link>
          <Link to="/admin" className="hover:text-terracotta">Administración</Link>
        </nav>
      </div>
    </header>
  );
}
