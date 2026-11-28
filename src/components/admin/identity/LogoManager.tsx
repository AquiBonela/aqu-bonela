import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { getBuildMunicipality } from "@/config/municipality";
import { Text } from "@/lib/i18n";
import { LOGO_TYPES } from "@/lib/site-assets";
import type { IdentityAssets } from "@/lib/identity-draft";
import { useAdminAssetUrl } from "@/components/admin/content/useAdminAssetUrl";

type Props = {
  assets: IdentityAssets;
  /** Vistas previas de las imágenes elegidas que aún no se han subido (se suben al guardar). */
  pendingLogo: string | null;
  pendingLight: string | null;
  disabled: boolean;
  onChooseLogo: (file: File | undefined) => void;
  onChooseLight: (file: File | undefined) => void;
  onRemoveLogo: () => void;
  onRemoveLight: () => void;
};

/**
 * Logotipo de la instalación y su versión clara para fondos oscuros. Al guardar el borrador, el
 * logotipo genera también el favicon, el icono de Apple y los iconos de la aplicación instalable.
 * Forma parte del borrador de la identidad: no cambia la web hasta que se publica.
 */
export function LogoManager({
  assets,
  pendingLogo,
  pendingLight,
  disabled,
  onChooseLogo,
  onChooseLight,
  onRemoveLogo,
  onRemoveLight,
}: Props) {
  const logoInput = useRef<HTMLInputElement>(null);
  const lightInput = useRef<HTMLInputElement>(null);
  const build = getBuildMunicipality().assets;
  const savedLogo = useAdminAssetUrl(assets.logo_path || null);
  const savedLight = useAdminAssetUrl(assets.logo_light_path || null);
  const savedIcon = useAdminAssetUrl(assets.icon_small_path || null);

  const hasLogo = Boolean(pendingLogo || assets.logo_path);
  const logo = pendingLogo ?? (assets.logo_path ? savedLogo : build.logoAdmin);
  const light =
    pendingLight ?? (assets.logo_light_path ? savedLight : hasLogo ? undefined : build.logoHome);
  const icon = pendingLogo ?? (assets.icon_small_path ? savedIcon : build.pwaIcons.icon192);

  return (
    <section className="grid gap-4 border bg-card p-4" aria-labelledby="identidad-logotipo">
      <div>
        <h2 id="identidad-logotipo" className="font-display text-lg font-bold">
          <Text text="Logotipo e iconos" />
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          <Text text="PNG, JPG, WebP o SVG de hasta 10 MB. Al guardar el borrador se generan también el icono de la pestaña, el de Apple y los de la aplicación instalable." />
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid content-start gap-2">
          <p className="text-sm font-medium">
            <Text text="Logotipo" />
            {!hasLogo && logo && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                <Text text="(de la instalación)" />
              </span>
            )}
          </p>
          <div className="flex h-24 items-center justify-center rounded-md border bg-background p-3">
            {logo ? (
              <img
                src={logo}
                alt="Vista previa del logotipo en la cabecera"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <span className="text-sm text-muted-foreground">
                <Text text="Sin logotipo: se muestra el nombre de la plataforma." />
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={logoInput}
              type="file"
              accept={LOGO_TYPES.join(",")}
              className="sr-only"
              id="identidad-logo-archivo"
              onChange={(e) => {
                onChooseLogo(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => logoInput.current?.click()}
            >
              <Text text={hasLogo ? "Sustituir" : "Elegir logotipo"} />
            </Button>
            {hasLogo && (
              <Button type="button" variant="ghost" disabled={disabled} onClick={onRemoveLogo}>
                <Text text="Quitar" />
              </Button>
            )}
          </div>
        </div>

        <div className="grid content-start gap-2">
          <p className="text-sm font-medium">
            <Text text="Versión clara (para fondos oscuros)" />
          </p>
          <div className="flex h-24 items-center justify-center rounded-md border bg-primary p-3">
            {light ? (
              <img
                src={light}
                alt="Vista previa del logotipo sobre fondo oscuro"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <span className="text-sm text-primary-foreground">
                <Text text="Sin versión clara: se usa el logotipo normal." />
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={lightInput}
              type="file"
              accept={LOGO_TYPES.join(",")}
              className="sr-only"
              id="identidad-logo-claro-archivo"
              onChange={(e) => {
                onChooseLight(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={() => lightInput.current?.click()}
            >
              <Text
                text={pendingLight || assets.logo_light_path ? "Sustituir" : "Elegir versión clara"}
              />
            </Button>
            {(pendingLight || assets.logo_light_path) && (
              <Button type="button" variant="ghost" disabled={disabled} onClick={onRemoveLight}>
                <Text text="Quitar" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {icon && (
        <div className="flex items-center gap-3 text-sm">
          <img src={icon} alt="" className="h-10 w-10 rounded-md border object-contain" />
          <span className="text-muted-foreground">
            <Text text="Icono de la pestaña y de la aplicación instalable" />
          </span>
        </div>
      )}
    </section>
  );
}
