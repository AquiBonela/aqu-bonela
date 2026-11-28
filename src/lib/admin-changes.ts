/**
 * Utilidades del panel sin interfaz: cambios respecto a lo publicado y reordenación de listas.
 * Aptas para navegador y pruebas.
 */

export type Change = { label: string; before: string; after: string };

/** Compara campo a campo dos objetos planos con las etiquetas dadas. */
export function fieldChanges<T extends Record<string, unknown>>(
  labels: Partial<Record<keyof T, string>>,
  before: T | null,
  after: T | null,
  format: (value: unknown) => string = (value) =>
    typeof value === "boolean" ? (value ? "Sí" : "No") : value == null ? "" : String(value),
): Change[] {
  if (!before || !after) return [];
  return (Object.keys(labels) as (keyof T)[])
    .filter((k) => format(before[k]) !== format(after[k]))
    .map((k) => ({
      label: labels[k] as string,
      before: format(before[k]),
      after: format(after[k]),
    }));
}

/** Mueve el elemento `index` una posición; devuelve una lista nueva. */
export function move<T>(list: readonly T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return [...list];
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item as T);
  return next;
}
