import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { ADMIN_AREAS, adminAreaForPath, adminSectionForPath } from "./admin-areas";

describe("áreas del panel", () => {
  it("ofrece las seis áreas en el orden acordado", () => {
    expect(ADMIN_AREAS.map((a) => a.label)).toEqual([
      "Inicio",
      "Directorio",
      "Identidad municipal",
      "Secciones y menús",
      "Páginas y contenidos",
      "Configuración",
    ]);
  });

  it.each([
    ["/admin", "inicio", "Inicio"],
    ["/admin/", "inicio", "Inicio"],
    ["/admin/directorio", "directorio", "Fichas"],
    ["/admin/fichas/nueva", "directorio", "Fichas"],
    ["/admin/fichas/3f2b", "directorio", "Fichas"],
    ["/admin/avisos", "directorio", "Avisos"],
    ["/admin/sugerencias", "directorio", "Sugerencias"],
    ["/admin/identidad", "identidad", "Identidad municipal"],
    ["/admin/secciones", "secciones", "Secciones y menús"],
    ["/admin/contenidos", "contenidos", "General"],
    ["/admin/tramites", "contenidos", "Trámites"],
    ["/admin/tramites/nuevo", "contenidos", "Trámites"],
    ["/admin/configuracion", "configuracion", "Configuración"],
  ])("%s pertenece a %s (%s)", (path, area, section) => {
    expect(adminAreaForPath(path).id).toBe(area);
    expect(adminSectionForPath(path)?.label).toBe(section);
  });

  it("no confunde rutas que solo comparten el comienzo del nombre", () => {
    expect(adminSectionForPath("/admin/fichasx")).toBeUndefined();
    expect(adminAreaForPath("/admin/fichasx").id).toBe("inicio");
  });

  it("enlaza solo a pantallas que existen en el router", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const targets = ADMIN_AREAS.flatMap((a) => [a.to, ...a.sections.map((s) => s.to)]);
    for (const to of new Set(targets)) {
      const leaf = router.matchRoutes(to).at(-1);
      expect(leaf?.routeId, to).toMatch(/^\/_authenticated\/admin\//);
    }
  });

  it("mantiene el listado de fichas del Directorio en su nueva dirección", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes("/admin").at(-1)?.routeId).toBe("/_authenticated/admin/");
    expect(router.matchRoutes("/admin/directorio").at(-1)?.routeId).toBe(
      "/_authenticated/admin/directorio",
    );
    expect(router.matchRoutes("/admin/fichas/nueva").at(-1)?.routeId).toBe(
      "/_authenticated/admin/fichas/$id",
    );
  });
});
