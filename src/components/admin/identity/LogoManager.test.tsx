import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LogoManager } from "./LogoManager";
import type { IdentityRow } from "@/lib/identity-form";

const OLD = "11111111-1111-4111-8111-111111111111";
const NEW = "22222222-2222-4222-8222-222222222222";

const mocks = vi.hoisted(() => ({
  steps: [] as string[],
  updateResult: { data: null as unknown, error: null as unknown },
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock("@/lib/site-assets", async (original) => ({
  ...(await original<typeof import("@/lib/site-assets")>()),
  newAssetId: () => NEW,
  prepareLogo: async () => ({
    logo: new Blob(["l"]),
    icon: new Blob(["i"]),
    iconSmall: new Blob(["s"]),
  }),
  uploadSiteAsset: async (path: string) => void mocks.steps.push(`subir ${path}`),
  removeSiteAssets: async (paths: string[]) => {
    mocks.steps.push(`borrar ${paths.filter(Boolean).join(",")}`);
    return true;
  },
}));
vi.mock("@/integrations/supabase/client", () => {
  const chain = {
    update: (values: unknown) => (mocks.steps.push(`guardar ${JSON.stringify(values)}`), chain),
    eq: () => chain,
    select: () => chain,
    maybeSingle: async () => mocks.updateResult,
  };
  return { supabase: { from: () => chain } };
});

const row = {
  logo_path: `identidad/${OLD}/logo.webp`,
  logo_light_path: "",
  icon_path: `identidad/${OLD}/icono-512.png`,
  icon_small_path: `identidad/${OLD}/icono-192.png`,
  updated_at: "2026-11-28T10:00:00.000000+00:00",
} as IdentityRow;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.steps = [];
});
afterEach(cleanup);

function upload(file = new File(["x"], "logo.png", { type: "image/png" })) {
  const input = document.getElementById("identidad-logo-archivo") as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

describe("gestión del logotipo", () => {
  it("sube los archivos nuevos, guarda sus rutas y después borra los anteriores", async () => {
    const onSaved = vi.fn();
    mocks.updateResult = { data: { ...row, logo_path: `identidad/${NEW}/logo.webp` }, error: null };
    render(<LogoManager row={row} onSaved={onSaved} />);
    upload();
    await waitFor(() => expect(mocks.success).toHaveBeenCalledOnce());
    expect(mocks.steps).toEqual([
      `subir identidad/${NEW}/logo.webp`,
      `subir identidad/${NEW}/icono-512.png`,
      `subir identidad/${NEW}/icono-192.png`,
      `guardar {"logo_path":"identidad/${NEW}/logo.webp","icon_path":"identidad/${NEW}/icono-512.png","icon_small_path":"identidad/${NEW}/icono-192.png"}`,
      `borrar identidad/${OLD}/logo.webp,identidad/${OLD}/icono-512.png,identidad/${OLD}/icono-192.png`,
    ]);
    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({ logo_path: `identidad/${NEW}/logo.webp` }),
    );
  });

  it("si no se puede guardar, borra lo recién subido y conserva el logotipo anterior", async () => {
    const onSaved = vi.fn();
    mocks.updateResult = { data: null, error: null };
    render(<LogoManager row={row} onSaved={onSaved} />);
    upload();
    await waitFor(() => expect(mocks.error).toHaveBeenCalledOnce());
    expect(mocks.steps.at(-1)).toBe(
      `borrar identidad/${NEW}/logo.webp,identidad/${NEW}/icono-512.png,identidad/${NEW}/icono-192.png`,
    );
    expect(mocks.steps.join(" ")).not.toContain(`borrar identidad/${OLD}`);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("no acepta formatos que no son imágenes", async () => {
    render(<LogoManager row={row} onSaved={vi.fn()} />);
    upload(new File(["x"], "logo.pdf", { type: "application/pdf" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Formato no admitido."));
    expect(mocks.steps).toEqual([]);
  });

  it("al eliminarlo deja la identidad sin logotipo y borra sus archivos", async () => {
    mocks.updateResult = {
      data: { ...row, logo_path: "", icon_path: "", icon_small_path: "" },
      error: null,
    };
    render(<LogoManager row={row} onSaved={vi.fn()} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Eliminar" })[0]!);
    await waitFor(() => expect(mocks.success).toHaveBeenCalledOnce());
    expect(mocks.steps[0]).toBe(`guardar {"logo_path":"","icon_path":"","icon_small_path":""}`);
    expect(mocks.steps[1]).toContain(`borrar identidad/${OLD}/logo.webp`);
  });
});
