import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProcedureImage } from "@/components/ProcedureImage";
import { uploadProcedureImage } from "@/lib/procedure-images";
import type { ProcedureElement } from "@/lib/procedure-sections";

export function ProcedureImagePicker({
  element,
  onChange,
  editable,
  onUploadingChange,
}: {
  element: Extract<ProcedureElement, { kind: "image" }>;
  onChange: (value: ProcedureElement) => void;
  editable: boolean;
  onUploadingChange?: ((busy: boolean) => void) | undefined;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(file: File | undefined) {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    onUploadingChange?.(true);
    try {
      const storagePath = await uploadProcedureImage(element.id, file);
      onChange({ ...element, storagePath });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "No se pudo subir la imagen.");
    } finally {
      setBusy(false);
      onUploadingChange?.(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <div className="mb-3 space-y-3">
      <ProcedureImage {...element} />
      {editable && (
        <>
          <input
            ref={input}
            type="file"
            hidden
            accept="image/jpeg,image/png,image/webp"
            aria-label="Archivo de imagen"
            onChange={(e) => void upload(e.target.files?.[0])}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => input.current?.click()}
            >
              {busy ? <LoaderCircle className="animate-spin" /> : <ImagePlus />}
              {busy ? "Subiendo…" : element.storagePath ? "Reemplazar imagen" : "Subir imagen"}
            </Button>
            {element.storagePath && (
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => onChange({ ...element, storagePath: "" })}
              >
                <Trash2 />
                Quitar imagen
              </Button>
            )}
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
