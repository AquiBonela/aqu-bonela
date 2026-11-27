import { Text, useI18n } from "@/lib/i18n";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BUCKET, MAX_GALLERY_PHOTOS, gallerySlots, removeFile, signedUrl, uploadListingImage } from "@/lib/listing-images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ACCEPT = "image/jpeg,image/png,image/webp";
const btn = "border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50";
const errMsg = (e: unknown) => (e as { message?: string }).message ?? "Error desconocido";

export function CoverPicker({ listingId }: { listingId: string }) {
  const { tr, locale } = useI18n();
  const [path, setPath] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from("listings").select("cover_path").eq("id", listingId).maybeSingle().then(({ data }) => setPath(data?.cover_path ?? null));
  }, [listingId]);
  useEffect(() => {
    if (path) signedUrl(path).then(setUrl); else setUrl(null);
  }, [path]);

  async function setCover(next: string | null) {
    const { error } = await supabase.from("listings").update({ cover_path: next }).eq("id", listingId);
    if (error) throw error;
    if (path) await removeFile(path);
    setPath(next);
  }

  async function onFile(file?: File) {
    if (!file) return;
    setBusy(true);
    let uploaded: string | null = null;
    try {
      uploaded = await uploadListingImage(listingId, file);
      await setCover(uploaded);
    } catch (e) {
      if (uploaded) await removeFile(uploaded);
      toast.error(tr(`No se pudo subir: ${errMsg(e)}`));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function quitar() {
    setBusy(true);
    try { await setCover(null); } catch (e) { toast.error(tr(`No se pudo quitar: ${errMsg(e)}`)); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium"><Text text="Imagen de cabecera" /></span>
      {url && <img src={url} alt="" className="h-32 w-full object-cover sm:w-64" />}
      <input ref={input} type="file" accept={ACCEPT} hidden onChange={(e) => onFile(e.target.files?.[0])} />
      <div className="flex gap-2">
        <Button variant="outline" type="button" disabled={busy} onClick={() => input.current?.click()} className={btn}>
          {tr(busy ? "Subiendo…" : path ? "Reemplazar" : "Subir imagen")}
        </Button>
        {path && <Button variant="outline" type="button" disabled={busy} onClick={quitar} className={btn}><Text text="Quitar" /></Button>}
      </div>
      <p className="text-xs text-muted-foreground"><Text text="JPG, PNG o WebP, máximo 8 MB." /></p>
    </div>
  );
}

type Photo = { id: string; storage_path: string; alt: string; sort_order: number; url: string | null };

export function GalleryPicker({ listingId }: { listingId: string }) {
  const { tr, locale } = useI18n();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [legacyCount, setLegacyCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const [result, listing] = await Promise.all([
      supabase.from("listing_photos").select("id,storage_path,alt,sort_order").eq("listing_id", listingId).order("sort_order"),
      supabase.from("listings").select("gallery_urls").eq("id", listingId).maybeSingle(),
    ]);
    if (result.error || listing.error) throw result.error ?? listing.error;
    const data = result.data;
    setLegacyCount(listing.data?.gallery_urls.length ?? 0);
    const rows = data ?? [];
    if (!rows.length) { setPhotos([]); return; }
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(rows.map((r) => r.storage_path), 3600);
    setPhotos(rows.map((r, i) => ({ ...r, url: signed?.[i]?.signedUrl ?? null })));
  }, [listingId]);
  // El mensaje como texto: tr cambia de identidad en cada render bajo ContentTranslationProvider.
  const loadError = tr("No se pudieron cargar las fotos.");
  useEffect(() => { load().catch(() => toast.error(loadError)); }, [load, loadError]);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, gallerySlots(photos.length + legacyCount));
    if (files.length > list.length) toast.error(tr("Máximo 5 fotos en la galería."));
    setBusy(true);
    let order = photos.reduce((m, p) => Math.max(m, p.sort_order), -1);
    for (const file of list) {
      let uploaded: string | null = null;
      try {
        uploaded = await uploadListingImage(listingId, file);
        const { error } = await supabase.from("listing_photos").insert({ listing_id: listingId, storage_path: uploaded, sort_order: ++order });
        if (error) throw error;
      } catch (e) {
        if (uploaded) await removeFile(uploaded);
        toast.error(tr(`${file.name}: ${errMsg(e)}`));
      }
    }
    await load();
    setBusy(false);
    if (input.current) input.current.value = "";
  }

  async function quitar(p: Photo) {
    const { error } = await supabase.from("listing_photos").delete().eq("id", p.id);
    if (error) { toast.error(tr(`No se pudo quitar: ${error.message}`)); return; }
    await removeFile(p.storage_path);
    setPhotos((ps) => ps.filter((x) => x.id !== p.id));
  }

  async function saveAlt(p: Photo, alt: string) {
    if (alt === p.alt) return;
    const { error } = await supabase.from("listing_photos").update({ alt }).eq("id", p.id);
    if (error) toast.error(tr(`No se pudo guardar el texto: ${error.message}`));
    else setPhotos((ps) => ps.map((x) => (x.id === p.id ? { ...x, alt } : x)));
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium"><Text text="Galería de fotos (" />{photos.length + legacyCount}/{MAX_GALLERY_PHOTOS})</span>
      <div className="grid gap-3 sm:grid-cols-2">
        {photos.map((p) => (
          <div key={p.id} className="space-y-1 border p-2">
            {p.url && <img src={p.url} alt={p.alt} className="h-28 w-full object-cover" />}
            <Input defaultValue={p.alt} placeholder={tr("Texto alternativo (opcional)")} onBlur={(e) => saveAlt(p, e.target.value.trim())} />
            <Button variant="outline" type="button" onClick={() => quitar(p)} className={btn}><Text text="Quitar" /></Button>
          </div>
        ))}
      </div>
      <input ref={input} type="file" accept={ACCEPT} multiple hidden onChange={(e) => onFiles(e.target.files)} />
      {gallerySlots(photos.length + legacyCount) > 0 && (
        <Button variant="outline" type="button" disabled={busy} onClick={() => input.current?.click()} className={btn}>
          {tr(busy ? "Subiendo…" : "Añadir fotos")}
        </Button>
      )}
    </div>
  );
}
