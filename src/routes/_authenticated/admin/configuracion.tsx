import { Text, useI18n } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin/AdminShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { siteSettingsQuery, withSettingsDefaults, type SiteSettings } from "@/lib/admin";
import { brand } from "@/config/municipality";

export const Route = createFileRoute("/_authenticated/admin/configuracion")({
  head: () => ({
    meta: [
      { title: brand("Configuración · Administración {app}") },
      { name: "description", content: brand("Datos generales y ajustes del directorio {app}.") },
      { property: "og:title", content: brand("Configuración · Administración {app}") },
      { property: "og:description", content: brand("Ajustes del directorio {app}.") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminShell>
      <h1 className="font-display text-2xl font-bold">
        <Text text="Configuración" />
      </h1>
      <GeneralSettings />
    </AdminShell>
  ),
});

function GeneralSettings() {
  const { tr, locale } = useI18n();
  const qc = useQueryClient();
  const { data } = useQuery(siteSettingsQuery);
  const [f, setF] = useState<SiteSettings | null>(null);
  // Solo inicializa la primera vez: una recarga en segundo plano (cambio de pestaña, guardado)
  // no debe borrar lo que aún no se ha guardado.
  useEffect(() => {
    if (data && !f) setF(withSettingsDefaults(data));
  }, [data, f]);
  if (!f) return null;
  const set = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => setF({ ...f, [k]: v });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f) return;
    const labels = Array.from(new Set(f.common_labels.map((t) => t.trim()).filter(Boolean)));
    const { error } = await supabase
      .from("site_settings")
      .update({
        ...f,
        common_labels: labels,
        collaborator_months: Number(f.collaborator_months) || 1,
      })
      .eq("id", true);
    if (error) {
      toast.error(tr("No se pudo guardar."));
      return;
    }
    toast.success(tr("Configuración guardada"));
    qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    qc.invalidateQueries({ queryKey: ["directory"] });
  }
  const block = "grid gap-4 border bg-card p-4";
  const lbl = "grid gap-1 text-sm font-medium";
  return (
    <form onSubmit={save} className="mt-6 grid gap-6">
      <section className={block}>
        <h2 className="font-display text-lg font-bold">
          <Text text="Portada" />
        </h2>
        <label className={lbl}>
          <Text text="Título de la portada" />{" "}
          <Input value={f.hero_title} onChange={(e) => set("hero_title", e.target.value)} />
        </label>
        <label className={lbl}>
          <Text text="Subtítulo o lema" />{" "}
          <Input
            value={f.hero_subtitle}
            onChange={(e) => set("hero_subtitle", e.target.value)}
            placeholder={tr("Apoya al comercio local de {municipio}")}
          />
        </label>
        <label className="flex items-center gap-3 text-sm font-medium">
          <Switch checked={f.banner_enabled} onCheckedChange={(v) => set("banner_enabled", v)} />
          <Text text="Mostrar aviso temporal arriba de la portada" />{" "}
        </label>
        <label className={lbl}>
          <Text text="Texto del aviso" />{" "}
          <Input
            value={f.banner_text}
            onChange={(e) => set("banner_text", e.target.value)}
            placeholder={tr("Horarios especiales por la feria")}
          />
        </label>
      </section>

      <section className={block}>
        <h2 className="font-display text-lg font-bold">
          <Text text="Datos legales del titular" />
        </h2>
        <p className="text-sm text-muted-foreground">
          <Text text="Aparecen en Aviso legal y Privacidad." />
        </p>
        <label className={lbl}>
          <Text text="Nombre o razón social" />{" "}
          <Input value={f.legal_name} onChange={(e) => set("legal_name", e.target.value)} />
        </label>
        <label className={lbl}>
          <Text text="NIF / CIF" />{" "}
          <Input value={f.legal_nif} onChange={(e) => set("legal_nif", e.target.value)} />
        </label>
        <label className={lbl}>
          <Text text="Dirección postal" />{" "}
          <Input value={f.legal_address} onChange={(e) => set("legal_address", e.target.value)} />
        </label>
        <label className={lbl}>
          <Text text="Email público de contacto" />{" "}
          <Input
            type="email"
            value={f.legal_email}
            onChange={(e) => set("legal_email", e.target.value)}
          />
        </label>
      </section>

      <section className={block}>
        <h2 className="font-display text-lg font-bold">
          <Text text="Avisos de formularios" />
        </h2>
        <label className={lbl}>
          <Text text="Email de administración y avisos" />{" "}
          <Input
            type="email"
            value={f.contact_email}
            onChange={(e) => set("contact_email", e.target.value)}
          />
        </label>
        <p className="text-sm text-muted-foreground">
          <Text text="Este es también el email de contacto de administración." />
        </p>
        <p role="status" className="text-sm text-muted-foreground">
          <Text text="Avisos por email pendientes de activar: falta configurar un dominio de correo. Los envíos siguen disponibles en el panel." />
        </p>
      </section>

      <section className={block}>
        <h2 className="font-display text-lg font-bold">
          <Text text="Administración" />
        </h2>
        <label className={lbl}>
          <Text text="WhatsApp de administración" />{" "}
          <Input
            value={f.admin_whatsapp}
            onChange={(e) => set("admin_whatsapp", e.target.value)}
            placeholder="+34 600 000 000"
          />
        </label>
        <label className={lbl}>
          <Text text="Duración de «Resaltado» (meses)" />{" "}
          <Input
            type="number"
            min={1}
            max={24}
            value={f.collaborator_months}
            onChange={(e) => set("collaborator_months", Number(e.target.value))}
          />
        </label>
        <label className={lbl}>
          <Text text="Mensaje de WhatsApp del enlace de revisión" />{" "}
          <Textarea
            rows={4}
            value={f.whatsapp_template}
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
          value={f.common_labels.join("\n")}
          onChange={(e) => set("common_labels", e.target.value.split("\n"))}
          aria-label={tr("Etiquetas frecuentes")}
        />
      </section>

      <Button type="submit" className="justify-self-start">
        <Text text="Guardar configuración" />
      </Button>
    </form>
  );
}
