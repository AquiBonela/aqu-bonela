import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { ADMIN_AREAS, adminAreaForPath, adminSectionForPath } from "./admin-areas";

describe("áreas del panel", () => {
  it("ofrece las ocho áreas en el orden acordado", () => {
    expect(ADMIN_AREAS.map((a) => a.label)).toEqual([
      "Inicio",
      "Identidad municipal",
      "Portada",
      "Directorio",
      "Servicios públicos",
      "Actualidad",
      "Descubre",
      "Configuración",
    ]);
  });

  it.each([
    ["/admin", "inicio", "Inicio"],
    ["/admin/", "inicio", "Inicio"],
    ["/admin/directorio", "directorio", "Fichas"],
    ["/admin/fichas/nueva", "directorio", "Fichas"],
    ["/admin/fichas/3f2b", "directorio", "Fichas"],
    ["/admin/avisos", "directorio", "Correcciones"],
    ["/admin/sugerencias", "directorio", "Sugerencias"],
    ["/admin/directorio/presentacion", "directorio", "Presentación"],
    ["/admin/identidad", "identidad", "Identidad municipal"],
    ["/admin/portada", "portada", "Presentación"],
    ["/admin/portada/aviso", "portada", "Aviso"],
    ["/admin/portada/accesos", "portada", "Accesos directos"],
    ["/admin/servicios-publicos", "servicios-publicos", "Configuración"],
    ["/admin/tramites", "servicios-publicos", "Guía de trámites"],
    ["/admin/tramites/nuevo", "servicios-publicos", "Guía de trámites"],
    ["/admin/actualidad", "actualidad", "Configuración"],
    ["/admin/descubre", "descubre", "Configuración"],
    ["/admin/configuracion", "configuracion", "Menú"],
    ["/admin/configuracion/secciones", "configuracion", "Secciones"],
    ["/admin/configuracion/legal", "configuracion", "Datos legales"],
    ["/admin/configuracion/ajustes", "configuracion", "Ajustes"],
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
      "/_authenticated/admin/directorio/",
    );
    expect(router.matchRoutes("/admin/fichas/nueva").at(-1)?.routeId).toBe(
      "/_authenticated/admin/fichas/$id",
    );
  });

  it("conserva las direcciones anteriores como redirecciones", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    for (const [path, id] of <[string, string][]>[
      ["/admin/secciones", "/_authenticated/admin/secciones"],
      ["/admin/contenidos", "/_authenticated/admin/contenidos/"],
      ["/admin/contenidos/inicio", "/_authenticated/admin/contenidos/$pagina"],
    ])
      expect(router.matchRoutes(path).at(-1)?.routeId, path).toBe(id);
  });
});
