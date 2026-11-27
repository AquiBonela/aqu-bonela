import { Text, useI18n } from "@/lib/i18n";
import { useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/SiteHeader";

export const UPDATED = "30 de octubre de 2026";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  const { tr, locale } = useI18n();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-3xl font-extrabold">{tr(title)}</h1>
        <p className="mt-2 text-sm text-muted-foreground"><Text text="Última actualización:" /> {tr(UPDATED)}</p>
        <div className="mt-8 space-y-6 text-base leading-relaxed [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-8 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1">
          {children}
        </div>
      </main>
    </div>
  );
}

export function LegalLoadError({ reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main role="alert" className="mx-auto max-w-2xl px-4 py-10 text-center">
        <h1 className="font-display text-xl font-bold"><Text text="Esta página no se ha cargado" /></h1>
        <p className="mt-2 text-sm text-muted-foreground"><Text text="Algo ha fallado. Puedes volver a intentarlo o regresar al inicio." /></p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              // En el renderizado del servidor el router no entrega reset.
              reset?.();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Text text="Intentar de nuevo" />
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Text text="Volver al inicio" />
          </a>
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
