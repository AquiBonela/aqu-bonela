import { Lock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { getAvailability } from "@/lib/site-availability";
import { MENU_ENTRIES, type ConfigurablePage } from "@/lib/site-structure";
import { MENU_LABELS, PAGE_LABELS, SECTION_LABELS } from "@/lib/structure-labels";
import { menuCodec, sectionsCodec, type OrderedToggle } from "@/lib/content-codecs";
import { Text, useI18n } from "@/lib/i18n";
import { DraftWorkflow } from "./DraftWorkflow";
import { ChangeSummary, DraftScreen } from "./DraftScreen";
import { OrderControls } from "./OrderControls";
import { move, type Change } from "@/lib/admin-changes";
import { useContentDraft } from "./useContentDraft";

/** Cambios de una lista ordenada de interruptores, para la revisión final. */
function toggleChanges(
  labels: Record<string, string>,
  before: OrderedToggle<string>[] | null,
  after: OrderedToggle<string>[],
): Change[] {
  if (!before) return [];
  const changes: Change[] = [];
  for (const item of after) {
    const prev = before.find((b) => b.key === item.key);
    if (prev && prev.enabled !== item.enabled)
      changes.push({
        label: labels[item.key] ?? item.key,
        before: prev.enabled ? "Activa" : "Desactivada",
        after: item.enabled ? "Activa" : "Desactivada",
      });
  }
  const order = (list: OrderedToggle<string>[]) =>
    list.map((i) => labels[i.key] ?? i.key).join(" · ");
  if (order(before) !== order(after))
    changes.push({ label: "Orden", before: order(before), after: order(after) });
  return changes;
}

function ToggleList({
  items,
  labels,
  hints,
  unavailable,
  disabled,
  onChange,
}: {
  items: OrderedToggle<string>[];
  labels: Record<string, string>;
  hints?: Record<string, string>;
  /** Claves sin contenido todavía: aunque estén activas, no se ven en la web. */
  unavailable: (key: string) => boolean;
  disabled: boolean;
  onChange: (items: OrderedToggle<string>[]) => void;
}) {
  const { tr } = useI18n();
  return (
    <ol className="grid gap-2">
      {items.map((item, index) => {
        const label = tr(labels[item.key] ?? item.key);
        const id = `estructura-${item.key}`;
        return (
          <li key={item.key} className="flex flex-wrap items-center gap-3 border bg-background p-3">
            <Switch
              id={id}
              checked={item.enabled}
              disabled={disabled}
              onCheckedChange={(enabled) =>
                onChange(items.map((i) => (i.key === item.key ? { ...i, enabled } : i)))
              }
            />
            <label htmlFor={id} className="min-w-0 flex-1 text-sm">
              <span className="font-medium">{label}</span>
              {unavailable(item.key) && (
                <span className="ml-2 text-xs text-muted-foreground">
                  <Text text="Sin contenido todavía: no se muestra aunque esté activa." />
                </span>
              )}
              {hints?.[item.key] && (
                <span className="block text-xs text-muted-foreground">
                  <Text text={hints[item.key] as string} />
                </span>
              )}
            </label>
            <OrderControls
              index={index}
              count={items.length}
              label={label}
              disabled={disabled}
              onMove={(delta) => onChange(move(items, index, delta))}
            />
          </li>
        );
      })}
    </ol>
  );
}

/** Menú de navegación: Portada y Directorio fijos; el resto se activa y ordena (borrador «menu»). */
export function MenuEditor() {
  const draft = useContentDraft("menu", menuCodec);
  const availability = getAvailability();
  const labels = Object.fromEntries(
    Object.entries(MENU_LABELS).map(([k, v]) => [k, v.label]),
  ) as Record<string, string>;
  const hints = Object.fromEntries(
    Object.entries(MENU_LABELS).map(([k, v]) => [k, v.hint]),
  ) as Record<string, string>;
  const unavailable = (key: string) => {
    const entry = MENU_ENTRIES.find((e) => e.key === key);
    if (!entry) return false;
    if (entry.kind === "page") return !availability.pages[entry.page];
    return !(availability.sections[entry.page] as Record<string, boolean>)[entry.section];
  };
  return (
    <section className="grid gap-4 border bg-card p-4" aria-labelledby="editor-menu">
      <h2 id="editor-menu" className="font-display text-lg font-bold">
        <Text text="Menú de navegación" />
      </h2>
      <ul className="grid gap-2 text-sm">
        {["Portada", "Directorio"].map((fixed) => (
          <li
            key={fixed}
            className="flex items-center gap-3 border border-dashed p-3 text-muted-foreground"
          >
            <Lock className="h-4 w-4" aria-hidden />
            <span className="flex-1 font-medium">
              <Text text={fixed} />
            </span>
            <span className="text-xs">
              <Text text="Siempre visible y primero" />
            </span>
          </li>
        ))}
      </ul>
      <DraftScreen draft={draft}>
        {(value) => (
          <>
            <ToggleList
              items={value}
              labels={labels}
              hints={hints}
              unavailable={unavailable}
              disabled={draft.busy}
              onChange={(items) => draft.setValue(items as typeof value)}
            />
            <p className="text-xs text-muted-foreground">
              <Text text="«Sobre» y «Sugerir o corregir» van siempre al final del menú. El orden de las páginas también ordena sus accesos en la portada." />
            </p>
            <DraftWorkflow
              draft={draft}
              changes={<ChangeSummary changes={toggleChanges(labels, draft.published, value)} />}
            />
          </>
        )}
      </DraftScreen>
    </section>
  );
}

/** Secciones de una página: activar, desactivar y ordenar (borrador «secciones:<página>»). */
export function SectionsEditor({ page }: { page: ConfigurablePage }) {
  const { tr } = useI18n();
  const draft = useContentDraft(`secciones:${page}`, sectionsCodec(page));
  const availability = getAvailability();
  const pageAvailable = availability.pages[page];
  return (
    <section className="grid gap-4 border bg-card p-4" aria-labelledby={`editor-secciones-${page}`}>
      <div>
        <h2 id={`editor-secciones-${page}`} className="font-display text-lg font-bold">
          {tr("Secciones de {pagina}", { pagina: tr(PAGE_LABELS[page]) })}
        </h2>
        {!pageAvailable && (
          <p className="mt-1 text-sm text-muted-foreground">
            <Text text="Esta página aún no tiene contenido publicado, así que no se muestra en la web aunque esté activa." />
          </p>
        )}
      </div>
      <DraftScreen draft={draft}>
        {(value) => (
          <>
            <ToggleList
              items={value}
              labels={SECTION_LABELS}
              unavailable={(key) => !(availability.sections[page] as Record<string, boolean>)[key]}
              disabled={draft.busy}
              onChange={(items) => draft.setValue(items)}
            />
            <DraftWorkflow
              draft={draft}
              changes={
                <ChangeSummary changes={toggleChanges(SECTION_LABELS, draft.published, value)} />
              }
            />
          </>
        )}
      </DraftScreen>
    </section>
  );
}
