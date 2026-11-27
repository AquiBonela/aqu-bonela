import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

type Rpc = { fn: string; args: Record<string, unknown> };
type ListingData = {
  listing: Record<string, unknown>;
  contact: null;
  hours: { weekday: number; opens: string; closes: string }[];
  activityIds: string[];
};

const V1 = "2026-11-27T10:00:00.123456+00:00";
const V2 = "2026-11-27T10:05:00.654321+00:00";

const mocks = vi.hoisted(() => ({
  params: { id: "nueva" },
  rpcs: [] as Rpc[],
  // Lo que save_listing aplicó de verdad en la base simulada.
  applied: [] as Record<string, unknown>[],
  // updated_at actual de la ficha en la base simulada.
  dbVersion: "",
  listing: null as ListingData | null,
  navigate: vi.fn(),
  // Referencias estables: el formulario recarga su estado cuando cambian sus datos.
  categories: [
    { id: "c1", name: "Alimentación", slug: "alimentacion", sort_order: 1, type: "comercio" },
  ],
  activities: [] as unknown[],
  settings: { collaborator_months: 1, common_labels: [] as string[], whatsapp_template: "" },
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options, useParams: () => mocks.params }),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useNavigate: () => mocks.navigate,
}));
vi.mock("@tanstack/react-query", async (original) => {
  const React = await import("react");
  return {
    ...(await original<typeof import("@tanstack/react-query")>()),
    useQuery: (options: { queryKey: unknown[]; enabled?: boolean }) => {
      const key = JSON.stringify(options.queryKey);
      if (key.includes('"categories"')) return { data: mocks.categories };
      if (key.includes('"activities"')) return { data: mocks.activities };
      if (key.includes('"settings"')) return { data: mocks.settings };
      if (key.includes('"listing"')) {
        // Recargar vuelve a pintar con lo que haya ahora en la base simulada.
        // eslint-disable-next-line react-hooks/rules-of-hooks -- la posición de esta llamada es estable
        const [, rerender] = React.useReducer((n: number) => n + 1, 0);
        return {
          data: options.enabled === false ? undefined : mocks.listing,
          isLoading: false,
          refetch: async () => {
            rerender();
            return { data: mocks.listing, error: null };
          },
        };
      }
      return { data: undefined };
    },
    useQueryClient: () => ({ invalidateQueries: () => Promise.resolve() }),
  };
});
// Cliente falso. save_listing se comporta como en la base: al editar, solo aplica el guardado
// si la versión enviada es la actual; si no, responde PT409 y no cambia nada.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (fn: string, args: Record<string, unknown>) => {
      mocks.rpcs.push({ fn, args });
      if (args["p_id"] && args["p_expected_updated_at"] !== mocks.dbVersion)
        return Promise.resolve({
          data: null,
          error: {
            code: "PT409",
            message: "La ficha ha cambiado desde que se abrió el formulario",
          },
        });
      mocks.applied.push(args);
      mocks.dbVersion = `2026-11-27T11:00:0${mocks.applied.length}.000000+00:00`;
      return Promise.resolve({
        data: { id: args["p_id"] ?? "ficha-nueva", updated_at: mocks.dbVersion },
        error: null,
      });
    },
    from: () => {
      throw new Error("El formulario no debe escribir en las tablas fuera de save_listing");
    },
  },
}));
vi.mock("@/components/admin/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/admin/ListingImages", () => ({
  CoverPicker: () => null,
  GalleryPicker: () => null,
}));
vi.mock("@/components/admin/ContentLanguages", () => ({ ContentLanguages: () => null }));
vi.mock("@/components/admin/TranslationSaveDialog", () => ({ TranslationSaveDialog: () => null }));
vi.mock("@/components/admin/useContentTranslations", () => ({
  useContentTranslations: () => ({ generate: vi.fn(), translating: false, translationError: null }),
}));
vi.mock("@/lib/content-translations", async (original) => ({
  ...(await original<typeof import("@/lib/content-translations")>()),
  languagesToGenerate: () => [],
}));
vi.mock("@/lib/review-token", () => ({ createReviewToken: vi.fn() }));
vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked: boolean;
    onCheckedChange: (v: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onCheckedChange(event.target.checked)}
    />
  ),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { Route } from "./fichas.$id";

