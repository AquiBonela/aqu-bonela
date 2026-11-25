// Bindings de Cloudflare Workers recibidos por petición en src/server.ts.
// Solo se leen en el servidor; en Vercel/Node no existen y se usa process.env.
type Bindings = Record<string, unknown>;
const KEY = "__AQUI_RUNTIME_BINDINGS__";

export function setRuntimeBindings(env: unknown): void {
  if (env && typeof env === "object") (globalThis as Record<string, unknown>)[KEY] = env;
}

export function readServerEnv(name: string): string | undefined {
  const bindings = (globalThis as Record<string, unknown>)[KEY] as Bindings | undefined;
  const fromBinding = bindings?.[name];
  if (typeof fromBinding === "string" && fromBinding) return fromBinding;
  if (typeof process !== "undefined") {
    const v = process.env[name];
    if (v) return v;
  }
  return undefined;
}
