import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { getSiteConfigSnapshot, setSiteConfig } from "@/config/municipality";
import { Text } from "@/lib/i18n";
import { PAGE_LABELS } from "@/lib/page-headers";
import {
  headerAssetPaths,
  HEADER_TYPES,
  newAssetId,
  prepareHeader,
  removeSiteAssets,
  uploadSiteAsset,
  validateSource,
} from "@/lib/site-assets";
import { siteAssetUrl, type PageKey } from "@/lib/site-identity";
import {
  PAGE_HEADER_COLUMNS as COLUMNS,
  pageHeaderQuery,
  type PageHeaderRow as Row,
} from "@/lib/page-header-query";

const ALT_MAX = 200;
const UNSAFE = /[<>{}]/;

/** La sesión del administrador ve el cambio al momento; los visitantes, en un minuto. */
function applyToSession(page: PageKey, row: Row | null) {
  const snapshot = getSiteConfigSnapshot();
  const headers = { ...(snapshot.pageHeaders ?? {}) };
  if (row)
    headers[page] = {
      imagePath: row.image_path,
      imageSmallPath: row.image_small_path,
      alt: row.alt,
      focalX: row.focal_x,
      focalY: row.focal_y,
    };
  else delete headers[page];
  setSiteConfig({ ...snapshot, pageHeaders: headers });
}

/**
 * Imagen de cabecera de una página, editada desde el propio editor de esa página: subir,
 * sustituir, eliminar, encuadrar, texto alternativo y vista previa en escritorio y móvil.
 */
