import { describe, expect, it } from "vitest";
import { getRouter } from "@/router";
import { CACHE } from "./cache-policy";
import { directoryQuery } from "./directory";
import { listingDetailQuery } from "./listing-detail";
import { publicProceduresQuery } from "./public-procedures";

describe("estrategia de caché", () => {
  it("cada tipo de dato público tiene su plazo, sin quedar obsoleto mucho tiempo", () => {
    expect(directoryQuery.staleTime).toBe(CACHE.directory.staleTime);
    expect(listingDetailQuery("comercio", "x").staleTime).toBe(CACHE.listing.staleTime);
    expect(publicProceduresQuery.staleTime).toBe(CACHE.procedures.staleTime);
    for (const policy of [CACHE.default, CACHE.directory, CACHE.listing, CACHE.procedures])
      expect(policy.staleTime).toBeLessThanOrEqual(10 * 60_000);
  });

  it("precarga solo al pasar por un enlace y el panel trabaja siempre con datos al día", () => {
    const router = getRouter();
    expect(router.options.defaultPreload).toBe("intent");
    const qc = router.options.context.queryClient;
    expect(qc.getDefaultOptions().queries?.staleTime).toBe(CACHE.default.staleTime);
    expect(qc.getQueryDefaults(["admin", "listing", "x"]).staleTime).toBe(0);
    expect(qc.getQueryDefaults(["admin", "listing", "x"]).refetchOnWindowFocus).toBe(true);
  });
});
