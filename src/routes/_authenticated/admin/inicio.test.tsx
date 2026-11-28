import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route as HomeRoute } from "./index";

type Result = { data?: unknown; isSuccess: boolean; isError: boolean };
const loading: Result = { data: undefined, isSuccess: false, isError: false };
const ok = (data: unknown): Result => ({ data, isSuccess: true, isError: false });

const mocks = vi.hoisted(() => ({ results: {} as Record<string, unknown> }));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
  Link: ({
    to,
    params,
    children,
    ...props
  }: {
    to: string;
    params?: { id: string };
    children: React.ReactNode;
  } & Record<string, unknown>) => (
    <a href={params ? to.replace("$id", params.id) : to} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@tanstack/react-query", async (original) => ({
  ...(await original<typeof import("@tanstack/react-query")>()),
  useQuery: ({ queryKey }: { queryKey: string[] }) =>
    mocks.results[queryKey.join("/")] ?? { data: undefined, isSuccess: false, isError: false },
}));
vi.mock("@/components/admin/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const listings = [
  { id: "a", name: "Panadería", status: "publicada", featured: true, featured_until: null },
  { id: "b", name: "Taller", status: "pendiente", featured: false, featured_until: null },
  { id: "c", name: "Bar", status: "borrador", featured: false, featured_until: null },
].map((l) => ({ ...l, updated_at: "2026-11-20T10:00:00Z" }));

beforeEach(() => {
  mocks.results = {};
});
afterEach(cleanup);

function renderRoute(route: { options: { component?: unknown } }) {
  const Screen = route.options.component as (() => React.ReactNode) | undefined;
  if (!Screen) throw new Error("Missing screen");
  return render(<Screen />);
}

