import { useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, CircleDot, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fmtDate } from "@/lib/admin";
import {
  CONFORMITY_CHANNELS,
  STATUS_HINTS,
  STATUS_LABELS,
  validateConformity,
  type ConformityInput,
} from "@/lib/content-workflow";
import { Text, useI18n } from "@/lib/i18n";
import type { ContentDraft } from "./useContentDraft";

type Props<T> = {
  draft: ContentDraft<T>;
  /** Comprueba el formulario antes de guardar; devuelve false si hay errores (ya mostrados). */
  validate?: () => boolean;
  /** Resumen de lo que cambia respecto a lo publicado, para la revisión final. */
  changes?: ReactNode;
  /** Hay cambios fuera del formulario (por ejemplo, una imagen elegida que aún no se ha subido). */
  pending?: boolean;
  /**
   * Prepara el valor que se guarda (por ejemplo, sube las imágenes elegidas). Devuelve el valor,
   * `undefined` para guardar el formulario tal cual o `null` para no guardar (error ya mostrado).
   */
  prepare?: () => Promise<T | null | undefined>;
  /** Se llama al deshacer o descartar, para limpiar lo pendiente de la pantalla. */
  onDiscard?: () => void;
};

const channelLabel = (value: string) =>
  CONFORMITY_CHANNELS.find((c) => c.value === value)?.label ?? value;

/**
 * Estado del borrador de una pantalla y sus pasos: guardar, presentar al Ayuntamiento, registrar
 * la conformidad, publicar, volver a borrador y descartar. Cada botón solo aparece cuando su paso
 * es posible; la base vuelve a comprobarlo todo.
 */