const HIDE = "__ocultar_horario";
const CHANGED = /Esta ficha ha cambiado desde que la abriste/;

function openForm() {
  const Page = (Route as unknown as { options: { component: () => React.ReactElement } }).options
    .component;
  render(<Page />);
}

function hoursToggle() {
  return screen.getByRole("checkbox", {
    name: /Mostrar el horario en la ficha pública/,
  }) as HTMLInputElement;
}

function nameInput() {
  return screen.getByText("Nombre").parentElement!.querySelector("input")!;
}

async function saved() {
  const before = mocks.rpcs.length;
  fireEvent.click(screen.getByRole("button", { name: "Guardar ficha" }));
  await waitFor(() => expect(mocks.rpcs.length).toBe(before + 1));
  const call = mocks.rpcs.at(-1)!;
  expect(call.fn).toBe("save_listing");
  const listing = call.args["p_listing"] as { tags: string[]; status: string; name: string };
  return { args: call.args, listing, tags: listing.tags, hours: call.args["p_hours"] as unknown[] };
}

function newListing(name: string) {
  mocks.params = { id: "nueva" };
  openForm();
  fireEvent.change(nameInput(), { target: { value: name } });
  fireEvent.change(screen.getByDisplayValue("Elige una categoría"), { target: { value: "c1" } });
  fireEvent.click(screen.getByRole("button", { name: /Añadir tramo/ }));
}

/** Ficha guardada en la base simulada, abierta en el formulario con la versión V1. */
function stored(id: string, listing: Record<string, unknown>, hours = [1]): ListingData {
  mocks.params = { id };
  mocks.dbVersion = (listing["updated_at"] as string | undefined) ?? V1;
  return {
    listing: {
      type: "comercio",
      category_id: "c1",
      activity: null,
      public_website: null,
      home_service: false,
      service_area: "",
      labels: [],
      name: "Taller",
      slug: "taller",
      short_description: "",
      description: "",
      tags: ["llantas"],
      translations: {},
      featured: false,
      featured_until: null,
      urgent_24h: false,
      status: "borrador",
      updated_at: V1,
      ...listing,
    },
    contact: null,
    hours: hours.map((weekday) => ({ weekday, opens: "10:00:00", closes: "13:00:00" })),
    activityIds: [],
  };
}

/** El titular aprueba desde su enlace: la ficha cambia en la base y pasa a la versión V2. */
function ownerApproves(changes: Record<string, unknown> = {}) {
  mocks.listing = {
    ...mocks.listing!,
    listing: {
      ...mocks.listing!.listing,
      status: "publicada",
      tags: ["llantas", HIDE],
      updated_at: V2,
      ...changes,
    },
  };
  mocks.dbVersion = V2;
}

beforeEach(() => {
  mocks.rpcs = [];
  mocks.applied = [];
  mocks.dbVersion = "";
  mocks.listing = null;
  vi.mocked(toast.error).mockClear();
});
afterEach(cleanup);

describe("Groundwork controla la visibilidad del horario desde el administrador", () => {
  it("crea una ficha con horario visible: guarda el horario y no lo marca como oculto", async () => {
    newListing("Panadería visible");
    expect(hoursToggle().checked).toBe(true);
    const { args, tags, hours } = await saved();
    expect(tags).not.toContain(HIDE);
    expect(hours).toEqual([{ weekday: 1, opens: "09:00", closes: "14:00" }]);
    expect(args).not.toHaveProperty("p_id");
    expect(args).not.toHaveProperty("p_expected_updated_at");
  });

  it("crea una ficha con horario oculto: guarda el horario y lo marca como oculto", async () => {
    newListing("Taller oculto");
    fireEvent.click(hoursToggle());
    expect(hoursToggle().checked).toBe(false);
    const { tags, hours } = await saved();
    expect(tags).toContain(HIDE);
    expect(hours).toHaveLength(1);
  });

  it("al editar muestra el estado guardado y permite volver a mostrar el horario sin perder etiquetas", async () => {
    mocks.listing = stored("f1", {
      tags: ["llantas", HIDE, "Guardia fin de semana"],
      status: "publicada",
    });
    openForm();
    await waitFor(() => expect(hoursToggle().checked).toBe(false));
    fireEvent.click(hoursToggle());
    const { args, tags } = await saved();
    expect(tags).not.toContain(HIDE);
    expect(tags).toEqual(expect.arrayContaining(["llantas", "Guardia fin de semana"]));
    expect(args["p_id"]).toBe("f1");
    expect(args["p_expected_updated_at"]).toBe(V1);
    expect(mocks.applied).toHaveLength(1);
  });

  it("al editar puede ocultar un horario visible", async () => {
    mocks.listing = stored("f2", { name: "Panadería", slug: "panaderia", tags: ["pan"] }, [2]);
    openForm();
    await waitFor(() => expect(hoursToggle().checked).toBe(true));
    fireEvent.click(hoursToggle());
    const { tags } = await saved();
    expect(tags).toEqual(["pan", HIDE]);
  });
});

