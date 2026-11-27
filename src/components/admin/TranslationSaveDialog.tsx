import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LANGUAGE_OPTIONS } from "@/lib/i18n";
import {
  correctedFields,
  languagesToGenerate,
  type Content,
  type Translations,
} from "@/lib/content-translations";

export function TranslationSaveDialog({
  open,
  onOpenChange,
  source,
  translations,
  onSave,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: Content;
  translations: Translations;
  onSave: (translate: boolean) => void;
  busy: boolean;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!busy) onOpenChange(value);
      }}
    >
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Actualizar traducciones</DialogTitle>
          <DialogDescription>
            Hay traducciones pendientes. ¿Quieres actualizarlas con el español actual antes de
            guardar?
          </DialogDescription>
        </DialogHeader>
        <ul className="divide-y">
          {languagesToGenerate(translations, source).map((lang) => (
            <li key={lang} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
              <span className="font-medium">{LANGUAGE_OPTIONS[lang].name}</span>
              <span className="text-muted-foreground">
                {correctedFields(translations[lang]).length
                  ? "Con tus correcciones como referencia"
                  : "Traducción automática"}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2">
          <Button type="button" disabled={busy} onClick={() => onSave(true)}>
            {busy ? "Actualizando…" : "Actualizar traducciones y guardar"}
          </Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => onSave(false)}>
            Guardar sin actualizar traducciones
          </Button>
          <Button type="button" variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
