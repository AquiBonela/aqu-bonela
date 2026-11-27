import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { LANGS, LANGUAGE_OPTIONS, type Lang } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  correctedFields,
  mergeGlossary,
  resetTranslationField,
  type Translations,
} from "@/lib/content-translations";

export function ContentLanguages({
  value,
  onChange,
  busy,
  onGenerate,
  stale = false,
  translations,
  onVersionsChange,
}: {
  value: Lang;
  onChange: (lang: Lang) => void;
  busy: boolean;
  onGenerate: () => void;
  stale?: boolean;
  translations?: Translations;
  onVersionsChange?: (versions: Translations) => void;
}) {
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [spanish, setSpanish] = useState("");
  const [target, setTarget] = useState("");
  const [resetField, setResetField] = useState("");
  const entry = translations?.[value];
  const fields = correctedFields(entry);
  const names: Record<string, string> = {
    description: "Descripción extensa",
    short_description: "Descripción corta",
    title: "Título",
    summary: "Subtítulo",
    short: "Descripción completa",
    para: "Usos",
    quien: "Personas destinatarias",
    necesitas: "Requisitos",
    links: "Enlaces",
  };
  const label = (path: string) =>
    names[path] ?? path.replace(/^guia\./, "").replace(/([A-Z])/g, " $1");
  return (
    <div className="space-y-3 border-y py-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            aria-label="Idioma del contenido"
            className="min-h-10 w-44 max-w-full justify-between shadow-none"
          >
            <span lang={value}>{LANGUAGE_OPTIONS[value].name}</span>
            <ChevronDown className="shrink-0" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuRadioGroup
            value={value}
            onValueChange={(next) => {
              const lang = LANGS.find((lang) => lang === next);
              if (lang) onChange(lang);
            }}
          >
            {LANGS.map((lang) => (
              <DropdownMenuRadioItem key={lang} value={lang} className="min-h-10">
                <span lang={lang}>{LANGUAGE_OPTIONS[lang].name}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={onGenerate}
        className="min-h-11 w-full whitespace-normal shadow-none sm:w-auto"
      >
        <Languages className="shrink-0" />
        {busy ? "Traduciendo…" : "Generar traducciones desde español"}
      </Button>
      {stale && (
        <p role="status" className="text-sm text-muted-foreground">
          El español ha cambiado. Traducción pendiente de actualizar con tus correcciones como
          referencia.
        </p>
      )}
      {value !== "es" && entry && translations && onVersionsChange && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => setGlossaryOpen(true)}
          >
            Diccionario · {LANGUAGE_OPTIONS[value].name}
          </Button>
          {fields.length > 0 && (
            <>
              <select
                aria-label="Campo a restablecer"
                value={resetField}
                onChange={(e) => setResetField(e.target.value)}
                disabled={busy}
                className="h-10 max-w-full border bg-background px-2 text-sm"
              >
                <option value="">Selecciona un campo</option>
                {fields.map((path) => (
                  <option key={path} value={path}>
                    {label(path)}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                disabled={busy || !resetField}
                onClick={() => {
                  if (
                    !window.confirm(
                      "¿Descartar las correcciones de este campo? Se traducirá de nuevo al actualizar traducciones.",
                    )
                  )
                    return;
                  onVersionsChange(resetTranslationField(translations, value, resetField));
                  setResetField("");
                }}
              >
                Restablecer traducción
              </Button>
            </>
          )}
          <Dialog open={glossaryOpen} onOpenChange={setGlossaryOpen}>
            <DialogContent className="max-h-[85dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Diccionario · {LANGUAGE_OPTIONS[value].name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {(entry.glossary ?? []).map((pair) => (
                  <div key={pair.source} className="border-b pb-3 text-sm">
                    <p className="break-words font-medium">{pair.source}</p>
                    <p className="whitespace-pre-line break-words text-muted-foreground">
                      {pair.target}
                    </p>
                  </div>
                ))}
              </div>
              <label className="text-sm font-medium">
                Término o frase en español
                <Input value={spanish} onChange={(e) => setSpanish(e.target.value)} />
              </label>
              <label className="text-sm font-medium">
                Traducción preferida
                <Input value={target} onChange={(e) => setTarget(e.target.value)} />
              </label>
              <Button
                type="button"
                disabled={busy || !spanish.trim() || !target.trim()}
                onClick={() => {
                  onVersionsChange({
                    ...translations,
                    [value]: {
                      ...entry,
                      glossary: mergeGlossary([
                        ...(entry.glossary ?? []),
                        { source: spanish.trim(), target: target.trim(), updatedAt: Date.now() },
                      ]),
                    },
                  });
                  setSpanish("");
                  setTarget("");
                }}
              >
                Añadir al diccionario
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
