import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { generateTranslation } from '@/lib/translation.functions';
import { correctedFields, languagesToGenerate, record, type Content, type Translations } from '@/lib/content-translations';

export function useContentTranslations() {
  const call = useServerFn(generateTranslation);
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState('');
  async function generate(source: Content, versions: Translations, onProgress: (next: Translations) => void, explicit = false) {
    if (translating) return null;
    const targets = languagesToGenerate(versions, source);
    if (!targets.length) { if (explicit) toast.success('Las traducciones ya están completas; se conservan tus correcciones.'); return versions; }
    setTranslating(true); setTranslationError('');
    let next = { ...versions };
    try {
      for (const lang of targets) {
        if (lang === 'es') continue;
        const previous = versions[lang];
        const result = await call({ data: { source, lang, resume: explicit, ...(previous ? { previous } : {}) } });
        if (!result.ok) throw new Error(result.message);
        const fields = correctedFields(previous);
        next = { ...next, [lang]: { ...previous, content: record(JSON.parse(result.contentJson)), source: structuredClone(source), manual: fields.length > 0, manualFields: fields } };
        onProgress(next);
      }
      if (explicit) toast.success('Traducciones preparadas.');
      return next;
    } catch (error) {
      setTranslationError(error instanceof Error ? error.message : 'No se pudieron generar las traducciones.');
      return null;
    } finally { setTranslating(false); }
  }
  return { generate, translating, translationError };
}