import { Text, useI18n } from "@/lib/i18n";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { activitiesQuery, adminCategoriesQuery, slugify } from "@/lib/admin";
import { LISTING_TYPES, type ListingType } from "@/lib/directory";

type Cat = { id: string; name: string; slug: string; sort_order: number; type: ListingType };
type Act = {
  id: string;
  category_id: string;
  name: string;
  synonyms: string[];
  sort_order: number;
};

/** Árbol Tipo → Categoría → Actividad, editable sin tocar el código. */
export function ListingCategories() {
  const { tr, locale } = useI18n();
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
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin"] });
    qc.invalidateQueries({ queryKey: ["directory"] });
  };
  const list = (cats as Cat[]).filter((c) => c.type === tab);
  const count = (id: string) => used.filter((u) => u.category_id === id).length;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    let slug = slugify(n);
    if (cats.some((c) => c.slug === slug)) slug = `${slug}-${tab}`;
    const sort = Math.max(0, ...cats.map((c) => c.sort_order)) + 1;
    const { error } = await supabase
      .from("categories")
      .insert({ name: n, slug, type: tab, sort_order: sort, is_provisional: false });
    if (error) {
      toast.error(tr("No se pudo crear (¿nombre repetido?)."));
      return;
    }
    setName("");
    refresh();
  }
  async function rename(id: string, newName: string) {
    if (!newName.trim()) return;
    const { error } = await supabase
      .from("categories")
      .update({ name: newName.trim() })
      .eq("id", id);
    if (error) toast.error(tr("No se pudo renombrar."));
    else {
      toast.success(tr("Categoría actualizada"));
      refresh();
    }
  }
  async function move(i: number, dir: -1 | 1) {
    const a = list[i],
      b = list[i + dir];
    if (!a || !b) return;
    await supabase.from("categories").update({ sort_order: b.sort_order }).eq("id", a.id);
    await supabase.from("categories").update({ sort_order: a.sort_order }).eq("id", b.id);
    refresh();
  }
  async function remove(c: Cat) {
    const n = count(c.id);
    if (n) {
      toast.error(tr(`No se puede borrar: tiene ${n} ficha(s).`));
      return;
    }
    if (!confirm(tr(`¿Borrar la categoría «${c.name}» y todas sus actividades?`))) return;
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    if (error) toast.error(tr("No se pudo borrar."));
    else refresh();
  }

  return (
    <section id="listing-categories" className="mt-5 border-y py-5">
      <h2 className="font-display text-lg font-bold">
        <Text text="Categorías y actividades" />
      </h2>
      <p className="text-sm text-muted-foreground">
        <Text text="Cada tipo tiene sus categorías y cada categoría sus actividades. En la web solo se muestran las que tienen fichas publicadas." />{" "}
      </p>
      <div role="tablist" className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {LISTING_TYPES.map((t) => (
          <Button
            key={t.value}
            variant="outline"
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => {
              setTab(t.value);
              setOpen(null);
            }}
            className={`min-h-10 rounded-soft-inner border px-2 text-sm font-medium ${tab === t.value ? "bg-foreground text-background hover:bg-foreground hover:text-background" : "bg-background text-foreground hover:bg-secondary hover:text-foreground"}`}
          >
            {tr(t.plural)}
          </Button>
        ))}
      </div>
      <ul className="mt-4 grid gap-2">
        {list.map((c, i) => {
          const n = count(c.id);
          const mine = (acts as Act[]).filter((a) => a.category_id === c.id);
          return (
            <li key={c.id} className="border">
              <div className="flex flex-wrap items-center gap-2 p-2">
                <Input
                  defaultValue={c.name}
                  className="max-w-xs flex-1"
                  onBlur={(e) => e.target.value !== c.name && rename(c.id, e.target.value)}
                  aria-label={`${tr("Nombre de")} ${c.name}`}
                />
                <span className="text-xs text-muted-foreground">
                  {mine.length} <Text text="actividades" /> · {n} <Text text="fichas" />
                </span>
                <div className="ml-auto flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setOpen(open === c.id ? null : c.id)}
                  >
                    {tr(open === c.id ? "Cerrar" : "Actividades")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label={tr("Subir")}
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => move(i, 1)}
                    disabled={i === list.length - 1}
                    aria-label={tr("Bajar")}
                  >
                    ↓
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => remove(c)}>
                    <Text text="Borrar" />
                  </Button>
                </div>
              </div>
              {open === c.id && (
                <Activities category={c} items={mine} used={used} onChange={refresh} />
              )}
            </li>
          );
        })}
        {!list.length && (
          <li className="text-sm text-muted-foreground">
            <Text text="Todavía no hay categorías de este tipo." />
          </li>
        )}
      </ul>
      <form onSubmit={add} className="mt-4 flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`${tr("Nueva categoría de")} ${tr(LISTING_TYPES.find((t) => t.value === tab)?.plural ?? "").toLowerCase()}`}
          className="max-w-xs"
        />
        <Button type="submit">
          <Text text="Añadir" />
        </Button>
      </form>
    </section>
  );
}

