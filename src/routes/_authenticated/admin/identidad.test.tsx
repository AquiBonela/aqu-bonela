import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "./identidad";

const V1 = "2026-11-28T10:00:00.123456+00:00";
const V2 = "2026-11-28T10:05:00.654321+00:00";

type RpcCall = { fn: string; args: Record<string, unknown> };

const mocks = vi.hoisted(() => ({
  calls: [] as RpcCall[],
  /** Respuesta de cada función: valor o error de PostgREST. */
  responses: {} as Record<
    string,
    (args: Record<string, unknown>) => { data: unknown; error: unknown }
  >,
  from: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      mocks.calls.push({ fn, args });
      return mocks.responses[fn]?.(args) ?? { data: null, error: null };
    },
    // La identidad nunca se escribe directamente desde el navegador.
    from: mocks.from,
    storage: {
      from: () => ({
        createSignedUrl: async () => ({
          data: { signedUrl: "https://firmada.example.org/x" },
          error: null,
        }),
      }),
    },
  },
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
}));
vi.mock("@/components/admin/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));

const published = {
  app_name: "Mi Pueblo",
  short_name: "",
  municipality_name: "Villaprueba",
  province: "Provincia Prueba",
  region: "",
  autonomous_community: "",
  demonym_masculine: "",
  demonym_feminine: "",
  site_url: "",
  town_hall_name: "",
  town_hall_address: "",
  town_hall_phone: "",
  town_hall_website: "",
  latitude: null,
  longitude: null,
  timezone: "",
  postal_code: "",
  primary_color: "",
  accent_color: "",
  logo_path: "",
  logo_light_path: "",
  icon_path: "",
  icon_small_path: "",
};

let state: Record<string, unknown>;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.calls = [];
  state = { exists: false, published };
  mocks.responses = {
    content_draft_state: () => ({ data: state, error: null }),
    save_content_draft: (args) => {
      state = {
        exists: true,
        published,
        content: args["p_content"],
        status: "borrador",
        updated_at: V2,
        created_at: V2,
        submitted_at: null,
        stale: false,
        conformity: null,
      };
      return { data: { draft_key: "identidad", updated_at: V2 }, error: null };
    },
  };
});
afterEach(cleanup);

function openIdentity() {
  const Screen = Route.options.component as () => React.ReactNode;
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Screen />
    </QueryClientProvider>,
  );
}

const field = (name: string) => screen.findByLabelText(name);
const statusBar = () => screen.getByRole("region", { name: "Estado de publicación" });
const saves = () => mocks.calls.filter((c) => c.fn === "save_content_draft");

