import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import instance from "@instance";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { availableInstances, resolveInstanceId } from "../../instances/resolve";

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "instancias-"));
  for (const id of ["casarabonela", "otro-pueblo"]) {
    mkdirSync(join(root, "instances", id), { recursive: true });
    writeFileSync(join(root, "instances", id, "config.ts"), "export default {};");
  }
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("selección de instancia", () => {
  it("sin variable o en blanco usa casarabonela", () => {
    expect(resolveInstanceId(undefined, root)).toBe("casarabonela");
    expect(resolveInstanceId("  ", root)).toBe("casarabonela");
  });

  it("selecciona la instancia indicada", () => {
    expect(resolveInstanceId("otro-pueblo", root)).toBe("otro-pueblo");
  });

  it("falla con un id inexistente y enumera los disponibles", () => {
    expect(() => resolveInstanceId("no-existe", root)).toThrow(/no-existe.*casarabonela, otro-pueblo/);
  });

  it("no admite rutas como identificador", () => {
    expect(() => resolveInstanceId("../instances/casarabonela", root)).toThrow();
  });

  it("el alias @instance apunta a casarabonela por defecto", () => {
    expect(instance.id).toBe("casarabonela");
  });

  it("cada instancia declara el mismo id que su carpeta", () => {
    for (const id of availableInstances(process.cwd())) {
      const source = readFileSync(join("instances", id, "config.ts"), "utf8");
      expect(source, id).toContain(`id: "${id}"`);
    }
  });
});
