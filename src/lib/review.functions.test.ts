// Diagnóstico del flujo de aprobación por enlace (submitReview y getReview).
// Las pruebas `it.fails` reproducen defectos actuales: pasan mientras el defecto exista y
// deben pasar a `it` cuando se corrija.
import { beforeEach, describe, expect, it, vi } from "vitest";

type Write = { table: string; op: string; payload?: unknown };

const db = vi.hoisted(() => ({
  writes: [] as Write[],
  token: null as null | {
    id: string;
    listing_id: string;
    request_id: null;
    expires_at: string;
    used_at: string | null;
  },
  listing: null as null | Record<string, unknown>,
  failListingUpdate: false,
}));

// Cliente con clave de servicio simulado: devuelve el token y la ficha, y registra cada escritura.
vi.mock("@/integrations/supabase/client.server", () => {
  const from = (table: string) => {
    const chain: Record<string, (...args: unknown[]) => unknown> = {};
    let op = "select";
    let payload: unknown;
    const result = () => {
      if (op !== "select") {
        db.writes.push({ table, op, payload });
        if (table === "listings" && op === "update" && db.failListingUpdate)
          return { data: null, error: { message: "fallo simulado al actualizar la ficha" } };
        return { data: null, error: null };
      }
      if (table === "approval_tokens") return { data: db.token, error: null };
      if (table === "listings") return { data: db.listing, error: null };
      return { data: table === "listing_hours" ? [] : null, error: null };
    };
    for (const name of ["insert", "update", "upsert", "delete"])
      chain[name] = (p?: unknown) => {
        op = name;
        payload = p;
        return chain;
      };
    chain["select"] = () => chain;
    chain["eq"] = () => chain;
    chain["order"] = () => chain;
    chain["maybeSingle"] = () => Promise.resolve(result());
    chain["then"] = (resolve: unknown) =>
      Promise.resolve(result()).then(resolve as (v: unknown) => unknown);
    return chain;
  };
  return {
    supabaseAdmin: {
      from,
      storage: { from: () => ({ createSignedUrls: () => Promise.resolve({ data: [] }) }) },
    },
  };
});
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const chain = {
      inputValidator: () => chain,
      handler: (handler: (ctx: { data: unknown }) => unknown) => (input: { data: unknown }) =>
        handler(input),
    };
    return chain;
  },
}));

import { getReview, submitReview } from "./review.functions";

const TOKEN = "t".repeat(43);
const visibility = {
  show_phone: true,
  show_phone_2: true,
  show_whatsapp: true,
  show_address: true,
  show_email: true,
  show_linkedin: true,
  show_facebook: true,
  show_youtube: true,
  show_x_twitter: true,
  show_instagram: true,
  show_tiktok: true,
};
const submit = (data: Record<string, unknown>) =>
  (submitReview as unknown as (i: { data: unknown }) => Promise<{ ok: boolean }>)({
    data: { token: TOKEN, ...visibility, ...data },
  });
const review = () =>
  (getReview as unknown as (i: { data: unknown }) => Promise<{ ok: boolean; done?: boolean }>)({
    data: { token: TOKEN },
  });

beforeEach(() => {
  db.writes = [];
  db.failListingUpdate = false;
  db.token = {
    id: "tok1",
    listing_id: "f1",
    request_id: null,
    expires_at: "2999-01-01T00:00:00Z",
    used_at: null,
  };
  db.listing = {
    id: "f1",
    type: "comercio",
    slug: "taller",
    status: "borrador",
    tags: ["llantas"],
  };
});

describe("aprobación por enlace", () => {
  it("guarda la marca de horario oculto y publica la ficha cuando el titular lo oculta", async () => {
    const res = await submit({ show_hours: false });
    expect(res.ok).toBe(true);
    const update = db.writes.find((w) => w.table === "listings" && w.op === "update");
    expect(update?.payload).toEqual({
      status: "publicada",
      tags: ["llantas", "__ocultar_horario"],
    });
  });

  // DEFECTO 2: los errores de escritura se ignoran. Si la ficha no se actualiza, el titular ve
  // «autorizada», el enlace queda gastado y su decisión se pierde sin que nadie lo sepa.
  it.fails(
    "si la ficha no se puede actualizar, no informa de éxito ni gasta el enlace",
    async () => {
      db.failListingUpdate = true;
      const res = await submit({ show_hours: false });
      expect(res.ok).toBe(false);
      expect(db.writes.some((w) => w.table === "approval_tokens" && w.op === "update")).toBe(false);
    },
  );

  // DEFECTO 3: con una ficha ya publicada, un enlace nuevo muestra directamente «autorizada»
  // sin interruptores: el titular no puede cambiar nada de una ficha publicada.
  it.fails("un enlace nuevo de una ficha publicada permite al titular revisarla", async () => {
    db.listing = {
      ...db.listing,
      status: "publicada",
      name: "Taller",
      tags: ["llantas", "__ocultar_horario"],
    };
    const res = await review();
    expect(res.ok).toBe(true);
    expect(res.done).toBe(false);
  });
});
