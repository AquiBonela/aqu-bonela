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
import { activitiesQuery, adminCategoriesQuery, siteSettingsQuery, slugify, withSettingsDefaults, type SiteSettings } from "@/lib/admin";
import { LISTING_TYPES, type ListingType } from "@/lib/directory";

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
  // Solo inicializa la primera vez: una recarga en segundo plano (cambio de pestaña, guardado)
  // no debe borrar lo que aún no se ha guardado.
  useEffect(() => { if (data && !f) setF(withSettingsDefaults(data)); }, [data, f]);
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

type Cat = { id: string; name: string; slug: string; sort_order: number; type: ListingType };
type Act = { id: string; category_id: string; name: string; synonyms: string[]; sort_order: number };

/** Árbol Tipo → Categoría → Actividad, editable sin tocar el código. */
function Categories() {
  const qc = useQueryClient();
  const { data: cats = [] } = useQuery(adminCategoriesQuery);
  const { data: acts = [] } = useQuery(activitiesQuery);
  const { data: used = [] } = useQuery({
    queryKey: ["admin", "category-usage"],
    queryFn: async () => {
      const { data } = await supabase.from("listings").select("category_id,activity");
      return data ?? [];
    },
  });
  const [tab, setTab] = useState<ListingType>("comercio");
  const [open, setOpen] = useState<string | null>(null);
  const [name, setName] = useState("");
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin"] }); qc.invalidateQueries({ queryKey: ["directory"] }); };
  const list = (cats as Cat[]).filter((c) => c.type === tab);
  const count = (id: string) => used.filter((u) => u.category_id === id).length;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    let slug = slugify(n);
    if (cats.some((c) => c.slug === slug)) slug = `${slug}-${tab}`;
    const sort = Math.max(0, ...cats.map((c) => c.sort_order)) + 1;
    const { error } = await supabase.from("categories").insert({ name: n, slug, type: tab, sort_order: sort, is_provisional: false });
    if (error) { toast.error("No se pudo crear (¿nombre repetido?)."); return; }
    setName(""); refresh();
  }
  async function rename(id: string, newName: string) {
    if (!newName.trim()) return;
    const { error } = await supabase.from("categories").update({ name: newName.trim() }).eq("id", id);
    if (error) toast.error("No se pudo renombrar."); else { toast.success("Categoría actualizada"); refresh(); }
  }
  async function move(i: number, dir: -1 | 1) {
    const a = list[i], b = list[i + dir];
    if (!a || !b) return;
    await supabase.from("categories").update({ sort_order: b.sort_order }).eq("id", a.id);
    await supabase.from("categories").update({ sort_order: a.sort_order }).eq("id", b.id);
    refresh();
  }
  async function remove(c: Cat) {
    const n = count(c.id);
    if (n) { toast.error(`No se puede borrar: tiene ${n} ficha(s).`); return; }
    if (!confirm(`¿Borrar la categoría «${c.name}» y todas sus actividades?`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    if (error) toast.error("No se pudo borrar."); else refresh();
  }

  return (
    <section className="mt-6 border bg-card p-4">
      <h2 className="font-display text-lg font-bold">Categorías y actividades</h2>
      <p className="text-sm text-muted-foreground">
        Cada tipo tiene sus categorías y cada categoría sus actividades. En la web solo se muestran las que tienen fichas publicadas.
      </p>
      <div role="tablist" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {LISTING_TYPES.map((t) => (
          <button key={t.value} type="button" role="tab" aria-selected={tab === t.value}
            onClick={() => { setTab(t.value); setOpen(null); }}
            className={`min-h-10 rounded-soft-inner border px-2 text-sm font-medium ${tab === t.value ? "bg-foreground text-background" : "bg-background hover:bg-secondary"}`}>
            {t.plural}
          </button>
        ))}
      </div>
      <ul className="mt-4 grid gap-2">
        {list.map((c, i) => {
          const n = count(c.id);
          const mine = (acts as Act[]).filter((a) => a.category_id === c.id);
          return (
            <li key={c.id} className="border">
              <div className="flex flex-wrap items-center gap-2 p-2">
                <Input defaultValue={c.name} className="max-w-xs flex-1" onBlur={(e) => e.target.value !== c.name && rename(c.id, e.target.value)} aria-label={`Nombre de ${c.name}`} />
                <span className="text-xs text-muted-foreground">{mine.length} actividades · {n} fichas</span>
                <div className="ml-auto flex gap-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => setOpen(open === c.id ? null : c.id)}>
                    {open === c.id ? "Cerrar" : "Actividades"}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir">↑</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="Bajar">↓</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => remove(c)}>Borrar</Button>
                </div>
              </div>
              {open === c.id && <Activities category={c} items={mine} used={used} onChange={refresh} />}
            </li>
          );
        })}
        {!list.length && <li className="text-sm text-muted-foreground">Todavía no hay categorías de este tipo.</li>}
      </ul>
      <form onSubmit={add} className="mt-4 flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Nueva categoría de ${LISTING_TYPES.find((t) => t.value === tab)!.plural.toLowerCase()}`} className="max-w-xs" />
        <Button type="submit">Añadir</Button>
      </form>
    </section>
  );
}

function Activities({ category, items, used, onChange }: {
  category: Cat; items: Act[]; used: { category_id: string | null; activity: string | null }[]; onChange: () => void;
}) {
  const [name, setName] = useState("");
  const inUse = (a: Act) => used.filter((u) => u.category_id === category.id && u.activity === a.name).length;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const sort = Math.max(-1, ...items.map((a) => a.sort_order)) + 1;
    const { error } = await supabase.from("activities").insert({ category_id: category.id, name: n, sort_order: sort });
    if (error) { toast.error("No se pudo crear (¿ya existe?)."); return; }
    setName(""); onChange();
  }
  async function update(a: Act, patch: { name?: string; synonyms?: string[] }) {
    const { error } = await supabase.from("activities").update(patch).eq("id", a.id);
    if (error) { toast.error("No se pudo guardar."); return; }
    // Las fichas guardan el nombre de la actividad: al renombrar, se actualizan también.
    if (patch.name && patch.name !== a.name) {
      await supabase.from("listings").update({ activity: patch.name }).eq("category_id", category.id).eq("activity", a.name);
    }
    toast.success("Actividad guardada"); onChange();
  }
  async function remove(a: Act) {
    const n = inUse(a);
    if (n) { toast.error(`No se puede borrar: la usan ${n} ficha(s).`); return; }
    if (!confirm(`¿Borrar la actividad «${a.name}»?`)) return;
    const { error } = await supabase.from("activities").delete().eq("id", a.id);
    if (error) toast.error("No se pudo borrar."); else onChange();
  }

  return (
    <div className="border-t bg-muted/30 p-3">
      <p className="mb-2 text-xs text-muted-foreground">
        «Palabras parecidas» ayudan al buscador: si alguien escribe «tubería», encuentra a los fontaneros. Sepáralas con comas.
      </p>
      <ul className="grid gap-2">
        {items.map((a) => (
          <li key={a.id} className="grid gap-2 sm:grid-cols-[14rem_1fr_auto] sm:items-center">
            <Input defaultValue={a.name} aria-label="Nombre de la actividad"
              onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== a.name) update(a, { name: v }); }} />
            <Input defaultValue={a.synonyms.join(", ")} placeholder="Palabras parecidas" aria-label={`Palabras parecidas de ${a.name}`}
              onBlur={(e) => {
                const v = e.target.value.split(",").map((x) => x.trim()).filter(Boolean);
                if (v.join(",") !== a.synonyms.join(",")) update(a, { synonyms: v });
              }} />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{inUse(a)} fichas</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(a)}>Borrar</Button>
            </div>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="mt-3 flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nueva actividad" className="max-w-xs" />
        <Button type="submit" variant="outline">Añadir actividad</Button>
      </form>
    </div>
  );
}
