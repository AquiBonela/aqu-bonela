import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Text } from "@/lib/i18n";
import { WEEKDAYS } from "@/lib/listing-detail";
import {
  MAX_PERIODS,
  PERIOD_LABELS,
  type HourPeriod,
  type PeriodKind,
} from "@/lib/listing-details";

type Props = {
  periods: HourPeriod[];
  onChange: (periods: HourPeriod[]) => void;
  error?: string | undefined;
};

const KINDS = Object.keys(PERIOD_LABELS) as PeriodKind[];

/**
 * Cierres excepcionales, vacaciones y horarios de temporada. Un cierre o unas vacaciones dejan la
 * ficha cerrada esos días; una temporada sustituye al horario habitual con el suyo propio.
 */
export function HourPeriodsEditor({ periods, onChange, error }: Props) {
  const update = (i: number, patch: Partial<HourPeriod>) =>
    onChange(periods.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="grid gap-3 border-t pt-3">
      <div>
        <p className="text-sm font-medium">
          <Text text="Cierres, vacaciones y temporadas" />
        </p>
        <p className="text-xs text-muted-foreground">
          <Text text="Durante un cierre o unas vacaciones la ficha se muestra cerrada; en temporada se muestra su horario en lugar del habitual. Los próximos cambios se anuncian con antelación." />
        </p>
      </div>
      {periods.map((p, i) => (
        <fieldset key={i} className="grid gap-2 border p-3">
          <legend className="sr-only">{`${PERIOD_LABELS[p.kind]} ${i + 1}`}</legend>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
            <select
              aria-label="Tipo de periodo"
              value={p.kind}
              onChange={(e) => {
                const kind = e.target.value as PeriodKind;
                update(i, { kind, hours: kind === "temporada" ? p.hours : [] });
              }}
              className="h-10 border bg-background px-2 text-sm"
            >
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {PERIOD_LABELS[k]}
                </option>
              ))}
            </select>
            <Input
              type="date"
              aria-label="Desde"
              value={p.starts_on}
              onChange={(e) =>
                update(i, {
                  starts_on: e.target.value,
                  ends_on: p.ends_on < e.target.value ? e.target.value : p.ends_on,
                })
              }
            />
            <Input
              type="date"
              aria-label="Hasta"
              value={p.ends_on}
              min={p.starts_on}
              onChange={(e) => update(i, { ends_on: e.target.value })}
            />
            <button
              type="button"
              aria-label="Quitar periodo"
              onClick={() => onChange(periods.filter((_, j) => j !== i))}
              className="inline-flex h-10 w-10 items-center justify-center border text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <Input
            aria-label="Nombre del periodo"
            placeholder={
              p.kind === "temporada" ? "Por ejemplo: Verano" : "Por ejemplo: Fiestas patronales"
            }
            maxLength={80}
            value={p.label}
            onChange={(e) => update(i, { label: e.target.value })}
          />
          {p.kind === "temporada" && (
            <div className="grid gap-2">
              {p.hours.map((h, k) => (
                <div key={k} className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Día"
                    value={h.weekday}
                    onChange={(e) =>
                      update(i, {
                        hours: p.hours.map((x, m) =>
                          m === k ? { ...x, weekday: +e.target.value } : x,
                        ),
                      })
                    }
                    className="h-9 border bg-background px-2 text-sm"
                  >
                    {WEEKDAYS.map((d, n) => (
                      <option key={d} value={n + 1}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="time"
                    aria-label="Abre"
                    className="h-9 w-28"
                    value={h.opens}
                    onChange={(e) =>
                      update(i, {
                        hours: p.hours.map((x, m) =>
                          m === k ? { ...x, opens: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <Input
                    type="time"
                    aria-label="Cierra"
                    className="h-9 w-28"
                    value={h.closes}
                    onChange={(e) =>
                      update(i, {
                        hours: p.hours.map((x, m) =>
                          m === k ? { ...x, closes: e.target.value } : x,
                        ),
                      })
                    }
                  />
                  <button
                    type="button"
                    aria-label="Quitar tramo"
                    onClick={() => update(i, { hours: p.hours.filter((_, m) => m !== k) })}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  update(i, {
                    hours: [...p.hours, { weekday: 1, opens: "09:00", closes: "14:00" }],
                  })
                }
                className="inline-flex items-center gap-1 justify-self-start text-sm text-terracotta"
              >
                <Plus className="h-4 w-4" aria-hidden /> <Text text="Añadir tramo de temporada" />
              </button>
            </div>
          )}
        </fieldset>
      ))}
      {periods.length < MAX_PERIODS && (
        <button
          type="button"
          onClick={() =>
            onChange([
              ...periods,
              { kind: "cierre", starts_on: today, ends_on: today, label: "", hours: [] },
            ])
          }
          className="inline-flex items-center gap-1 justify-self-start text-sm text-terracotta"
        >
          <Plus className="h-4 w-4" aria-hidden />{" "}
          <Text text="Añadir cierre, vacaciones o temporada" />
        </button>
      )}
      {error && (
        <p role="alert" className="text-xs font-medium text-destructive">
          <Text text={error} />
        </p>
      )}
    </div>
  );
}
