import { describe, expect, it } from "vitest";
import { publicEnvScript } from "./public-env";

describe("publicEnvScript", () => {
  it("solo expone URL y clave publicable", () => {
    const s = publicEnvScript({
      SUPABASE_URL: "https://x.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "pk",
      SUPABASE_SERVICE_ROLE_KEY: "secret",
    } as never);
    expect(s).toContain("https://x.supabase.co");
    expect(s).not.toContain("secret");
  });
  it("escapa < para no cerrar la etiqueta script", () => {
    expect(
      publicEnvScript({ SUPABASE_URL: "</script>", SUPABASE_PUBLISHABLE_KEY: "" }),
    ).not.toContain("</script>");
  });
});
