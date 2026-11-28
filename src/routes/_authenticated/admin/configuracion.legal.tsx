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
import { legalCodec, validateLegal, type FieldErrors, type LegalData } from "@/lib/content-codecs";
import { Text } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/configuracion/legal")({
  head: () => adminHead("Datos legales", "Datos legales del titular de {app}."),
  component: () => (
    <AdminShell>
      <h1 className="font-display text-2xl font-bold">
        <Text text="Datos legales del titular" />
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        <Text text="Aparecen en el Aviso legal y en la Política de privacidad. Se publican con la conformidad del Ayuntamiento." />
      </p>
      <LegalEditor />
    </AdminShell>
  ),
});

const FIELDS: {
  name: keyof LegalData;
  label: string;
  max: number;
  type?: "email";
  hint?: string;
}[] = [
  { name: "legal_name", label: "Nombre o razón social", max: 200 },
  { name: "legal_nif", label: "NIF / CIF", max: 20 },
  { name: "legal_address", label: "Dirección postal", max: 300 },
  {
    name: "legal_email",
    label: "Correo público de contacto",
    max: 254,
    type: "email",
    hint: "Se publica en el Aviso legal: usa una dirección institucional, no una personal.",
  },
];
const LABELS = Object.fromEntries(FIELDS.map((f) => [f.name, f.label])) as Record<
  keyof LegalData,
  string
>;

function LegalEditor() {
  const draft = useContentDraft("datos-legales", legalCodec);
  const [errors, setErrors] = useState<FieldErrors<LegalData>>({});
  return (
    <section className="mt-6 grid gap-4 border bg-card p-4">
      <DraftScreen draft={draft}>
        {(value) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <FormField
                  key={f.name}
                  id={`legal-${f.name}`}
                  label={f.label}
                  type={f.type ?? "text"}
                  value={value[f.name]}
                  maxLength={f.max}
                  hint={f.hint}
                  error={errors[f.name]}
                  onChange={(v) => {
                    draft.setValue({ ...value, [f.name]: v });
                    if (errors[f.name]) setErrors({ ...errors, [f.name]: undefined });
                  }}
                />
              ))}
            </div>
            <DraftWorkflow
              draft={draft}
              validate={() => {
                const found = validateLegal(value);
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
