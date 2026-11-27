import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import instance from "@instance";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { availableInstances, resolveInstanceId } from "../../instances/resolve";

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "instancias-"));
  for (const id of ["casarabonela", "demo", "otro-pueblo"]) {
    mkdirSync(join(root, "instances", id), { recursive: true });
    writeFileSync(join(root, "instances", id, "config.ts"), "export default {};");
  }
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe("selección de instancia", () => {
  it("sin variable o en blanco usa la demo", () => {
    expect(resolveInstanceId(undefined, root)).toBe("demo");
    expect(resolveInstanceId("  ", root)).toBe("demo");
  });

  it("selecciona la instancia indicada", () => {
    expect(resolveInstanceId("otro-pueblo", root)).toBe("otro-pueblo");
  });

  it("falla con un id inexistente y enumera los disponibles", () => {
    expect(() => resolveInstanceId("no-existe", root)).toThrow(/no-existe.*casarabonela, demo, otro-pueblo/);
  });

  it("no admite rutas como identificador", () => {
    expect(() => resolveInstanceId("../instances/casarabonela", root)).toThrow();
  });

  it("en las pruebas el alias @instance apunta a casarabonela", () => {
    expect(instance.id).toBe("casarabonela");
  });

  it("cada instancia declara el mismo id que su carpeta", () => {
    for (const id of availableInstances(process.cwd())) {
      const source = readFileSync(join("instances", id, "config.ts"), "utf8");
      expect(source, id).toContain(`id: "${id}"`);
      expect(readFileSync(join("instances", id, "content.ts"), "utf8").length, id).toBeGreaterThan(0);
      expect(readFileSync(join("instances", id, "public", "manifest.webmanifest"), "utf8"), id).toContain('"name"');
    }
  });
});
