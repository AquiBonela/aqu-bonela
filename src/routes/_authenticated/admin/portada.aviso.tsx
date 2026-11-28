import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminHead } from "@/components/admin/admin-areas";
import { DraftWorkflow } from "@/components/admin/content/DraftWorkflow";
import { ChangeSummary, DraftScreen } from "@/components/admin/content/DraftScreen";
import { fieldChanges } from "@/lib/admin-changes";
import { FormField } from "@/components/admin/content/FormField";
import { useContentDraft } from "@/components/admin/content/useContentDraft";
import { Switch } from "@/components/ui/switch";
import { bannerCodec, validateBanner, type Banner, type FieldErrors } from "@/lib/content-codecs";
import { Text, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/portada/aviso")({
  head: () => adminHead("Aviso de la portada", "Aviso temporal de la portada de {app}."),
  component: () => (
    <AdminShell>
      <h1 className="font-display text-2xl font-bold">
        <Text text="Aviso de la portada" />
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        <Text text="Franja destacada arriba de la portada para un aviso breve (por ejemplo, un corte de agua o un horario especial). Se publica con la conformidad del Ayuntamiento y se quita publicando el aviso desactivado." />
      </p>
      <BannerEditor />
    </AdminShell>
  ),
});

const LABELS = { banner_enabled: "Mostrar el aviso", banner_text: "Texto del aviso" } as const;

function BannerEditor() {
  const { tr } = useI18n();
  const draft = useContentDraft("aviso-cabecera", bannerCodec);
  const [errors, setErrors] = useState<FieldErrors<Banner>>({});
  return (
    <section className="mt-6 grid gap-4 border bg-card p-4">
      <DraftScreen draft={draft}>
        {(value) => (
          <>
            <label className="flex items-center gap-3 text-sm font-medium">
              <Switch
                checked={value.banner_enabled}
                onCheckedChange={(v) => draft.setValue({ ...value, banner_enabled: v })}
              />
              <Text text={LABELS.banner_enabled} />
            </label>
            <FormField
              id="aviso-texto"
              label={LABELS.banner_text}
              value={value.banner_text}
              maxLength={240}
              error={errors.banner_text}
              placeholder={tr("Horarios especiales por la feria")}
              onChange={(v) => {
                draft.setValue({ ...value, banner_text: v });
                setErrors({});
              }}
            />
            {value.banner_enabled && value.banner_text.trim() && (
              <div aria-hidden>
                <p className="text-xs text-muted-foreground">
                  <Text text="Vista previa" />
                </p>
                <div className="mt-1 bg-terracotta px-4 py-2.5 text-center text-sm font-semibold text-terracotta-foreground">
                  {tr(value.banner_text)}
                </div>
              </div>
            )}
            <DraftWorkflow
              draft={draft}
              validate={() => {
                const found = validateBanner(value);
                setErrors(found);
                if (Object.keys(found).length) toast.error("Revisa los campos marcados.");
                return Object.keys(found).length === 0;
              }}
              changes={<ChangeSummary changes={fieldChanges(LABELS, draft.published, value)} />}
            />
          </>
        )}
      </DraftScreen>
    </section>
  );
}
