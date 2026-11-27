import type { ReactNode } from "react";
import { Construction } from "lucide-react";
import { Text } from "@/lib/i18n";

type AdminPendingModuleProps = {
  title: string;
  intro: string;
  /** Qué permitirá gestionar el módulo cuando esté disponible. Solo texto, sin controles. */
  planned: string[];
  /** Herramientas que ya existen y pertenecen a esta área. */
  children?: ReactNode;
};

/** Presentación de un área del panel cuyo módulo aún no está desarrollado. */
export function AdminPendingModule({ title, intro, planned, children }: AdminPendingModuleProps) {
  return (
    <>
      <h1 className="font-display text-2xl font-bold">
        <Text text={title} />
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        <Text text={intro} />
      </p>
      <section className="mt-6 border bg-card p-5" aria-labelledby="modulo-pendiente">
        <div className="flex items-start gap-3">
          <Construction className="mt-0.5 h-5 w-5 shrink-0 text-terracotta" aria-hidden />
          <div className="min-w-0">
            <h2 id="modulo-pendiente" className="font-display text-lg font-bold">
              <Text text="Módulo pendiente de desarrollo" />
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              <Text text="Esta área todavía no tiene funciones propias. Cuando esté disponible permitirá:" />
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              {planned.map((item) => (
                <li key={item}>
                  <Text text={item} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      {children}
    </>
  );
}
