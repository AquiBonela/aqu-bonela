import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminHead } from "@/components/admin/admin-areas";
import { PageHeaderEditor } from "@/components/admin/PageHeaderEditor";
import { DraftWorkflow } from "@/components/admin/content/DraftWorkflow";
import { ChangeSummary, DraftScreen } from "@/components/admin/content/DraftScreen";
import { fieldChanges } from "@/lib/admin-changes";
import { FormField } from "@/components/admin/content/FormField";
import { useContentDraft } from "@/components/admin/content/useContentDraft";
import {
  homeTextsCodec,
  validateHomeTexts,
  type FieldErrors,
  type HomeTexts,
} from "@/lib/content-codecs";
import { Text, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/directorio/presentacion")({
  head: () => adminHead("Presentación del Directorio", "Presentación del Directorio de {app}."),
  component: () => (
    <AdminShell>
      <h1 className="font-display text-2xl font-bold">
        <Text text="Presentación del Directorio" />
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        <Text text="Título, subtítulo e imagen de la cabecera de la página del Directorio. Son contenido municipal: se publican con la conformidad del Ayuntamiento. Las fichas siguen su propio circuito, con la aceptación de cada titular." />
      </p>
      <div className="mt-6 grid gap-6">
        <DirectoryTexts />
        <PageHeaderEditor page="directorio" />
      </div>
    </AdminShell>
  ),
});

const LABELS = { hero_title: "Título", hero_subtitle: "Subtítulo o lema" } as const;

function DirectoryTexts() {
  const { tr } = useI18n();
  const draft = useContentDraft("portada", homeTextsCodec);
  const [errors, setErrors] = useState<FieldErrors<HomeTexts>>({});
  return (
    <section className="grid gap-4 border bg-card p-4" aria-labelledby="textos-directorio">
      <h2 id="textos-directorio" className="font-display text-lg font-bold">
        <Text text="Textos de la cabecera" />
      </h2>
      <DraftScreen draft={draft}>
        {(value) => {
          const set = (k: keyof HomeTexts, v: string) => {
            draft.setValue({ ...value, [k]: v });
            if (errors[k]) setErrors({ ...errors, [k]: undefined });
          };
          return (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  id="directorio-titulo"
                  label={LABELS.hero_title}
                  value={value.hero_title}
                  maxLength={160}
                  error={errors.hero_title}
                  placeholder={tr("¿Qué buscas en {municipio}?")}
                  onChange={(v) => set("hero_title", v)}
                  hint="Puedes usar {municipio} y {app}: se sustituyen por los de la identidad."
                />
                <FormField
                  id="directorio-subtitulo"
                  label={LABELS.hero_subtitle}
                  value={value.hero_subtitle}
                  maxLength={240}
                  error={errors.hero_subtitle}
                  placeholder={tr("Apoya al comercio local de {municipio}")}
                  onChange={(v) => set("hero_subtitle", v)}
                />
              </div>
              <div className="rounded-md bg-primary px-4 py-6 text-primary-foreground" aria-hidden>
                <p className="text-xs uppercase tracking-wide opacity-80">
                  <Text text="Vista previa" />
                </p>
                <p className="mt-2 font-display text-2xl font-bold">
                  {tr(value.hero_title || "¿Qué buscas en {municipio}?")}
                </p>
                {value.hero_subtitle && (
                  <p className="mt-1 opacity-90">{tr(value.hero_subtitle)}</p>
                )}
              </div>
              <DraftWorkflow
                draft={draft}
                validate={() => {
                  const found = validateHomeTexts(value);
                  setErrors(found);
                  if (Object.keys(found).length) toast.error("Revisa los campos marcados.");
                  return Object.keys(found).length === 0;
                }}
                changes={<ChangeSummary changes={fieldChanges(LABELS, draft.published, value)} />}
              />
            </>
          );
        }}
      </DraftScreen>
    </section>
  );
}
