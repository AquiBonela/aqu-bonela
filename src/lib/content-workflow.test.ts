import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import {
  draftActions,
  draftScreen,
  HEADER_ROUTES,
  parseDraftState,
  validateConformity,
  workflowError,
} from "./content-workflow";
import { PAGE_KEYS } from "./site-identity";

const draft = (status: string, extra: Record<string, unknown> = {}) =>
  parseDraftState({
    exists: true,
    published: { a: 1 },
    content: { a: 2 },
    status,
    updated_at: "2026-11-28T10:00:00Z",
    created_at: "2026-11-28T09:00:00Z",
    submitted_at: status === "borrador" ? null : "2026-11-28T09:30:00Z",
    stale: false,
    conformity:
      status === "conforme"
        ? { by: "Alcaldía", on: "2026-11-28", channel: "correo", reference: null, recorded_at: "x" }
        : null,
    ...extra,
  });

describe("estado del borrador", () => {
  it("sin borrador, solo hay lo publicado", () => {
    expect(parseDraftState({ exists: false, published: { a: 1 } })).toEqual({
      published: { a: 1 },
      draft: null,
    });
    expect(parseDraftState(null)).toEqual({ published: null, draft: null });
  });

  it("lee estado, versión, presentación y conformidad", () => {
    const state = draft("conforme");
    expect(state.draft).toMatchObject({
      status: "conforme",
      updatedAt: "2026-11-28T10:00:00Z",
      submittedAt: "2026-11-28T09:30:00Z",
      conformity: { by: "Alcaldía", channel: "correo", reference: null },
    });
  });

  it("no inventa una conformidad en un estado que no la tiene", () => {
    expect(
      draft("presentado", { conformity: { by: "x", channel: "correo" } }).draft?.conformity,
    ).toBeNull();
    expect(draft("raro").draft?.status).toBe("borrador");
  });
});

describe("pasos posibles en cada estado", () => {
  it.each([
    ["borrador", { submit: true, recordConformity: false, publish: false, returnToDraft: false }],
    ["presentado", { submit: false, recordConformity: true, publish: false, returnToDraft: true }],
    ["conforme", { submit: false, recordConformity: false, publish: true, returnToDraft: true }],
  ])("%s", (status, expected) => {
    expect(draftActions(draft(status), false)).toMatchObject({
      ...expected,
      save: false,
      discard: true,
    });
  });

  it("con cambios sin guardar solo se puede guardar o deshacer", () => {
    expect(draftActions(draft("conforme"), true)).toMatchObject({
      save: true,
      submit: false,
      recordConformity: false,
      publish: false,
    });
  });

  it("un borrador desfasado no se presenta ni se publica, pero se puede descartar", () => {
    const stale = draft("conforme", { stale: true });
    expect(draftActions(stale, false)).toMatchObject({ publish: false, discard: true });
    expect(draftActions(draft("borrador", { stale: true }), false).submit).toBe(false);
  });

  it("sin borrador ni cambios no hay nada que hacer", () => {
    expect(draftActions(parseDraftState({ exists: false, published: {} }), false)).toEqual({
      save: false,
      submit: false,
      recordConformity: false,
      returnToDraft: false,
      publish: false,
      discard: false,
    });
  });
});

describe("respuestas de la base", () => {
  it.each([
    ["draft_changed", "draft_changed"],
    ["published_changed", "published_changed"],
    ["conformity_required", "conformity_required"],
    ["missing_asset", "missing_asset"],
    ["invalid_content", "invalid_content"],
  ])("%s", (hint, kind) => {
    expect(workflowError({ code: "PT422", hint }).kind).toBe(kind);
  });

  it("un rechazo de permisos no se confunde con un fallo de conexión", () => {
    expect(workflowError({ code: "42501" }).kind).toBe("forbidden");
    expect(workflowError({ code: "08006" }).kind).toBe("network");
  });

  it("los datos de conformidad rechazados conservan la explicación de la base", () => {
    expect(
      workflowError({
        code: "PT422",
        hint: "invalid_conformity",
        message: "La fecha no puede ser futura",
      }).message,
    ).toBe("La fecha no puede ser futura");
  });
});

describe("validación de la conformidad", () => {
  const today = new Date("2026-11-28T12:00:00");
  const ok = { by: "Alcaldía", on: "2026-11-28", channel: "correo" as const, reference: "" };

  it("acepta una conformidad completa de hoy", () => {
    expect(validateConformity(ok, "2026-11-27T10:00:00Z", today)).toEqual({});
  });

  it("exige quién, medio y una fecha ni futura ni anterior a la presentación", () => {
    expect(validateConformity({ ...ok, by: " x " }, null, today).by).toBeDefined();
    expect(validateConformity({ ...ok, channel: "" }, null, today).channel).toBeDefined();
    expect(validateConformity({ ...ok, on: "2026-11-30" }, null, today).on).toMatch(/futura/);
    expect(
      validateConformity({ ...ok, on: "2026-11-20" }, "2026-11-27T10:00:00Z", today).on,
    ).toMatch(/anterior/);
    expect(validateConformity({ ...ok, reference: "<b>" }, null, today).reference).toBeDefined();
  });
});

describe("pantalla de cada borrador", () => {
  it("cada cabecera de página tiene su pantalla en el panel", () => {
    for (const page of PAGE_KEYS) {
      expect(HEADER_ROUTES[page]).toMatch(/^\/admin\//);
      expect(draftScreen(`cabecera:${page}`)?.to).toBe(HEADER_ROUTES[page]);
    }
  });

  it("nombra y enlaza las pantallas fijas y las de secciones", () => {
    expect(draftScreen("identidad")).toEqual({
      label: "Identidad municipal",
      to: "/admin/identidad",
    });
    expect(draftScreen("secciones:descubre")?.to).toBe("/admin/descubre");
    expect(draftScreen("otra")).toBeNull();
  });
});