describe("identidad municipal con borrador y conformidad", () => {
  it("muestra lo publicado y dice que no hay cambios pendientes", async () => {
    openIdentity();
    expect(await field("Nombre del municipio")).toHaveValue("Villaprueba");
    expect(screen.getByLabelText("Nombre de la plataforma")).toHaveValue("Mi Pueblo");
    expect(within(statusBar()).getByText("Publicado, sin cambios pendientes")).toBeInTheDocument();
    expect(mocks.calls[0]).toEqual({ fn: "content_draft_state", args: { p_key: "identidad" } });
    // Sin cambios no hay nada que guardar ni presentar.
    expect(within(statusBar()).queryByRole("button")).not.toBeInTheDocument();
  });

  it("no guarda y señala los campos que no cumplen las reglas", async () => {
    openIdentity();
    fireEvent.change(await field("Nombre del municipio"), { target: { value: "Pueblo {app}" } });
    fireEvent.change(screen.getByLabelText("Latitud"), { target: { value: "36.7" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar borrador" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Revisa los campos marcados."));
    expect(saves()).toHaveLength(0);
    const name = screen.getByLabelText("Nombre del municipio");
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveFocus();
    expect(screen.getByLabelText("Longitud")).toHaveAccessibleDescription(/latitud y longitud/);
  });

  it("guarda un borrador normalizado con todas las claves, sin escribir la identidad publicada", async () => {
    openIdentity();
    fireEvent.change(await field("Nombre del municipio"), { target: { value: " Villanueva " } });
    expect(within(statusBar()).getByText("Cambios sin guardar")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Guardar borrador" }));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledOnce());
    const content = saves()[0]?.args["p_content"] as Record<string, unknown>;
    expect(saves()[0]?.args["p_key"]).toBe("identidad");
    expect(saves()[0]?.args).not.toHaveProperty("p_expected_updated_at");
    expect(content).toMatchObject({
      municipality_name: "Villanueva",
      latitude: null,
      logo_path: "",
    });
    expect(Object.keys(content).sort()).toEqual(Object.keys(published).sort());
    expect(mocks.from).not.toHaveBeenCalled();
    expect(await within(statusBar()).findByText("Borrador")).toBeInTheDocument();
    expect(
      within(statusBar()).getByRole("button", { name: "Presentar al Ayuntamiento" }),
    ).toBeInTheDocument();
  });

  it("un borrador presentado espera la conformidad y no se puede publicar todavía", async () => {
    state = {
      exists: true,
      published,
      content: { ...published, app_name: "Mi Pueblo Nuevo" },
      status: "presentado",
      updated_at: V1,
      created_at: V1,
      submitted_at: V1,
      stale: false,
      conformity: null,
    };
    openIdentity();
    expect(await field("Nombre de la plataforma")).toHaveValue("Mi Pueblo Nuevo");
    expect(within(statusBar()).getByText("Presentado al Ayuntamiento")).toBeInTheDocument();
    expect(
      within(statusBar()).getByRole("button", { name: "Registrar conformidad" }),
    ).toBeInTheDocument();
    expect(
      within(statusBar()).queryByRole("button", { name: "Revisar y publicar" }),
    ).not.toBeInTheDocument();
  });

  it("publicar exige confirmar la revisión final y envía la conformidad confirmada", async () => {
    state = {
      exists: true,
      published,
      content: { ...published, app_name: "Mi Pueblo Nuevo" },
      status: "conforme",
      updated_at: V1,
      created_at: V1,
      submitted_at: V1,
      stale: false,
      conformity: {
        by: "Alcaldía",
        on: "2026-11-28",
        channel: "correo",
        reference: null,
        recorded_at: V1,
      },
    };
    mocks.responses["publish_content_draft"] = () => ({
      data: { draft_key: "identidad", published_at: V2 },
      error: null,
    });
    mocks.responses["site_config"] = () => ({ data: null, error: null });
    openIdentity();
    fireEvent.click(await screen.findByRole("button", { name: "Revisar y publicar" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Nombre de la plataforma/)).toBeInTheDocument();
    const publish = within(dialog).getByRole("button", { name: "Publicar" });
    expect(publish).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("checkbox"));
    fireEvent.click(publish);
    await waitFor(() =>
      expect(mocks.calls.find((c) => c.fn === "publish_content_draft")?.args).toEqual({
        p_key: "identidad",
        p_expected_updated_at: V1,
        p_conformity: true,
        p_note: null,
      }),
    );
  });

  it("explica el conflicto si otra sesión cambió el borrador", async () => {
    mocks.responses["save_content_draft"] = () => ({
      data: null,
      error: { code: "PT409", hint: "draft_exists", message: "Ya hay un borrador" },
    });
    openIdentity();
    fireEvent.change(await field("Provincia"), { target: { value: "Otra" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar borrador" }));
    await waitFor(() =>
      expect(mocks.error).toHaveBeenCalledWith(
        expect.stringContaining("Ya hay un borrador de esta pantalla"),
      ),
    );
    expect(mocks.success).not.toHaveBeenCalled();
    // Lo escrito no se pierde.
    expect(screen.getByLabelText("Provincia")).toHaveValue("Otra");
  });

  it("propone Europe/Madrid al escribir coordenadas", async () => {
    openIdentity();
    fireEvent.change(await field("Latitud"), { target: { value: "40.4" } });
    expect(screen.getByLabelText("Zona horaria")).toHaveValue("Europe/Madrid");
  });

  it("enseña una vista previa con los datos del borrador", async () => {
    openIdentity();
    fireEvent.change(await field("Nombre de la plataforma"), {
      target: { value: "Conecta Prueba" },
    });
    const preview = screen.getByRole("region", { name: "Vista previa" });
    expect(within(preview).getByText("Conecta Prueba")).toBeInTheDocument();
  });
});
