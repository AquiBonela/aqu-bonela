import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORIAS, TRAMITES, type Tramite, type Categoria } from './tramites';
import { procedureContentSchema, readVisibility, visibleContent, matchesProcedureSource, isDeletedProcedure } from './procedure-editor';
import { readTranslations, translationMap, type Translations } from './content-translations';
import type { Lang } from './i18n';
import type { ProcedureCategory, ProcedureRow } from './admin-procedures';

export type PublicProcedure = Tramite & { translations?: Translations };
export function publicProcedureList(rows: ProcedureRow[], categories: ProcedureCategory[]) {
  const cats: Categoria[] = categories.filter((c) => c.visible).map((c) => ({ slug: c.slug, title: c.title, text: c.description, icon: CATEGORIAS.find((v) => v.slug === c.slug)?.icon ?? 'doc' }));
  const saved: PublicProcedure[] = rows.filter((r) => r.status === 'publicada' && !isDeletedProcedure(r)).flatMap((r) => {
    const category = categories.find((c) => c.id === r.category_id && c.visible);
    const parsed = procedureContentSchema.safeParse(r.content);
    if (!category || !parsed.success) return [];
    const content = visibleContent({ ...parsed.data, title: r.title, slug: r.slug, cat: category.slug }, readVisibility(r.visibility));
    const translations = readTranslations(r.translations);
    const en = procedureContentSchema.safeParse(r.content_en);
    if (en.success && !translations.en) translations.en = { content: en.data, source: parsed.data, manual: true };
    return [{ ...content, links: Array.isArray(content['links']) ? content['links'] : [], translations } as PublicProcedure];
  });
  // Unsaved legacy guides remain available until an administrator publishes their saved replacement.
  const legacy = TRAMITES.filter((t) => cats.some((c) => c.slug === t.cat) && !rows.some((r) => r.status === 'publicada' && matchesProcedureSource(r, t, categories)));
  return { categories: cats, procedures: [...legacy, ...saved].sort((a, b) => {
    const order = (t: Tramite) => rows.find((r) => r.slug === t.slug && categories.find((c) => c.id === r.category_id)?.slug === t.cat)?.sort_order ?? 0;
    return order(a) - order(b) || a.title.localeCompare(b.title, 'es');
  }) };
}
export const publicProceduresQuery = queryOptions({
  queryKey: ['public-procedures'],
  queryFn: async () => {
    const [categories, procedures] = await Promise.all([
      supabase.from('procedure_categories').select('*').eq('visible', true).order('sort_order'),
      supabase.from('procedures').select('*').eq('status', 'publicada').order('sort_order').order('title'),
    ]);
    if (categories.error || procedures.error) throw new Error('No se pudieron cargar los trámites.');
    return publicProcedureList(procedures.data ?? [], categories.data ?? []);
  },
});
export function procedureTranslationMap(t: PublicProcedure, lang: Lang) {
  return lang === 'es' ? {} : translationMap(t, t.translations?.[lang]?.content);
}