import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Call = { table: string; op: string; payload?: unknown };
type ListingData = {
  listing: Record<string, unknown>;
  contact: null;
  hours: { weekday: number; opens: string; closes: string }[];
  activityIds: string[];
};

const mocks = vi.hoisted(() => ({
  params: { id: "nueva" },
  calls: [] as Call[],
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
vi.mock("@tanstack/react-query", async (original) => ({
  ...(await original<typeof import("@tanstack/react-query")>()),
  useQuery: (options: { queryKey: unknown[]; enabled?: boolean }) => {
    const key = JSON.stringify(options.queryKey);
    if (key.includes('"categories"')) return { data: mocks.categories };
    if (key.includes('"activities"')) return { data: mocks.activities };
    if (key.includes('"settings"')) return { data: mocks.settings };
    if (key.includes('"listing"'))
      return { data: options.enabled === false ? undefined : mocks.listing, isLoading: false };
    return { data: undefined };
  },
  useQueryClient: () => ({ invalidateQueries: () => Promise.resolve() }),
}));
// Cliente falso: registra cada escritura (tabla, operación y datos) y responde sin error.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const result = { data: { id: "ficha-nueva" }, error: null };
      const chain: Record<string, (...args: unknown[]) => unknown> = {};
      const write = (op: string) => (payload?: unknown) => {
        mocks.calls.push({ table, op, payload });
        return chain;
      };
      chain["insert"] = write("insert");
      chain["update"] = write("update");
      chain["upsert"] = write("upsert");
      chain["delete"] = write("delete");
      chain["select"] = () => chain;
      chain["eq"] = () => chain;
      chain["single"] = () => Promise.resolve(result);
      chain["then"] = (resolve: unknown) =>
        Promise.resolve(result).then(resolve as (value: typeof result) => unknown);
      return chain;
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

async function saved(op: "insert" | "update") {
  fireEvent.click(screen.getByRole("button", { name: "Guardar ficha" }));
  await waitFor(() =>
    expect(mocks.calls.some((c) => c.table === "listing_hours" && c.op === "insert")).toBe(true),
  );
  const row = mocks.calls.find((c) => c.table === "listings" && c.op === op);
  if (!row) throw new Error(`No se guardó la ficha (${op})`);
  const hours = mocks.calls.find((c) => c.table === "listing_hours" && c.op === "insert");
  return { tags: (row.payload as { tags: string[] }).tags, hours: hours?.payload as unknown[] };
}

function newListing(name: string) {
  mocks.params = { id: "nueva" };
  openForm();
  fireEvent.change(screen.getByText("Nombre").parentElement!.querySelector("input")!, {
    target: { value: name },
  });
  fireEvent.change(screen.getByDisplayValue("Elige una categoría"), { target: { value: "c1" } });
  fireEvent.click(screen.getByRole("button", { name: /Añadir tramo/ }));
}

beforeEach(() => {
  mocks.calls = [];
  mocks.listing = null;
});
afterEach(cleanup);

describe("Groundwork controla la visibilidad del horario desde el administrador", () => {
  it("crea una ficha con horario visible: guarda el horario y no lo marca como oculto", async () => {
    newListing("Panadería visible");
    expect(hoursToggle().checked).toBe(true);
    const { tags, hours } = await saved("insert");
    expect(tags).not.toContain(HIDE);
    expect(hours).toHaveLength(1);
  });

  it("crea una ficha con horario oculto: guarda el horario y lo marca como oculto", async () => {
    newListing("Taller oculto");
    fireEvent.click(hoursToggle());
    expect(hoursToggle().checked).toBe(false);
    const { tags, hours } = await saved("insert");
    expect(tags).toContain(HIDE);
    expect(hours).toHaveLength(1);
  });

  it("al editar muestra el estado guardado y permite volver a mostrar el horario sin perder etiquetas", async () => {
    mocks.params = { id: "f1" };
    mocks.listing = {
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
        tags: ["llantas", HIDE, "Guardia fin de semana"],
        translations: {},
        featured: false,
        featured_until: null,
        urgent_24h: false,
        status: "publicada",
      },
      contact: null,
      hours: [{ weekday: 1, opens: "10:00:00", closes: "13:00:00" }],
      activityIds: [],
    };
    openForm();
    await waitFor(() => expect(hoursToggle().checked).toBe(false));
    fireEvent.click(hoursToggle());
    const { tags } = await saved("update");
    expect(tags).not.toContain(HIDE);
    expect(tags).toEqual(expect.arrayContaining(["llantas", "Guardia fin de semana"]));
  });

  it("al editar puede ocultar un horario visible", async () => {
    mocks.params = { id: "f2" };
    mocks.listing = {
      listing: {
        type: "comercio",
        category_id: "c1",
        activity: null,
        public_website: null,
        home_service: false,
        service_area: "",
        labels: [],
        name: "Panadería",
        slug: "panaderia",
        short_description: "",
        description: "",
        tags: ["pan"],
        translations: {},
        featured: false,
        featured_until: null,
        urgent_24h: false,
        status: "publicada",
      },
      contact: null,
      hours: [{ weekday: 2, opens: "09:00:00", closes: "14:00:00" }],
      activityIds: [],
    };
    openForm();
    await waitFor(() => expect(hoursToggle().checked).toBe(true));
    fireEvent.click(hoursToggle());
    const { tags } = await saved("update");
    expect(tags).toEqual(["pan", HIDE]);
  });
});
