import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n";
import { ProcedureEditor } from "@/routes/_authenticated/admin/tramites.$id";
import type { ProcedureCategory, ProcedureRow } from "@/lib/admin-procedures";
import { catalogContent, languagesToGenerate } from "@/lib/content-translations";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  navigate: vi.fn(),
  generate: vi.fn(),
  uploadImage: vi.fn(),
}));
vi.mock("@/lib/procedure-images", () => ({
  uploadProcedureImage: mocks.uploadImage,
  procedureImageUrl: async () => "https://example.com/photo.webp",
}));
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => mocks.navigate,
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ insert: mocks.insert, update: mocks.update, delete: mocks.delete }) },
}));
vi.mock("@/components/admin/useContentTranslations", () => ({
  useContentTranslations: () => ({
    translating: false,
    translationError: "",
    generate: mocks.generate,
  }),
}));
const categories: ProcedureCategory[] = [
  {
    id: "category-1",
    slug: "documentacion",
    title: "Documentación personal",
    description: "",
    title_en: "",
    description_en: "",
    visible: true,
    sort_order: 0,
    created_at: "",
    updated_at: "",
  },
];
function mount(id = "nuevo", editorCategories = categories, row?: ProcedureRow) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mocks.insert.mockReturnValue({
    select: () => ({ single: async () => ({ data: { id: "saved-id" }, error: null }) }),
  });
  for (const mutation of [mocks.update, mocks.delete])
    mutation.mockReturnValue({
      eq: () => ({ select: () => ({ single: async () => ({ data: { id }, error: null }) }) }),
    });
  mocks.generate.mockImplementation(
    async (
      source: Record<string, unknown>,
      versions: import("@/lib/content-translations").Translations,
      update: (v: import("@/lib/content-translations").Translations) => void,
    ) => {
      const next = { ...versions };
      for (const lang of languagesToGenerate(versions, source))
        next[lang] = { content: catalogContent(source, lang), source, manual: false };
      update(next);
      return next;
    },
  );
  render(
    <QueryClientProvider client={qc}>
      <I18nProvider>
        <ProcedureEditor id={id} row={row} categories={editorCategories} />
      </I18nProvider>
    </QueryClientProvider>,
  );
}
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
async function chooseLanguage(name: string) {
  fireEvent.keyDown(screen.getByRole("button", { name: "Idioma del contenido" }), { key: "Enter" });
  fireEvent.click(await screen.findByRole("menuitemradio", { name }));
}
async function saveWithoutTranslation() {
  fireEvent.click(
    screen.getAllByRole("button", { name: "Guardar" })[0] ?? screen.getByText("missing"),
  );
  const skip = screen.queryByRole("button", { name: "Guardar sin actualizar traducciones" });
  if (skip) fireEvent.click(skip);
}

