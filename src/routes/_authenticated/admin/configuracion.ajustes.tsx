import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminHead } from "@/components/admin/admin-areas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  loadInternalSettings,
  saveInternalSettings,
  type InternalSettings,
  type InternalSettingsRow,
} from "@/lib/internal-settings";
import { Text, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/configuracion/ajustes")({
  head: () => adminHead("Ajustes generales", "Ajustes generales del panel de {app}."),
  component: () => (
    <AdminShell>
      <h1 className="font-display text-2xl font-bold">
        <Text text="Ajustes generales" />
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        <Text text="Ajustes internos de Groundwork para el funcionamiento del panel. No son contenido público, así que se guardan al momento, sin borrador ni conformidad." />
      </p>
      <InternalSettingsForm />
    </AdminShell>
  ),
});

const internalSettingsQuery = queryOptions({
  queryKey: ["admin", "internal-settings"],
  queryFn: loadInternalSettings,
  retry: false,
});

function InternalSettingsForm() {
  const { tr } = useI18n();
  const qc = useQueryClient();
  const { data, error, isLoading } = useQuery(internalSettingsQuery);
  const [loaded, setLoaded] = useState<InternalSettingsRow | null>(null);
  const [form, setForm] = useState<InternalSettings | null>(null);
  const [saving, setSaving] = useState(false);

  // Solo la primera vez: una recarga en segundo plano no borra lo que aún no se ha guardado.
  useEffect(() => {
    if (data && !form) {
      setLoaded(data);
      setForm(data);
    }
  }, [data, form]);

  if (isLoading)
    return (
      <p role="status" className="mt-6 text-sm text-muted-foreground">
        <Text text="Cargando…" />
      </p>
    );
  if (error || !form || !loaded)
    return (
      <p role="alert" className="mt-6 border bg-card p-4 text-sm">
        <Text text="No se pudieron cargar los ajustes. Comprueba la conexión y recarga." />
      </p>
    );

  const set = <K extends keyof InternalSettings>(k: K, v: InternalSettings[K]) =>
    setForm({ ...form, [k]: v });

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form || !loaded || saving) return;
    setSaving(true);
    try {
      const result = await saveInternalSettings(loaded, form);
      if (result.ok) {
        setLoaded(result.row);
        setForm(result.row);
        qc.setQueryData(internalSettingsQuery.queryKey, result.row);
        void qc.invalidateQueries({ queryKey: ["admin", "settings"] });
        toast.success(tr("Ajustes guardados"));
      } else if (result.reason === "conflict") {
        toast.error(
          tr(
            "Los ajustes cambiaron en otra sesión mientras editabas. Recarga la página para ver los actuales.",
          ),
        );
      } else {
        toast.error(tr("No se pudo guardar. Comprueba tu conexión y tus permisos."));
      }
    } finally {
      setSaving(false);
    }
  }

  const block = "grid gap-4 border bg-card p-4";
  const lbl = "grid gap-1 text-sm font-medium";
  return (
    <form onSubmit={save} className="mt-6 grid gap-6">
      <section className={block}>
        <h2 className="font-display text-lg font-bold">
          <Text text="Avisos de formularios" />
        </h2>
        <label className={lbl}>
          <Text text="Email de administración y avisos" />
          <Input
            type="email"
            value={form.contact_email}
            onChange={(e) => set("contact_email", e.target.value)}
          />
        </label>
        <p role="status" className="text-sm text-muted-foreground">
          <Text text="Avisos por email pendientes de activar: falta configurar un dominio de correo. Los envíos siguen disponibles en el panel." />
        </p>
      </section>

      <section className={block}>
        <h2 className="font-display text-lg font-bold">
          <Text text="Directorio" />
        </h2>
        <label className={lbl}>
          <Text text="WhatsApp de administración" />
          <Input
            value={form.admin_whatsapp}
            onChange={(e) => set("admin_whatsapp", e.target.value)}
            placeholder="+34 600 000 000"
          />
        </label>
        <label className="flex items-start gap-3 text-sm font-medium">
          <Switch
            checked={form.publish_on_owner_approval}
            onCheckedChange={(v) => set("publish_on_owner_approval", v)}
          />
          <span>
            <Text text="Publicar la ficha en cuanto el titular la apruebe" />
            <span className="block text-xs font-normal text-muted-foreground">
              <Text text="Si lo desactivas, la ficha aprobada queda como «Aprobada» hasta que la publiques desde el panel." />
            </span>
          </span>
        </label>
        <label className={lbl}>
          <Text text="Duración de «Resaltado» (meses)" />
          <Input
            type="number"
            min={1}
            max={24}
            value={form.collaborator_months}
            onChange={(e) => set("collaborator_months", Number(e.target.value))}
          />
        </label>
        <label className={lbl}>
          <Text text="Mensaje de WhatsApp del enlace de revisión" />
          <Textarea
            rows={4}
            value={form.whatsapp_template}
            onChange={(e) => set("whatsapp_template", e.target.value)}
          />
          <span className="text-xs font-normal text-muted-foreground">
            <Text text="Usa" /> {"{nombre}"} <Text text="para el nombre del titular y" />{" "}
            {"{enlace}"} <Text text="para el enlace." />
          </span>
        </label>
      </section>

      <section className={block}>
        <h2 className="font-display text-lg font-bold">
          <Text text="Etiquetas frecuentes" />
        </h2>
        <p className="text-sm text-muted-foreground">
          <Text text="Se ofrecen con un clic al editar una ficha. Una por línea." />
        </p>
        <Textarea
          rows={6}
          value={form.common_labels.join("\n")}
          onChange={(e) => set("common_labels", e.target.value.split("\n"))}
          aria-label={tr("Etiquetas frecuentes")}
        />
      </section>

      <Button type="submit" disabled={saving} className="justify-self-start">
        <Text text={saving ? "Guardando…" : "Guardar ajustes"} />
      </Button>
    </form>
  );
}
