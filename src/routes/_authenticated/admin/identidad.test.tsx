import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "./identidad";

const V1 = "2026-11-27T10:00:00.123456+00:00";
const V2 = "2026-11-27T10:05:00.654321+00:00";

type Call = { op: string; args: unknown[] };
type Result = { data: unknown; error: unknown };

const mocks = vi.hoisted(() => ({
  calls: [] as Call[],
  reads: [] as Result[],
  updateResult: { data: null, error: null } as Result,
  success: vi.fn(),
  error: vi.fn(),
  setSiteConfig: vi.fn(),
}));

/** Constructor de consultas simulado: registra cada paso y responde al final. */
function builder() {
  let updating = false;
  const chain = {
    select: (...args: unknown[]) => (mocks.calls.push({ op: "select", args }), chain),
    update: (...args: unknown[]) => {
      updating = true;
      mocks.calls.push({ op: "update", args });
      return chain;
    },
    eq: (...args: unknown[]) => (mocks.calls.push({ op: "eq", args }), chain),
    maybeSingle: async () =>
      updating ? mocks.updateResult : (mocks.reads.shift() ?? { data: null, error: null }),
  };
  return chain;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      mocks.calls.push({ op: "from", args: [table] });
      return builder();
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
vi.mock("@/config/municipality", async (original) => ({
  ...(await original<typeof import("@/config/municipality")>()),
  setSiteConfig: mocks.setSiteConfig,
}));

const stored = {
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
  updated_at: V1,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.calls = [];
  mocks.reads = [{ data: stored, error: null }];
  mocks.updateResult = { data: null, error: null };
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
const saveButton = () => screen.getByRole("button", { name: "Guardar identidad" });
const updates = () => mocks.calls.filter((c) => c.op === "update");

describe("pantalla de identidad municipal", () => {
  it("muestra la identidad guardada sin pedir el autor del último cambio", async () => {
    openIdentity();
    expect(await field("Nombre del municipio")).toHaveValue("Villaprueba");
    expect(screen.getByLabelText("Nombre de la plataforma")).toHaveValue("Mi Pueblo");
    const select = mocks.calls.find((c) => c.op === "select");
    expect(String(select?.args[0])).not.toContain("updated_by");
    expect(mocks.calls).toContainEqual({ op: "from", args: ["site_identity"] });
  });

  it("no guarda y señala los campos que no cumplen las reglas", async () => {
    openIdentity();
    fireEvent.change(await field("Nombre del municipio"), { target: { value: "Pueblo {app}" } });
    fireEvent.change(screen.getByLabelText("Latitud"), { target: { value: "36.7" } });
    fireEvent.click(saveButton());
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Revisa los campos marcados."));
    expect(updates()).toHaveLength(0);
    const name = screen.getByLabelText("Nombre del municipio");
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAccessibleDescription(/< > \{ \}/);
    expect(name).toHaveFocus();
    expect(screen.getByLabelText("Longitud")).toHaveAccessibleDescription(/latitud y longitud/);
  });

  it("guarda sobre la versión cargada, confirma y conserva lo guardado", async () => {
    mocks.updateResult = {
      data: { ...stored, municipality_name: "Villanueva", updated_at: V2 },
      error: null,
    };
    openIdentity();
    fireEvent.change(await field("Nombre del municipio"), { target: { value: " Villanueva " } });
    fireEvent.click(saveButton());
    await waitFor(() => expect(mocks.success).toHaveBeenCalledOnce());
    expect(updates()[0]?.args[0]).toMatchObject({ municipality_name: "Villanueva" });
    expect(updates()[0]?.args[0]).not.toHaveProperty("updated_by");
    expect(mocks.calls).toContainEqual({ op: "eq", args: ["id", true] });
    expect(mocks.calls).toContainEqual({ op: "eq", args: ["updated_at", V1] });
    expect(screen.getByLabelText("Nombre del municipio")).toHaveValue("Villanueva");
    expect(mocks.setSiteConfig).toHaveBeenCalledWith(
      expect.objectContaining({ identity: expect.objectContaining({ name: "Villanueva" }) }),
    );
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it("guarda los datos institucionales tal como se escriben", async () => {
    mocks.updateResult = {
      data: {
        ...stored,
        town_hall_name: "Ayuntamiento de Prueba",
        town_hall_phone: "900 000 000",
        updated_at: V2,
      },
      error: null,
    };
    openIdentity();
    fireEvent.change(await field("Nombre del Ayuntamiento"), {
      target: { value: "Ayuntamiento de Prueba" },
    });
    fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "900 000 000" } });
    fireEvent.click(saveButton());
    await waitFor(() => expect(mocks.success).toHaveBeenCalledOnce());
    expect(updates()[0]?.args[0]).toMatchObject({
      town_hall_name: "Ayuntamiento de Prueba",
      town_hall_phone: "900 000 000",
      town_hall_address: "",
      town_hall_website: "",
    });
    expect(screen.getByLabelText("Teléfono")).toHaveValue("900 000 000");
  });

  it("muestra en gris lo que la web usará y lo retira al empezar el bloque del Ayuntamiento", async () => {
    openIdentity();
    const address = screen.getByLabelText.bind(screen, "Dirección");
    await field("Nombre del Ayuntamiento");
    const compiled = address().getAttribute("placeholder");
    expect(compiled).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Nombre del Ayuntamiento"), {
      target: { value: "Ayuntamiento de Prueba" },
    });
    expect(address()).toHaveAttribute("placeholder", "");
  });

  it("usa el teclado de texto en las coordenadas para poder escribir el signo menos", async () => {
    openIdentity();
    for (const name of ["Latitud", "Longitud"]) {
      const input = await field(name);
      expect(input).toHaveAttribute("type", "text");
      expect(input).not.toHaveAttribute("inputmode");
    }
  });

  it("habla de la conexión, no de permisos, si no puede comprobar por qué no se guardó", async () => {
    mocks.reads.push({ data: null, error: { code: "", message: "Failed to fetch" } });
    openIdentity();
    fireEvent.change(await field("Provincia"), { target: { value: "Otra" } });
    fireEvent.click(saveButton());
    await waitFor(() =>
      expect(mocks.error).toHaveBeenCalledWith(expect.stringMatching(/conexión/)),
    );
    expect(mocks.error).not.toHaveBeenCalledWith(expect.stringMatching(/permiso/));
  });

  it("explica el error de la base de datos y no confirma el guardado", async () => {
    mocks.updateResult = { data: null, error: { code: "23514", message: "check" } };
    openIdentity();
    fireEvent.change(await field("Provincia"), { target: { value: "Otra" } });
    fireEvent.click(saveButton());
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith(expect.stringMatching(/formato/)));
    expect(mocks.success).not.toHaveBeenCalled();
    expect(mocks.setSiteConfig).not.toHaveBeenCalled();
  });

  it("avisa si otra sesión cambió la identidad mientras se editaba", async () => {
    mocks.reads.push({ data: { ...stored, updated_at: V2 }, error: null });
    openIdentity();
    fireEvent.change(await field("Provincia"), { target: { value: "Otra" } });
    fireEvent.click(saveButton());
    await waitFor(() =>
      expect(mocks.error).toHaveBeenCalledWith(expect.stringMatching(/otra sesión/)),
    );
    expect(mocks.success).not.toHaveBeenCalled();
  });

  it("avisa de falta de permiso cuando la política no deja actualizar", async () => {
    mocks.reads.push({ data: stored, error: null });
    openIdentity();
    fireEvent.change(await field("Provincia"), { target: { value: "Otra" } });
    fireEvent.click(saveButton());
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith(expect.stringMatching(/permiso/)));
    expect(mocks.success).not.toHaveBeenCalled();
  });

  it("explica que falta la migración si la tabla no existe", async () => {
    mocks.reads = [{ data: null, error: { code: "PGRST205", message: "missing" } }];
    openIdentity();
    expect(await screen.findByRole("alert")).toHaveTextContent(/migración/);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("guarda los dos colores en minúsculas y comprueba su contraste", async () => {
    mocks.updateResult = {
      data: { ...stored, primary_color: "#1f4e79", accent_color: "#b5562a", updated_at: V2 },
      error: null,
    };
    openIdentity();
    fireEvent.change(await field("Color principal"), { target: { value: "#1F4E79" } });
    fireEvent.change(screen.getByLabelText("Color de acento"), { target: { value: "#B5562A" } });
    const checks = screen.getByRole("list", { name: "Contraste de la paleta" });
    expect(within(checks).getAllByText(/· AA/)).toHaveLength(6);
    fireEvent.click(saveButton());
    await waitFor(() => expect(mocks.success).toHaveBeenCalledOnce());
    expect(updates()[0]?.args[0]).toMatchObject({
      primary_color: "#1f4e79",
      accent_color: "#b5562a",
    });
    expect(mocks.setSiteConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        branding: expect.objectContaining({ primaryColor: "#1f4e79", accentColor: "#b5562a" }),
      }),
    );
  });

  it("rechaza un código postal o un color mal escritos", async () => {
    openIdentity();
    fireEvent.change(await field("Código postal principal"), { target: { value: "123" } });
    fireEvent.change(screen.getByLabelText("Color principal"), { target: { value: "azul" } });
    fireEvent.click(saveButton());
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Revisa los campos marcados."));
    expect(updates()).toHaveLength(0);
    expect(screen.getByLabelText("Código postal principal")).toHaveAccessibleDescription(
      /cinco cifras/,
    );
    expect(screen.getByLabelText("Color principal")).toHaveAttribute("aria-invalid", "true");
  });

  it("propone Europe/Madrid al escribir coordenadas y conserva una zona poco habitual", async () => {
    mocks.reads = [{ data: { ...stored, timezone: "Etc/GMT+12" }, error: null }];
    openIdentity();
    const zone = await field("Zona horaria");
    expect(zone).toHaveValue("Etc/GMT+12");
    fireEvent.change(zone, { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Latitud"), { target: { value: "40.5" } });
    expect(screen.getByLabelText("Zona horaria")).toHaveValue("Europe/Madrid");
    expect(
      within(screen.getByLabelText("Zona horaria")).getByRole("option", {
        name: "Atlantic/Canary",
      }),
    ).toBeInTheDocument();
  });

  it("ofrece subir el logotipo y su versión clara", async () => {
    openIdentity();
    const block = (await screen.findByRole("heading", { name: "Logotipo e iconos" })).closest(
      "section",
    )!;
    expect(within(block).getByRole("button", { name: "Subir logotipo" })).toBeInTheDocument();
    expect(within(block).getByRole("button", { name: "Subir versión clara" })).toBeInTheDocument();
    expect(within(block).queryByRole("button", { name: "Eliminar" })).not.toBeInTheDocument();
  });
});
