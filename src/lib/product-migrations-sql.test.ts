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
  { file: "20261202090000_site_structure.sql", block: "site_structure" },
  { file: "20261203090000_content_workflow.sql", block: "content_workflow" },
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
  const structure = block(`supabase/migrations/${MIGRATIONS[3].file}`, "site_structure");
  const workflow = block(`supabase/migrations/${MIGRATIONS[4].file}`, "content_workflow");

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

  it("el Directorio y los accesos directos de la portada no se pueden configurar", () => {
    expect(structure).toContain(
      "CHECK (entry_key IN ('servicios-publicos', 'actualidad', 'descubre', 'guia-tramites'))",
    );
    expect(structure).not.toMatch(/page_key = '(inicio|directorio)'/);
  });

  it("las tablas nuevas no admiten escritura directa desde el navegador", () => {
    for (const table of [
      "site_menu",
      "page_sections",
      "home_shortcuts",
      "content_drafts",
      "content_publications",
    ])
      expect(structure).not.toMatch(
        new RegExp(
          `GRANT (INSERT|UPDATE|DELETE|ALL)[^;]*public\\.${table}[^;]*(anon|authenticated)`,
        ),
      );
  });

  it("publicar exige la conformidad municipal y lo publicado sin cambios", () => {
    const publish = structure.slice(
      structure.indexOf("CREATE OR REPLACE FUNCTION public.publish_content_draft"),
    );
    expect(publish).toContain("IF p_conformity IS NOT TRUE THEN");
    expect(publish).toContain("HINT = 'published_changed'");
    expect(publish.indexOf("p_conformity IS NOT TRUE")).toBeLessThan(
      publish.indexOf("DELETE FROM public.site_menu"),
    );
    expect(structure).toContain("CONSTRAINT content_publications_conformity CHECK (conformity)");
  });

  it("la web solo recibe lo publicado y visible", () => {
    const config = structure.slice(
      structure.indexOf("CREATE OR REPLACE FUNCTION public.site_config()"),
    );
    expect(config).not.toContain("content_drafts");
    expect(config).toContain("WHERE h.visible");
  });

  it("publicar bloquea, comprueba la versión y valida contenido y archivos antes de escribir", () => {
    const publish = structure.slice(
      structure.indexOf("CREATE OR REPLACE FUNCTION public.publish_content_draft"),
    );
    const lock = publish.indexOf("LOCK TABLE public.site_menu IN SHARE ROW EXCLUSIVE MODE");
    const version = publish.indexOf("d.base_version <> md5(");
    const validate = publish.indexOf("private.validate_draft_content(p_key, c)");
    const assets = publish.indexOf("HINT = 'missing_asset'");
    const firstWrite = publish.indexOf("DELETE FROM public.site_menu");
    expect(lock).toBeGreaterThan(0);
    expect(lock).toBeLessThan(version);
    expect(version).toBeLessThan(validate);
    expect(validate).toBeLessThan(assets);
    expect(assets).toBeLessThan(firstWrite);
    expect(publish).toContain("PERFORM 1 FROM public.site_settings AS s WHERE s.id FOR UPDATE;");
    expect(publish).toContain("PERFORM 1 FROM public.site_identity AS i WHERE i.id FOR UPDATE;");
  });

  it("una lista ausente o mal escrita nunca se publica como vacía", () => {
    expect(structure).not.toMatch(/coalesce\(c -> '(entries|sections|shortcuts)'/);
    expect(structure).toContain("WHERE NOT k = ANY (p_required || p_optional)");
  });

  it("publicar exige la conformidad registrada y la revisión final antes de escribir", () => {
    const publish = workflow.slice(
      workflow.indexOf("CREATE OR REPLACE FUNCTION public.publish_content_draft"),
    );
    const review = publish.indexOf("IF p_conformity IS NOT TRUE THEN");
    const conformity = publish.indexOf("IF d.status <> 'conforme' THEN");
    const lock = publish.indexOf("PERFORM private.lock_published_content(p_key);");
    const version = publish.indexOf("d.base_version <> md5(v_previous::text)");
    const apply = publish.indexOf("PERFORM private.apply_content_draft(p_key, d.content);");
    expect(review).toBeGreaterThan(0);
    expect(review).toBeLessThan(conformity);
    expect(conformity).toBeLessThan(lock);
    expect(lock).toBeLessThan(version);
    expect(version).toBeLessThan(apply);
  });

  it("presentar prueba el contenido y lo deshace; cambiarlo anula la conformidad", () => {
    const submit = workflow.slice(
      workflow.indexOf("CREATE OR REPLACE FUNCTION public.submit_content_draft"),
    );
    expect(submit).toContain("RAISE EXCEPTION USING ERRCODE = 'PZ002'");
    expect(submit.indexOf("PERFORM private.apply_content_draft")).toBeLessThan(
      submit.indexOf("SET status = 'presentado'"),
    );
    expect(workflow).toContain("IF NEW.content IS DISTINCT FROM OLD.content THEN");
    expect(workflow).toContain("BEFORE UPDATE OF content ON public.content_drafts");
  });

  it("el navegador ya no escribe lo publicado; los ajustes internos sí, solo sus columnas", () => {
    expect(workflow).toContain(
      "REVOKE INSERT, UPDATE, DELETE ON public.site_identity, public.page_headers FROM authenticated;",
    );
    const internal = workflow.slice(workflow.indexOf("GRANT UPDATE (contact_email"));
    const columns = internal.slice(0, internal.indexOf(")"));
    for (const field of ["hero_title", "banner_text", "legal_name", "legal_nif"])
      expect(columns).not.toContain(field);
  });

  it("el registro de operaciones no guarda valores y solo anota estados no personales", () => {
    const audit = workflow.slice(
      workflow.indexOf("CREATE OR REPLACE FUNCTION private.audit_change()"),
    );
    expect(audit).toContain(
      "INSERT INTO public.admin_audit_log (actor, actor_role, operation, table_name, record_key, changed_columns, state)",
    );
    const states = [...workflow.matchAll(/audit_change\('[^']+', '([a-z_]+)'\)/g)].map((m) => m[1]);
    expect(states.length).toBeGreaterThan(0);
    for (const state of states) expect(["status", "draft_key", "purpose"]).toContain(state);
    expect(workflow).not.toMatch(/GRANT (INSERT|UPDATE|DELETE|ALL)[^;]*admin_audit_log/);
  });

  it("los visitantes pierden la escritura en todas las tablas y la lectura de las privadas", () => {
    expect(workflow).toContain(
      "REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon;",
    );
    for (const table of ["listing_contacts", "user_roles", "approval_tokens", "consents"])
      expect(workflow).toMatch(
        new RegExp(`REVOKE SELECT ON [^;]*public\\.${table}[^;]*FROM anon;`),
      );
  });
});
