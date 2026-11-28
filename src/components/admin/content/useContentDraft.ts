import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";
import {
  discardDraft,
  draftActions,
  loadDraftState,
  publishDraft,
  recordConformity,
  refreshSessionSiteConfig,
  returnDraft,
  saveDraft,
  submitDraft,
  WorkflowError,
  type ConformityInput,
  type DraftKey,
  type DraftState,
} from "@/lib/content-workflow";

/** Cómo pasa una pantalla de su formulario al contenido del borrador y al revés. */
export interface DraftCodec<T> {
  /** Lee lo publicado o el contenido de un borrador. Nunca lanza: lo que falta, vacío. */
  read: (raw: unknown) => T;
  /** Contenido del borrador tal como lo valida la base (claves exactas). */
  write: (value: T) => Json;
}

export const draftQueryKey = (key: DraftKey) => ["admin", "draft", key] as const;
/** Listados que dependen de los borradores (Inicio y actividad reciente). */
export const DRAFT_LISTS = [
  ["admin", "drafts"],
  ["admin", "activity"],
] as const;

export type ContentDraft<T> = ReturnType<typeof useContentDraft<T>>;

/**
 * Estado y acciones del borrador de una pantalla. El formulario empieza en el borrador si existe y
 * en lo publicado si no; una recarga en segundo plano nunca borra lo que aún no se ha guardado.
 */
export function useContentDraft<T>(key: DraftKey, codec: DraftCodec<T>) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: draftQueryKey(key),
    queryFn: () => loadDraftState(key),
    retry: false,
  });
  const codecRef = useRef(codec);
  codecRef.current = codec;
  const serialize = (v: T | null) => (v === null ? "" : JSON.stringify(codecRef.current.write(v)));

  const state: DraftState | undefined = query.data;
  const serverValue = useMemo<T | null>(
    () =>
      state ? codecRef.current.read(state.draft ? state.draft.content : state.published) : null,
    [state],
  );
  const publishedValue = useMemo<T | null>(
    () => (state ? codecRef.current.read(state.published) : null),
    [state],
  );

  const [value, setValue] = useState<T | null>(null);
  const [busy, setBusy] = useState(false);
  const previousServer = useRef<string | null>(null);

  // Sigue a la versión del servidor solo si el formulario no tiene cambios sin guardar.
  useEffect(() => {
    if (serverValue === null) return;
    const next = serialize(serverValue);
    setValue((current) =>
      current === null || serialize(current) === previousServer.current ? serverValue : current,
    );
    previousServer.current = next;
    // serialize depende solo del codec, que no cambia el resultado entre renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverValue]);

  const dirty =
    value !== null && serverValue !== null && serialize(value) !== serialize(serverValue);
  const changedFromPublished =
    value !== null && publishedValue !== null && serialize(value) !== serialize(publishedValue);
  const actions = state
    ? draftActions(state, dirty)
    : {
        save: false,
        submit: false,
        recordConformity: false,
        returnToDraft: false,
        publish: false,
        discard: false,
      };

  async function refresh() {
    await qc.invalidateQueries({ queryKey: draftQueryKey(key) });
    for (const list of DRAFT_LISTS) void qc.invalidateQueries({ queryKey: list });
  }

  async function run(action: () => Promise<unknown>, success: string): Promise<boolean> {
    if (busy) return false;
    setBusy(true);
    try {
      await action();
      await refresh();
      toast.success(success);
      return true;
    } catch (error) {
      toast.error(
        error instanceof WorkflowError
          ? error.message
          : "No se pudo completar. Comprueba tu conexión y vuelve a intentarlo.",
      );
      // Si otra sesión cambió el borrador, se muestra su estado sin perder lo que se está editando.
      if (error instanceof WorkflowError && error.kind !== "network") await refresh();
      return false;
    } finally {
      setBusy(false);
    }
  }

  const draft = state?.draft ?? null;
  const requireDraft = () => {
    if (!draft) throw new WorkflowError("invalid_state", "Primero guarda el borrador.");
    return draft;
  };

  return {
    key,
    isLoading: query.isLoading,
    error: query.error,
    state,
    draft,
    value,
    setValue: (next: T) => setValue(next),
    published: publishedValue,
    dirty,
    /** El borrador (o lo que se edita) es distinto de lo publicado. */
    changedFromPublished,
    busy,
    actions,
    /** Guarda el formulario, o el valor preparado (por ejemplo, con las imágenes ya subidas). */
    save: (prepared?: T) =>
      run(
        async () => {
          const toSave = prepared ?? value;
          if (toSave === null) return;
          await saveDraft(key, codecRef.current.write(toSave), draft?.updatedAt ?? null);
          if (prepared !== undefined) setValue(prepared);
        },
        draft?.status && draft.status !== "borrador"
          ? "Borrador guardado. Como cambió el contenido, hay que volver a presentarlo al Ayuntamiento."
          : "Borrador guardado. La web sigue mostrando lo publicado.",
      ),
    submit: () =>
      run(
        () => submitDraft(key, requireDraft().updatedAt),
        "Borrador presentado al Ayuntamiento. Cuando dé su conformidad, regístrala aquí.",
      ),
    recordConformity: (input: ConformityInput) =>
      run(
        () => recordConformity(key, requireDraft().updatedAt, input),
        "Conformidad registrada. Revisa la versión final y publícala.",
      ),
    returnToDraft: () =>
      run(
        () => returnDraft(key, requireDraft().updatedAt),
        "El borrador vuelve a estar en edición.",
      ),
    publish: (note: string) =>
      run(async () => {
        await publishDraft(key, requireDraft().updatedAt, true, note);
        await refreshSessionSiteConfig();
      }, "Publicado. La web pública lo mostrará en un minuto como máximo."),
    discard: async () => {
      if (!draft) {
        if (serverValue !== null) setValue(serverValue);
        return true;
      }
      const ok = await run(
        () => discardDraft(key, draft.updatedAt),
        "Borrador descartado. Se mantiene lo publicado.",
      );
      if (ok && publishedValue !== null) setValue(publishedValue);
      return ok;
    },
    reload: refresh,
  };
}