function Activities({
  category,
  items,
  used,
  onChange,
}: {
  category: Cat;
  items: Act[];
  used: { category_id: string | null; activity: string | null }[];
  onChange: () => void;
}) {
  const { tr, locale } = useI18n();
  const [name, setName] = useState("");
  const inUse = (a: Act) =>
    used.filter((u) => u.category_id === category.id && u.activity === a.name).length;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const sort = Math.max(-1, ...items.map((a) => a.sort_order)) + 1;
    const { error } = await supabase
      .from("activities")
      .insert({ category_id: category.id, name: n, sort_order: sort });
    if (error) {
      toast.error(tr("No se pudo crear (¿ya existe?)."));
      return;
    }
    setName("");
    onChange();
  }
  async function update(a: Act, patch: { name?: string; synonyms?: string[] }) {
    const { error } = await supabase.from("activities").update(patch).eq("id", a.id);
    if (error) {
      toast.error(tr("No se pudo guardar."));
      return;
    }
    // Las fichas guardan el nombre de la actividad: al renombrar, se actualizan también.
    if (patch.name && patch.name !== a.name) {
      await supabase
        .from("listings")
        .update({ activity: patch.name })
        .eq("category_id", category.id)
        .eq("activity", a.name);
    }
    toast.success(tr("Actividad guardada"));
    onChange();
  }
  async function remove(a: Act) {
    const n = inUse(a);
    if (n) {
      toast.error(tr(`No se puede borrar: la usan ${n} ficha(s).`));
      return;
    }
    if (!confirm(tr(`¿Borrar la actividad «${a.name}»?`))) return;
    const { error } = await supabase.from("activities").delete().eq("id", a.id);
    if (error) toast.error(tr("No se pudo borrar."));
    else onChange();
  }

  return (
    <div className="border-t bg-muted/30 p-3">
      <p className="mb-2 text-xs text-muted-foreground">
        <Text text="«Palabras parecidas» ayudan al buscador: si alguien escribe «tubería», encuentra a los fontaneros. Sepáralas con comas." />{" "}
      </p>
      <ul className="grid gap-2">
        {items.map((a) => (
          <li key={a.id} className="grid gap-2 sm:grid-cols-[14rem_1fr_auto] sm:items-center">
            <Input
              defaultValue={a.name}
              aria-label={tr("Nombre de la actividad")}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== a.name) update(a, { name: v });
              }}
            />
            <Input
              defaultValue={a.synonyms.join(", ")}
              placeholder={tr("Palabras parecidas")}
              aria-label={`${tr("Palabras parecidas de")} ${a.name}`}
              onBlur={(e) => {
                const v = e.target.value
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean);
                if (v.join(",") !== a.synonyms.join(",")) update(a, { synonyms: v });
              }}
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {inUse(a)} <Text text="fichas" />
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(a)}>
                <Text text="Borrar" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="mt-3 flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={tr("Nueva actividad")}
          className="max-w-xs"
        />
        <Button type="submit" variant="outline">
          <Text text="Añadir actividad" />
        </Button>
      </form>
    </div>
  );
}