describe("Inicio del panel", () => {
  it("no muestra indicadores ni tareas mientras los datos no han llegado", () => {
    mocks.results = {
      "admin/listings": loading,
      "admin/reports": loading,
      "admin/suggestions": loading,
    };
    renderRoute(HomeRoute);
    expect(screen.queryByRole("heading", { name: "Indicadores" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Pendiente de atender" })).not.toBeInTheDocument();
    // El resumen del municipio y los accesos no dependen de la base de datos.
    expect(screen.getByRole("heading", { name: "Municipio" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Nueva ficha/ })).toHaveAttribute(
      "href",
      "/admin/fichas/nueva",
    );
  });

  it("calcula los indicadores con los datos reales de las fichas y bandejas", () => {
    mocks.results = {
      "admin/listings": ok(listings),
      "admin/reports": ok([{ resolved: false }, { resolved: true }]),
      "admin/suggestions": ok([{ handled: true }]),
    };
    renderRoute(HomeRoute);
    const indicators = screen.getByRole("heading", { name: "Indicadores" }).closest("section")!;
    const value = (label: string) =>
      within(indicators).getByText(label).closest("div")?.querySelector("dd")?.textContent;
    expect(value("Fichas publicadas")).toBe("1");
    expect(value("Pendientes de aprobación")).toBe("1");
    expect(value("Borradores")).toBe("1");
    expect(value("Correcciones sin resolver")).toBe("1");
    expect(value("Sugerencias sin atender")).toBe("0");

    const pending = screen
      .getByRole("heading", { name: "Pendiente de atender" })
      .closest("section")!;
    expect(
      within(pending)
        .getAllByRole("link")
        .map((l) => l.getAttribute("href")),
    ).toEqual(["/admin/directorio", "/admin/avisos"]);

    const recent = screen
      .getByRole("heading", { name: "Últimas fichas modificadas" })
      .closest("section")!;
    expect(within(recent).getByRole("link", { name: /Taller/ })).toHaveAttribute(
      "href",
      "/admin/fichas/b",
    );
  });

  it("muestra solo los indicadores que sí se pudieron cargar", () => {
    mocks.results = {
      "admin/listings": ok(listings),
      "admin/reports": { data: undefined, isSuccess: false, isError: true },
      "admin/suggestions": ok([]),
    };
    renderRoute(HomeRoute);
    expect(screen.getByText("Fichas publicadas")).toBeInTheDocument();
    expect(screen.queryByText("Correcciones sin resolver")).not.toBeInTheDocument();
    expect(screen.getByText("Algunos indicadores no se pudieron cargar.")).toBeInTheDocument();
    // Sin todas las bandejas no se afirma que no haya tareas pendientes.
    expect(screen.queryByText("No hay tareas pendientes.")).not.toBeInTheDocument();
  });
});

describe("publicación municipal y actividad", () => {
  it("cuenta los borradores por paso del circuito y enlaza cada uno a su pantalla", () => {
    mocks.results = {
      "admin/drafts": ok({
        drafts: [
          {
            draft_key: "identidad",
            status: "conforme",
            updated_at: "2026-11-28T10:00:00Z",
            submitted_at: "2026-11-27T10:00:00Z",
          },
          {
            draft_key: "menu",
            status: "presentado",
            updated_at: "2026-11-28T09:00:00Z",
            submitted_at: "2026-11-28T09:00:00Z",
          },
          {
            draft_key: "cabecera:descubre",
            status: "borrador",
            updated_at: "2026-11-28T08:00:00Z",
            submitted_at: null,
          },
        ],
        lastPublication: null,
      }),
    };
    renderRoute(HomeRoute);
    const block = screen
      .getByRole("heading", { name: "Publicación municipal" })
      .closest("section")!;
    const value = (label: string) =>
      within(block).getByText(label).closest("div")?.querySelector("dd")?.textContent;
    expect(value("En borrador")).toBe("1");
    expect(value("Pendientes de conformidad municipal")).toBe("1");
    expect(value("Pendientes de publicación por Groundwork")).toBe("1");
    expect(within(block).getByRole("link", { name: /Identidad municipal/ })).toHaveAttribute(
      "href",
      "/admin/identidad",
    );
    expect(within(block).getByRole("link", { name: /Cabecera: Descubre/ })).toHaveAttribute(
      "href",
      "/admin/descubre",
    );
    expect(
      within(block).getByText("Aún no se ha publicado nada con el circuito de conformidad."),
    ).toBeInTheDocument();
  });

  it("muestra la actividad del registro sin las operaciones internas de una publicación", () => {
    const at = "2026-11-28T10:00:00Z";
    mocks.results = {
      "admin/listings": ok(listings),
      "admin/activity": ok([
        {
          id: 4,
          occurred_at: at,
          operation: "delete",
          table_name: "content_drafts",
          record_key: "portada",
          changed_columns: [],
          state: "conforme",
          actor: "u1",
          actor_role: "authenticated",
        },
        {
          id: 3,
          occurred_at: at,
          operation: "insert",
          table_name: "content_publications",
          record_key: "9",
          changed_columns: [],
          state: "portada",
          actor: "u1",
          actor_role: "authenticated",
        },
        {
          id: 2,
          occurred_at: at,
          operation: "update",
          table_name: "site_settings",
          record_key: "true",
          changed_columns: ["hero_title"],
          state: null,
          actor: "u1",
          actor_role: "authenticated",
        },
        {
          id: 1,
          occurred_at: "2026-11-27T10:00:00Z",
          operation: "update",
          table_name: "listings",
          record_key: "b",
          changed_columns: ["status"],
          state: "publicada",
          actor: null,
          actor_role: "service_role",
        },
      ]),
    };
    renderRoute(HomeRoute);
    const block = screen.getByRole("heading", { name: "Actividad reciente" }).closest("section")!;
    expect(
      within(block)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual([
      expect.stringContaining("Publicado: Directorio: textos de presentación"),
      expect.stringContaining("Ficha publicada: Taller"),
    ]);
  });
});
