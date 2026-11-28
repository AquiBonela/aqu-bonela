import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LogoManager } from "./LogoManager";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    storage: {
      from: () => ({
        createSignedUrl: async (path: string) => ({
          data: { signedUrl: `https://firmada.example.org/${path}` },
          error: null,
        }),
      }),
    },
  },
}));

afterEach(cleanup);

const empty = { logo_path: "", logo_light_path: "", icon_path: "", icon_small_path: "" };

function renderLogos(props: Partial<React.ComponentProps<typeof LogoManager>> = {}) {
  const handlers = {
    onChooseLogo: vi.fn(),
    onChooseLight: vi.fn(),
    onRemoveLogo: vi.fn(),
    onRemoveLight: vi.fn(),
  };
  render(
    <QueryClientProvider client={new QueryClient()}>
      <LogoManager
        assets={empty}
        pendingLogo={null}
        pendingLight={null}
        disabled={false}
        {...handlers}
        {...props}
      />
    </QueryClientProvider>,
  );
  return handlers;
}

describe("logotipo en el borrador de la identidad", () => {
  it("pasa la imagen elegida a la pantalla, que la sube al guardar el borrador", () => {
    const handlers = renderLogos();
    const file = new File(["x"], "logo.png", { type: "image/png" });
    fireEvent.change(document.getElementById("identidad-logo-archivo") as HTMLInputElement, {
      target: { files: [file] },
    });
    expect(handlers.onChooseLogo).toHaveBeenCalledWith(file);
  });

  it("muestra la vista previa de la imagen elegida aunque aún no esté subida", () => {
    renderLogos({ pendingLogo: "blob:vista-previa" });
    expect(screen.getByAltText("Vista previa del logotipo en la cabecera")).toHaveAttribute(
      "src",
      "blob:vista-previa",
    );
    expect(screen.getByRole("button", { name: "Quitar" })).toBeInTheDocument();
  });

  it("firma la imagen guardada en el borrador para verla en el panel", async () => {
    renderLogos({
      assets: { ...empty, logo_path: "identidad/11111111-1111-4111-8111-111111111111/logo.webp" },
    });
    expect(await screen.findByAltText("Vista previa del logotipo en la cabecera")).toHaveAttribute(
      "src",
      "https://firmada.example.org/identidad/11111111-1111-4111-8111-111111111111/logo.webp",
    );
  });

  it("quitar el logotipo lo pide a la pantalla, sin borrar archivos publicados", () => {
    const handlers = renderLogos({
      assets: { ...empty, logo_path: "identidad/11111111-1111-4111-8111-111111111111/logo.webp" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Quitar" })[0]!);
    expect(handlers.onRemoveLogo).toHaveBeenCalledOnce();
  });
});
