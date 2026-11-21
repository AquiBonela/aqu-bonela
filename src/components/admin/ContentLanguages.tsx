import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';
import { LANGS, LANGUAGE_OPTIONS, type Lang } from '@/lib/i18n';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

export function ContentLanguages({ value, onChange, busy, onGenerate, stale = false }: {
  value: Lang; onChange: (lang: Lang) => void; busy: boolean; onGenerate: () => void; stale?: boolean;
}) {
  return <div className="space-y-3 border-y py-4">
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button type="button" variant="outline" disabled={busy} aria-label="Idioma del contenido" className="min-h-10 w-44 max-w-full justify-between shadow-none"><span lang={value}>{LANGUAGE_OPTIONS[value].name}</span><ChevronDown className="shrink-0" aria-hidden /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuRadioGroup value={value} onValueChange={(next) => { const lang = LANGS.find((lang) => lang === next); if (lang) onChange(lang); }}>
          {LANGS.map((lang) => <DropdownMenuRadioItem key={lang} value={lang} className="min-h-10"><span lang={lang}>{LANGUAGE_OPTIONS[lang].name}</span></DropdownMenuRadioItem>)}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
    <Button type="button" variant="outline" disabled={busy} onClick={onGenerate} className="min-h-11 w-full whitespace-normal shadow-none sm:w-auto"><Languages className="shrink-0" />{busy ? 'Traduciendo…' : 'Generar traducciones desde español'}</Button>
    {stale && <p role="status" className="text-sm text-muted-foreground">El español ha cambiado. Esta versión conserva tus correcciones; revísala.</p>}
  </div>;
}