import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { mergeGlossary, readTranslations, type GlossaryEntry } from './content-translations';

const glossaryEntry = z.object({ source: z.string().max(10000), target: z.string().max(10000), updatedAt: z.number() });
const input = z.object({ source: z.record(z.unknown()), lang: z.enum(['en', 'de', 'nl', 'fr', 'uk']), resume: z.boolean().optional(),
  previous: z.object({ content: z.record(z.unknown()), source: z.record(z.unknown()), manual: z.boolean(), manualFields: z.array(z.string()).optional(), glossary: z.array(glossaryEntry).max(500).optional() }).optional(),
});
export const generateTranslation = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => {
    const parsed = input.parse(value);
    if (JSON.stringify(parsed).length > 200000 || JSON.stringify(parsed.source).length > 60000) throw new Error('El contenido es demasiado extenso para traducirlo de una vez.');
    return parsed;
  })
  .handler(async ({ data, context }) => {
    const { data: allowed, error: roleError } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (roleError || !allowed) throw new Error('Solo los administradores pueden generar traducciones.');
    const state = await context.supabase.from('translation_gateway_state').select('blocked,reason').eq('id', true).maybeSingle();
    if (state.error) throw new Error('No se pudo comprobar la disponibilidad de las traducciones.');
    if (state.data?.blocked && !data.resume) return { ok: false as const, message: state.data.reason, blocked: true };
    const key = process.env['LOVABLE_API_KEY'];
    if (!key) return { ok: false as const, message: 'La traducción automática aún no está configurada.', blocked: false };
    try {
      const { translateSource } = await import('./translate.server');
      // Read only editorial translation memories, with the caller's admin RLS, never contacts.
      const memories: GlossaryEntry[] = [];
      for (const table of ['listings', 'procedures'] as const) {
        for (let offset = 0; ; offset += 500) {
          const rows = await context.supabase.from(table).select('translations').range(offset, offset + 499);
          if (rows.error) throw new Error('No se pudo consultar el diccionario de correcciones.');
          for (const row of rows.data ?? []) memories.push(...(readTranslations(row.translations)[data.lang]?.glossary ?? []));
          if ((rows.data?.length ?? 0) < 500) break;
        }
      }
      const glossary = mergeGlossary([...memories, ...(data.previous?.glossary ?? [])]);
      const previous = data.previous ? readTranslations({ [data.lang]: data.previous })[data.lang] : undefined;
      const content = await translateSource(data.source, data.lang, key, previous, glossary);
      if (data.resume) {
        const cleared = await context.supabase.from('translation_gateway_state').upsert({ id: true, blocked: false, reason: '' });
        if (cleared.error) throw new Error('No se pudo reactivar la traducción.');
      }
      return { ok: true as const, contentJson: JSON.stringify(content) };
    } catch (error) {
      let current: unknown = error;
      let status = 0;
      let message = error instanceof Error ? error.message : 'No se pudo completar la traducción.';
      // Structured-output wrappers retain the upstream error as their cause.
      for (let depth = 0; depth < 5 && current && typeof current === 'object'; depth++) {
        const e = current as { statusCode?: number; responseBody?: string; cause?: unknown };
        if (e.statusCode) status = e.statusCode;
        if (e.responseBody) {
          try { const body = JSON.parse(e.responseBody); message = body.message ?? body.error?.message ?? message; } catch { /* Do not expose raw provider bodies. */ }
        }
        current = e.cause;
      }
      const blocked = status === 402 || status === 403;
      if (blocked) {
        const stored = await context.supabase.from('translation_gateway_state').upsert({ id: true, blocked: true, reason: message });
        if (stored.error) throw new Error('La traducción está bloqueada y no se pudo guardar su estado.');
      }
      return { ok: false as const, message, blocked };
    }
  });