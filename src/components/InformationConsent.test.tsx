import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SuggestionForm } from "./SuggestionForm";
import { ReportDialog } from "./ReportDialog";

const { insert } = vi.hoisted(() => ({ insert: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: () => (args: { data: unknown }) => insert(args.data) }));
vi.mock("@/lib/forms.functions", () => ({
  submitSuggestion: {}, submitReport: {},
  REPORT_REASONS: ["Horario incorrecto", "Teléfono erróneo", "Cerrado / Mudado", "Otro motivo"],
}));
vi.mock("@/components/FormProtection", () => ({
  useFormProtection: () => ({ fields: null, ready: true, payload: { session: "s", turnstileToken: "t", website: "" }, reset: () => {} }),
}));
const P = { session: "s", turnstileToken: "t", website: "" };
vi.mock("@tanstack/react-router", () => ({ Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => <a href={to} {...props}>{children}</a> }));
beforeEach(() => { insert.mockReset(); insert.mockResolvedValue({ ok: true }); });
afterEach(cleanup);

describe("aceptación obligatoria antes de enviar información", () => {
  it.each([false, true])("bloquea sugerencias y altas sin aceptar (negocio=%s)", async (business) => {
    const { container } = render(<SuggestionForm business={business} />);
    fireEvent.change(screen.getByRole("textbox", { name: business ? "Nombre del negocio o servicio" : "¿De qué se trata?" }), { target: { value: "Biblioteca" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Cuéntanoslo" }), { target: { value: "Información actualizada de horarios" } });
    const form = container.querySelector("form");
    if (!form) throw new Error("Missing form");
    fireEvent.submit(form);
    expect(insert).not.toHaveBeenCalled();
    const accepted = screen.getByRole("checkbox");
    expect(accepted).not.toBeChecked();
    fireEvent.click(accepted);
    fireEvent.submit(form);
    await waitFor(() => expect(insert).toHaveBeenCalledOnce());
    expect(insert).toHaveBeenCalledWith({ ...P, name: "Biblioteca", contact: undefined, message: "Información actualizada de horarios" });
  });
  it("bloquea avisos de fichas sin aceptar y permite enviarlos tras aceptar", async () => {
    const { container } = render(<ReportDialog listingId="listing-1" listingName="Biblioteca" />);
    fireEvent.click(screen.getByRole("button", { name: /Avísanos/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "¿Qué hay que corregir?" }), { target: { value: "Abre a las nueve" } });
    const form = container.querySelector("form");
    if (!form) throw new Error("Missing form");
    fireEvent.submit(form);
    expect(insert).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.submit(form);
    await waitFor(() => expect(insert).toHaveBeenCalledOnce());
    expect(insert).toHaveBeenCalledWith({ ...P, listingId: "listing-1", reason: "Horario incorrecto", message: "Abre a las nueve", contact: undefined });
  });
});