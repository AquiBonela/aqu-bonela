import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getBuildMunicipality } from "@/config/municipality";
import { Text } from "@/lib/i18n";
import { IDENTITY_COLUMNS, identityErrorMessage, type IdentityRow } from "@/lib/identity-form";
import {
  identityAssetPaths,
  LOGO_TYPES,
  newAssetId,
  prepareLightLogo,
  prepareLogo,
  removeSiteAssets,
  uploadSiteAsset,
  validateSource,
} from "@/lib/site-assets";
import { siteAssetUrl } from "@/lib/site-identity";

type PathFields = Pick<
  IdentityRow,
  "logo_path" | "logo_light_path" | "icon_path" | "icon_small_path"
>;

type Props = {
  row: IdentityRow;
  onSaved: (row: IdentityRow) => void;
};

/**
 * Logotipo de la instalación y su versión clara para fondos oscuros. Al subir el logotipo se
 * generan también el favicon, el icono de Apple y los iconos de la aplicación instalable.
 * Se guarda al momento, sobre la versión de la identidad que se cargó.
 */
export function LogoManager({ row, onSaved }: Props) {
  const [busy, setBusy] = useState<"logo" | "light" | null>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const lightInput = useRef<HTMLInputElement>(null);
  const build = getBuildMunicipality().assets;

  async function save(changes: Partial<PathFields>, uploaded: string[], replaced: string[]) {
    const { data, error } = await supabase
      .from("site_identity")
      .update(changes)
      .eq("id", true)
      .eq("updated_at", row.updated_at)
      .select(IDENTITY_COLUMNS)
      .maybeSingle();
    if (error || !data) {
      await removeSiteAssets(uploaded);
      toast.error(
        error
          ? identityErrorMessage(error)
          : "La identidad cambió en otra sesión o esta cuenta no puede cambiarla. Recarga la página.",
      );
      return;
    }
    onSaved(data);
    const cleaned = await removeSiteAssets(replaced);
    toast.success(
      cleaned
        ? "Logotipo guardado. La web pública lo mostrará en un minuto como máximo."
        : "Logotipo guardado. No se pudieron borrar algunos archivos anteriores.",
    );
  }

  async function uploadLogo(file: File | undefined) {
    if (!file) return;
    const invalid = validateSource(file, LOGO_TYPES);
    if (invalid) return void toast.error(invalid);
    setBusy("logo");
    const paths = identityAssetPaths(newAssetId());
    const uploaded: string[] = [];
    try {
      const { logo, icon, iconSmall } = await prepareLogo(file);
      for (const [path, blob] of [
        [paths.logo, logo],
        [paths.icon, icon],
        [paths.iconSmall, iconSmall],
      ] as const) {
        await uploadSiteAsset(path, blob);
        uploaded.push(path);
      }
      await save(
        { logo_path: paths.logo, icon_path: paths.icon, icon_small_path: paths.iconSmall },
        uploaded,
        [row.logo_path, row.icon_path, row.icon_small_path],
      );
    } catch {
      await removeSiteAssets(uploaded);
      toast.error("No se pudo preparar o subir el logotipo. Prueba con otra imagen.");
    } finally {
      setBusy(null);
      if (logoInput.current) logoInput.current.value = "";
    }
  }

  async function uploadLight(file: File | undefined) {
    if (!file) return;
    const invalid = validateSource(file, LOGO_TYPES);
    if (invalid) return void toast.error(invalid);
    setBusy("light");
    const path = identityAssetPaths(newAssetId()).logoLight;
    try {
      await uploadSiteAsset(path, await prepareLightLogo(file));
      await save({ logo_light_path: path }, [path], [row.logo_light_path]);
    } catch {
      await removeSiteAssets([path]);
      toast.error("No se pudo preparar o subir el logotipo. Prueba con otra imagen.");
    } finally {
      setBusy(null);
      if (lightInput.current) lightInput.current.value = "";
    }
  }

  async function removeLogo() {
    setBusy("logo");
    try {
      await save(
        { logo_path: "", icon_path: "", icon_small_path: "" },
        [],
        [row.logo_path, row.icon_path, row.icon_small_path],
      );
    } finally {
      setBusy(null);
    }
  }

  async function removeLight() {
    setBusy("light");
    try {
      await save({ logo_light_path: "" }, [], [row.logo_light_path]);
    } finally {
      setBusy(null);
    }
  }

  const logo = row.logo_path ? siteAssetUrl(row.logo_path) : build.logoAdmin;
  const light = row.logo_light_path
    ? siteAssetUrl(row.logo_light_path)
    : row.logo_path
      ? undefined
      : build.logoHome;
  const icon = row.icon_small_path ? siteAssetUrl(row.icon_small_path) : build.pwaIcons.icon192;

  return (
    <section className="grid gap-4 border bg-card p-4" aria-labelledby="identidad-logotipo">
      <div>
        <h2 id="identidad-logotipo" className="font-display text-lg font-bold">
          <Text text="Logotipo e iconos" />
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          <Text text="PNG, JPG, WebP o SVG de hasta 10 MB. Al subirlo se generan también el icono de la pestaña, el de Apple y los de la aplicación instalable. Se guarda al momento." />
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid content-start gap-2">
          <p className="text-sm font-medium">
            <Text text="Logotipo" />
            {!row.logo_path && logo && (
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
              onChange={(e) => void uploadLogo(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              disabled={busy !== null}
              onClick={() => logoInput.current?.click()}
            >
              <Text
                text={
                  busy === "logo" ? "Guardando…" : row.logo_path ? "Sustituir" : "Subir logotipo"
                }
              />
            </Button>
            {row.logo_path && (
              <Button
                type="button"
                variant="ghost"
                disabled={busy !== null}
                onClick={() => void removeLogo()}
              >
                <Text text="Eliminar" />
              </Button>
            )}
          </div>
        </div>

        <div className="grid content-start gap-2">
          <p className="text-sm font-medium">
            <Text text="Versión para fondos oscuros (opcional)" />
          </p>
          <div className="flex h-24 items-center justify-center rounded-md border bg-primary p-3">
            {light ? (
              <img
                src={light}
                alt="Vista previa del logotipo sobre la imagen de portada"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <span className="text-sm text-primary-foreground">
                <Text text="Sin versión clara: la portada muestra el logotipo sobre un fondo blanco." />
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
              onChange={(e) => void uploadLight(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              disabled={busy !== null}
              onClick={() => lightInput.current?.click()}
            >
              <Text
                text={
                  busy === "light"
                    ? "Guardando…"
                    : row.logo_light_path
                      ? "Sustituir"
                      : "Subir versión clara"
                }
              />
            </Button>
            {row.logo_light_path && (
              <Button
                type="button"
                variant="ghost"
                disabled={busy !== null}
                onClick={() => void removeLight()}
              >
                <Text text="Eliminar" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 text-sm">
        <img src={icon} alt="" className="h-10 w-10 rounded-md border bg-white object-contain" />
        <span className="text-muted-foreground">
          <Text text="Icono de la pestaña y de la aplicación instalable." />
        </span>
      </div>
    </section>
  );
}
