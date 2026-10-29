import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ from: vi.fn(), storageFrom: vi.fn(), remove: vi.fn(), deletion: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from, storage: { from: mocks.storageFrom } } }));
import { deleteListing } from "./delete-listing";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.storageFrom.mockReturnValue({ remove: mocks.remove });
  mocks.remove.mockResolvedValue({ error: null });
  mocks.deletion.mockResolvedValue({ data: { id: "listing-1" }, error: null });
  mocks.from.mockImplementation((table: string) => ({
    select: () => ({ eq: () => table === "listing_photos"
      ? Promise.resolve({ data: [{ storage_path: "listing-1/gallery.webp" }], error: null })
      : { single: async () => ({ data: { cover_path: "listing-1/cover.webp" }, error: null }) } }),
    delete: () => ({ eq: () => ({ select: () => ({ single: mocks.deletion }) }) }),
  }));
});

describe("eliminación de fichas", () => {
  it("elimina la ficha y después los archivos de cabecera y galería", async () => {
    expect(await deleteListing("listing-1")).toEqual({ cleanupFailed: false });
    expect(mocks.deletion).toHaveBeenCalledOnce();
    expect(mocks.remove).toHaveBeenCalledWith(["listing-1/cover.webp", "listing-1/gallery.webp"]);
    expect(mocks.deletion.mock.invocationCallOrder[0]).toBeLessThan(mocks.remove.mock.invocationCallOrder[0] ?? 0);
  });
  it("no elimina fotos si la base de datos rechaza eliminar la ficha", async () => {
    mocks.deletion.mockResolvedValue({ data: null, error: { code: "42501" } });
    await expect(deleteListing("listing-1")).rejects.toEqual({ code: "42501" });
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("avisa cuando falla la limpieza de fotos", async () => {
    mocks.remove.mockResolvedValue({ error: { message: "storage failed" } });
    expect(await deleteListing("listing-1")).toEqual({ cleanupFailed: true });
  });
});