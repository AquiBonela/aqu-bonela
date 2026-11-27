import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MIGRATION = "supabase/migrations/20261127150000_site_identity.sql";
const TEMPLATE = "supabase/template/01_schema.sql";

function identityBlock(file: string): string {
  const text = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const start = text.indexOf("-- >>> site_identity");
  const end = text.indexOf("-- <<< site_identity");
  expect(start, file).toBeGreaterThanOrEqual(0);
  expect(end, file).toBeGreaterThan(start);
  return text.slice(start, end);
}

describe("public.site_identity", () => {
  it("la instalación limpia crea exactamente lo mismo que la migración", () => {
    expect(identityBlock(TEMPLATE)).toBe(identityBlock(MIGRATION));
  });

  it("la migración no contiene datos de ningún municipio", () => {
    const block = identityBlock(MIGRATION);
    expect(block).toMatch(/INSERT INTO public\.site_identity \(id\) VALUES \(true\)/);
    expect(block).not.toMatch(/casarabonela|bonela|m[aá]laga|municipio de ejemplo|conecta tu pueblo demo/i);
  });

  it("site_config() no expone el autor del cambio", () => {
    const fn = identityBlock(MIGRATION).split("CREATE OR REPLACE FUNCTION public.site_config()")[1] ?? "";
    expect(fn).not.toContain("updated_by");
  });
});
