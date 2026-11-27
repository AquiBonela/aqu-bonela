import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Migraciones de la implementación integral (identidad visual, fichas y revisión). Cada una debe
 * estar en la plantilla limpia sin cambios y tener su vuelta atrás.
 */
const MIGRATIONS = [
  { file: "20261201090000_identity_branding.sql", block: "identity_branding" },
  { file: "20261201091000_listing_details.sql", block: "listing_details" },
  { file: "20261201092000_listing_review_flow.sql", block: "listing_review_flow" },
] as const;
const TEMPLATE = "supabase/template/01_schema.sql";

const read = (file: string) => readFileSync(file, "utf8").replace(/\r\n/g, "\n");

function block(file: string, name: string): string {
  const text = read(file);
  const start = text.indexOf(`-- >>> ${name}`);
  const end = text.indexOf(`-- <<< ${name}`);
  expect(start, `${file}: ${name}`).toBeGreaterThanOrEqual(0);
  expect(end, `${file}: ${name}`).toBeGreaterThan(start);
  return text.slice(start, end);
}

describe.each(MIGRATIONS)("migración $file", ({ file, block: name }) => {
  const migration = `supabase/migrations/${file}`;

  it("la instalación limpia crea exactamente lo mismo que la migración", () => {
    expect(block(TEMPLATE, name)).toBe(block(migration, name));
  });

  it("tiene su script de vuelta atrás con el mismo nombre", () => {
    expect(existsSync(`supabase/rollback/${file}`)).toBe(true);
  });

  it("no amplía el ENUM de estados ni concede vaciado de tablas", () => {
    const sql = block(migration, name);
    expect(sql).not.toMatch(/ALTER TYPE/i);
    expect(sql).not.toMatch(/GRANT[^;]*TRUNCATE/i);
  });

  it("toda función SECURITY DEFINER fija search_path y, si es pública, comprueba el rol", () => {
    const sql = block(migration, name);
    const functions = sql.split(/CREATE (?:OR REPLACE )?FUNCTION /).slice(1);
    for (const fn of functions) {
      const header = fn.slice(0, fn.indexOf("AS $"));
      if (!/SECURITY DEFINER/.test(header)) continue;
      expect(header, fn.slice(0, 60)).toMatch(/SET search_path (TO|=) ''/);
      // Las de trigger no se pueden llamar directamente; las demás deben exigir el rol.
      if (fn.startsWith("public.") && !/RETURNS trigger/i.test(header))
        expect(fn, fn.slice(0, 60)).toContain("public.has_role(auth.uid(), 'admin')");
    }
  });
});

describe("garantías de las migraciones", () => {
  const identity = block(`supabase/migrations/${MIGRATIONS[0].file}`, "identity_branding");
  const details = block(`supabase/migrations/${MIGRATIONS[1].file}`, "listing_details");
  const review = block(`supabase/migrations/${MIGRATIONS[2].file}`, "listing_review_flow");

  it("los visitantes solo leen los archivos que la identidad o una cabecera usan", () => {
    expect(identity).toContain(
      'CREATE POLICY "Visitors read referenced site assets" ON storage.objects',
    );
    expect(identity).not.toMatch(/INSERT INTO storage\.buckets/i);
    expect(identity).not.toMatch(/GRANT SELECT \(page_key[^;]*updated_by/);
  });

  it("la vista pública conserva sus columnas y añade las nuevas al final", () => {
    const view = details.slice(details.indexOf("CREATE OR REPLACE VIEW public.public_listings"));
    expect(view.indexOf("AS translations")).toBeLessThan(view.indexOf("l.public_locality"));
    expect(view).toContain("(l.show_service_area AND l.home_service) AS public_home_service");
  });

  it("la web pasa a la parte privada sin cambiar las fichas que ya la publicaban", () => {
    expect(details).toContain("public_website = CASE WHEN NEW.show_website THEN NEW.website END");
    expect(details).toMatch(/SET website = l\.public_website, show_website = true/);
  });

  it("los formularios antiguos no borran los campos nuevos al guardar", () => {
    for (const field of ["street", "website", "show_website", "latitude"])
      expect(details).toContain(`${field} = CASE WHEN p_contact ? '${field}'`);
    expect(details).toContain("IF p_periods IS NOT NULL THEN");
  });

  it("la publicación exige la aprobación del titular salvo en servicios públicos", () => {
    expect(review).toContain(
      "CREATE TRIGGER listings_publish_rule BEFORE INSERT OR UPDATE OF status ON public.listings",
    );
    expect(review).toContain("ERRCODE = 'PT422'");
    expect(review).toContain(
      "IF NEW.type = 'publico'::public.listing_type THEN RETURN NEW; END IF;",
    );
  });

  it("la aprobación registra la decisión antes de publicar y bloquea el enlace", () => {
    const approve = review.slice(review.indexOf("CREATE FUNCTION public.approve_listing_review"));
    expect(approve).toMatch(
      /FROM public\.approval_tokens AS a WHERE a\.token_hash = p_token_hash FOR UPDATE/,
    );
    expect(approve.indexOf("'aprobacion'")).toBeLessThan(
      approve.indexOf("UPDATE public.listings AS x SET"),
    );
    expect(review).toContain(
      "REVOKE ALL ON FUNCTION public.approve_listing_review(text, jsonb, boolean, jsonb, text, text) FROM PUBLIC, anon, authenticated;",
    );
  });

  it("consentimientos y solicitudes dejan de admitir escrituras del navegador", () => {
    expect(review).toContain('DROP POLICY IF EXISTS "Admins manage consents" ON public.consents;');
    expect(review).toContain(
      "REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.consents, public.listing_requests FROM anon, authenticated;",
    );
  });
});
