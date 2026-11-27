import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminHead } from "@/components/admin/admin-areas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getBuildMunicipality, getMunicipality, setSiteConfig } from "@/config/municipality";
import { fmtDate } from "@/lib/admin";
import { Text } from "@/lib/i18n";
import {
  formFromRow,
  IDENTITY_COLUMNS,
  identityErrorMessage,
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
  /** Valor compilado de la instalación, que se usa mientras el campo esté vacío. */
  fallback?: string | undefined;
  hint?: string | undefined;
  type?: "text" | "url" | "tel" | undefined;
  inputMode?: "decimal" | undefined;
};

function sections(): { title: string; intro?: string; fields: FieldDef[] }[] {
  const build = getBuildMunicipality();
  return [
    {
      title: "Nombre y territorio",
      fields: [
        { name: "municipality_name", label: "Nombre del municipio", fallback: build.name },
        { name: "app_name", label: "Nombre de la plataforma", fallback: build.appName },
        {
          name: "short_name",
          label: "Nombre breve",
          fallback: build.shortName,
          hint: "Se usa en frases cortas de la web.",
        },
        { name: "province", label: "Provincia", fallback: build.province },
        { name: "region", label: "Comarca", fallback: build.region },
        {
          name: "autonomous_community",
          label: "Comunidad autónoma",
          fallback: build.autonomousCommunity,
        },
        {
          name: "demonym_masculine",
          label: "Gentilicio masculino",
          fallback: build.demonym?.masculine,
        },
        {
          name: "demonym_feminine",
          label: "Gentilicio femenino",
          fallback: build.demonym?.feminine,
        },
      ],
    },
    {
      title: "Datos institucionales",
      intro: "Solo se muestran en la web si el Ayuntamiento tiene nombre.",
      fields: [
        {
          name: "town_hall_name",
          label: "Nombre del Ayuntamiento",
          fallback: build.institutional?.townHallName,
        },
        {
          name: "town_hall_address",
          label: "Dirección",
          fallback: build.institutional?.address,
        },
        {
          name: "town_hall_phone",
          label: "Teléfono",
          type: "tel",
          fallback: build.institutional?.phone,
        },
        {
          name: "town_hall_website",
          label: "Web del Ayuntamiento",
          type: "url",
          fallback: build.institutional?.website,
        },
      ],
    },
    {
      title: "Web y ubicación",
      intro: "Las coordenadas y la zona horaria permiten mostrar el tiempo del municipio.",
      fields: [
        {
          name: "site_url",
          label: "Dirección pública de la plataforma",
          type: "url",
          fallback: build.siteUrl,
          hint: "Solo la dirección principal, sin rutas: por ejemplo, https://ejemplo.es",
        },
        {
          name: "latitude",
          label: "Latitud",
          inputMode: "decimal",
          fallback: build.coordinates ? String(build.coordinates.lat) : undefined,
        },
        {
          name: "longitude",
          label: "Longitud",
          inputMode: "decimal",
          fallback: build.coordinates ? String(build.coordinates.lng) : undefined,
        },
        {
          name: "timezone",
          label: "Zona horaria",
          fallback: build.coordinates?.timezone,
          hint: "Formato Región/Ciudad, por ejemplo Europe/Madrid.",
        },
      ],
    },
  ];
}

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

  if (isLoading) return null;
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
    setForm({ ...form, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: undefined });
  };

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
        const current = await readIdentity().catch(() => null);
        toast.error(
          current && current.updated_at !== loaded.updated_at
            ? "La identidad cambió en otra sesión mientras editabas. Recarga la página para ver los datos actuales."
            : "Esta cuenta no tiene permiso para cambiar la identidad municipal.",
        );
        return;
      }
      setLoaded(saved);
      setForm(formFromRow(saved));
      qc.setQueryData(identityQuery.queryKey, saved);
      // Esta sesión ve el cambio al momento; los visitantes, al renovarse la caché del servidor.
      setSiteConfig(parseSiteConfig({ identity: saved }));
      toast.success("Identidad guardada. La web pública la mostrará en un minuto como máximo.");
    } catch {
      toast.error(identityErrorMessage({}));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} noValidate className="mt-6 grid gap-6">
      {sections().map((section) => (
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
                error={errors[field.name]}
                onChange={(value) => set(field.name, value)}
              />
            ))}
          </div>
        </section>
      ))}

      <LogoAndColors />

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving}>
          <Text text={saving ? "Guardando…" : "Guardar identidad"} />
        </Button>
        <p className="text-xs text-muted-foreground">
          <Text text="Última modificación:" /> {fmtDate(loaded.updated_at)}
        </p>
      </div>
    </form>
  );
}

function IdentityField({
  field,
  value,
  error,
  onChange,
}: {
  field: FieldDef;
  value: string;
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
      <Input
        id={id}
        type={field.type ?? "text"}
        inputMode={field.inputMode}
        value={value}
        placeholder={field.fallback ?? ""}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy.length ? describedBy.join(" ") : undefined}
        className={error ? "border-destructive" : undefined}
      />
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

/** Solo consulta: Supabase todavía no tiene dónde guardar logotipos ni colores. */
function LogoAndColors() {
  const m = getMunicipality();
  const logo = m.assets.logoAdmin ?? m.assets.logoText;
  return (
    <section className="grid gap-4 border bg-card p-4" aria-labelledby="identidad-imagen">
      <div>
        <h2 id="identidad-imagen" className="font-display text-lg font-bold">
          <Text text="Logotipo y colores" />
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          <Text text="Se definen en la instalación y todavía no se pueden cambiar desde el panel." />
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-6">
        {logo ? (
          <img
            src={logo}
            alt={`Logotipo de ${m.appName}`}
            className="h-14 max-w-56 object-contain"
          />
        ) : (
          <p className="text-sm">
            <Text text="Sin logotipo: se muestra el nombre de la plataforma." />
          </p>
        )}
        <ul className="flex flex-wrap gap-4 text-xs">
          {[
            { label: "Color principal", className: "bg-primary" },
            { label: "Color de acento", className: "bg-terracotta" },
          ].map((color) => (
            <li key={color.label} className="flex items-center gap-2">
              <span aria-hidden className={`h-8 w-8 rounded-full border ${color.className}`} />
              <Text text={color.label} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
