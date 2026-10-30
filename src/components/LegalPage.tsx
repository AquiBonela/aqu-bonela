import type { ReactNode } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";

const PLACEHOLDER = {
  name: "Daniel Alberto Flagel",
  nif: "Z0717100B",
  address: "Av. Fernando Diaz Herrero 12, Bloque 2 Piso 1A",
  email: "daflagel@gmail.com",
};

const ownerQuery = queryOptions({
  queryKey: ["legal-owner"],
  queryFn: async () => {
    const { data } = await supabase.from("site_settings").select("legal_name,legal_nif,legal_address,legal_email").maybeSingle();
    return data;
  },
});

/** Datos del titular configurados en el panel; huecos entre corchetes si faltan. */
export function useOwner() {
  const { data } = useQuery(ownerQuery);
  return {
    name: data?.legal_name?.trim() || PLACEHOLDER.name,
    nif: data?.legal_nif?.trim() || PLACEHOLDER.nif,
    address: data?.legal_address?.trim() || PLACEHOLDER.address,
    email: data?.legal_email?.trim() || PLACEHOLDER.email,
  };
}

export const UPDATED = "30 de octubre de 2026";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-3xl font-extrabold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última actualización: {UPDATED}</p>
        <div className="mt-8 space-y-6 text-base leading-relaxed [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-8 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1">
          {children}
        </div>
      </main>
    </div>
  );
}

export function legalHead(title: string, description: string) {
  return {
    meta: [
      { title: `${title} — Aquí Bonela` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} — Aquí Bonela` },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  };
}