export function DraftWorkflow<T>({
  draft,
  validate,
  changes,
  pending = false,
  prepare,
  onDiscard,
}: Props<T>) {
  const { tr } = useI18n();
  const [conformityOpen, setConformityOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const d = draft.draft;
  const status = d?.status ?? "publicado";
  const Icon = status === "conforme" ? CheckCircle2 : status === "presentado" ? Send : CircleDot;
  const dirty = draft.dirty || pending;
  const busy = draft.busy || preparing;
  // Con cambios sin guardar, solo se puede guardar o deshacer: los demás pasos usan lo guardado.
  const actions = pending
    ? {
        ...draft.actions,
        save: true,
        submit: false,
        recordConformity: false,
        returnToDraft: false,
        publish: false,
        discard: true,
      }
    : draft.actions;

  async function save() {
    if (validate && !validate()) return;
    let prepared: T | null | undefined;
    if (prepare) {
      setPreparing(true);
      try {
        prepared = await prepare();
      } finally {
        setPreparing(false);
      }
      if (prepared === null) return;
    }
    await draft.save(prepared ?? undefined);
  }

  return (
    <section
      aria-label={tr("Estado de publicación")}
      className="grid gap-3 border border-primary/30 bg-secondary/30 p-4"
    >
      <div className="flex flex-wrap items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-semibold" role="status">
            <Text text={dirty ? "Cambios sin guardar" : STATUS_LABELS[status]} />
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            <Text
              text={
                dirty
                  ? "Guarda el borrador para no perder los cambios. Nada se publica al guardar."
                  : STATUS_HINTS[status]
              }
            />
          </p>
          {d?.submittedAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              <Text text="Presentado al Ayuntamiento el" /> {fmtDate(d.submittedAt)}
            </p>
          )}
          {d?.conformity && (
            <p className="mt-1 text-xs text-muted-foreground">
              <Text text="Conformidad de" /> {d.conformity.by}, {fmtDate(d.conformity.on)} (
              {tr(channelLabel(d.conformity.channel))}
              {d.conformity.reference ? `, ${d.conformity.reference}` : ""})
            </p>
          )}
        </div>
      </div>

      {d?.stale && (
        <p
          role="alert"
          className="flex gap-2 border border-destructive/40 bg-background p-3 text-sm"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
          <Text text="Lo publicado cambió después de empezar este borrador. No se puede presentar ni publicar: descártalo y empieza uno nuevo sobre la versión actual." />
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {actions.save && (
          <Button type="button" disabled={busy} onClick={() => void save()}>
            <Text text={busy ? "Guardando…" : "Guardar borrador"} />
          </Button>
        )}
        {actions.submit && (
          <Button type="button" disabled={busy} onClick={() => void draft.submit()}>
            <Text text="Presentar al Ayuntamiento" />
          </Button>
        )}
        {actions.recordConformity && (
          <Button type="button" disabled={busy} onClick={() => setConformityOpen(true)}>
            <Text text="Registrar conformidad" />
          </Button>
        )}
        {actions.publish && (
          <Button
            type="button"
            disabled={busy}
            className="bg-terracotta text-terracotta-foreground hover:bg-terracotta/90"
            onClick={() => setPublishOpen(true)}
          >
            <Text text="Revisar y publicar" />
          </Button>
        )}
        {actions.returnToDraft && (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void draft.returnToDraft()}
          >
            <Text text="Volver a borrador" />
          </Button>
        )}
        {actions.discard && (
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() =>
              d ? setDiscardOpen(true) : void draft.discard().then(() => onDiscard?.())
            }
          >
            <Text text={d ? "Descartar borrador" : "Deshacer cambios"} />
          </Button>
        )}
      </div>

      <ConformityDialog
        open={conformityOpen}
        onOpenChange={setConformityOpen}
        submittedAt={d?.submittedAt ?? null}
        busy={busy}
        onConfirm={async (input) => {
          if (await draft.recordConformity(input)) setConformityOpen(false);
        }}
      />
      <PublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        busy={busy}
        changes={changes}
        conformity={
          d?.conformity
            ? `${d.conformity.by}, ${fmtDate(d.conformity.on)} (${tr(channelLabel(d.conformity.channel))})`
            : ""
        }
        onConfirm={async (note) => {
          if (await draft.publish(note)) setPublishOpen(false);
        }}
      />
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Text text="¿Descartar el borrador?" />
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Text text="Se borran los cambios del borrador y, si estaba presentado, su conformidad. Lo publicado no cambia." />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text text="Cancelar" />
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => void draft.discard().then(() => onDiscard?.())}>
              <Text text="Descartar" />
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function today() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function ConformityDialog({
  open,
  onOpenChange,
  submittedAt,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submittedAt: string | null;
  busy: boolean;
  onConfirm: (input: ConformityInput) => Promise<void>;
}) {
  const { tr } = useI18n();
  const [input, setInput] = useState<ConformityInput>({
    by: "",
    on: today(),
    channel: "",
    reference: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ConformityInput, string>>>({});
  const set = (k: keyof ConformityInput, v: string) => {
    setInput({ ...input, [k]: v });
    if (errors[k]) setErrors({ ...errors, [k]: undefined });
  };
  const field = (k: keyof ConformityInput) => ({
    id: `conformidad-${k}`,
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": errors[k] ? `conformidad-${k}-error` : undefined,
  });
  const error = (k: keyof ConformityInput) =>
    errors[k] ? (
      <p id={`conformidad-${k}-error`} className="text-xs font-medium text-destructive">
        <Text text={errors[k] as string} />
      </p>
    ) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Text text="Registrar la conformidad municipal" />
          </DialogTitle>
          <DialogDescription>
            <Text text="Anota la conformidad que el Ayuntamiento ha dado sobre este borrador. Queda registrada con tu usuario y la fecha." />
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            const found = validateConformity(input, submittedAt);
            setErrors(found);
            if (Object.keys(found).length === 0) void onConfirm(input);
          }}
        >
          <div className="grid gap-1 text-sm">
            <label htmlFor="conformidad-by" className="font-medium">
              <Text text="Quién dio la conformidad" />
            </label>
            <Input
              {...field("by")}
              value={input.by}
              placeholder={tr("Cargo o área, por ejemplo: Alcaldía o Concejalía de Cultura")}
              onChange={(e) => set("by", e.target.value)}
            />
            {error("by")}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1 text-sm">
              <label htmlFor="conformidad-on" className="font-medium">
                <Text text="Fecha" />
              </label>
              <Input
                {...field("on")}
                type="date"
                value={input.on}
                max={today()}
                onChange={(e) => set("on", e.target.value)}
              />
              {error("on")}
            </div>
            <div className="grid gap-1 text-sm">
              <label htmlFor="conformidad-channel" className="font-medium">
                <Text text="Medio" />
              </label>
              <select
                {...field("channel")}
                value={input.channel}
                onChange={(e) => set("channel", e.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">{tr("Elige el medio")}</option>
                {CONFORMITY_CHANNELS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {tr(c.label)}
                  </option>
                ))}
              </select>
              {error("channel")}
            </div>
          </div>
          <div className="grid gap-1 text-sm">
            <label htmlFor="conformidad-reference" className="font-medium">
              <Text text="Referencia (opcional)" />
            </label>
            <Input
              {...field("reference")}
              value={input.reference}
              placeholder={tr("Asunto del correo, número de registro o acta")}
              onChange={(e) => set("reference", e.target.value)}
            />
            {error("reference")}
            <p className="text-xs text-muted-foreground">
              <Text text="No incluyas datos personales que no hagan falta." />
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              <Text text="Cancelar" />
            </Button>
            <Button type="submit" disabled={busy}>
              <Text text={busy ? "Registrando…" : "Registrar conformidad"} />
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PublishDialog({
  open,
  onOpenChange,
  busy,
  changes,
  conformity,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  changes?: ReactNode;
  conformity: string;
  onConfirm: (note: string) => Promise<void>;
}) {
  const { tr } = useI18n();
  const [reviewed, setReviewed] = useState(false);
  const [note, setNote] = useState("");
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setReviewed(false);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <Text text="Revisión final y publicación" />
          </DialogTitle>
          <DialogDescription>
            <Text text="Al publicar, la web pública mostrará este contenido en un minuto como máximo. Queda registrado quién publica, cuándo, la conformidad y tu nota." />
          </DialogDescription>
        </DialogHeader>
        {conformity && (
          <p className="text-sm">
            <span className="font-medium">
              <Text text="Conformidad municipal:" />
            </span>{" "}
            {conformity}
          </p>
        )}
        {changes && <div className="border bg-secondary/30 p-3 text-sm">{changes}</div>}
        <label className="flex items-start gap-3 text-sm">
          <Checkbox
            checked={reviewed}
            onCheckedChange={(v) => setReviewed(v === true)}
            className="mt-0.5"
          />
          <span>
            <Text text="He revisado la versión final y coincide con la que recibió la conformidad del Ayuntamiento." />
          </span>
        </label>
        <div className="grid gap-1 text-sm">
          <label htmlFor="publicacion-nota" className="font-medium">
            <Text text="Nota (opcional)" />
          </label>
          <Textarea
            id="publicacion-nota"
            rows={2}
            maxLength={500}
            value={note}
            placeholder={tr("Por ejemplo: cambio pedido por el Ayuntamiento")}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            <Text text="Cancelar" />
          </Button>
          <Button
            type="button"
            disabled={!reviewed || busy}
            className="bg-terracotta text-terracotta-foreground hover:bg-terracotta/90"
            onClick={() => void onConfirm(note)}
          >
            <Text text={busy ? "Publicando…" : "Publicar"} />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
