import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminHead } from "@/components/admin/admin-areas";
import { Input } from "@/components/ui/input";
import { getBuildMunicipality } from "@/config/municipality";
import { BrandColors } from "@/components/admin/identity/BrandColors";
import { LogoManager } from "@/components/admin/identity/LogoManager";
import { DraftWorkflow } from "@/components/admin/content/DraftWorkflow";
import { ChangeSummary, DraftScreen } from "@/components/admin/content/DraftScreen";
import type { Change } from "@/lib/admin-changes";
import { useContentDraft } from "@/components/admin/content/useContentDraft";
import { Text } from "@/lib/i18n";
import {
  identityFallbacks,
  identityPlaceholders,
  DEFAULT_TIMEZONE,
  timezoneOptions,
  validateIdentityForm,
  type IdentityErrors,
  type IdentityForm,
  type IdentityFormField,
} from "@/lib/identity-form";
import { identityCodec, type IdentityAssets, type IdentityDraft } from "@/lib/identity-draft";
import {
  identityAssetPaths,
  LOGO_TYPES,
  newAssetId,
  prepareLightLogo,
  prepareLogo,
  removeSiteAssets,
  uploadSiteAsset,
  validateSource,
} from "@/lib/site-assets";
import { themeFromColors } from "@/lib/brand-palette";

export const Route = createFileRoute("/_authenticated/admin/identidad")({
  head: () => adminHead("Identidad municipal", "Identidad municipal de {app}."),
  component: () => (
    <AdminShell>
      <h1 className="font-display text-2xl font-bold">
        <Text text="Identidad municipal" />
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        <Text text="Datos que identifican al municipio y a la plataforma en toda la web. Un campo vacío usa el valor de la instalación, que aparece en gris dentro del campo. Los cambios se guardan como borrador y se publican con la conformidad del Ayuntamiento." />
      </p>
      <IdentityEditor />
    </AdminShell>
  ),
});

type FieldDef = {
  name: IdentityFormField;
  label: string;
  hint?: string | undefined;
  /**
   * Teclado del móvil. Las coordenadas usan el de texto: el teclado numérico del iPhone
   * no tiene signo menos y casi todas las longitudes de España son negativas.
   */
  type?: "text" | "url" | "tel" | "timezone" | undefined;
  inputMode?: "numeric" | undefined;
};

const SECTIONS: { title: string; intro?: string; fields: FieldDef[] }[] = [
  {
    title: "Nombre y territorio",
    fields: [
      { name: "municipality_name", label: "Nombre del municipio" },
      {
        name: "postal_code",
        label: "Código postal principal",
        hint: "Cinco cifras.",
        inputMode: "numeric",
      },
      { name: "app_name", label: "Nombre de la plataforma" },
      { name: "short_name", label: "Nombre breve", hint: "Se usa en frases cortas de la web." },
      { name: "province", label: "Provincia" },
      { name: "region", label: "Comarca" },
      { name: "autonomous_community", label: "Comunidad autónoma" },
      {
        name: "demonym_masculine",
        label: "Gentilicio masculino",
        hint: "Si rellenas solo uno, se usa para los dos.",
      },
      { name: "demonym_feminine", label: "Gentilicio femenino" },
    ],
  },
  {
    title: "Datos institucionales",
    intro:
      "Con todo el bloque vacío se usan los datos de la instalación. Si rellenas alguno, se publican solo los de este bloque, y el nombre del Ayuntamiento es obligatorio.",
    fields: [
      { name: "town_hall_name", label: "Nombre del Ayuntamiento" },
      { name: "town_hall_address", label: "Dirección" },
      { name: "town_hall_phone", label: "Teléfono", type: "tel" },
      { name: "town_hall_website", label: "Web del Ayuntamiento", type: "url" },
    ],
  },
  {
    title: "Web y ubicación",
    intro:
      "Las coordenadas y la zona horaria permiten mostrar el tiempo del municipio. Se rellenan las tres o ninguna; vacías, se usan las de la instalación.",
    fields: [
      {
        name: "site_url",
        label: "Dirección pública de la plataforma",
        type: "url",
        hint: "Solo la dirección principal, sin rutas: por ejemplo, https://ejemplo.es",
      },
      { name: "latitude", label: "Latitud", hint: "Número con punto o coma decimal, como 40.5" },
      {
        name: "longitude",
        label: "Longitud",
        hint: "Al oeste de Greenwich es negativa, como -3.7",
      },
      {
        name: "timezone",
        label: "Zona horaria",
        type: "timezone",
        hint: "Al indicar coordenadas se propone Europe/Madrid.",
      },
    ],
  },
];

