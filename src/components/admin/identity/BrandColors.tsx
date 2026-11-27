import type { CSSProperties } from "react";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getBuildMunicipality } from "@/config/municipality";
import { AA_CONTRAST, paletteContrasts, themeFromColors } from "@/lib/brand-palette";
import { Text } from "@/lib/i18n";
import type { MunicipalityTheme } from "../../../../instances/schema";

type ColorName = "primary_color" | "accent_color";

type Props = {
  primary: string;
  accent: string;
  errors: Partial<Record<ColorName, string | undefined>>;
  onChange: (name: ColorName, value: string) => void;
};

const HEX = /^#[0-9a-f]{6}$/i;

/** Variables CSS del tema calculado, para la vista previa. */
function previewStyle(theme: MunicipalityTheme): CSSProperties {
  return {
    "--primary": theme.light.primary,
    "--primary-foreground": theme.light.primaryForeground,
    "--terracotta": theme.light.terracotta,
    "--terracotta-foreground": theme.light.terracottaForeground,
    "--accent-foreground": theme.light.accentForeground,
    "--sand": theme.light.sand,
    "--beige": theme.light.beige,
    "--ring": theme.light.ring,
  } as CSSProperties;
}

/**
 * Dos colores de la instalación con vista previa y comprobación de contraste. El resto de la
 * paleta (fondos, estados, modo oscuro) se calcula con la función común brand-palette.
 */
export function BrandColors({ primary, accent, errors, onChange }: Props) {
  const theme = themeFromColors(
    getBuildMunicipality().theme,
    HEX.test(primary) ? primary.toLowerCase() : undefined,
    HEX.test(accent) ? accent.toLowerCase() : undefined,
  );
  const checks = paletteContrasts(theme);
  const fields: { name: ColorName; label: string; value: string }[] = [
    { name: "primary_color", label: "Color principal", value: primary },
    { name: "accent_color", label: "Color de acento", value: accent },
  ];

  return (
    <section className="grid gap-4 border bg-card p-4" aria-labelledby="identidad-colores">
      <div>
        <h2 id="identidad-colores" className="font-display text-lg font-bold">
          <Text text="Colores" />
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          <Text text="Elige dos colores. Fondos, estados y modo oscuro se calculan a partir de ellos; si un color no se lee bien sobre blanco, se oscurece lo justo. Vacíos, se usan los de la instalación." />
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => {
          const id = `identidad-${field.name}`;
          const error = errors[field.name];
          return (
            <div key={field.name} className="grid content-start gap-1 text-sm">
              <label htmlFor={id} className="font-medium">
                <Text text={field.label} />
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label={`${field.label}: selector`}
                  value={HEX.test(field.value) ? field.value.toLowerCase() : "#ffffff"}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  className="h-10 w-12 shrink-0 cursor-pointer rounded border bg-background p-1"
                />
                <Input
                  id={id}
                  value={field.value}
                  placeholder="#1f4e79"
                  maxLength={7}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? `${id}-error` : undefined}
                  className={error ? "border-destructive" : undefined}
                />
                {field.value && (
                  <button
                    type="button"
                    onClick={() => onChange(field.name, "")}
                    className="shrink-0 text-xs text-muted-foreground underline"
                  >
                    <Text text="Quitar" />
                  </button>
                )}
              </div>
              {error && (
                <p id={`${id}-error`} className="text-xs font-medium text-destructive">
                  <Text text={error} />
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div style={previewStyle(theme)} className="grid gap-3 rounded-md border bg-sand p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Text text="Vista previa" />
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            <Text text="Botón principal" />
          </span>
          <span className="rounded-full bg-terracotta px-3 py-1 text-xs font-semibold text-terracotta-foreground">
            <Text text="Distintivo" />
          </span>
          <span className="text-sm font-medium text-primary underline">
            <Text text="Enlace" />
          </span>
          <span className="rounded-md bg-beige px-3 py-1 text-sm text-accent-foreground">
            <Text text="Texto de acento" />
          </span>
        </div>
      </div>

      <ul className="grid gap-1 text-xs" aria-label="Contraste de la paleta">
        {checks.map((check) => {
          const ok = check.ratio >= AA_CONTRAST;
          const Icon = ok ? CheckCircle2 : TriangleAlert;
          return (
            <li key={check.label} className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${ok ? "text-primary" : "text-destructive"}`} aria-hidden />
              <Text text={check.label} />
              <span className="text-muted-foreground">
                {check.ratio.toFixed(1)}:1 {ok ? "· AA" : ""}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
