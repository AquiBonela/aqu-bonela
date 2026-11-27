import { LANGS, translateText, type Lang } from "@/lib/i18n";

export type Content = Record<string, unknown>;
export type GlossaryEntry = { source: string; target: string; updatedAt: number };
export type Translation = {
  content: Content;
  source: Content;
  manual: boolean;
  manualFields?: string[];
  glossary?: GlossaryEntry[];
};
export type Translations = Partial<Record<Lang, Translation>>;
export const TARGET_LANGS = LANGS.filter((l) => l !== "es");
export function record(value: unknown): Content {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Content) : {};
}
export function readTranslations(value: unknown): Translations {
  const data = record(value);
  return Object.fromEntries(
    TARGET_LANGS.flatMap((lang) => {
      const entry = record(data[lang]);
      return entry["content"] && typeof entry["content"] === "object"
        ? [
            [
              lang,
              {
                content: record(entry["content"]),
                source: record(entry["source"]),
                manual: entry["manual"] === true,
                ...(Array.isArray(entry["manualFields"])
                  ? {
                      manualFields: entry["manualFields"].filter(
                        (v): v is string => typeof v === "string",
                      ),
                    }
                  : {}),
                glossary: readGlossary(entry["glossary"]),
              },
            ],
          ]
        : [];
    }),
  );
}
const preservedKeys = new Set([
  "slug",
  "cat",
  "url",
  "href",
  "tags",
  "id",
  "name",
  "kind",
  "storagePath",
]);
export function mapContent(value: unknown, translate: (text: string) => string, key = ""): unknown {
  if (preservedKeys.has(key)) return value;
  if (typeof value === "string") return value.trim() ? translate(value) : value;
  if (Array.isArray(value)) return value.map((v) => mapContent(v, translate, key));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, mapContent(v, translate, k)]),
    );
  return value;
}
export function catalogContent(source: Content, lang: Lang): Content {
  return record(mapContent(source, (s) => translateText(s, lang)));
}
export function sourceChanged(entry: Translation, source: Content) {
  return !sameContent(contentUnits(entry.source), contentUnits(source));
}
export function languagesToGenerate(translations: Translations, source: Content): Lang[] {
  return TARGET_LANGS.filter((lang) => {
    const entry = translations[lang];
    return (
      !entry ||
      sourceChanged(entry, source) ||
      Object.entries(contentUnits(source)).some(([path, value]) =>
        hasMissingText(value, contentUnits(entry.content)[path]),
      )
    );
  });
}
export function hasMissingText(source: unknown, target: unknown): boolean {
  let original = 0,
    translated = 0;
  mapContent(source, () => {
    original++;
    return "";
  });
  mapContent(target, () => {
    translated++;
    return "";
  });
  return original > translated;
}
export function editTranslation(
  translations: Translations,
  lang: Lang,
  content: Content,
  source: Content,
): Translations {
  const previous = translations[lang];
  const previousUnits = contentUnits(previous?.content ?? record(mapContent(source, () => "")));
  const changed = Object.entries(contentUnits(content))
    .filter(([path, value]) => !sameContent(value, previousUnits[path]))
    .map(([path]) => path);
  const manualFields = [...new Set([...correctedFields(previous), ...changed])];
  // Keep the Spanish baseline until a contextual refresh succeeds.
  let baseline = previous?.source ?? structuredClone(source);
  for (const path of changed) baseline = setContentUnit(baseline, path, contentUnits(source)[path]);
  const pairs: GlossaryEntry[] = changed.flatMap((path) => {
    const original = contentUnits(baseline)[path],
      target = contentUnits(content)[path];
    return typeof original === "string" &&
      original.trim() &&
      typeof target === "string" &&
      target.trim()
      ? [{ source: original, target, updatedAt: Date.now() }]
      : [];
  });
  return {
    ...translations,
    [lang]: {
      ...previous,
      content,
      source: baseline,
      manual: true,
      manualFields,
      glossary: mergeGlossary([...(previous?.glossary ?? []), ...pairs]),
    },
  };
}

export function sameContent(a: unknown, b: unknown): boolean {
  const canonical = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(canonical)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .map((key) => [key, canonical(record(v)[key])]),
          )
        : v;
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}
/** Arrays are an atomic block: item insertions/reorders must never reuse a translation by index. */
export function contentUnits(value: Content, prefix = ""): Content {
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, item]) => {
      if (preservedKeys.has(key)) return [];
      const path = prefix ? `${prefix}.${key}` : key;
      return item && typeof item === "object" && !Array.isArray(item)
        ? Object.entries(contentUnits(record(item), path))
        : [[path, item]];
    }),
  );
}
export function setContentUnit(value: Content, path: string, item: unknown): Content {
  const [key, ...rest] = path.split(".");
  if (!key) return value;
  return {
    ...value,
    [key]: rest.length ? setContentUnit(record(value[key]), rest.join("."), item) : item,
  };
}
export function correctedFields(entry: Translation | undefined): string[] {
  return entry?.manualFields ?? (entry?.manual ? Object.keys(contentUnits(entry.content)) : []);
}
export function readGlossary(value: unknown): GlossaryEntry[] {
  return Array.isArray(value)
    ? value.flatMap((v) => {
        const entry = record(v);
        return typeof entry["source"] === "string" &&
          typeof entry["target"] === "string" &&
          entry["source"].trim() &&
          entry["target"].trim()
          ? [
              {
                source: entry["source"],
                target: entry["target"],
                updatedAt: typeof entry["updatedAt"] === "number" ? entry["updatedAt"] : 0,
              },
            ]
          : [];
      })
    : [];
}
export function mergeGlossary(entries: GlossaryEntry[]): GlossaryEntry[] {
  const latest = new Map<string, GlossaryEntry>();
  for (const entry of entries)
    if ((latest.get(entry.source)?.updatedAt ?? -1) <= entry.updatedAt)
      latest.set(entry.source, entry);
  return [...latest.values()];
}
export function resetTranslationField(
  versions: Translations,
  lang: Lang,
  path: string,
): Translations {
  const entry = versions[lang];
  if (!entry) return versions;
  const fields = correctedFields(entry).filter((field) => field !== path);
  const original = contentUnits(entry.source)[path];
  return {
    ...versions,
    [lang]: {
      ...entry,
      source: setContentUnit(entry.source, path, null),
      manualFields: fields,
      manual: fields.length > 0,
      glossary: (entry.glossary ?? []).filter((pair) => pair.source !== original),
    },
  };
}
export function translationMap(source: unknown, target: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  function walk(a: unknown, b: unknown, key = "") {
    if (preservedKeys.has(key)) return;
    if (typeof a === "string" && a && typeof b === "string") result[a] = b;
    else if (Array.isArray(a) && Array.isArray(b)) a.forEach((v, i) => walk(v, b[i], key));
    else if (a && typeof a === "object")
      Object.entries(a).forEach(([k, v]) => walk(v, record(b)[k], k));
  }
  walk(source, target);
  return result;
}
export function listingText(
  listing: { short_description: string; description: string; translations?: unknown },
  lang: Lang,
  field: "short_description" | "description",
): string {
  const value =
    lang === "es" ? undefined : readTranslations(listing.translations)[lang]?.content[field];
  return typeof value === "string" && value.trim() ? value : translateText(listing[field], lang);
}