const FIELD_LABELS: Record<string, string> = Object.fromEntries(
  SECTIONS.flatMap((s) => s.fields.map((f) => [f.name, f.label])),
);
FIELD_LABELS["primary_color"] = "Color principal";
FIELD_LABELS["accent_color"] = "Color de acento";

const fieldId = (name: IdentityFormField) => `identidad-${name}`;

type PendingLogo = { logo: Blob; icon: Blob; iconSmall: Blob; preview: string };
type PendingLight = { blob: Blob; preview: string };

function IdentityEditor() {
  const draft = useContentDraft("identidad", identityCodec);
  return (
    <DraftScreen draft={draft}>
      {(value) => <IdentityFormView draft={draft} value={value} />}
    </DraftScreen>
  );
}

function IdentityFormView({
  draft,
  value,
}: {
  draft: ReturnType<typeof useContentDraft<IdentityDraft>>;
  value: IdentityDraft;
}) {
  const [errors, setErrors] = useState<IdentityErrors>({});
  const [pendingLogo, setPendingLogo] = useState<PendingLogo | null>(null);
  const [pendingLight, setPendingLight] = useState<PendingLight | null>(null);
  const previews = useRef<string[]>([]);
  useEffect(() => () => previews.current.forEach((url) => URL.revokeObjectURL(url)), []);
  const form = value.form;

  const set = (name: IdentityFormField, next: string) => {
    const updated = { ...form, [name]: next };
    // Al empezar a indicar coordenadas se propone la zona horaria predeterminada.
    if ((name === "latitude" || name === "longitude") && next.trim() && !updated.timezone.trim())
      updated.timezone = DEFAULT_TIMEZONE;
    draft.setValue({ ...value, form: updated });
    if (errors[name]) setErrors({ ...errors, [name]: undefined });
  };
  const setAssets = (assets: Partial<IdentityAssets>) =>
    draft.setValue({ ...value, assets: { ...value.assets, ...assets } });

  function validate(): boolean {
    const result = validateIdentityForm(form);
    if (result.ok) {
      setErrors({});
      return true;
    }
    setErrors(result.errors);
    const first = (Object.keys(result.errors) as IdentityFormField[])[0];
    if (first) document.getElementById(fieldId(first))?.focus();
    toast.error("Revisa los campos marcados.");
    return false;
  }

  async function chooseLogo(file: File | undefined) {
    if (!file) return;
    const invalid = validateSource(file, LOGO_TYPES);
    if (invalid) return void toast.error(invalid);
    try {
      const prepared = await prepareLogo(file);
      const preview = URL.createObjectURL(prepared.logo);
      previews.current.push(preview);
      setPendingLogo({ ...prepared, preview });
    } catch {
      toast.error("No se pudo preparar el logotipo. Prueba con otra imagen.");
    }
  }

  async function chooseLight(file: File | undefined) {
    if (!file) return;
    const invalid = validateSource(file, LOGO_TYPES);
    if (invalid) return void toast.error(invalid);
    try {
      const blob = await prepareLightLogo(file);
      const preview = URL.createObjectURL(blob);
      previews.current.push(preview);
      setPendingLight({ blob, preview });
    } catch {
      toast.error("No se pudo preparar el logotipo. Prueba con otra imagen.");
    }
  }

  /** Sube los logotipos elegidos y devuelve la identidad con sus rutas nuevas. */
  async function prepare(): Promise<IdentityDraft | null | undefined> {
    if (!pendingLogo && !pendingLight) return undefined;
    const paths = identityAssetPaths(newAssetId());
    const uploaded: string[] = [];
    const assets = { ...value.assets };
    try {
      if (pendingLogo) {
        for (const [path, blob] of [
          [paths.logo, pendingLogo.logo],
          [paths.icon, pendingLogo.icon],
          [paths.iconSmall, pendingLogo.iconSmall],
        ] as const) {
          await uploadSiteAsset(path, blob);
          uploaded.push(path);
        }
        Object.assign(assets, {
          logo_path: paths.logo,
          icon_path: paths.icon,
          icon_small_path: paths.iconSmall,
        });
      }
      if (pendingLight) {
        await uploadSiteAsset(paths.logoLight, pendingLight.blob);
        uploaded.push(paths.logoLight);
        assets.logo_light_path = paths.logoLight;
      }
    } catch {
      await removeSiteAssets(uploaded);
      toast.error("No se pudo subir el logotipo. Comprueba tu conexión.");
      return null;
    }
    setPendingLogo(null);
    setPendingLight(null);
    return { ...value, assets };
  }

  const placeholders = identityPlaceholders(form, identityFallbacks(getBuildMunicipality()));

  return (
    <div className="mt-6 grid gap-6">
      <div className="grid gap-6">
        {SECTIONS.map((section) => (
          <section key={section.title} className="grid gap-4 border bg-card p-4">
            <div>
              <h2 className="font-display text-lg font-bold">
                <Text text={section.title} />
              </h2>
              {section.intro && (
                <p className="mt-1 text-sm text-muted-foreground">
                  <Text text={section.intro} />
                </p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {section.fields.map((field) => (
                <IdentityField
                  key={field.name}
                  field={field}
                  value={form[field.name]}
                  placeholder={placeholders[field.name]}
                  error={errors[field.name]}
                  onChange={(next) => set(field.name, next)}
                />
              ))}
            </div>
          </section>
        ))}

        <BrandColors
          primary={form.primary_color}
          accent={form.accent_color}
          errors={{ primary_color: errors.primary_color, accent_color: errors.accent_color }}
          onChange={set}
        />
      </div>
      <LogoManager
        assets={value.assets}
        pendingLogo={pendingLogo?.preview ?? null}
        pendingLight={pendingLight?.preview ?? null}
        disabled={draft.busy}
        onChooseLogo={(file) => void chooseLogo(file)}
        onChooseLight={(file) => void chooseLight(file)}
        onRemoveLogo={() => {
          setPendingLogo(null);
          setAssets({ logo_path: "", icon_path: "", icon_small_path: "" });
        }}
        onRemoveLight={() => {
          setPendingLight(null);
          setAssets({ logo_light_path: "" });
        }}
      />
      <IdentityPreview form={form} placeholders={placeholders} logo={pendingLogo?.preview} />
      <DraftWorkflow
        draft={draft}
        pending={pendingLogo !== null || pendingLight !== null}
        validate={validate}
        prepare={prepare}
        onDiscard={() => {
          setPendingLogo(null);
          setPendingLight(null);
          setErrors({});
        }}
        changes={
          <ChangeSummary
            changes={identityChanges(
              draft.published,
              value,
              pendingLogo !== null || pendingLight !== null,
            )}
          />
        }
      />
    </div>
  );
}

function identityChanges(
  before: IdentityDraft | null,
  after: IdentityDraft,
  pendingImages: boolean,
): Change[] {
  if (!before) return [];
  const changes: Change[] = [];
  for (const [name, label] of Object.entries(FIELD_LABELS)) {
    const a = before.form[name as IdentityFormField]?.trim() ?? "";
    const b = after.form[name as IdentityFormField]?.trim() ?? "";
    if (a !== b) changes.push({ label, before: a, after: b });
  }
  if (pendingImages || before.assets.logo_path !== after.assets.logo_path)
    changes.push({
      label: "Logotipo e iconos",
      before: before.assets.logo_path ? "Actual" : "Sin logotipo",
      after: after.assets.logo_path || pendingImages ? "Nuevo" : "Sin logotipo",
    });
  else if (before.assets.logo_light_path !== after.assets.logo_light_path)
    changes.push({
      label: "Versión clara del logotipo",
      before: before.assets.logo_light_path ? "Actual" : "Sin versión clara",
      after: after.assets.logo_light_path ? "Nueva" : "Sin versión clara",
    });
  return changes;
}

/** Cómo se verá la cabecera con los datos y colores del borrador (sin publicarlos). */
function IdentityPreview({
  form,
  placeholders,
  logo,
}: {
  form: IdentityForm;
  placeholders: IdentityForm;
  logo: string | undefined;
}) {
  const name = form.app_name.trim() || placeholders.app_name;
  const municipality = form.municipality_name.trim() || placeholders.municipality_name;
  // Paleta del borrador sobre el tema compilado, con las mismas reglas que la web (contraste AA).
  const theme = themeFromColors(
    getBuildMunicipality().theme,
    form.primary_color.trim().toLowerCase() || undefined,
    form.accent_color.trim().toLowerCase() || undefined,
  );
  const {
    primary,
    primaryForeground,
    terracotta: accent,
    terracottaForeground: accentForeground,
  } = theme.light;
  const custom = Boolean(form.primary_color.trim() || form.accent_color.trim());
  return (
    <section className="grid gap-3 border bg-card p-4" aria-labelledby="identidad-vista-previa">
      <h2 id="identidad-vista-previa" className="font-display text-lg font-bold">
        <Text text="Vista previa" />
      </h2>
      <p className="text-sm text-muted-foreground">
        <Text text="Aproximación de la cabecera y los botones con los datos de este borrador. La web pública no cambia hasta que se publica." />
      </p>
      <div
        className="grid gap-3 rounded-md p-4"
        style={{ background: primary, color: primaryForeground }}
        aria-hidden
      >
        <div className="flex items-center gap-3 rounded-md p-2">
          {logo && <img src={logo} alt="" className="h-8 max-w-32 object-contain" />}
          <span className="font-display text-lg font-extrabold">{name}</span>
        </div>
        <p className="text-sm opacity-90">{municipality}</p>
        <span
          className="inline-flex w-max rounded-md px-3 py-1.5 text-sm font-semibold"
          style={{ background: accent, color: accentForeground }}
        >
          <Text text="Botón destacado" />
        </span>
      </div>
      {!custom && (
        <p className="text-xs text-muted-foreground">
          <Text text="Sin colores propios: la web usa los de la instalación." />
        </p>
      )}
    </section>
  );
}

function IdentityField({
  field,
  value,
  placeholder,
  error,
  onChange,
}: {
  field: FieldDef;
  value: string;
  /** Lo que la web mostrará si el campo se queda vacío. */
  placeholder: string;
  error?: string | undefined;
  onChange: (value: string) => void;
}) {
  const id = fieldId(field.name);
  const describedBy = [field.hint && `${id}-ayuda`, error && `${id}-error`].filter(Boolean);
  return (
    <div className="grid content-start gap-1 text-sm">
      <label htmlFor={id} className="font-medium">
        <Text text={field.label} />
      </label>
      {field.type === "timezone" ? (
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy.length ? describedBy.join(" ") : undefined}
          className={`h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm ${error ? "border-destructive" : ""}`}
        >
          <option value="">
            {placeholder ? `De la instalación (${placeholder})` : "Sin zona horaria"}
          </option>
          {timezoneOptions(value).map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      ) : (
        <Input
          id={id}
          type={field.type ?? "text"}
          inputMode={field.inputMode}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy.length ? describedBy.join(" ") : undefined}
          className={error ? "border-destructive" : undefined}
        />
      )}
      {field.hint && (
        <p id={`${id}-ayuda`} className="text-xs text-muted-foreground">
          <Text text={field.hint} />
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-destructive">
          <Text text={error} />
        </p>
      )}
    </div>
  );
}
