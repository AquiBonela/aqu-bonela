import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImageIcon, Plus, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminHead } from "@/components/admin/admin-areas";
import { DraftWorkflow } from "@/components/admin/content/DraftWorkflow";
import { ChangeSummary, DraftScreen } from "@/components/admin/content/DraftScreen";
import { move, type Change } from "@/lib/admin-changes";
import { FormField } from "@/components/admin/content/FormField";
import { OrderControls } from "@/components/admin/content/OrderControls";
import { useAdminAssetUrl } from "@/components/admin/content/useAdminAssetUrl";
import { useContentDraft } from "@/components/admin/content/useContentDraft";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  shortcutsCodec,
  validateShortcut,
  type FieldErrors,
  type ShortcutValue,
  type ShortcutsValue,
} from "@/lib/content-codecs";
import {
  HEADER_TYPES,
  newAssetId,
  prepareShortcutImage,
  removeSiteAssets,
  shortcutAssetPath,
  uploadSiteAsset,
  validateSource,
} from "@/lib/site-assets";
import { Text, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/portada/accesos")({
  head: () => adminHead("Accesos directos", "Accesos directos de la portada de {app}."),
  component: () => (
    <AdminShell>
      <h1 className="font-display text-2xl font-bold">
        <Text text="Accesos directos" />
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        <Text text="Tarjetas adicionales de la portada, detrás del Directorio y de las páginas principales (que se ordenan desde el menú). Cada una lleva a una página de la web o a una dirección https://." />
      </p>
      <ShortcutsEditor />
    </AdminShell>
  ),
});

const MAX_SHORTCUTS = 12;
type Pending = Record<string, { blob: Blob; preview: string }>;

function ShortcutsEditor() {
  const draft = useContentDraft("accesos", shortcutsCodec);
  return (
    <section className="mt-6 grid gap-4">
      <DraftScreen draft={draft}>
        {(value) => <ShortcutsForm draft={draft} value={value} />}
      </DraftScreen>
    </section>
  );
}

function ShortcutsForm({
  draft,
  value,
}: {
  draft: ReturnType<typeof useContentDraft<ShortcutsValue>>;
  value: ShortcutsValue;
}) {
  const [pending, setPending] = useState<Pending>({});
  const [errors, setErrors] = useState<Record<string, FieldErrors<ShortcutValue>>>({});
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  useEffect(
    () => () => Object.values(pendingRef.current).forEach((p) => URL.revokeObjectURL(p.preview)),
    [],
  );

  const set = (index: number, changes: Partial<ShortcutValue>) => {
    const next = value.map((s, i) => (i === index ? { ...s, ...changes } : s));
    draft.setValue(next);
    const id = value[index]?.localId;
    if (id && errors[id]) setErrors({ ...errors, [id]: {} });
  };

  function add() {
    if (value.length >= MAX_SHORTCUTS) return;
    draft.setValue([
      ...value,
      {
        id: "",
        localId: `nuevo-${newAssetId()}`,
        title: "",
        description: "",
        image_path: "",
        image_alt: "",
        href: "",
        visible: true,
      },
    ]);
  }

  function remove(index: number) {
    const item = value[index];
    if (!item) return;
    const next = { ...pending };
    if (next[item.localId]) {
      URL.revokeObjectURL(next[item.localId]!.preview);
      delete next[item.localId];
      setPending(next);
    }
    draft.setValue(value.filter((_, i) => i !== index));
  }

  async function choose(item: ShortcutValue, file: File | undefined) {
    if (!file) return;
    const invalid = validateSource(file, HEADER_TYPES);
    if (invalid) return void toast.error(invalid);
    try {
      const blob = await prepareShortcutImage(file);
      setPending((p) => {
        if (p[item.localId]) URL.revokeObjectURL(p[item.localId]!.preview);
        return { ...p, [item.localId]: { blob, preview: URL.createObjectURL(blob) } };
      });
    } catch {
      toast.error("No se pudo preparar la imagen. Prueba con otra.");
    }
  }

  function validate(): boolean {
    const found: Record<string, FieldErrors<ShortcutValue>> = {};
    for (const s of value) {
      // Una imagen elegida cuenta como imagen aunque aún no se haya subido.
      const errs = validateShortcut(s, Boolean(pending[s.localId]));
      if (Object.keys(errs).length) found[s.localId] = errs;
    }
    setErrors(found);
    if (Object.keys(found).length) toast.error("Revisa los accesos marcados.");
    return Object.keys(found).length === 0;
  }

  /** Sube las imágenes elegidas y devuelve los accesos con sus rutas. */
  async function prepare(): Promise<ShortcutsValue | null | undefined> {
    if (Object.keys(pending).length === 0) return undefined;
    const uploaded: string[] = [];
    try {
      const next: ShortcutsValue = [];
      for (const s of value) {
        const p = pending[s.localId];
        if (!p) {
          next.push(s);
          continue;
        }
        const path = shortcutAssetPath(newAssetId());
        await uploadSiteAsset(path, p.blob);
        uploaded.push(path);
        next.push({ ...s, image_path: path });
      }
      Object.values(pending).forEach((p) => URL.revokeObjectURL(p.preview));
      setPending({});
      return next;
    } catch {
      await removeSiteAssets(uploaded);
      toast.error("No se pudo subir alguna imagen. Comprueba tu conexión.");
      return null;
    }
  }

  return (
    <>
      {value.length === 0 && (
        <p className="border bg-card p-4 text-sm text-muted-foreground">
          <Text text="No hay accesos directos adicionales. La portada muestra el Directorio y las páginas activas." />
        </p>
      )}
      <ol className="grid gap-4">
        {value.map((item, index) => (
          <ShortcutCard
            key={item.localId}
            item={item}
            index={index}
            count={value.length}
            preview={pending[item.localId]?.preview ?? null}
            errors={errors[item.localId] ?? {}}
            disabled={draft.busy}
            onChange={(changes) => set(index, changes)}
            onMove={(delta) => draft.setValue(move(value, index, delta))}
            onRemove={() => remove(index)}
            onChoose={(file) => void choose(item, file)}
          />
        ))}
      </ol>
      <Button
        type="button"
        variant="outline"
        className="justify-self-start"
        disabled={draft.busy || value.length >= MAX_SHORTCUTS}
        onClick={add}
      >
        <Plus className="h-4 w-4" aria-hidden />
        <Text text="Añadir acceso directo" />
      </Button>
      <DraftWorkflow
        draft={draft}
        pending={Object.keys(pending).length > 0}
        validate={validate}
        prepare={prepare}
        onDiscard={() => {
          Object.values(pending).forEach((p) => URL.revokeObjectURL(p.preview));
          setPending({});
          setErrors({});
        }}
        changes={<ChangeSummary changes={shortcutChanges(draft.published, value)} />}
      />
    </>
  );
}