describe("el formulario nunca sobrescribe cambios posteriores", () => {
  // Antes era DEFECTO 1 (causa principal): el formulario guardaba todo lo que cargó al abrirse.
  // Si el titular aprobaba mientras estaba abierto, «Guardar ficha» devolvía la ficha a borrador
  // y borraba su decisión sobre el horario y los contactos.
  it("un formulario abierto antes de que el titular apruebe no sobrescribe su decisión", async () => {
    mocks.listing = stored("f3", {});
    openForm();
    await waitFor(() => expect(nameInput().value).toBe("Taller"));
    fireEvent.change(nameInput(), { target: { value: "Taller con cambios de Groundwork" } });
    // El titular aprueba en otra ventana y el formulario todavía no lo sabe.
    ownerApproves();
    const { args, listing } = await saved();
    expect(args["p_expected_updated_at"]).toBe(V1);
    expect(listing.status).toBe("borrador");
    // La base lo rechaza: no se aplica nada y la decisión del titular sigue intacta.
    expect(mocks.applied).toEqual([]);
    expect(await screen.findByRole("alert")).toHaveTextContent(CHANGED);
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/ha cambiado/));
    // Los cambios locales se conservan y no se puede volver a guardar sin recargar.
    expect(nameInput().value).toBe("Taller con cambios de Groundwork");
    fireEvent.click(screen.getByRole("button", { name: "Guardar ficha" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2));
    expect(mocks.rpcs).toHaveLength(1);
  });

  it("al recuperar el foco sin cambios locales muestra la versión nueva", async () => {
    mocks.listing = stored("f4", {});
    openForm();
    await waitFor(() => expect(hoursToggle().checked).toBe(true));
    ownerApproves({ name: "Taller del titular" });
    fireEvent.focus(window);
    await waitFor(() => expect(nameInput().value).toBe("Taller del titular"));
    expect(hoursToggle().checked).toBe(false);
    expect(screen.queryByRole("alert")).toBeNull();
    // Guardar ahora parte de la versión nueva y conserva la decisión del titular.
    const { args, listing, tags } = await saved();
    expect(args["p_expected_updated_at"]).toBe(V2);
    expect(listing.status).toBe("publicada");
    expect(tags).toContain(HIDE);
    expect(mocks.applied).toHaveLength(1);
  });

  it("al recuperar el foco con cambios locales los conserva, avisa y bloquea el guardado hasta recargar", async () => {
    mocks.listing = stored("f5", {});
    openForm();
    await waitFor(() => expect(nameInput().value).toBe("Taller"));
    fireEvent.change(nameInput(), { target: { value: "Mi cambio" } });
    ownerApproves({ name: "Taller del titular" });
    fireEvent.focus(window);
    expect(await screen.findByRole("alert")).toHaveTextContent(CHANGED);
    expect(nameInput().value).toBe("Mi cambio");
    fireEvent.click(screen.getByRole("button", { name: "Guardar ficha" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(mocks.rpcs).toEqual([]);
    // Recargar descarta los cambios locales y muestra la versión actual.
    fireEvent.click(screen.getByRole("button", { name: "Recargar la ficha" }));
    await waitFor(() => expect(nameInput().value).toBe("Taller del titular"));
    expect(screen.queryByRole("alert")).toBeNull();
    const { args, tags } = await saved();
    expect(args["p_expected_updated_at"]).toBe(V2);
    expect(tags).toContain(HIDE);
    expect(mocks.applied).toHaveLength(1);
  });
});
