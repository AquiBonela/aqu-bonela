import { Link } from "@tanstack/react-router";
import logoTexto from "@/assets/logo-texto.webp";

export function SiteFooter({ inMenu = false }: { inMenu?: boolean }) {


  return (
    <footer className={inMenu ? "text-center text-sm text-primary-foreground/85 [&_*]:!text-primary-foreground" : "mt-8 border-t bg-secondary/40 px-4 py-8 text-center text-sm text-muted-foreground"}>
      <div className="mx-auto max-w-2xl [&_nav]:justify-center [&_p]:justify-center">
        <div className="flex flex-col items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-foreground sm:flex-row sm:justify-center sm:gap-3">
          <img
            src={logoTexto}
            alt="Aquí Bonela"
            className={`h-6 w-auto ${inMenu ? "brightness-0 invert" : ""}`}
          />
          <span aria-hidden className="hidden sm:inline">·</span>
          <span>Directorio local colaborativo</span>
        </div>
        <p className="mt-2 font-semibold">Casarabonela {new Date().getFullYear()}</p>
        <p className="mt-3 text-base leading-relaxed text-foreground">
          Una plataforma digital independiente para descubrir, conocer y compartir todo lo que ocurre en Casarabonela.
        </p>
        <nav aria-label="Información legal" className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-semibold">
          <Link to="/aviso-legal" className="underline-offset-4 hover:underline">Aviso legal</Link>
          <span aria-hidden>·</span>
          <Link to="/privacidad" className="underline-offset-4 hover:underline">Política de privacidad</Link>
          <span aria-hidden>·</span>
          <Link to="/cookies" className="underline-offset-4 hover:underline">Cookies</Link>
        </nav>
      </div>
    </footer>
  );
}
