// Flujo de aprobación por enlace (submitReview y getReview).
// La aprobación es una sola llamada transaccional a la base (approve_listing_review): la
// atomicidad y la concurrencia se prueban contra Postgres en supabase/tests/listing_safe_writes.sql
// y scripts/ci-concurrency.sh. Aquí se prueba lo que hace el servidor con cada resultado.
import { beforeEach, describe, expect, it, vi } from "vitest";

type Write = { table: string; op: string; payload?: unknown };
type Rpc = { fn: string; args: Record<string, unknown> };

const db = vi.hoisted(() => ({
  writes: [] as Write[],
  rpcs: [] as Rpc[],
  rpcResult: { data: null as unknown, error: null as null | { code: string; message: string } },
  token: null as null | {
    id: string;
    listing_id: string;
    request_id: null;
    expires_at: string;
    used_at: string | null;
  },
  listing: null as null | Record<string, unknown>,
}));

// Cliente con clave de servicio simulado: devuelve el token y la ficha, y registra cada escritura
// directa en tablas y cada llamada a funciones de la base.
vi.mock("@/integrations/supabase/client.server", () => {
  const from = (table: string) => {
    const chain: Record<string, (...args: unknown[]) => unknown> = {};
    let op = "select";
    let payload: unknown;
    const result = () => {
      if (op !== "select") {
        db.writes.push({ table, op, payload });
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
      rpc: (fn: string, args: Record<string, unknown>) => {
        db.rpcs.push({ fn, args });
        return Promise.resolve(db.rpcResult);
      },
      storage: { from: () => ({ createSignedUrls: () => Promise.resolve({ data: [] }) }) },
    },
  };
});
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const chain = {
      inputValidator: (validate: (d: unknown) => unknown) => ({
        handler: (handler: (ctx: { data: unknown }) => unknown) => (input: { data: unknown }) =>
          handler({ data: validate(input.data) }),
      }),
    };
    return chain;
  },
}));

import { getReview, sendCorrection, submitReview } from "./review.functions";
import { REVIEW_TERMS_VERSION } from "./listing-review";

