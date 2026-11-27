// Se usa solo al compilar (Node). No importar desde src/ salvo en pruebas.
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_MUNICIPALITY_ID } from "./schema";

const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function instanceConfigPath(root: string, id: string): string {
  return join(root, "instances", id, "config.ts");
}

export function availableInstances(root: string): string[] {
  return readdirSync(join(root, "instances"), { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(instanceConfigPath(root, e.name)))
    .map((e) => e.name)
    .sort();
}

/** Vacío: instancia predeterminada. Inexistente o con formato no válido: error. */
export function resolveInstanceId(raw: string | undefined, root: string): string {
  const id = (raw ?? "").trim() || DEFAULT_MUNICIPALITY_ID;
  if (!ID_RE.test(id) || !existsSync(instanceConfigPath(root, id))) {
    throw new Error(
      `VITE_MUNICIPALITY_ID: no existe la instancia "${id}". Disponibles: ${availableInstances(root).join(", ")}.`,
    );
  }
  return id;
}