describe("procedure editor form", () => {
  it("waits for an image upload before saving and persists only its storage path", async () => {
    let finish: ((path: string) => void) | undefined;
    mocks.uploadImage.mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          finish = resolve;
        }),
    );
    mount();
    fireEvent.change(screen.getByLabelText("Título", { exact: true }), {
      target: { value: "Guía con imagen" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Añadir sección" }));
    fireEvent.keyDown(screen.getByRole("button", { name: "Añadir elemento" }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitem", { name: /^Imagen$/ }));
    fireEvent.change(screen.getByLabelText("Archivo de imagen"), {
      target: { files: [new File(["x"], "foto.png", { type: "image/png" })] },
    });
    fireEvent.click(
      screen.getAllByRole("button", { name: "Guardar" })[0] ?? screen.getByText("missing"),
    );
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
    finish?.("element/photo.webp");
    await screen.findByRole("button", { name: "Reemplazar imagen" });
    await saveWithoutTranslation();
    await waitFor(() => expect(mocks.insert).toHaveBeenCalled());
    expect(mocks.insert.mock.calls[0]?.[0].content.sections[0].elements[0]).toMatchObject({
      kind: "image",
      storagePath: "element/photo.webp",
    });
  });
  const saved: ProcedureRow = {
    id: "saved",
    category_id: "category-1",
    slug: "certificado-digital",
    title: "Certificado",
    summary: "",
    status: "publicada",
    source_key: "documentacion/certificado-digital",
    sort_order: 0,
    content: {},
    content_en: {},
    translations: {},
    visibility: {},
    created_at: "",
    updated_at: "",
  };
  it("marks a saved legacy guide as deleted instead of restoring its template", async () => {
    mount(saved.id, categories, saved);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar trámite" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /^Eliminar$/ }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/admin/tramites" }));
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        source_key: "documentacion/certificado-digital",
        visibility: { deleted: true },
      }),
    );
    expect(mocks.delete).not.toHaveBeenCalled();
  });
  it("deletes an independently created guide normally", async () => {
    mount(saved.id, categories, { ...saved, source_key: null, slug: "guia-nueva" });
    fireEvent.click(screen.getByRole("button", { name: "Eliminar trámite" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /^Eliminar$/ }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/admin/tramites" }));
    expect(mocks.delete).toHaveBeenCalledTimes(1);
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("deletes the unsaved European health card template only after confirmation", async () => {
    const health = { ...categories[0], id: "health", slug: "salud" } as ProcedureCategory;
    const qc = new QueryClient();
    mocks.insert.mockReturnValue({
      select: () => ({ single: async () => ({ data: { id: "deleted-marker" }, error: null }) }),
    });
    render(
      <QueryClientProvider client={qc}>
        <I18nProvider>
          <ProcedureEditor id="tarjeta-europea" row={undefined} categories={[health]} />
        </I18nProvider>
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Eliminar trámite" }));
    expect(mocks.insert).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /^Eliminar$/ }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: "/admin/tramites" }));
    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        category_id: "health",
        slug: "tarjeta-europea",
        source_key: "salud/tarjeta-europea",
        visibility: { deleted: true },
        content: {},
        translations: {},
      }),
    );
  });
  it("keeps the template available when deletion fails", async () => {
    const health = { ...categories[0], id: "health", slug: "salud" } as ProcedureCategory;
    mount("tarjeta-europea", [health]);
    mocks.insert.mockReturnValue({
      select: () => ({ single: async () => ({ data: null, error: new Error("Denied") }) }),
    });
    fireEvent.click(screen.getByRole("button", { name: "Eliminar trámite" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /^Eliminar$/ }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("No se pudo eliminar el trámite."),
    );
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
  it("asks before translating changed Spanish and does not write until a choice is made", async () => {
    mount("certificado-digital");
    fireEvent.change(screen.getByLabelText("Subtítulo"), {
      target: { value: "Nuevo requisito municipal" },
    });
    fireEvent.click(
      screen.getAllByRole("button", { name: "Guardar" })[0] ?? screen.getByText("missing"),
    );
    expect(mocks.generate).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Actualizar traducciones y guardar" }));
    await waitFor(() => expect(mocks.insert).toHaveBeenCalled());
    expect(mocks.generate).toHaveBeenCalledTimes(1);
    expect(mocks.insert.mock.calls[0]?.[0].translations.uk.source.summary).toBe(
      "Nuevo requisito municipal",
    );
  });
  it("cancels the confirmation without saving or translating", () => {
    mount("certificado-digital");
    fireEvent.change(screen.getByLabelText("Subtítulo"), { target: { value: "Cambio pendiente" } });
    fireEvent.click(
      screen.getAllByRole("button", { name: "Guardar" })[0] ?? screen.getByText("missing"),
    );
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancelar" }));
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("does not save after a failed translation and permits a subsequent save without translating", async () => {
    mount("certificado-digital");
    mocks.generate.mockResolvedValue(null);
    fireEvent.change(screen.getByLabelText("Subtítulo"), { target: { value: "Cambio pendiente" } });
    fireEvent.click(
      screen.getAllByRole("button", { name: "Guardar" })[0] ?? screen.getByText("missing"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Actualizar traducciones y guardar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(mocks.insert).not.toHaveBeenCalled();
    await saveWithoutTranslation();
    await waitFor(() => expect(mocks.insert).toHaveBeenCalled());
  });
  it("saves a new procedure as a draft with the selected category", async () => {
    mount();
    fireEvent.change(screen.getByLabelText("Título", { exact: true }), {
      target: { value: "Solicitud de ejemplo" },
    });
    fireEvent.change(screen.getByLabelText("Subtítulo"), {
      target: { value: "Resumen de prueba" },
    });
    fireEvent.change(screen.getByLabelText("Descripción corta"), {
      target: { value: "Descripción para la tarjeta" },
    });
    await saveWithoutTranslation();
    await waitFor(() => expect(mocks.insert).toHaveBeenCalled());
    expect(mocks.insert.mock.calls[0]?.[0]).toMatchObject({
      title: "Solicitud de ejemplo",
      slug: "solicitud-de-ejemplo",
      status: "borrador",
      category_id: "category-1",
      summary: "Resumen de prueba",
    });
    expect(mocks.insert.mock.calls[0]?.[0].content).toMatchObject({
      summary: "Resumen de prueba",
      cardDescription: "Descripción para la tarjeta",
    });
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("saves all eight element kinds and optional notes in the chosen order", async () => {
    mount();
    fireEvent.change(screen.getByLabelText("Título", { exact: true }), {
      target: { value: "Solicitud modular" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Añadir sección" }));
    fireEvent.change(screen.getByLabelText("Título de la sección 1"), {
      target: { value: "Información de la solicitud" },
    });
    for (const name of [
      "Cuadro de texto",
      "Listado",
      "Pasos",
      "Lugares",
      "Valor",
      "Fuentes / enlaces",
      "Aviso destacado",
      "Plazos y vigencia",
    ]) {
      fireEvent.keyDown(screen.getByRole("button", { name: "Añadir elemento" }), { key: "Enter" });
      fireEvent.click(await screen.findByRole("menuitem", { name }));
    }
    fireEvent.change(screen.getByLabelText("Sección 1 · Elemento 1 · Texto"), {
      target: { value: "Primera línea\nSegunda línea" },
    });
    fireEvent.change(screen.getByLabelText("Sección 1 · Elemento 5 · Importe"), {
      target: { value: "12,50" },
    });
    fireEvent.change(screen.getByLabelText("Sección 1 · Elemento 8 · Tiempo de resolución"), {
      target: { value: "15 días hábiles" },
    });
    fireEvent.change(screen.getByLabelText("Sección 1 · Elemento 8 · Vigencia / validez"), {
      target: { value: "2 años" },
    });
    fireEvent.change(screen.getByLabelText("Notas finales (opcional)"), {
      target: { value: "Lleva los originales." },
    });
    await saveWithoutTranslation();
    await waitFor(() => expect(mocks.insert).toHaveBeenCalled());
    const stored = mocks.insert.mock.calls[0]?.[0].content;
    expect(stored.sections[0].elements.map((e: { kind: string }) => e.kind)).toEqual([
      "text",
      "list",
      "steps",
      "places",
      "value",
      "sources",
      "notice",
      "timing",
    ]);
    expect(stored.sections[0].elements[0].text).toBe("Primera línea\nSegunda línea");
    expect(stored.sections[0].elements[4].amount).toBe("12,50");
    expect(stored.sections[0].elements[7]).toMatchObject({
      resolution: "15 días hábiles",
      validity: "2 años",
    });
    expect(stored.notes).toBe("Lleva los originales.");
  });
  it("reorders sections and removes one only after confirmation", async () => {
    mount();
    fireEvent.change(screen.getByLabelText("Título", { exact: true }), {
      target: { value: "Orden de solicitud" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Añadir sección" }));
    fireEvent.change(screen.getByLabelText("Título de la sección 1"), {
      target: { value: "Requisitos" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Añadir sección" }));
    fireEvent.change(screen.getByLabelText("Título de la sección 2"), {
      target: { value: "Solicitud" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Subir sección 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar sección 2" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancelar" }));
    await saveWithoutTranslation();
    await waitFor(() => expect(mocks.insert).toHaveBeenCalled());
    expect(
      mocks.insert.mock.calls[0]?.[0].content.sections.map((s: { title: string }) => s.title),
    ).toEqual(["Solicitud", "Requisitos"]);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar sección 2" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Eliminar" }));
    await saveWithoutTranslation();
    await waitFor(() => expect(mocks.insert).toHaveBeenCalledTimes(2));
    expect(
      mocks.insert.mock.calls[1]?.[0].content.sections.map((s: { title: string }) => s.title),
    ).toEqual(["Solicitud"]);
  });
  it("preserves an existing guide when a section is switched off and saved", async () => {
    mount("certificado-digital");
    fireEvent.click(screen.getByRole("switch", { name: "Mostrar sección 4" }));
    await saveWithoutTranslation();
    await waitFor(() => expect(mocks.insert).toHaveBeenCalled());
    const saved = mocks.insert.mock.calls[0]?.[0];
    expect(
      saved.content.sections.find((s: { id: string }) => s.id === "legacy-pasos").visible,
    ).toBe(false);
    expect(saved.content.guia.pasos.length).toBeGreaterThan(0);
    expect(saved.source_key).toBe("documentacion/certificado-digital");
  });
  it("lets an administrator add a structured step and reads it back in preview", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Añadir sección" }));
    fireEvent.change(screen.getByLabelText("Título de la sección 1"), {
      target: { value: "Solicitud" },
    });
    fireEvent.keyDown(screen.getByRole("button", { name: "Añadir elemento" }), { key: "Enter" });
    fireEvent.click(screen.getByRole("menuitem", { name: /^Pasos$/ }));
    fireEvent.click(screen.getByRole("button", { name: "Añadir pasos" }));
    fireEvent.change(screen.getByLabelText("Sección 1 · Elemento 1 · Pasos 1 · Título del paso"), {
      target: { value: "**Presentar la solicitud** *original*" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Vista previa" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Solicitud" }));
    expect(
      within(screen.getByRole("dialog")).getByText("Presentar la solicitud"),
    ).toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).getByText("original")).toBeInTheDocument();
  });
  it("keeps English and Spanish summaries separate", async () => {
    mount();
    fireEvent.change(screen.getByLabelText("Título", { exact: true }), {
      target: { value: "Solicitud" },
    });
    fireEvent.change(screen.getByLabelText("Subtítulo"), { target: { value: "Resumen español" } });
    await chooseLanguage("English");
    fireEvent.change(screen.getByLabelText("Subtítulo"), { target: { value: "English summary" } });
    await saveWithoutTranslation();
    await waitFor(() => expect(mocks.insert).toHaveBeenCalled());
    const saved = mocks.insert.mock.calls[0]?.[0];
    expect(saved.content.summary).toBe("Resumen español");
    expect(saved.content_en.summary).toBe("English summary");
  });
  it("saves a Dutch correction without changing Spanish or English", async () => {
    mount("certificado-digital");
    await chooseLanguage("English");
    const english = (screen.getByLabelText("Subtítulo") as HTMLTextAreaElement).value;
    await chooseLanguage("Nederlands");
    fireEvent.change(screen.getByLabelText("Subtítulo"), {
      target: { value: "Handmatig gecontroleerde Nederlandse tekst" },
    });
    await saveWithoutTranslation();
    await waitFor(() => expect(mocks.insert).toHaveBeenCalled());
    const saved = mocks.insert.mock.calls[0]?.[0];
    expect(saved.translations.nl.content.summary).toBe(
      "Handmatig gecontroleerde Nederlandse tekst",
    );
    expect(saved.translations.nl.manual).toBe(true);
    expect(saved.content_en.summary).toBe(english);
    expect(saved.content.summary).not.toBe("Handmatig gecontroleerde Nederlandse tekst");
    expect(Object.keys(saved.translations).sort()).toEqual(["de", "en", "fr", "nl", "uk"]);
  });
});
