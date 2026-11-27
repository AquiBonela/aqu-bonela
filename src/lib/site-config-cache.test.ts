import { afterEach, describe, expect, it, vi } from "vitest";
import { createRefreshingCache } from "./site-config-cache";

function setup(load: (signal: AbortSignal) => Promise<string>) {
  let clock = 1_000_000;
  const onError = vi.fn();
  const cache = createRefreshingCache({
    load,
    fallback: "respaldo",
    freshMs: 60_000,
    staleMs: 86_400_000,
    retryMs: 10_000,
    timeoutMs: 1_500,
    now: () => clock,
    onError,
  });
  return {
    cache,
    onError,
    advance: (ms: number) => {
      clock += ms;
    },
  };
}

afterEach(() => vi.useRealTimers());

describe("caché de configuración", () => {
  it("reutiliza el valor fresco sin volver a consultar", async () => {
    const load = vi.fn(async () => "v1");
    const { cache, advance } = setup(load);
    expect(await cache.get()).toEqual({ value: "v1", source: "fresh" });
    advance(59_999);
    expect(await cache.get()).toEqual({ value: "v1", source: "fresh" });
    expect(load).toHaveBeenCalledOnce();
  });

  it("vuelve a consultar al caducar y recoge el cambio", async () => {
    const load = vi.fn().mockResolvedValueOnce("v1").mockResolvedValueOnce("v2");
    const { cache, advance } = setup(load);
    await cache.get();
    advance(60_000);
    expect(await cache.get()).toEqual({ value: "v2", source: "fresh" });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("si falla, usa el último valor bueno y avisa", async () => {
    const load = vi.fn().mockResolvedValueOnce("v1").mockRejectedValueOnce(new Error("caída"));
    const { cache, advance, onError } = setup(load);
    await cache.get();
    advance(60_000);
    expect(await cache.get()).toEqual({ value: "v1", source: "stale" });
    expect(onError).toHaveBeenCalledOnce();
  });

  it("sin ningún valor bueno devuelve el respaldo", async () => {
    const { cache } = setup(vi.fn().mockRejectedValue(new Error("caída")));
    expect(await cache.get()).toEqual({ value: "respaldo", source: "fallback" });
  });

  it("el último valor bueno deja de usarse pasado staleMs", async () => {
    const load = vi.fn().mockResolvedValueOnce("v1").mockRejectedValue(new Error("caída"));
    const { cache, advance } = setup(load);
    await cache.get();
    advance(86_400_001);
    expect(await cache.get()).toEqual({ value: "respaldo", source: "fallback" });
  });

  it("tras un fallo no reintenta hasta retryMs", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("caída")).mockResolvedValueOnce("v1");
    const { cache, advance } = setup(load);
    await cache.get();
    advance(9_999);
    expect(await cache.get()).toEqual({ value: "respaldo", source: "fallback" });
    expect(load).toHaveBeenCalledOnce();
    advance(1);
    expect(await cache.get()).toEqual({ value: "v1", source: "fresh" });
  });

  it("las peticiones simultáneas comparten una consulta", async () => {
    let resolve: (v: string) => void = () => {};
    const load = vi.fn(
      () =>
        new Promise<string>((r) => {
          resolve = r;
        }),
    );
    const { cache } = setup(load);
    const results = Promise.all([cache.get(), cache.get(), cache.get()]);
    resolve("v1");
    expect((await results).map((r) => r.value)).toEqual(["v1", "v1", "v1"]);
    expect(load).toHaveBeenCalledOnce();
  });

  it("corta la espera y cancela la consulta si Supabase no responde", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const { cache, onError } = setup((s) => {
      signal = s;
      return new Promise<string>(() => {});
    });
    const pending = cache.get();
    await vi.advanceTimersByTimeAsync(1_500);
    expect(await pending).toEqual({ value: "respaldo", source: "fallback" });
    expect(signal?.aborted).toBe(true);
    expect(String(onError.mock.calls[0]?.[0])).toMatch(/1500 ms/);
  });
});