export function PageHeaderEditor({ page }: { page: PageKey }) {
  const qc = useQueryClient();
  const { data: row, isLoading, error } = useQuery(pageHeaderQuery(page));
  const [pending, setPending] = useState<{ image: Blob; small: Blob; preview: string } | null>(
    null,
  );
  const [alt, setAlt] = useState("");
  const [focal, setFocal] = useState({ x: 50, y: 50 });
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const altId = `cabecera-${page}-alt`;

  // Al cargar o cambiar la fila guardada, el formulario muestra sus valores. Depende de los
  // valores, no del objeto: una recarga con los mismos datos no reinicia lo que se está editando.
  const savedAlt = row?.alt ?? "";
  const savedX = row?.focal_x ?? 50;
  const savedY = row?.focal_y ?? 50;
  useEffect(() => {
    setAlt(savedAlt);
    setFocal({ x: savedX, y: savedY });
  }, [savedAlt, savedX, savedY, row?.updated_at]);
  useEffect(
    () => () => {
      if (pending) URL.revokeObjectURL(pending.preview);
    },
    [pending],
  );

  if (isLoading) return null;
  if (error)
    return (
      <p role="alert" className="text-sm text-destructive">
        <Text text="No se pudo cargar la cabecera. Comprueba la conexión." />
      </p>
    );

  const src = pending?.preview ?? (row ? siteAssetUrl(row.image_path) : null);
  const altError =
    alt.length > ALT_MAX
      ? `Máximo ${ALT_MAX} caracteres.`
      : UNSAFE.test(alt)
        ? "No uses los símbolos < > { }."
        : null;
  const dirty =
    pending !== null ||
    alt !== (row?.alt ?? "") ||
    focal.x !== (row?.focal_x ?? 50) ||
    focal.y !== (row?.focal_y ?? 50);

  async function choose(file: File | undefined) {
    if (!file) return;
    const invalid = validateSource(file, HEADER_TYPES);
    if (invalid) return void toast.error(invalid);
    setBusy(true);
    try {
      const { image, small } = await prepareHeader(file);
      setPending({ image, small, preview: URL.createObjectURL(image) });
      setFocal({ x: 50, y: 50 });
    } catch {
      toast.error("No se pudo preparar la imagen. Prueba con otra.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function save() {
    if (altError || !src) return;
    if (!alt.trim()) return void toast.error("Describe la imagen en el texto alternativo.");
    setBusy(true);
    const uploaded: string[] = [];
    try {
      let paths = row ? { image: row.image_path, small: row.image_small_path } : null;
      if (pending) {
        paths = headerAssetPaths(page, newAssetId());
        await uploadSiteAsset(paths.image, pending.image);
        uploaded.push(paths.image);
        await uploadSiteAsset(paths.small, pending.small);
        uploaded.push(paths.small);
      }
      if (!paths) return;
      const values = {
        image_path: paths.image,
        image_small_path: paths.small,
        alt: alt.trim(),
        focal_x: Math.round(focal.x),
        focal_y: Math.round(focal.y),
      };
      // Sobre la versión cargada: no se pisa un cambio hecho en otra sesión.
      const query = row
        ? supabase
            .from("page_headers")
            .update(values)
            .eq("page_key", page)
            .eq("updated_at", row.updated_at)
        : supabase.from("page_headers").insert({ page_key: page, ...values });
      const { data, error: saveError } = await query.select(COLUMNS).maybeSingle();
      if (saveError || !data) {
        await removeSiteAssets(uploaded);
        toast.error(
          saveError?.code === "23505" || !data
            ? "La cabecera cambió en otra sesión. Recarga la página."
            : "No se pudo guardar la cabecera. Comprueba tu conexión y tus permisos.",
        );
        return;
      }
      if (pending && row) await removeSiteAssets([row.image_path, row.image_small_path]);
      setPending(null);
      qc.setQueryData(pageHeaderQuery(page).queryKey, data);
      applyToSession(page, data);
      toast.success("Cabecera guardada. La web pública la mostrará en un minuto como máximo.");
    } catch {
      await removeSiteAssets(uploaded);
      toast.error("No se pudo subir la imagen. Comprueba tu conexión.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (pending && !row) return void setPending(null);
    if (!row) return;
    setBusy(true);
    try {
      const { error: deleteError } = await supabase
        .from("page_headers")
        .delete()
        .eq("page_key", page);
      if (deleteError) return void toast.error("No se pudo eliminar la cabecera.");
      const cleaned = await removeSiteAssets([row.image_path, row.image_small_path]);
      setPending(null);
      qc.setQueryData(pageHeaderQuery(page).queryKey, null);
      applyToSession(page, null);
      toast.success(
        cleaned ? "Cabecera eliminada." : "Cabecera eliminada; quedaron archivos sin borrar.",
      );
    } finally {
      setBusy(false);
    }
  }

  function pick(event: MouseEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    setFocal({
      x: Math.min(100, Math.max(0, ((event.clientX - box.left) / box.width) * 100)),
      y: Math.min(100, Math.max(0, ((event.clientY - box.top) / box.height) * 100)),
    });
  }

  const position = `${Math.round(focal.x)}% ${Math.round(focal.y)}%`;

  return (
    <section className="grid gap-4 border bg-card p-4" aria-labelledby={`cabecera-${page}`}>
      <div>
        <h2 id={`cabecera-${page}`} className="font-display text-lg font-bold">
          <Text text="Imagen de cabecera" />
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {`Página: ${PAGE_LABELS[page]}. `}
          <Text text="JPG, PNG o WebP de hasta 10 MB; se optimiza al subirla (versión de escritorio y de móvil). Sin imagen, la página usa su fondo de color." />
        </p>
      </div>

      {src ? (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
          <figure className="grid gap-1">
            <div
              onClick={pick}
              className="relative aspect-[16/6] w-full cursor-crosshair overflow-hidden rounded-md border bg-muted"
              title="Pulsa sobre la imagen para elegir el punto que debe verse siempre"
            >
              <img
                src={src}
                alt=""
                className="h-full w-full object-cover"
                style={{ objectPosition: position }}
              />
              <span
                aria-hidden
                className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary/70 shadow"
                style={{ left: `${focal.x}%`, top: `${focal.y}%` }}
              />
            </div>
            <figcaption className="text-xs text-muted-foreground">
              <Text text="Escritorio" />
            </figcaption>
          </figure>
          <figure className="grid content-start gap-1">
            <div className="aspect-[4/5] w-full max-w-48 overflow-hidden rounded-md border bg-muted">
              <img
                src={pending?.preview ?? (row ? siteAssetUrl(row.image_small_path) : src)}
                alt=""
                className="h-full w-full object-cover"
                style={{ objectPosition: position }}
              />
            </div>
            <figcaption className="text-xs text-muted-foreground">
              <Text text="Móvil" />
            </figcaption>
          </figure>
        </div>
      ) : (
        <div className="flex aspect-[16/6] items-center justify-center gap-2 rounded-md border border-dashed bg-primary/90 text-sm text-primary-foreground">
          <ImageIcon className="h-5 w-5" aria-hidden />
          <Text text="Sin imagen: se muestra el fondo de color de la página." />
        </div>
      )}

      {src && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium">
            <Text text="Encuadre horizontal" />
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(focal.x)}
              onChange={(e) => setFocal({ ...focal, x: Number(e.target.value) })}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            <Text text="Encuadre vertical" />
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(focal.y)}
              onChange={(e) => setFocal({ ...focal, y: Number(e.target.value) })}
            />
          </label>
          <div className="grid gap-1 text-sm sm:col-span-2">
            <label htmlFor={altId} className="font-medium">
              <Text text="Texto alternativo" />
            </label>
            <Input
              id={altId}
              value={alt}
              maxLength={ALT_MAX + 20}
              placeholder="Describe lo que se ve, por ejemplo: Plaza mayor con la iglesia al fondo"
              onChange={(e) => setAlt(e.target.value)}
              aria-invalid={altError ? true : undefined}
              aria-describedby={altError ? `${altId}-error` : undefined}
            />
            {altError && (
              <p id={`${altId}-error`} className="text-xs font-medium text-destructive">
                <Text text={altError} />
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <input
          ref={input}
          type="file"
          accept={HEADER_TYPES.join(",")}
          className="sr-only"
          id={`cabecera-${page}-archivo`}
          onChange={(e) => void choose(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          <Text text={src ? "Sustituir imagen" : "Subir imagen"} />
        </Button>
        {src && (
          <Button
            type="button"
            disabled={busy || !dirty || Boolean(altError)}
            onClick={() => void save()}
          >
            <Text text={busy ? "Guardando…" : "Guardar cabecera"} />
          </Button>
        )}
        {(row || pending) && (
          <Button type="button" variant="ghost" disabled={busy} onClick={() => void remove()}>
            <Text text={pending && !row ? "Descartar" : "Eliminar imagen"} />
          </Button>
        )}
      </div>
    </section>
  );
}
