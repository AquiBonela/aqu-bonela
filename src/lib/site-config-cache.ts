/**
 * Caché de un valor remoto con respaldo, sin dependencias:
 * - fresco: se reutiliza sin consultar durante freshMs;
 * - si la consulta falla o supera timeoutMs, se usa el último valor bueno durante staleMs;
 * - sin valor bueno, se devuelve fallback;
 * - tras un fallo no se reintenta hasta retryMs, para no penalizar cada página durante una caída;
 * - las peticiones simultáneas comparten una sola consulta.
 */
export type CacheSource = "fresh" | "stale" | "fallback";
export interface CacheResult<T> {
  value: T;
  source: CacheSource;
}

export interface RefreshingCacheOptions<T> {
  load: (signal: AbortSignal) => Promise<T>;
  fallback: T;
  freshMs: number;
  staleMs: number;
  retryMs: number;
  timeoutMs: number;
  now?: () => number;
  onError?: (error: unknown) => void;
}

export interface RefreshingCache<T> {
  get(): Promise<CacheResult<T>>;
}

export function createRefreshingCache<T>(options: RefreshingCacheOptions<T>): RefreshingCache<T> {
  const now = options.now ?? (() => Date.now());
  let value: T | undefined;
  let hasValue = false;
  let loadedAt = 0;
  let failedAt: number | undefined;
  let inflight: Promise<CacheResult<T>> | undefined;

  const lastGood = (): CacheResult<T> =>
    hasValue && now() - loadedAt <= options.staleMs
      ? { value: value as T, source: "stale" }
      : { value: options.fallback, source: "fallback" };

  async function refresh(): Promise<CacheResult<T>> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error(`Sin respuesta en ${options.timeoutMs} ms`));
        }, options.timeoutMs);
      });
      const loaded = await Promise.race([options.load(controller.signal), timeout]);
      value = loaded;
      hasValue = true;
      loadedAt = now();
      failedAt = undefined;
      return { value: loaded, source: "fresh" };
    } catch (error) {
      failedAt = now();
      options.onError?.(error);
      return lastGood();
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      inflight = undefined;
    }
  }

  return {
    get() {
      if (hasValue && now() - loadedAt < options.freshMs)
        return Promise.resolve({ value: value as T, source: "fresh" });
      if (failedAt !== undefined && now() - failedAt < options.retryMs)
        return Promise.resolve(lastGood());
      inflight ??= refresh();
      return inflight;
    },
  };
}