const TOKEN = "t".repeat(43);
const visibility = {
  show_phone: false,
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
type Result = { ok: boolean; url?: string | null; reason?: string };
const submit = (data: Record<string, unknown>) =>
  (submitReview as unknown as (i: { data: unknown }) => Promise<Result>)({
    data: { token: TOKEN, ...visibility, accepted_terms: true, ...data },
  });
const review = () =>
  (getReview as unknown as (i: { data: unknown }) => Promise<{ ok: boolean; done?: boolean }>)({
    data: { token: TOKEN },
  });
async function sha256(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

beforeEach(() => {
  db.writes = [];
  db.rpcs = [];
  db.rpcResult = { data: { status: "ok", type: "comercio", slug: "taller" }, error: null };
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
  it("envía la decisión completa del titular en una sola operación de la base", async () => {
    const res = await submit({ show_hours: false, comment: "Todo correcto" });
    expect(res).toEqual({ ok: true, url: "/comercios/taller", published: true });
    expect(db.rpcs).toHaveLength(1);
    const [call] = db.rpcs;
    expect(call?.fn).toBe("approve_listing_review");
    expect(call?.args).toEqual({
      p_token_hash: await sha256(TOKEN),
      p_visibility: {
        ...visibility,
        show_website: false,
        show_service_area: false,
        show_approximate_location: false,
      },
      p_show_hours: false,
      p_authorized_fields: [
        "segundo teléfono",
        "whatsapp",
        "dirección",
        "email",
        "linkedin",
        "facebook",
        "youtube",
        "x_twitter",
        "instagram",
        "tiktok",
      ],
      p_comment: "Todo correcto",
      p_terms_version: REVIEW_TERMS_VERSION,
    });
    // Ninguna escritura suelta: o se aplica todo en la base o nada.
    expect(db.writes).toEqual([]);
  });

  it("sin comentario no envía p_comment y el horario se muestra por defecto", async () => {
    await submit({});
    expect(db.rpcs[0]?.args).not.toHaveProperty("p_comment");
    expect(db.rpcs[0]?.args["p_show_hours"]).toBe(true);
    expect(db.rpcs[0]?.args["p_authorized_fields"]).toContain("horario");
  });

  // Antes era DEFECTO 2: los errores de escritura se ignoraban y el titular veía «autorizada».
  it("si la base no completa la aprobación, no informa de éxito ni gasta el enlace", async () => {
    db.rpcResult = { data: null, error: { code: "23514", message: "fallo simulado" } };
    const res = await submit({ show_hours: false });
    expect(res).toEqual({ ok: false, reason: "error" });
    expect(db.writes.some((w) => w.table === "approval_tokens")).toBe(false);
    expect(db.writes).toEqual([]);
  });

  it("una respuesta inesperada de la base tampoco se presenta como éxito", async () => {
    db.rpcResult = { data: { status: "ok" }, error: null };
    expect(await submit({})).toEqual({ ok: false, reason: "error" });
  });

  it("un enlace ya usado no muestra éxito: esta vez no se aplicó nada", async () => {
    db.rpcResult = { data: { status: "used" }, error: null };
    expect(await submit({})).toEqual({ ok: false, reason: "used" });
  });

  it("un enlace caducado o desconocido se rechaza", async () => {
    db.rpcResult = { data: { status: "expired" }, error: null };
    expect(await submit({})).toEqual({ ok: false, reason: "expired" });
    db.rpcResult = { data: { status: "invalid" }, error: null };
    expect(await submit({})).toEqual({ ok: false, reason: "invalid" });
  });

  // Antes era DEFECTO 3 (fijado hasta la etapa 5): un enlace nuevo de una ficha ya publicada la
  // daba por autorizada. Cambio deliberado: ahora solo cuenta si el enlace se usó, así el titular
  // puede volver a revisar su ficha cuando cambian datos relevantes.
  it("un enlace nuevo de una ficha ya publicada permite volver a revisarla", async () => {
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

  it("no autoriza sin aceptar expresamente las condiciones", async () => {
    await expect(Promise.resolve().then(() => submit({ accepted_terms: false }))).rejects.toThrow();
    expect(db.rpcs).toEqual([]);
  });

  it("si la publicación queda para la administración, no envía al titular a una ficha sin publicar", async () => {
    db.rpcResult = {
      data: { status: "ok", type: "comercio", slug: "taller", published: false },
      error: null,
    };
    expect(await submit({})).toEqual({ ok: true, url: null, published: false });
  });
});

describe("correcciones del titular", () => {
  const correct = (comment: string) =>
    (sendCorrection as unknown as (i: { data: unknown }) => Promise<Result>)({
      data: { token: TOKEN, comment },
    });

  it("las pide en una sola operación de la base que gasta el enlace", async () => {
    db.rpcResult = { data: { status: "ok" }, error: null };
    expect(await correct("El teléfono ha cambiado")).toEqual({ ok: true, url: null });
    expect(db.rpcs).toEqual([
      {
        fn: "request_listing_corrections",
        args: { p_token_hash: await sha256(TOKEN), p_message: "El teléfono ha cambiado" },
      },
    ]);
    expect(db.writes).toEqual([]);
  });

  it("explica por qué no se aplicó (mensaje corto, enlace usado o fallo)", async () => {
    db.rpcResult = { data: { status: "invalid_message" }, error: null };
    expect(await correct("no")).toEqual({ ok: false, reason: "invalid_message" });
    db.rpcResult = { data: { status: "used" }, error: null };
    expect(await correct("Otra corrección")).toEqual({ ok: false, reason: "used" });
    db.rpcResult = { data: null, error: { code: "XX000", message: "fallo" } };
    expect(await correct("Otra corrección")).toEqual({ ok: false, reason: "error" });
  });
});
