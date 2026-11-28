import type { ReactNode } from "react";
import { Text } from "@/lib/i18n";
import { WorkflowError } from "@/lib/content-workflow";
import type { Change } from "@/lib/admin-changes";
import type { ContentDraft } from "./useContentDraft";

/** Carga y errores comunes de una pantalla con borrador; muestra su contenido cuando está lista. */
export function DraftScreen<T>({
  draft,
  children,
}: {
  draft: ContentDraft<T>;
  children: (value: T) => ReactNode;
}) {
  if (draft.isLoading)
    return (
      <p role="status" className="mt-4 text-sm text-muted-foreground">
        <Text text="Cargando…" />
      </p>
    );
  if (draft.error || draft.value === null)
    return (
      <p role="alert" className="mt-4 border bg-card p-4 text-sm">
        <Text
          text={
            draft.error instanceof WorkflowError
              ? draft.error.message
              : "No se pudo cargar esta pantalla. Comprueba la conexión y recarga."
          }
        />
      </p>
    );
  return <>{children(draft.value)}</>;
}

/** Lista de cambios respecto a lo publicado, para revisar antes de publicar. */
export function ChangeSummary({ changes }: { changes: Change[] }) {
  if (changes.length === 0)
    return (
      <p className="text-muted-foreground">
        <Text text="No hay diferencias con lo publicado." />
      </p>
    );
  return (
    <div>
      <p className="font-medium">
        <Text text="Cambios respecto a lo publicado" />
      </p>
      <ul className="mt-2 grid gap-2">
        {changes.map((change) => (
          <li key={change.label} className="grid gap-0.5">
            <span className="text-xs font-medium text-muted-foreground">
              <Text text={change.label} />
            </span>
            <span className="break-words">
              <del className="text-muted-foreground">{change.before || "—"}</del>
              {" → "}
              <ins className="no-underline">{change.after || "—"}</ins>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
