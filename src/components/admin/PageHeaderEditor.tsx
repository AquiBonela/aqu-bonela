import { useEffect, useRef, useState, type MouseEvent } from "react";
import { toast } from "sonner";
import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { PageKey } from "@/lib/site-identity";
import { headerCodec, validateHeader, type HeaderValue } from "@/lib/content-codecs";
import { useContentDraft } from "@/components/admin/content/useContentDraft";
import { DraftWorkflow } from "@/components/admin/content/DraftWorkflow";
import { ChangeSummary, DraftScreen } from "@/components/admin/content/DraftScreen";
import { useAdminAssetUrl } from "@/components/admin/content/useAdminAssetUrl";

const ALT_MAX = 200;

type Pending = { image: Blob; small: Blob; preview: string };

/**
 * Imagen de cabecera de una página: subir, sustituir, quitar, encuadrar, texto alternativo y vista
 * previa en escritorio y móvil. Cada cambio es un borrador de la pantalla «cabecera:<página>» y
 * solo llega a la web al publicarlo con la conformidad municipal. La imagen nueva se sube al
 * guardar el borrador, a una ruta propia; no es pública hasta que se publica.
 */
export function PageHeaderEditor({ page }: { page: PageKey }) {
  const draft = useContentDraft(`cabecera:${page}`, headerCodec);
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
      <DraftScreen draft={draft}>
        {(value) => <HeaderForm page={page} draft={draft} value={value} />}
      </DraftScreen>
    </section>
  );
}

