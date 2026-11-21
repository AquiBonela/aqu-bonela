import { LANGS, translateText, type Lang } from "@/lib/i18n";

export type Content = Record<string, unknown>;
export type Translation = { content: Content; source: Content; manual: boolean };
export type Translations = Partial<Record<Lang, Translation>>;
export const TARGET_LANGS = LANGS.filter((l) => l !== "es");
export function record(value: unknown): Content {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Content : {};
}
export function readTranslations(value: unknown): Translations {
  const data = record(value);
  return Object.fromEntries(TARGET_LANGS.flatMap((lang) => {
    const entry = record(data[lang]);
    return entry['content'] && typeof entry['content'] === 'object'
      ? [[lang, { content: record(entry['content']), source: record(entry['source']), manual: entry['manual'] === true }]] : [];
  }));
}
const preservedKeys = new Set(['slug', 'cat', 'url', 'href', 'tags', 'id', 'name']);
export function mapContent(value: unknown, translate: (text: string) => string, key = ''): unknown {
  if (preservedKeys.has(key)) return value;
  if (typeof value === 'string') return value.trim() ? translate(value) : value;
  if (Array.isArray(value)) return value.map((v) => mapContent(v, translate, key));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapContent(v, translate, k)]));
  return value;
}
export function catalogContent(source: Content, lang: Lang): Content {
  return record(mapContent(source, (s) => translateText(s, lang)));
}
export function sourceChanged(entry: Translation, source: Content) {
  // jsonb reorders object keys when reading a saved version back from Supabase.
  function canonical(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(record(value)[key])]));
    return value;
  }
  return JSON.stringify(canonical(entry.source)) !== JSON.stringify(canonical(source));
}
export function languagesToGenerate(translations: Translations, source: Content): Lang[] {
  return TARGET_LANGS.filter((lang) => !translations[lang] || (!translations[lang]?.manual && sourceChanged(translations[lang], source)));
}
export function editTranslation(translations: Translations, lang: Lang, content: Content, source: Content): Translations {
  return { ...translations, [lang]: { content, source: translations[lang]?.source ?? structuredClone(source), manual: true } };
}
export function translationMap(source: unknown, target: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  function walk(a: unknown, b: unknown, key = '') {
    if (preservedKeys.has(key)) return;
    if (typeof a === 'string' && a && typeof b === 'string') result[a] = b;
    else if (Array.isArray(a) && Array.isArray(b)) a.forEach((v, i) => walk(v, b[i], key));
    else if (a && typeof a === 'object') Object.entries(a).forEach(([k, v]) => walk(v, record(b)[k], k));
  }
  walk(source, target);
  return result;
}
export function listingText(listing: { short_description: string; description: string; translations?: unknown }, lang: Lang, field: 'short_description' | 'description'): string {
  const value = lang === 'es' ? undefined : readTranslations(listing.translations)[lang]?.content[field];
  return typeof value === 'string' && value.trim() ? value : translateText(listing[field], lang);
}