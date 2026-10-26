import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link to="/" search={{ q: "", cat: "", of: "" }} className="font-display text-xl font-bold tracking-tight">
          Aquí <span className="text-terracotta">Bonela</span>
        </Link>
        <nav className="flex gap-5 text-sm font-medium">
          <Link to="/" search={{ q: "", cat: "", of: "" }} className="hover:text-terracotta">Directorio</Link>
          <Link to="/sugerir" className="hover:text-terracotta">Sugerir</Link>
        </nav>
      </div>
    </header>
  );
}