function ShortcutCard({
  item,
  index,
  count,
  preview,
  errors,
  disabled,
  onChange,
  onMove,
  onRemove,
  onChoose,
}: {
  item: ShortcutValue;
  index: number;
  count: number;
  preview: string | null;
  errors: FieldErrors<ShortcutValue>;
  disabled: boolean;
  onChange: (changes: Partial<ShortcutValue>) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
  onChoose: (file: File | undefined) => void;
}) {
  const { tr } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const saved = useAdminAssetUrl(item.image_path || null);
  const src = preview ?? saved;
  const label = item.title.trim() || tr("Acceso {n}", { n: String(index + 1) });
  const id = (field: string) => `acceso-${item.localId}-${field}`;
  return (
    <li className="grid gap-3 border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">
          {index + 1}. {label}
        </span>
        <span className="flex-1" />
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={item.visible} onCheckedChange={(v) => onChange({ visible: v })} />
          <Text text="Visible" />
        </label>
        <OrderControls
          index={index}
          count={count}
          label={label}
          onMove={onMove}
          disabled={disabled}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={tr("Quitar {item}", { item: label })}
          disabled={disabled}
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-[10rem_minmax(0,1fr)]">
        <div className="grid content-start gap-2">
          <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md border bg-muted">
            {src ? (
              <img src={src} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="h-6 w-6 text-muted-foreground" aria-hidden />
            )}
          </div>
          <input
            ref={input}
            type="file"
            accept={HEADER_TYPES.join(",")}
            className="sr-only"
            id={id("archivo")}
            aria-label={tr("Imagen de {item}", { item: label })}
            onChange={(e) => {
              onChoose(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => input.current?.click()}
          >
            <Text text={src ? "Cambiar imagen" : "Elegir imagen"} />
          </Button>
          {errors.image_path && (
            <p className="text-xs font-medium text-destructive">
              <Text text={errors.image_path} />
            </p>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            id={id("titulo")}
            label="Título"
            value={item.title}
            maxLength={60}
            error={errors.title}
            onChange={(v) => onChange({ title: v })}
          />
          <FormField
            id={id("destino")}
            label="Destino"
            value={item.href}
            maxLength={300}
            error={errors.href}
            placeholder="/servicios-publicos o https://…"
            onChange={(v) => onChange({ href: v })}
          />
          <FormField
            id={id("descripcion")}
            label="Descripción breve (opcional)"
            value={item.description}
            maxLength={160}
            error={errors.description}
            onChange={(v) => onChange({ description: v })}
          />
          <FormField
            id={id("alt")}
            label="Texto alternativo de la imagen"
            value={item.image_alt}
            maxLength={200}
            error={errors.image_alt}
            onChange={(v) => onChange({ image_alt: v })}
          />
        </div>
      </div>
    </li>
  );
}

function shortcutChanges(before: ShortcutsValue | null, after: ShortcutsValue): Change[] {
  if (!before) return [];
  const changes: Change[] = [];
  const old = new Map(before.map((s) => [s.id, s]));
  for (const s of after) {
    const prev = s.id ? old.get(s.id) : undefined;
    if (!prev) changes.push({ label: "Acceso nuevo", before: "", after: s.title });
    else if (JSON.stringify({ ...prev, localId: "" }) !== JSON.stringify({ ...s, localId: "" }))
      changes.push({ label: "Acceso modificado", before: prev.title, after: s.title });
  }
  for (const s of before)
    if (!after.some((a) => a.id === s.id))
      changes.push({ label: "Acceso retirado", before: s.title, after: "" });
  if (changes.length === 0 && before.map((s) => s.id).join() !== after.map((s) => s.id).join())
    changes.push({ label: "Orden", before: "Anterior", after: "Nuevo" });
  return changes;
}
