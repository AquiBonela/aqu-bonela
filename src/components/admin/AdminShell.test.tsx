import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminShell } from "./AdminShell";

const mocks = vi.hoisted(() => ({
  pathname: "/admin",
  isAdmin: true as boolean,
  reports: [] as { resolved: boolean }[],
  suggestions: [] as { handled: boolean }[],
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    ...props
  }: { to: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  useRouterState: ({ select }: { select: (s: { location: { pathname: string } }) => string }) =>
    select({ location: { pathname: mocks.pathname } }),
}));
vi.mock("@tanstack/react-query", async (original) => ({
  ...(await original<typeof import("@tanstack/react-query")>()),
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    const key = queryKey.join("/");
    if (key === "admin/is-admin") return { data: mocks.isAdmin, isLoading: false };
    if (key === "admin/reports") return { data: mocks.reports };
    if (key === "admin/suggestions") return { data: mocks.suggestions };
    return { data: undefined };
  },
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { signOut: vi.fn() } } }));
vi.mock("@/components/AppHeader", () => ({ AppHeader: () => <header /> }));

beforeEach(() => {
  mocks.pathname = "/admin";
  mocks.isAdmin = true;
  mocks.reports = [];
  mocks.suggestions = [];
});
afterEach(cleanup);

function openAt(pathname: string) {
  mocks.pathname = pathname;
  render(
    <AdminShell>
      <p>Contenido de la pantalla</p>
    </AdminShell>,
  );
}

const areasNav = () => screen.getByRole("navigation", { name: "Áreas de administración" });

describe("navegación del panel por áreas", () => {
  it("enlaza las seis áreas desde cualquier pantalla", () => {
    openAt("/admin");
    const links = within(areasNav()).getAllByRole("link");
    expect(links.map((l) => [l.textContent, l.getAttribute("href")])).toEqual([
      ["Inicio", "/admin"],
      ["Directorio", "/admin/directorio"],
      ["Identidad municipal", "/admin/identidad"],
      ["Secciones y menús", "/admin/secciones"],
      ["Páginas y contenidos", "/admin/contenidos"],
      ["Configuración", "/admin/configuracion"],
    ]);
    expect(within(areasNav()).getByRole("link", { name: "Inicio" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByText("Contenido de la pantalla")).toBeInTheDocument();
  });

  it("mantiene Fichas, Avisos y Sugerencias dentro del Directorio al editar una ficha", () => {
    mocks.reports = [{ resolved: false }, { resolved: true }];
    mocks.suggestions = [{ handled: false }, { handled: false }];
    openAt("/admin/fichas/3f2b");
    // Dentro del área, pero no en la pantalla a la que lleva el enlace.
    expect(
      within(areasNav()).getByRole("link", { name: /^Directorio\s*, 3 sin atender$/ }),
    ).toHaveAttribute("aria-current", "true");
    const tabs = screen.getByRole("navigation", { name: "Secciones de Directorio" });
    expect(
      within(tabs)
        .getAllByRole("link")
        .map((l) => l.getAttribute("href")),
    ).toEqual(["/admin/directorio", "/admin/avisos", "/admin/sugerencias"]);
    // Los contadores se anuncian con su significado, no como un número suelto.
    expect(
      within(tabs).getByRole("link", { name: /^Avisos\s*, 1 sin atender$/ }),
    ).toBeInTheDocument();
    expect(
      within(tabs).getByRole("link", { name: /^Sugerencias\s*, 2 sin atender$/ }),
    ).toBeInTheDocument();
    expect(within(tabs).getByRole("link", { name: "Fichas" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("marca como página actual solo el enlace de la pantalla abierta", () => {
    openAt("/admin/avisos");
    expect(within(areasNav()).getByRole("link", { name: "Directorio" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    const tabs = screen.getByRole("navigation", { name: "Secciones de Directorio" });
    expect(within(tabs).getByRole("link", { name: "Avisos" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(tabs).getByRole("link", { name: "Fichas" })).not.toHaveAttribute("aria-current");
  });

  it("agrupa los trámites en Páginas y contenidos", () => {
    openAt("/admin/tramites/nuevo");
    expect(within(areasNav()).getByRole("link", { name: "Páginas y contenidos" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    const tabs = screen.getByRole("navigation", { name: "Secciones de Páginas y contenidos" });
    expect(within(tabs).getByRole("link", { name: "Trámites" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("desplaza la lista móvil hasta el área actual", () => {
    const scrolled: string[] = [];
    const original = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = function (this: HTMLElement) {
      scrolled.push(this.textContent ?? "");
    };
    try {
      openAt("/admin/configuracion");
    } finally {
      HTMLElement.prototype.scrollIntoView = original;
    }
    expect(scrolled).toEqual(["Configuración"]);
  });

  it("no muestra pestañas en áreas de una sola pantalla", () => {
    openAt("/admin/identidad");
    expect(screen.getAllByRole("navigation")).toHaveLength(1);
  });

  it("no muestra la navegación ni el contenido a una cuenta sin permisos", () => {
    mocks.isAdmin = false;
    openAt("/admin/directorio");
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByText("Contenido de la pantalla")).not.toBeInTheDocument();
    expect(
      screen.getByText("Esta cuenta no tiene permisos de administración."),
    ).toBeInTheDocument();
  });
});
