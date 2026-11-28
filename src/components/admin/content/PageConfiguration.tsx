import { PageHeaderEditor } from "@/components/admin/PageHeaderEditor";
import { SectionsEditor } from "@/components/admin/content/StructureEditors";
import type { ConfigurablePage } from "@/lib/site-structure";
import { Text } from "@/lib/i18n";

/**
 * Pestaña «Configuración» de una página principal: cómo se organiza (secciones) y cómo se
 * presenta (cabecera). La edición de sus contenidos va en sus propias pestañas.
 */
export function PageConfiguration({
  page,
  title,
  intro,
  pendingContent,
}: {
  page: ConfigurablePage;
  title: string;
  intro: string;
  /** Contenidos que aún no se gestionan desde el panel (se dice claramente, sin pantallas vacías). */
  pendingContent?: string;
}) {
  return (
    <>
      <h1 className="font-display text-2xl font-bold">
        <Text text={title} />
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        <Text text={intro} />
      </p>
      {pendingContent && (
        <p role="note" className="mt-3 max-w-2xl border-l-4 border-terracotta bg-muted p-3 text-sm">
          <Text text={pendingContent} />
        </p>
      )}
      <div className="mt-6 grid gap-6">
        <SectionsEditor page={page} />
        <PageHeaderEditor page={page} />
      </div>
    </>
  );
}
