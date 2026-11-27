import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "./configuracion";

const { update, eq, invalidateQueries, success, error } = vi.hoisted(() => ({
  update: vi.fn(),
  eq: vi.fn(),
  invalidateQueries: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ update }) } }));
vi.mock("@tanstack/react-query", async (original) => ({
  ...(await original<typeof import("@tanstack/react-query")>()),
  useQuery: () => ({ data: { contact_email: "anterior@example.com" } }),
  useQueryClient: () => ({ invalidateQueries }),
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
}));
vi.mock("@/components/admin/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onCheckedChange(event.target.checked)}
    />
  ),
}));
vi.mock("sonner", () => ({ toast: { success, error } }));

beforeEach(() => {
  vi.clearAllMocks();
  update.mockReturnValue({ eq });
  eq.mockResolvedValue({ error: null });
});
afterEach(cleanup);

function openSettings() {
  const Settings = Route.options.component;
  if (!Settings) throw new Error("Missing settings screen");
  render(<Settings />);
}

describe("email de administración y avisos", () => {
  it("guarda el destinatario elegido en la configuración existente", async () => {
    openSettings();
    fireEvent.change(
      await screen.findByRole("textbox", { name: "Email de administración y avisos" }),
      { target: { value: "avisos@example.com" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Guardar configuración" }));
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ contact_email: "avisos@example.com" }),
      ),
    );
    expect(eq).toHaveBeenCalledWith("id", true);
    await waitFor(() => expect(success).toHaveBeenCalledOnce());
  });

  it("no confirma el guardado cuando falla la persistencia del email", async () => {
    eq.mockResolvedValue({ error: { message: "Denied" } });
    openSettings();
    fireEvent.change(
      await screen.findByRole("textbox", { name: "Email de administración y avisos" }),
      { target: { value: "avisos@example.com" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Guardar configuración" }));
    await waitFor(() => expect(error).toHaveBeenCalledOnce());
    expect(success).not.toHaveBeenCalled();
  });
});
