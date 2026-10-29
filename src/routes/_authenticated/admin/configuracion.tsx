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
import { adminCategoriesQuery, siteSettingsQuery, slugify, withSettingsDefaults, type SiteSettings } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración · Administración Aquí Bonela" },
      { name: "description", content: "Categorías generales y datos generales del directorio." },
      { property: "og:title", content: "Configuración · Administración Aquí Bonela" },
      { property: "og:description", content: "Ajustes del directorio Aquí Bonela." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <AdminShell>
      <h1 className="font-display text-2xl font-bold">Configuración</h1>
      <GeneralSettings />
      <Categories />
    </AdminShell>
  ),
});

function GeneralSettings() {
  const qc = useQueryClient();
  const { data } = useQuery(siteSettingsQuery);
  const [f, setF] = useState<SiteSettings | null>(null);
  useEffect(() => { if (data) setF(withSettingsDefaults(data)); }, [data]);
  if (!f) return null;
  const set = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => setF({ ...f, [k]: v });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const labels = Array.from(new Set(f!.common_labels.map((t) => t.trim()).filter(Boolean)));
    const { error } = await supabase
      .from("site_settings")
      .update({ ...f!, common_labels: labels, collaborator_months: Number(f!.collaborator_months) || 1 })
      .eq("id", true);
    if (error) { toast.error("No se pudo guardar."); return; }
    toast.success("Configuración guardada");
    qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    qc.invalidateQueries({ queryKey: ["directory"] });
    qc.invalidateQueries({ queryKey: ["legal-owner"] });
  }
  const block = "grid gap-4 border bg-card p-4";
  const lbl = "grid gap-1 text-sm font-medium";
  return (
    <form onSubmit={save} className="mt-6 grid gap-6">
      <section className={block}>
        <h2 className="font-display text-lg font-bold">Portada</h2>
        <label className={lbl}>Título de la portada
          <Input value={f.hero_title} onChange={(e) => set("hero_title", e.target.value)} />
        </label>
        <label className={lbl}>Subtítulo o lema
          <Input value={f.hero_subtitle} onChange={(e) => set("hero_subtitle", e.target.value)} placeholder="Apoya al comercio local de Casarabonela" />
        </label>
        <label className="flex items-center gap-3 text-sm font-medium">
          <Switch checked={f.banner_enabled} onCheckedChange={(v) => set("banner_enabled", v)} />
          Mostrar aviso temporal arriba de la portada
        </label>
        <label className={lbl}>Texto del aviso
          <Input value={f.banner_text} onChange={(e) => set("banner_text", e.target.value)} placeholder="Horarios especiales por la feria" />
        </label>
      </section>

      <section className={block}>
        <h2 className="font-display text-lg font-bold">Datos legales del titular</h2>
        <p className="text-sm text-muted-foreground">Aparecen en Aviso legal y Privacidad.</p>
        <label className={lbl}>Nombre o razón social
          <Input value={f.legal_name} onChange={(e) => set("legal_name", e.target.value)} />
        </label>
        <label className={lbl}>NIF / CIF
          <Input value={f.legal_nif} onChange={(e) => set("legal_nif", e.target.value)} />
        </label>
        <label className={lbl}>Dirección postal
          <Input value={f.legal_address} onChange={(e) => set("legal_address", e.target.value)} />
        </label>
        <label className={lbl}>Email público de contacto
          <Input type="email" value={f.legal_email} onChange={(e) => set("legal_email", e.target.value)} />
        </label>
      </section>

      <section className={block}>
        <h2 className="font-display text-lg font-bold">Administración</h2>
        <label className={lbl}>Email de contacto de administración
          <Input type="email" value={f.contact_email} onChange={(e) => set("contact_email", e.target.value)} />
        </label>
        <label className={lbl}>WhatsApp de administración
          <Input value={f.admin_whatsapp} onChange={(e) => set("admin_whatsapp", e.target.value)} placeholder="+34 600 000 000" />
        </label>
        <label className={lbl}>Duración de «Colaborador» (meses)
          <Input type="number" min={1} max={24} value={f.collaborator_months} onChange={(e) => set("collaborator_months", Number(e.target.value))} />
        </label>
        <label className={lbl}>Mensaje de WhatsApp del enlace de revisión
          <Textarea rows={4} value={f.whatsapp_template} onChange={(e) => set("whatsapp_template", e.target.value)} />
          <span className="text-xs font-normal text-muted-foreground">Usa {"{nombre}"} para el nombre del titular y {"{enlace}"} para el enlace.</span>
        </label>
      </section>

      <section className={block}>
        <h2 className="font-display text-lg font-bold">Etiquetas frecuentes</h2>
        <p className="text-sm text-muted-foreground">Se ofrecen con un clic al editar una ficha. Una por línea.</p>
        <Textarea
          rows={6}
          value={f.common_labels.join("\n")}
          onChange={(e) => set("common_labels", e.target.value.split("\n"))}
          aria-label="Etiquetas frecuentes"
        />
      </section>

      <Button type="submit" className="justify-self-start">Guardar configuración</Button>
    </form>
  );
}

function Categories() {
  const qc = useQueryClient();
  const { data = [] } = useQuery(adminCategoriesQuery);
  const [name, setName] = useState("");
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin"] }); qc.invalidateQueries({ queryKey: ["directory"] }); };

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const sort = Math.max(0, ...data.map((c) => c.sort_order)) + 1;
    const { error } = await supabase.from("categories").insert({ name: name.trim(), slug: slugify(name), sort_order: sort, is_provisional: false });
    if (error) { toast.error("No se pudo crear (¿nombre repetido?)."); return; }
    setName(""); refresh();
  }
  async function rename(id: string, newName: string) {
    if (!newName.trim()) return;
    const { error } = await supabase.from("categories").update({ name: newName.trim(), slug: slugify(newName) }).eq("id", id);
    if (error) toast.error("No se pudo renombrar."); else { toast.success("Categoría actualizada"); refresh(); }
  }
  async function move(i: number, dir: -1 | 1) {
    const a = data[i], b = data[i + dir];
    if (!a || !b) return;
    await supabase.from("categories").update({ sort_order: b.sort_order }).eq("id", a.id);
    await supabase.from("categories").update({ sort_order: a.sort_order }).eq("id", b.id);
    refresh();
  }
  async function remove(id: string) {
    const { count } = await supabase.from("listings").select("id", { count: "exact", head: true }).eq("category_id", id);
    if (count) { toast.error(`No se puede borrar: tiene ${count} ficha(s).`); return; }
    if (!confirm("¿Borrar esta categoría?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) toast.error("No se pudo borrar."); else refresh();
  }

  return (
    <section className="mt-6 border bg-card p-4">
      <h2 className="font-display text-lg font-bold">Categorías generales</h2>
      <p className="text-sm text-muted-foreground">Los oficios se escriben en cada ficha y aparecen solos dentro de su categoría.</p>
      <ul className="mt-4 grid gap-2">
        {data.map((c, i) => (
          <li key={c.id} className="flex flex-wrap items-center gap-2">
            <Input defaultValue={c.name} className="max-w-xs" onBlur={(e) => e.target.value !== c.name && rename(c.id, e.target.value)} aria-label={`Nombre de ${c.name}`} />
            <Button type="button" variant="outline" size="sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir">↑</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => move(i, 1)} disabled={i === data.length - 1} aria-label="Bajar">↓</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => remove(c.id)}>Borrar</Button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="mt-4 flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nueva categoría" className="max-w-xs" />
        <Button type="submit">Añadir</Button>
      </form>
    </section>
  );
}
