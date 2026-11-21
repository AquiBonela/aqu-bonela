import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n";
import { ProcedureEditor } from "@/routes/_authenticated/admin/tramites.$id";
import type { ProcedureCategory } from "@/lib/admin-procedures";
import { catalogContent, languagesToGenerate } from '@/lib/content-translations';

const mocks = vi.hoisted(() => ({ insert: vi.fn(), navigate: vi.fn(), generate: vi.fn() }));
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
vi.mock("@tanstack/react-router", async (original) => ({ ...await original<typeof import("@tanstack/react-router")>(), useNavigate: () => mocks.navigate, Link: ({ children }: { children: ReactNode }) => <a>{children}</a> }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ insert: mocks.insert }) } }));
vi.mock('@/components/admin/useContentTranslations', () => ({ useContentTranslations: () => ({
  translating: false, translationError: '', generate: mocks.generate,
}) }));
const categories: ProcedureCategory[] = [{ id: 'category-1', slug: 'documentacion', title: 'Documentación personal', description: '', title_en: '', description_en: '', visible: true, sort_order: 0, created_at: '', updated_at: '' }];
function mount(id = "nuevo") {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mocks.insert.mockReturnValue({ select: () => ({ single: async () => ({ data: { id: 'saved-id' }, error: null }) }) });
  mocks.generate.mockImplementation(async (source: Record<string, unknown>, versions: import('@/lib/content-translations').Translations, update: (v: import('@/lib/content-translations').Translations) => void) => {
    const next = { ...versions };
    for (const lang of languagesToGenerate(versions, source)) next[lang] = { content: catalogContent(source, lang), source, manual: false };
    update(next); return next;
  });
  render(<QueryClientProvider client={qc}><I18nProvider><ProcedureEditor id={id} row={undefined} categories={categories} /></I18nProvider></QueryClientProvider>);
}
afterEach(() => { cleanup(); vi.clearAllMocks(); });
async function chooseLanguage(name: string) {
  fireEvent.keyDown(screen.getByRole('button', { name: 'Idioma del contenido' }), { key: 'Enter' });
  fireEvent.click(await screen.findByRole('menuitemradio', { name }));
}

describe("procedure editor form", () => {
  it("saves a new procedure as a draft with the selected category", async () => {
    mount();
    fireEvent.change(screen.getByLabelText('Título', { exact: true }), { target: { value: 'Solicitud de ejemplo' } });
    fireEvent.change(screen.getByLabelText('Subtítulo'), { target: { value: 'Resumen de prueba' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Guardar' })[0] ?? screen.getByText('missing'));
    await waitFor(() => expect(mocks.insert).toHaveBeenCalled());
    expect(mocks.insert.mock.calls[0]?.[0]).toMatchObject({ title: 'Solicitud de ejemplo', slug: 'solicitud-de-ejemplo', status: 'borrador', category_id: 'category-1', summary: 'Resumen de prueba' });
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("preserves an existing guide when a section is switched off and saved", async () => {
    mount('certificado-digital');
    fireEvent.click(screen.getByRole('switch', { name: 'Mostrar ¿Cómo hacerlo paso a paso?' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Guardar' })[0] ?? screen.getByText('missing'));
    await waitFor(() => expect(mocks.insert).toHaveBeenCalled());
    const saved = mocks.insert.mock.calls[0]?.[0];
    expect(saved.visibility.pasos).toBe(false);
    expect(saved.content.guia.pasos.length).toBeGreaterThan(0);
    expect(saved.source_key).toBe('documentacion/certificado-digital');
  });
  it("lets an administrator add a structured step and reads it back in preview", () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: '¿Cómo hacerlo paso a paso?' }));
    fireEvent.click(screen.getByRole('button', { name: 'Añadir pasos' }));
    fireEvent.change(screen.getByLabelText('Pasos 1 · Título del paso'), { target: { value: '**Presentar la solicitud** *original*' } });
    fireEvent.click(screen.getByRole('button', { name: 'Vista previa' }));
    expect(within(screen.getByRole('dialog')).getByText('Presentar la solicitud')).toBeInTheDocument();
    expect(within(screen.getByRole('dialog')).getByText('original')).toBeInTheDocument();
  });
  it("keeps English and Spanish summaries separate", async () => {
    mount();
    fireEvent.change(screen.getByLabelText('Título', { exact: true }), { target: { value: 'Solicitud' } });
    fireEvent.change(screen.getByLabelText('Subtítulo'), { target: { value: 'Resumen español' } });
    await chooseLanguage('English');
    fireEvent.change(screen.getByLabelText('Subtítulo'), { target: { value: 'English summary' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Guardar' })[0] ?? screen.getByText('missing'));
    await waitFor(() => expect(mocks.insert).toHaveBeenCalled());
    const saved = mocks.insert.mock.calls[0]?.[0];
    expect(saved.content.summary).toBe('Resumen español');
    expect(saved.content_en.summary).toBe('English summary');
  });
  it('saves a Dutch correction without changing Spanish or English', async () => {
    mount('certificado-digital');
    await chooseLanguage('English');
    const english = (screen.getByLabelText('Subtítulo') as HTMLTextAreaElement).value;
    await chooseLanguage('Nederlands');
    fireEvent.change(screen.getByLabelText('Subtítulo'), { target: { value: 'Handmatig gecontroleerde Nederlandse tekst' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Guardar' })[0] ?? screen.getByText('missing'));
    await waitFor(() => expect(mocks.insert).toHaveBeenCalled());
    const saved = mocks.insert.mock.calls[0]?.[0];
    expect(saved.translations.nl.content.summary).toBe('Handmatig gecontroleerde Nederlandse tekst');
    expect(saved.translations.nl.manual).toBe(true);
    expect(saved.content_en.summary).toBe(english);
    expect(saved.content.summary).not.toBe('Handmatig gecontroleerde Nederlandse tekst');
    expect(Object.keys(saved.translations).sort()).toEqual(['de', 'en', 'fr', 'nl', 'uk']);
  });
});