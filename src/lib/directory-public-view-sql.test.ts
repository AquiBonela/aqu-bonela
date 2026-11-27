import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MIGRATION = "supabase/migrations/20261128090000_directory_public_view.sql";
const TEMPLATE = "supabase/template/01_schema.sql";

function block(file: string): string {
  const text = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const start = text.indexOf("-- >>> directory_public_view");
  const end = text.indexOf("-- <<< directory_public_view");
  expect(start, file).toBeGreaterThanOrEqual(0);
  expect(end, file).toBeGreaterThan(start);
  return text.slice(start, end);
}

describe("vista pública del Directorio", () => {
  it("la instalación limpia crea exactamente lo mismo que la migración", () => {
    expect(block(TEMPLATE)).toBe(block(MIGRATION));
  });

  it("no expone columnas internas ni cambia tablas de fichas", () => {
    const sql = block(MIGRATION);
    const view = sql.slice(
      sql.indexOf("CREATE OR REPLACE VIEW"),
      sql.indexOf("FROM public.listings AS l"),
    );
    for (const internal of [
      "featured_until AS",
      "l.created_at",
      "l.updated_at",
      "l.published_at",
      "l.home_service",
      "l.service_area",
      "l.status,",
    ]) {
      expect(view).not.toContain(internal);
    }
    expect(sql).not.toMatch(/ALTER TABLE|CREATE TABLE|DROP TABLE|ALTER TYPE/i);
  });
});
