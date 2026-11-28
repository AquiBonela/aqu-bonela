import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import { describeActivity, type AuditEntry } from "./admin-activity";

const entry = (e: Partial<AuditEntry>): AuditEntry => ({
  id: 1,
  occurred_at: "2026-11-28T10:00:00Z",
  operation: "update",
  table_name: "content_drafts",
  record_key: "menu",
  changed_columns: [],
  state: null,
  actor: "u1",
  actor_role: "authenticated",
  ...e,
});

describe("actividad reciente", () => {
  it("narra el circuito de un borrador", () => {
    const items = describeActivity([
      entry({ id: 5, table_name: "content_publications", operation: "insert", state: "menu" }),
      entry({ id: 4, state: "conforme", changed_columns: ["conformity_by", "status"] }),
      entry({ id: 3, state: "presentado", changed_columns: ["status", "submitted_at"] }),
      entry({ id: 2, state: "borrador", changed_columns: ["content"] }),
      entry({ id: 1, operation: "insert", state: "borrador" }),
    ]);
    expect(items.map((i) => i.text)).toEqual([
      "Publicado: Menú de navegación",
      "Conformidad registrada: Menú de navegación",
      "Presentado al Ayuntamiento: Menú de navegación",
      "Borrador guardado: Menú de navegación",
      "Borrador nuevo: Menú de navegación",
    ]);
    expect(items[0]?.to).toBe("/admin/configuracion");
  });

  it("distingue un borrador descartado del que se borra al publicarlo", () => {
    const at = "2026-11-28T11:00:00Z";
    const items = describeActivity([
      entry({ id: 3, occurred_at: at, operation: "delete", record_key: "menu", state: "conforme" }),
      entry({
        id: 2,
        occurred_at: at,
        table_name: "content_publications",
        operation: "insert",
        state: "menu",
      }),
      entry({ id: 1, operation: "delete", record_key: "portada", state: "borrador" }),
    ]);
    expect(items.map((i) => i.text)).toEqual([
      "Publicado: Menú de navegación",
      "Borrador descartado: Directorio: textos de presentación",
    ]);
  });

  it("omite los cambios internos de una publicación y lo que hace la instalación", () => {
    expect(
      describeActivity([
        entry({ table_name: "site_settings", changed_columns: ["hero_title"] }),
        entry({
          table_name: "categories",
          actor: null,
          actor_role: "postgres",
          operation: "insert",
        }),
      ]),
    ).toEqual([]);
    expect(
      describeActivity([
        entry({ table_name: "site_settings", changed_columns: ["admin_whatsapp"] }),
      ])[0]?.text,
    ).toBe("Ajustes generales guardados");
  });

  it("incluye la aceptación del titular, que hace el servidor", () => {
    const items = describeActivity(
      [
        entry({
          table_name: "consents",
          operation: "insert",
          record_key: "l1:c1",
          actor: null,
          actor_role: "service_role",
        }),
        entry({
          table_name: "listings",
          record_key: "l1",
          changed_columns: ["status"],
          state: "publicada",
          actor: null,
          actor_role: "service_role",
        }),
      ],
      (id) => (id === "l1" ? "Panadería" : undefined),
    );
    expect(items.map((i) => i.text)).toEqual([
      "El titular aceptó la revisión: Panadería",
      "Ficha publicada: Panadería",
    ]);
    expect(items[1]).toMatchObject({ to: "/admin/fichas/$id", params: { id: "l1" } });
  });
});
