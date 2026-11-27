import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

const V1 = "2026-11-27T10:00:00.123456+00:00";
const V2 = "2026-11-27T10:05:00.654321+00:00";

const mocks = vi.hoisted(() => ({
  filters: [] as [string, unknown][][],
  updatedRows: [] as { updated_at: string }[],
  removed: [] as string[],
}));

// La portada se guarda con un UPDATE filtrado; el cliente falso registra los filtros de cada uno.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const filters: [string, unknown][] = [];
      let updating = false;
      const chain: Record<string, (...args: unknown[]) => unknown> = {
        update: () => {
          updating = true;
          mocks.filters.push(filters);
          return chain;
        },
        eq: (column: unknown, value: unknown) => {
          filters.push([column as string, value]);
          return chain;
        },
        select: () =>
          updating ? Promise.resolve({ data: mocks.updatedRows, error: null }) : chain,
        maybeSingle: () => Promise.resolve({ data: { cover_path: null }, error: null }),
      };
      chain["then"] = (resolve: unknown) =>
        Promise.resolve({ data: { cover_path: null }, error: null }).then(
          resolve as (v: unknown) => unknown,
        );
      return chain;
    },
  },
}));
vi.mock("@/lib/listing-images", async (original) => ({
  ...(await original<typeof import("@/lib/listing-images")>()),
  uploadListingImage: () => Promise.resolve("f1/nueva.webp"),
  removeFile: (path: string) => {
    mocks.removed.push(path);
    return Promise.resolve();
  },
  signedUrl: () => Promise.resolve("https://example.org/firmada.webp"),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { CoverPicker } from "./ListingImages";

function upload(onSaved = vi.fn(), onConflict = vi.fn()) {
  const { container } = render(
    <CoverPicker listingId="f1" version={V1} onSaved={onSaved} onConflict={onConflict} />,
  );
  const input = container.querySelector('input[type="file"]')!;
  fireEvent.change(input, {
    target: { files: [new File(["x"], "portada.png", { type: "image/png" })] },
  });
  return { onSaved, onConflict };
}

beforeEach(() => {
  mocks.filters = [];
  mocks.updatedRows = [];
  mocks.removed = [];
  vi.mocked(toast.error).mockClear();
});
afterEach(cleanup);

describe("portada de la ficha", () => {
  it("solo se guarda si la ficha sigue en la versión del formulario, y devuelve la nueva", async () => {
    mocks.updatedRows = [{ updated_at: V2 }];
    const { onSaved, onConflict } = upload();
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(V2));
    expect(mocks.filters[0]).toEqual([
      ["id", "f1"],
      ["updated_at", V1],
    ]);
    expect(onConflict).not.toHaveBeenCalled();
    expect(mocks.removed).toEqual([]);
  });

  it("si la ficha cambió, no cambia la portada, borra la imagen subida y avisa", async () => {
    const { onSaved, onConflict } = upload();
    await waitFor(() => expect(onConflict).toHaveBeenCalled());
    expect(onSaved).not.toHaveBeenCalled();
    await waitFor(() => expect(mocks.removed).toEqual(["f1/nueva.webp"]));
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/ha cambiado/));
  });
});
