import { beforeEach, describe, expect, it, vi } from "vitest";

type Result = { data: unknown; error: unknown };
const mocks = vi.hoisted(() => ({
  updates: [] as { values: unknown; version: unknown }[],
  updateResults: [] as Result[],
  reads: [] as Result[],
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      let values: unknown;
      let updating = false;
      const filters: Record<string, unknown> = {};
      const chain = {
        update: (v: unknown) => ((updating = true), (values = v), chain),
        select: () => chain,
        eq: (k: string, v: unknown) => ((filters[k] = v), chain),
        maybeSingle: async () => {
          if (updating) {
            mocks.updates.push({ values, version: filters["updated_at"] });
            return mocks.updateResults.shift() ?? { data: null, error: null };
          }
          return mocks.reads.shift() ?? { data: null, error: null };
        },
      };
      return chain;
    },
  },
}));

import {
  normalizeInternal,
  saveInternalSettings,
  type InternalSettingsRow,
} from "./internal-settings";

const loaded: InternalSettingsRow = {
  contact_email: "avisos@example.org",
  admin_whatsapp: "+34 600 000 000",
  collaborator_months: 1,
  whatsapp_template: "Hola {nombre}",
  common_labels: ["A"],
  publish_on_owner_approval: true,
  updated_at: "V1",
};

beforeEach(() => {
  mocks.updates = [];
  mocks.updateResults = [];
  mocks.reads = [];
});

describe("ajustes internos", () => {
  it("solo envía sus columnas, nunca textos públicos, y sobre la versión cargada", async () => {
    mocks.updateResults = [
      { data: { ...loaded, admin_whatsapp: "+34 611", updated_at: "V2" }, error: null },
    ];
    const result = await saveInternalSettings(loaded, { ...loaded, admin_whatsapp: " +34 611 " });
    expect(result).toMatchObject({ ok: true, row: { updated_at: "V2" } });
    expect(mocks.updates[0]?.version).toBe("V1");
    expect(Object.keys(mocks.updates[0]?.values as object).sort()).toEqual([
      "admin_whatsapp",
      "collaborator_months",
      "common_labels",
      "contact_email",
      "publish_on_owner_approval",
      "whatsapp_template",
    ]);
  });

  it("si entretanto solo cambió lo publicado, reintenta sobre la versión nueva", async () => {
    mocks.updateResults = [
      { data: null, error: null },
      { data: { ...loaded, updated_at: "V3" }, error: null },
    ];
    mocks.reads = [{ data: { ...loaded, updated_at: "V2" }, error: null }];
    const result = await saveInternalSettings(loaded, loaded);
    expect(result.ok).toBe(true);
    expect(mocks.updates.map((u) => u.version)).toEqual(["V1", "V2"]);
  });

  it("si otra sesión cambió los ajustes internos, no los pisa", async () => {
    mocks.updateResults = [{ data: null, error: null }];
    mocks.reads = [
      { data: { ...loaded, contact_email: "otra@example.org", updated_at: "V2" }, error: null },
    ];
    const result = await saveInternalSettings(loaded, { ...loaded, admin_whatsapp: "+34 622" });
    expect(result).toMatchObject({ ok: false, reason: "conflict" });
    expect(mocks.updates).toHaveLength(1);
  });

  it("normaliza etiquetas y meses", () => {
    expect(
      normalizeInternal({
        ...loaded,
        common_labels: [" a ", "a", "", "b"],
        collaborator_months: 99,
      }),
    ).toMatchObject({
      common_labels: ["a", "b"],
      collaborator_months: 24,
    });
  });
});
