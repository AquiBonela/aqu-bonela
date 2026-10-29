import { webcrypto } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

const { insert, from } = vi.hoisted(() => {
  const insert = vi.fn();
  return { insert, from: vi.fn(() => ({ insert })) };
});
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));
import { createReviewToken } from "./review-token";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("creación de enlace protegida por la base de datos", () => {
  it("guarda solo el hash SHA-256 de un token de 32 bytes", async () => {
    vi.stubGlobal("crypto", webcrypto);
    insert.mockResolvedValue({ error: null });
    const result = await createReviewToken("00000000-0000-4000-8000-000000000000");
    const row = insert.mock.calls[0]?.[0];
    expect(from).toHaveBeenCalledWith("approval_tokens");
    expect(atob(result.token.replace(/-/g, "+").replace(/_/g, "/") + "=").length).toBe(32);
    const hash = await webcrypto.subtle.digest("SHA-256", new TextEncoder().encode(result.token));
    expect(row.token_hash).toBe(Buffer.from(hash).toString("hex"));
    expect(Object.values(row)).not.toContain(result.token);
  });

  it("el enlace caduca exactamente a los 30 días", async () => {
    vi.stubGlobal("crypto", webcrypto);
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-29T13:44:00Z"));
    insert.mockResolvedValue({ error: null });
    expect((await createReviewToken("00000000-0000-4000-8000-000000000000")).expiresAt)
      .toBe("2026-11-28T13:44:00.000Z");
  });

  it("no devuelve un enlace cuando la base de datos rechaza los permisos", async () => {
    vi.stubGlobal("crypto", webcrypto);
    const error = { code: "42501", message: "row-level security policy" };
    insert.mockResolvedValue({ error });
    await expect(createReviewToken("00000000-0000-4000-8000-000000000000")).rejects.toEqual(error);
  });
});