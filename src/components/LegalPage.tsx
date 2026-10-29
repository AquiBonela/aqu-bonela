import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";

export const OWNER = {
  name: "[Nombre o razón social del titular]",
  nif: "[NIF/CIF]",
  address: "[Dirección postal], 29566 Casarabonela (Málaga)",
  email: "[email de contacto]",
};

export const UPDATED = "29 de octubre de 2026";

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
