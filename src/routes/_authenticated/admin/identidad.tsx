import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminHead } from "@/components/admin/admin-areas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getBuildMunicipality, getSiteConfigSnapshot, setSiteConfig } from "@/config/municipality";
import { BrandColors } from "@/components/admin/identity/BrandColors";
import { LogoManager } from "@/components/admin/identity/LogoManager";
import { fmtDate } from "@/lib/admin";
import { Text } from "@/lib/i18n";
import {
  formFromRow,
  IDENTITY_COLUMNS,
  identityErrorMessage,
  identityFallbacks,
  identityPlaceholders,
  DEFAULT_TIMEZONE,
  timezoneOptions,
  validateIdentityForm,
  type IdentityErrors,
  type IdentityForm,
  type IdentityFormField,
  type IdentityRow,
} from "@/lib/identity-form";
import { parseSiteConfig } from "@/lib/site-identity";

export const Route = createFileRoute("/_authenticated/admin/identidad")({
  head: () => adminHead("Identidad municipal", "Identidad municipal de {app}."),
  component: () => (
    <AdminShell>
      <h1 className="font-display text-2xl font-bold">
        <Text text="Identidad municipal" />
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        <Text text="Datos que identifican al municipio y a la plataforma en toda la web. Un campo vacío usa el valor de la instalación, que aparece en gris dentro del campo." />
      </p>
      <IdentityEditor />
    </AdminShell>
  ),
});

class IdentityError extends Error {
  constructor(readonly info: { code?: string; message?: string }) {
    super(info.message);
  }
}

async function readIdentity(): Promise<IdentityRow | null> {
  const { data, error } = await supabase
    .from("site_identity")
    .select(IDENTITY_COLUMNS)
    .eq("id", true)
    .maybeSingle();
  if (error) throw new IdentityError(error);
  return data;
}

const identityQuery = queryOptions({
  queryKey: ["admin", "identity"],
  queryFn: readIdentity,
  retry: false,
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

const fieldId = (name: IdentityFormField) => `identidad-${name}`;

function IdentityEditor() {
  const qc = useQueryClient();
  const { data, error, isLoading } = useQuery(identityQuery);
  const [form, setForm] = useState<IdentityForm | null>(null);
  const [loaded, setLoaded] = useState<IdentityRow | null>(null);
  const [errors, setErrors] = useState<IdentityErrors>({});
  const [saving, setSaving] = useState(false);

  // Solo inicializa la primera vez: una recarga en segundo plano no debe borrar lo no guardado.
  useEffect(() => {
    if (data && !form) {
      setForm(formFromRow(data));
      setLoaded(data);
    }
  }, [data, form]);

  if (isLoading)
    return (
      <p role="status" className="mt-6 text-sm text-muted-foreground">
        <Text text="Cargando la identidad municipal…" />
      </p>
    );
  if (error || !data)
    return (
      <p role="alert" className="mt-6 border bg-card p-4 text-sm">
        <Text
          text={
            error instanceof IdentityError
              ? identityErrorMessage(error.info)
              : error
                ? identityErrorMessage({})
                : "No hay ninguna identidad municipal registrada en este Supabase."
          }
        />
      </p>
    );
  if (!form || !loaded) return null;

  const set = (name: IdentityFormField, value: string) => {
    const next = { ...form, [name]: value };
    // Al empezar a indicar coordenadas se propone la zona horaria predeterminada.
    if ((name === "latitude" || name === "longitude") && value.trim() && !next.timezone.trim())
      next.timezone = DEFAULT_TIMEZONE;
    setForm(next);
    if (errors[name]) setErrors({ ...errors, [name]: undefined });
  };

  // La sesión del administrador ve el cambio al momento, sin perder las cabeceras ya cargadas;
  // los visitantes, al renovarse la caché del servidor.
  function applySaved(saved: IdentityRow) {
    setLoaded(saved);
    qc.setQueryData(identityQuery.queryKey, saved);
    const parsed = parseSiteConfig({ identity: saved });
    setSiteConfig({
      ...getSiteConfigSnapshot(),
      identity: parsed.identity,
      branding: parsed.branding ?? {},
    });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form || !loaded || saving) return;
    const result = validateIdentityForm(form);
    if (!result.ok) {
      setErrors(result.errors);
      const first = (Object.keys(result.errors) as IdentityFormField[])[0];
      if (first) document.getElementById(fieldId(first))?.focus();
      toast.error("Revisa los campos marcados.");
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      // Solo se guarda sobre la versión que se cargó: no se pisa un cambio hecho en otra sesión.
      const { data: saved, error: saveError } = await supabase
        .from("site_identity")
        .update(result.values)
        .eq("id", true)
        .eq("updated_at", loaded.updated_at)
        .select(IDENTITY_COLUMNS)
        .maybeSingle();
      if (saveError) {
        toast.error(identityErrorMessage(saveError));
        return;
      }
      if (!saved) {
        // Nada se actualizó: o la versión ya no es la cargada, o la política no deja escribir.
        const current = await readIdentity().catch(() => null);
        toast.error(
          !current
            ? identityErrorMessage({})
            : current.updated_at !== loaded.updated_at
              ? "La identidad cambió en otra sesión mientras editabas. Recarga la página para ver los datos actuales."
              : "Esta cuenta no tiene permiso para cambiar la identidad municipal.",
        );
        return;
      }
      applySaved(saved);
      setForm(formFromRow(saved));
      toast.success("Identidad guardada. La web pública la mostrará en un minuto como máximo.");
    } catch {
      toast.error(identityErrorMessage({}));
    } finally {
      setSaving(false);
    }
  }

  const placeholders = identityPlaceholders(form, identityFallbacks(getBuildMunicipality()));

  return (
    <div className="mt-6 grid gap-6">
      <form onSubmit={save} noValidate className="grid gap-6">
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
                  onChange={(value) => set(field.name, value)}
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

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={saving}>
            <Text text={saving ? "Guardando…" : "Guardar identidad"} />
          </Button>
          <p className="text-xs text-muted-foreground">
            <Text text="Última modificación:" /> {fmtDate(loaded.updated_at)}
          </p>
        </div>
      </form>
      <LogoManager row={loaded} onSaved={applySaved} />
    </div>
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
