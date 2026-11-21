import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';
import { LANGS, LANGUAGE_OPTIONS, LANGUAGE_FLAGS, type Lang } from '@/lib/i18n';

export function ContentLanguages({ value, onChange, busy, onGenerate, stale = false }: {
  value: Lang; onChange: (lang: Lang) => void; busy: boolean; onGenerate: () => void; stale?: boolean;
}) {
  return <div className="space-y-3 border-y py-4">
    <div role="group" aria-label="Idioma del contenido" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {LANGS.map((lang) => <Button key={lang} type="button" variant={value === lang ? 'default' : 'outline'} aria-pressed={value === lang} disabled={busy} onClick={() => onChange(lang)} className="min-h-11 min-w-0 justify-start gap-2 px-3 shadow-none">
        <img src={LANGUAGE_FLAGS[lang]} width={24} height={16} alt="" aria-hidden className="h-4 w-6 shrink-0 object-cover" />
        <span lang={lang}>{LANGUAGE_OPTIONS[lang].name}</span>
      </Button>)}
    </div>
    <Button type="button" variant="outline" disabled={busy} onClick={onGenerate} className="min-h-11 w-full whitespace-normal shadow-none sm:w-auto"><Languages className="shrink-0" />{busy ? 'Traduciendo…' : 'Generar traducciones desde español'}</Button>
    {stale && <p role="status" className="text-sm text-muted-foreground">El español ha cambiado. Esta versión conserva tus correcciones; revísala.</p>}
  </div>;
}