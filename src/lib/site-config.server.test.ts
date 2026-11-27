import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import instance from "@instance";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => mocks.rpc(...args) },
}));

import { brand, getMunicipality, setSiteConfig } from "@/config/municipality";
import { loadSiteConfig, resetSiteConfigCache } from "./site-config.server";

const respond = (result: { data: unknown; error: { code: string; message: string } | null }) =>
  mocks.rpc.mockReturnValueOnce({ abortSignal: () => Promise.resolve(result) });

beforeEach(() => {
  resetSiteConfigCache();
  mocks.rpc.mockReset();
});
afterEach(() => {
  setSiteConfig({ identity: {} });
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("loadSiteConfig", () => {
  it("aplica la identidad de Supabase a getMunicipality() y a las variables de marca", async () => {
    respond({
      data: { identity: { app_name: "Plataforma Prueba", municipality_name: "Villa de Prueba" } },
      error: null,
    });
    const config = await loadSiteConfig();
    expect(mocks.rpc).toHaveBeenCalledWith("site_config");
    expect(config.identity).toEqual({ appName: "Plataforma Prueba", name: "Villa de Prueba" });
    expect(getMunicipality().appName).toBe("Plataforma Prueba");
    expect(brand("{app} en {municipio} ({provincia})")).toBe(
      `Plataforma Prueba en Villa de Prueba (${instance.province})`,
    );
  });

  it("sin la migración aplicada usa la instancia compilada, sin registrar un error", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    respond({
      data: null,
      error: { code: "PGRST202", message: "Could not find the function public.site_config" },
    });
    expect((await loadSiteConfig()).identity).toEqual({});
    expect(getMunicipality().appName).toBe(instance.appName);
    expect(error).not.toHaveBeenCalled();
  });

  it("si Supabase falla, la web sigue con los valores compilados y lo registra", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    respond({ data: null, error: { code: "PGRST000", message: "Could not connect" } });
    expect((await loadSiteConfig()).identity).toEqual({});
    expect(getMunicipality().name).toBe(instance.name);
    expect(error).toHaveBeenCalledOnce();
  });

  it("si Supabase falla después, mantiene la última identidad buena", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.useFakeTimers();
    try {
      respond({ data: { identity: { app_name: "Plataforma Prueba" } }, error: null });
      await loadSiteConfig();
      vi.advanceTimersByTime(60_000);
      respond({ data: null, error: { code: "PGRST000", message: "Could not connect" } });
      expect((await loadSiteConfig()).identity.appName).toBe("Plataforma Prueba");
      expect(mocks.rpc).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("separa la caché por proyecto de Supabase", async () => {
    vi.stubEnv("SUPABASE_URL", "https://proyecto-a.supabase.co");
    respond({ data: { identity: { app_name: "Pueblo A" } }, error: null });
    expect((await loadSiteConfig()).identity.appName).toBe("Pueblo A");
    vi.stubEnv("SUPABASE_URL", "https://proyecto-b.supabase.co");
    respond({ data: { identity: { app_name: "Pueblo B" } }, error: null });
    expect((await loadSiteConfig()).identity.appName).toBe("Pueblo B");
    expect(getMunicipality().appName).toBe("Pueblo B");
  });
});
