import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import demo from "../../instances/demo/config";
import { serveSiteAsset } from "./site-assets.server";
import { buildWebManifest } from "./web-manifest";

const UUID = "11111111-1111-4111-8111-111111111111";
const LOGO = `identidad/${UUID}/logo.webp`;

beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://demo.supabase.co/");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "clave-publicable");
});
afterEach(() => vi.unstubAllEnvs());

describe("recursos gráficos servidos desde el propio dominio", () => {
  it("lee el archivo del bucket con la clave publicable y lo guarda en caché para siempre", async () => {
    const fetchImpl = vi.fn(async () => new Response("imagen", { status: 200 }));
    const res = await serveSiteAsset(LOGO, fetchImpl);
    expect(fetchImpl).toHaveBeenCalledWith(
      `https://demo.supabase.co/storage/v1/object/authenticated/site-assets/${LOGO}`,
      expect.objectContaining({
        headers: { apikey: "clave-publicable", authorization: "Bearer clave-publicable" },
      }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(res.headers.get("content-type")).toBe("image/webp");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await res.text()).toBe("imagen");
  });

  it("no consulta Supabase para rutas que el panel no genera", async () => {
    const fetchImpl = vi.fn();
    for (const path of [
      "../listing-photos/x.webp",
      `identidad/${UUID}/../secreto.png`,
      "otro.svg",
    ]) {
      const res = await serveSiteAsset(path, fetchImpl as unknown as typeof fetch);
      expect(res.status).toBe(404);
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("devuelve 404 con caché corta si el archivo ya no se usa", async () => {
    const res = await serveSiteAsset(LOGO, async () => new Response("{}", { status: 400 }));
    expect(res.status).toBe(404);
    expect(res.headers.get("cache-control")).toBe("public, max-age=60");
  });

  it("no guarda en caché un fallo de conexión", async () => {
    const res = await serveSiteAsset(LOGO, async () => {
      throw new Error("sin conexión");
    });
    expect(res.status).toBe(503);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});

describe("manifiesto de la aplicación", () => {
  it("usa el nombre, el color y los iconos de la instalación", () => {
    const manifest = buildWebManifest(demo);
    expect(manifest.name).toBe(demo.appName);
    expect(manifest.theme_color).toBe(demo.theme.themeColor);
    expect(manifest.icons.map((i) => i.src)).toEqual([
      demo.assets.pwaIcons.icon192,
      demo.assets.pwaIcons.icon512,
    ]);
  });
});
