import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { parseDraftState, draftActions } from "@/lib/content-workflow";
import { DraftWorkflow } from "./DraftWorkflow";
import type { ContentDraft } from "./useContentDraft";

afterEach(cleanup);

function fakeDraft(
  status: "borrador" | "presentado" | "conforme" | null,
  extra: Partial<ContentDraft<unknown>> = {},
) {
  const state = parseDraftState(
    status
      ? {
          exists: true,
          published: {},
          content: {},
          status,
          updated_at: "V1",
          created_at: "V1",
          submitted_at: status === "borrador" ? null : "2026-11-27T10:00:00Z",
          stale: false,
          conformity: null,
        }
      : { exists: false, published: {} },
  );
  const draft = {
    key: "menu",
    isLoading: false,
    error: null,
    state,
    draft: state.draft,
    value: {},
    setValue: vi.fn(),
    published: {},
    dirty: false,
    changedFromPublished: true,
    busy: false,
    actions: draftActions(state, false),
    save: vi.fn(async () => true),
    submit: vi.fn(async () => true),
    recordConformity: vi.fn(async () => true),
    returnToDraft: vi.fn(async () => true),
    publish: vi.fn(async () => true),
    discard: vi.fn(async () => true),
    reload: vi.fn(),
    ...extra,
  };
  return draft as unknown as ContentDraft<unknown>;
}

describe("barra del circuito de publicación", () => {
  it("registra la conformidad solo con quién, fecha y medio válidos", async () => {
    const draft = fakeDraft("presentado");
    render(<DraftWorkflow draft={draft} />);
    fireEvent.click(screen.getByRole("button", { name: "Registrar conformidad" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Registrar conformidad" }));
    expect(await within(dialog).findByText(/Indica quién dio la conformidad/)).toBeInTheDocument();
    expect(within(dialog).getByText("Elige el medio por el que se recibió.")).toBeInTheDocument();
    expect(draft.recordConformity).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText("Quién dio la conformidad"), {
      target: { value: "Alcaldía" },
    });
    fireEvent.change(within(dialog).getByLabelText("Medio"), { target: { value: "correo" } });
    fireEvent.change(within(dialog).getByLabelText("Referencia (opcional)"), {
      target: { value: "Correo del 28" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Registrar conformidad" }));
    await waitFor(() =>
      expect(draft.recordConformity).toHaveBeenCalledWith(
        expect.objectContaining({ by: "Alcaldía", channel: "correo", reference: "Correo del 28" }),
      ),
    );
  });

  it("con una imagen elegida sin subir, solo deja guardar o deshacer", () => {
    render(<DraftWorkflow draft={fakeDraft("conforme")} pending />);
    expect(screen.getByRole("button", { name: "Guardar borrador" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Revisar y publicar" })).not.toBeInTheDocument();
    expect(screen.getByText("Cambios sin guardar")).toBeInTheDocument();
  });

  it("prepara (sube imágenes) antes de guardar y guarda lo preparado", async () => {
    const draft = fakeDraft("borrador", {
      dirty: true,
      actions: { ...draftActions(fakeDraft("borrador").state!, true) },
    });
    const prepare = vi.fn(async () => ({ ready: true }));
    render(<DraftWorkflow draft={draft} prepare={prepare} />);
    fireEvent.click(screen.getByRole("button", { name: "Guardar borrador" }));
    await waitFor(() => expect(draft.save).toHaveBeenCalledWith({ ready: true }));
  });

  it("no guarda si la preparación falla", async () => {
    const draft = fakeDraft("borrador", {
      dirty: true,
      actions: { ...draftActions(fakeDraft("borrador").state!, true) },
    });
    render(<DraftWorkflow draft={draft} prepare={async () => null} />);
    fireEvent.click(screen.getByRole("button", { name: "Guardar borrador" }));
    await waitFor(() => expect(draft.save).not.toHaveBeenCalled());
  });

  it("avisa de un borrador desfasado y no ofrece publicarlo", () => {
    const state = parseDraftState({
      exists: true,
      published: {},
      content: {},
      status: "conforme",
      updated_at: "V1",
      created_at: "V1",
      submitted_at: "V1",
      stale: true,
      conformity: {
        by: "Alcaldía",
        on: "2026-11-28",
        channel: "correo",
        reference: null,
        recorded_at: "V1",
      },
    });
    render(
      <DraftWorkflow
        draft={fakeDraft("conforme", {
          state,
          draft: state.draft,
          actions: draftActions(state, false),
        })}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/Lo publicado cambió/);
    expect(screen.queryByRole("button", { name: "Revisar y publicar" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Descartar borrador" })).toBeInTheDocument();
  });
});
