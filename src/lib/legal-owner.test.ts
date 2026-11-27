import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/integrations/supabase/types";
import { fetchLegalOwner, toLegalOwner } from "./legal-owner";

const markers = {
  name: "[Titular pendiente]",
  nif: "[NIF pendiente]",
  address: "[Domicilio pendiente]",
  email: "[Correo pendiente]",
};
const row = {
  legal_name: "Titular Ficticio",
  legal_nif: "NIF-FICTICIO",
  legal_address: "Calle Inventada 1",
  legal_email: "titular@example.test",
};
const owner = {
  name: "Titular Ficticio",
  nif: "NIF-FICTICIO",
  address: "Calle Inventada 1",
  email: "titular@example.test",
};

function client(result: { data: unknown; error: { message: string } | null }) {
  const select = vi.fn(() => ({ maybeSingle: async () => result }));
  const from = vi.fn(() => ({ select }));
  return { from, select, supabase: { from } as unknown as SupabaseClient<Database> };
}

// DNI: 8 cifras y letra. NIE: X, Y o Z, 7 cifras y letra.
const ID_PATTERN = /\b(?:[XYZ]\d{7}|\d{8})[A-Z]\b/i;
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[a-z]{2,}/i;

afterEach(() => vi.restoreAllMocks());

describe("datos del titular", () => {
  it("muestra los datos configurados", () => {
    expect(toLegalOwner(row)).toEqual(owner);
  });

  it("sin registro, con NULL, vacío o solo espacios usa marcadores", () => {
    expect(toLegalOwner(null)).toEqual(markers);
    expect(
      toLegalOwner({ legal_name: "", legal_nif: "   ", legal_address: null as unknown as string }),
    ).toEqual(markers);
  });

  it("con datos parciales sustituye solo los que faltan", () => {
    expect(toLegalOwner({ legal_name: "  Titular Ficticio " })).toEqual({
      ...markers,
      name: "Titular Ficticio",
    });
  });

  it("consulta solo las cuatro columnas públicas de site_settings", async () => {
    const fake = client({ data: row, error: null });
    await expect(fetchLegalOwner(fake.supabase)).resolves.toEqual(owner);
    expect(fake.from).toHaveBeenCalledWith("site_settings");
    expect(fake.select).toHaveBeenCalledWith("legal_name,legal_nif,legal_address,legal_email");
  });

  it("si la consulta falla lanza un error sin datos de reserva", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fake = client({ data: null, error: { message: "permission denied" } });
    await expect(fetchLegalOwner(fake.supabase)).rejects.toThrow(
      "No se pudieron cargar los datos del titular.",
    );
  });

  it("los patrones detectan DNI, NIE y correos ficticios", () => {
    for (const id of ["00000000T", "X0000000T", "y1234567x", "Z7654321R"]) {
      expect(`const nif = "${id}";`).toMatch(ID_PATTERN);
    }
    for (const email of ["persona@example.test", "nombre.apellido+aviso@mail.example.org"]) {
      expect(`const email = "${email}";`).toMatch(EMAIL_PATTERN);
    }
    const clean = 'import { x } from "@/lib/i18n"; const nif = "[NIF pendiente]";';
    expect(clean).not.toMatch(ID_PATTERN);
    expect(clean).not.toMatch(EMAIL_PATTERN);
  });

  it("el código de las páginas legales no contiene NIF, NIE ni correos", () => {
    for (const file of [
      "src/components/LegalPage.tsx",
      "src/routes/aviso-legal.tsx",
      "src/routes/privacidad.tsx",
      "src/lib/legal-owner.ts",
      "src/lib/legal-owner.functions.ts",
    ]) {
      const source = readFileSync(file, "utf8");
      expect(source, file).not.toMatch(ID_PATTERN);
      expect(source, file).not.toMatch(EMAIL_PATTERN);
    }
  });
});