function HeaderForm({
  page,
  draft,
  value,
}: {
  page: PageKey;
  draft: ReturnType<typeof useContentDraft<HeaderValue>>;
  value: HeaderValue;
}) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [preparing, setPreparing] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const altId = `cabecera-${page}-alt`;
  const image = "remove" in value ? null : value;
  const savedUrl = useAdminAssetUrl(image?.image_path);
  const savedSmallUrl = useAdminAssetUrl(image?.image_small_path);
  const publishedImage = draft.published && !("remove" in draft.published) ? draft.published : null;

  useEffect(
    () => () => {
      if (pending) URL.revokeObjectURL(pending.preview);
    },
    [pending],
  );

  const src = pending?.preview ?? savedUrl;
  const smallSrc = pending?.preview ?? savedSmallUrl ?? src;
  const alt = image?.alt ?? "";
  const focal = { x: image?.focal_x ?? 50, y: image?.focal_y ?? 50 };
  const altError = image ? validateHeader(image) : undefined;

  function update(changes: Partial<Exclude<HeaderValue, { remove: true }>>) {
    const base = image ?? {
      image_path: "",
      image_small_path: "",
      alt: "",
      focal_x: 50,
      focal_y: 50,
    };
    draft.setValue({ ...base, ...changes });
  }

  async function choose(file: File | undefined) {
    if (!file) return;
    const invalid = validateSource(file, HEADER_TYPES);
    if (invalid) return void toast.error(invalid);
    setPreparing(true);
    try {
      const { image: big, small } = await prepareHeader(file);
      setPending({ image: big, small, preview: URL.createObjectURL(big) });
      // La imagen nueva se encuadra desde el centro; las rutas se asignan al subirla.
      update({ focal_x: 50, focal_y: 50 });
    } catch {
      toast.error("No se pudo preparar la imagen. Prueba con otra.");
    } finally {
      setPreparing(false);
      if (input.current) input.current.value = "";
    }
  }

  /** Sube la imagen elegida (si hay) y devuelve el valor que se guarda en el borrador. */
  async function prepare(): Promise<HeaderValue | null | undefined> {
    if (!pending) return undefined;
    if (!alt.trim()) {
      toast.error("Describe la imagen en el texto alternativo.");
      return null;
    }
    const paths = headerAssetPaths(page, newAssetId());
    const uploaded: string[] = [];
    try {
      await uploadSiteAsset(paths.image, pending.image);
      uploaded.push(paths.image);
      await uploadSiteAsset(paths.small, pending.small);
      uploaded.push(paths.small);
    } catch {
      await removeSiteAssets(uploaded);
      toast.error("No se pudo subir la imagen. Comprueba tu conexión.");
      return null;
    }
    setPending(null);
    return {
      image_path: paths.image,
      image_small_path: paths.small,
      alt: alt.trim(),
      focal_x: Math.round(focal.x),
      focal_y: Math.round(focal.y),
    };
  }

  function pick(event: MouseEvent<HTMLDivElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    update({
      focal_x: Math.round(
        Math.min(100, Math.max(0, ((event.clientX - box.left) / box.width) * 100)),
      ),
      focal_y: Math.round(
        Math.min(100, Math.max(0, ((event.clientY - box.top) / box.height) * 100)),
      ),
    });
  }

  const position = `${Math.round(focal.x)}% ${Math.round(focal.y)}%`;
  const hasImage = Boolean(pending || image);

  return (
    <div className="grid gap-4">
      {hasImage && src ? (
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
              {smallSrc && (
                <img
                  src={smallSrc}
                  alt=""
                  className="h-full w-full object-cover"
                  style={{ objectPosition: position }}
                />
              )}
            </div>
            <figcaption className="text-xs text-muted-foreground">
              <Text text="Móvil" />
            </figcaption>
          </figure>
        </div>
      ) : hasImage ? (
        <p role="status" className="text-sm text-muted-foreground">
          <Text text="Cargando la imagen…" />
        </p>
      ) : (
        <div className="flex aspect-[16/6] items-center justify-center gap-2 rounded-md border border-dashed bg-primary/90 text-sm text-primary-foreground">
          <ImageIcon className="h-5 w-5" aria-hidden />
          <Text text="Sin imagen: se muestra el fondo de color de la página." />
        </div>
      )}

      {hasImage && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium">
            <Text text="Encuadre horizontal" />
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(focal.x)}
              onChange={(e) => update({ focal_x: Number(e.target.value) })}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            <Text text="Encuadre vertical" />
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(focal.y)}
              onChange={(e) => update({ focal_y: Number(e.target.value) })}
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
              onChange={(e) => update({ alt: e.target.value })}
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
          disabled={preparing || draft.busy}
          onClick={() => input.current?.click()}
        >
          <Text text={hasImage ? "Sustituir imagen" : "Elegir imagen"} />
        </Button>
        {hasImage && (
          <Button
            type="button"
            variant="ghost"
            disabled={preparing || draft.busy}
            onClick={() => {
              setPending(null);
              draft.setValue({ remove: true });
            }}
          >
            <Text text="Quitar imagen" />
          </Button>
        )}
      </div>

      <DraftWorkflow
        draft={draft}
        pending={pending !== null}
        validate={() => {
          if (pending && !alt.trim()) {
            toast.error("Describe la imagen en el texto alternativo.");
            return false;
          }
          if (altError) {
            toast.error(altError);
            return false;
          }
          return true;
        }}
        prepare={prepare}
        onDiscard={() => setPending(null)}
        changes={
          <ChangeSummary
            changes={
              !image && publishedImage
                ? [{ label: "Imagen de cabecera", before: "Con imagen", after: "Sin imagen" }]
                : image && !publishedImage
                  ? [{ label: "Imagen de cabecera", before: "Sin imagen", after: "Imagen nueva" }]
                  : image && publishedImage
                    ? [
                        ...(image.image_path !== publishedImage.image_path
                          ? [{ label: "Imagen", before: "Anterior", after: "Nueva" }]
                          : []),
                        ...(image.alt !== publishedImage.alt
                          ? [
                              {
                                label: "Texto alternativo",
                                before: publishedImage.alt,
                                after: image.alt,
                              },
                            ]
                          : []),
                        ...(image.focal_x !== publishedImage.focal_x ||
                        image.focal_y !== publishedImage.focal_y
                          ? [
                              {
                                label: "Encuadre",
                                before: `${publishedImage.focal_x}% ${publishedImage.focal_y}%`,
                                after: `${image.focal_x}% ${image.focal_y}%`,
                              },
                            ]
                          : []),
                      ]
                    : []
            }
          />
        }
      />
    </div>
  );
}
