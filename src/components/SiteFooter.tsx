import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t px-4 py-6 text-center text-sm text-muted-foreground">
      <p>Aquí Bonela · Directorio local de Casarabonela</p>
      <nav aria-label="Información legal" className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
        <Link to="/aviso-legal" className="underline-offset-4 hover:underline">Aviso legal</Link>
        <Link to="/privacidad" className="underline-offset-4 hover:underline">Privacidad</Link>
        <Link to="/cookies" className="underline-offset-4 hover:underline">Cookies</Link>
      </nav>
    </footer>
  );
}
