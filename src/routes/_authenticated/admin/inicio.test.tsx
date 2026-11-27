import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Route as HomeRoute } from "./index";
import { Route as SectionsRoute } from "./secciones";
import { Route as ContentsRoute } from "./contenidos.index";

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
    expect(value("Avisos sin resolver")).toBe("1");
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
    expect(screen.queryByText("Avisos sin resolver")).not.toBeInTheDocument();
    expect(screen.getByText("Algunos indicadores no se pudieron cargar.")).toBeInTheDocument();
    // Sin todas las bandejas no se afirma que no haya tareas pendientes.
    expect(screen.queryByText("No hay tareas pendientes.")).not.toBeInTheDocument();
  });
});

describe("áreas pendientes de desarrollo", () => {
  it.each([["Secciones y menús", SectionsRoute]])(
    "%s se presenta como pendiente y sin controles",
    (title, route) => {
      const { container } = renderRoute(route);
      expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
      expect(screen.getByText("Módulo pendiente de desarrollo")).toBeInTheDocument();
      expect(container.querySelectorAll("form, input, select, textarea, button")).toHaveLength(0);
    },
  );

  it("Páginas y contenidos enlaza el editor de cada página y los trámites", () => {
    renderRoute(ContentsRoute);
    expect(
      screen.getAllByRole("link", { name: /Trámites/ }).map((l) => l.getAttribute("href")),
    ).toContain("/admin/tramites");
    for (const page of [
      "Portada",
      "Directorio",
      "Servicios públicos",
      "Tablón",
      "Actualidad y eventos",
    ])
      expect(screen.getByRole("link", { name: new RegExp(page) })).toBeInTheDocument();
  });
});
