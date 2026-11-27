import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MIGRATION = "supabase/migrations/20261129090000_listing_safe_writes.sql";
const TEMPLATE = "supabase/template/01_schema.sql";

function block(file: string): string {
  const text = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const start = text.indexOf("-- >>> listing_safe_writes");
  const end = text.indexOf("-- <<< listing_safe_writes");
  expect(start, file).toBeGreaterThanOrEqual(0);
  expect(end, file).toBeGreaterThan(start);
  return text.slice(start, end);
}

describe("escrituras seguras de fichas", () => {
  it("la instalación limpia crea exactamente lo mismo que la migración", () => {
    expect(block(TEMPLATE)).toBe(block(MIGRATION));
  });

  it("comprueba la versión dentro del propio UPDATE, no con una lectura previa", () => {
    const sql = block(MIGRATION);
    expect(sql).toContain("WHERE l.id = p_id AND l.updated_at = p_expected_updated_at");
    expect(sql).toContain("ERRCODE = 'PT409'");
    expect(sql).toMatch(
      /FROM public\.approval_tokens AS a WHERE a\.token_hash = p_token_hash FOR UPDATE/,
    );
  });

  it("no cambia tablas ni da la aprobación a sesiones del navegador", () => {
    const sql = block(MIGRATION);
    expect(sql).not.toMatch(/ALTER TABLE|CREATE TABLE|DROP TABLE|ALTER TYPE|SECURITY DEFINER/i);
    expect(sql).toContain(
      "REVOKE ALL ON FUNCTION public.approve_listing_review(text, jsonb, boolean, jsonb, text) FROM PUBLIC, anon, authenticated;",
    );
  });
});
