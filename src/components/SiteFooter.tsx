import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { whatsappUrl } from "@/lib/directory";

export function SiteFooter() {
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
    <footer className="border-t px-4 py-6 text-center text-sm text-muted-foreground">
      <p>Aquí Bonela · Directorio local de Casarabonela</p>
      {(email || wa) && (
        <p className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
          <span>Contacto:</span>
          {email && <a href={`mailto:${email}`} className="underline-offset-4 hover:underline">{email}</a>}
          {wa && (
            <a href={whatsappUrl(wa, "Aquí Bonela")} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
              WhatsApp {wa}
            </a>
          )}
        </p>
      )}
      <nav aria-label="Información legal" className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
        <Link to="/aviso-legal" className="underline-offset-4 hover:underline">Aviso legal</Link>
        <Link to="/privacidad" className="underline-offset-4 hover:underline">Privacidad</Link>
        <Link to="/cookies" className="underline-offset-4 hover:underline">Cookies</Link>
      </nav>
    </footer>
  );
}
