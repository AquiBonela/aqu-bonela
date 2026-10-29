import { Link } from "@tanstack/react-router";
import { Sprout } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { whatsappUrl } from "@/lib/directory";

export function SiteFooter({ inMenu = false }: { inMenu?: boolean }) {
  const { data } = useQuery({
    queryKey: ["footer-contact"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("contact_email,admin_whatsapp").eq("id", true).maybeSingle();
      return data;
    },
    staleTime: 5 * 60_000,
  });
  const email = data?.contact_email?.trim();
  const wa = data?.admin_whatsapp?.trim();

  return (
    <footer className={inMenu ? "text-sm text-primary-foreground/85 [&_*]:!text-primary-foreground" : "mt-8 border-t bg-secondary/40 px-4 py-8 text-sm text-muted-foreground"}>
      <div className={inMenu ? "" : "mx-auto max-w-2xl"}>
        <p className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-foreground">
          <Sprout className="h-5 w-5 text-primary" aria-hidden /> Aquí Bonela · Directorio local colaborativo
        </p>
        <p className="mt-2 font-semibold">Casarabonela {new Date().getFullYear()}</p>
        <p className="mt-3 text-base leading-relaxed text-foreground">
          Directorio local abierto para el fomento económico, comercial y profesional de Casarabonela.
        </p>
        {(email || wa) && (
          <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
            <span className="font-semibold">Contacto:</span>
            {email && <a href={`mailto:${email}`} className="underline-offset-4 hover:underline">{email}</a>}
            {wa && (
              <a href={whatsappUrl(wa, "Aquí Bonela")} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                WhatsApp {wa}
              </a>
            )}
          </p>
        )}
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
