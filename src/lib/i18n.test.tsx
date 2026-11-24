import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { I18nProvider, LangSwitch, useI18n, LANGS, LANGUAGE_OPTIONS, Text, interpolate, translateText } from "./i18n";

function CurrentLanguage() {
  const { lang } = useI18n();
  return <output data-testid="current-language">{lang}</output>;
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("language selection", () => {
  it("switches every context consumer to English and persists the selection", async () => {
    render(<I18nProvider><LangSwitch /><CurrentLanguage /></I18nProvider>);
    fireEvent.keyDown(screen.getByRole("button", { name: /Español/ }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitemradio", { name: "English" }));
    expect(screen.getByTestId("current-language").textContent).toBe("en");
    expect(localStorage.getItem("aquibonela-lang")).toBe("en");
    await waitFor(() => expect(document.documentElement.lang).toBe("en"));
  });

  it("restores English after reopening and can return to Spanish", async () => {
    localStorage.setItem("aquibonela-lang", "en");
    render(<I18nProvider><LangSwitch /><CurrentLanguage /></I18nProvider>);
    await waitFor(() => expect(screen.getByTestId("current-language").textContent).toBe("en"));
    fireEvent.keyDown(screen.getByRole("button", { name: /English/ }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitemradio", { name: "Español" }));
    expect(screen.getByTestId("current-language").textContent).toBe("es");
    expect(localStorage.getItem("aquibonela-lang")).toBe("es");
  });
  it("offers the six agreed languages", () => {
    expect(LANGS).toEqual(["es", "en", "de", "nl", "fr", "uk"]);
  });
  it.each(["de", "nl", "fr", "uk"] as const)("selects and restores %s independently", async (language) => {
    const first = render(<I18nProvider><LangSwitch /><CurrentLanguage /></I18nProvider>);
    fireEvent.keyDown(screen.getByRole("button", { name: /Español/ }), { key: "Enter" });
    fireEvent.click(await screen.findByRole("menuitemradio", { name: LANGUAGE_OPTIONS[language].name }));
    expect(screen.getByTestId("current-language").textContent).toBe(language);
    expect(localStorage.getItem("aquibonela-lang")).toBe(language);
    first.unmount();
    render(<I18nProvider><CurrentLanguage /></I18nProvider>);
    await waitFor(() => expect(screen.getByTestId("current-language").textContent).toBe(language));
    expect(document.documentElement.lang).toBe(language);
  });
});

describe("interpolación de variables", () => {
  const vars = { municipio: "Alozaina", app: "Aquí Alozaina", gentilicio_m: "alozaineño", gentilicio_f: "alozaineña" };

  it("deja intactos los textos sin variables y las llamadas sin parámetros", () => {
    expect(interpolate("Servicios públicos")).toBe("Servicios públicos");
    expect(interpolate("Servicios públicos", vars)).toBe("Servicios públicos");
    expect(interpolate("Hola {nombre}")).toBe("Hola {nombre}");
  });
  it("sustituye {municipio}", () => {
    expect(interpolate("Vive {municipio}", vars)).toBe("Vive Alozaina");
  });
  it("sustituye {app}", () => {
    expect(interpolate("Sobre {app}", vars)).toBe("Sobre Aquí Alozaina");
  });
  it("sustituye varias variables y repeticiones", () => {
    expect(interpolate("{app}: {municipio}, {gentilicio_m}/{gentilicio_f}, {municipio}", vars))
      .toBe("Aquí Alozaina: Alozaina, alozaineño/alozaineña, Alozaina");
  });
  it("conserva las variables sin valor sin lanzar errores", () => {
    expect(interpolate("{municipio} y {desconocida}", vars)).toBe("Alozaina y {desconocida}");
    expect(interpolate("{toString}", {})).toBe("{toString}");
  });
  it.each(LANGS)("interpola tras traducir en %s", (lang) => {
    expect(interpolate(translateText("{municipio}", lang), vars)).toBe("Alozaina");
  });
});

function Probe() {
  const { t, tr } = useI18n();
  return (
    <>
      <output data-testid="t-old">{t("menu.servicios")}</output>
      <output data-testid="t-new">{t("menu.servicios", { municipio: "X" })}</output>
      <output data-testid="tr-old">{tr("Servicios públicos")}</output>
      <output data-testid="tr-new">{tr("Bienvenido a {municipio}", { municipio: "Alozaina" })}</output>
      <output data-testid="text"><Text text="Sobre {app}" params={{ app: "Aquí Alozaina" }} /></output>
      <output data-testid="text-old"><Text text="Servicios públicos" /></output>
    </>
  );
}

describe("compatibilidad de t(), tr() y Text", () => {
  it("mantiene las llamadas antiguas y admite parámetros", () => {
    render(<I18nProvider><Probe /></I18nProvider>);
    expect(screen.getByTestId("t-old").textContent).toBe("Servicios públicos");
    expect(screen.getByTestId("t-new").textContent).toBe("Servicios públicos");
    expect(screen.getByTestId("tr-old").textContent).toBe("Servicios públicos");
    expect(screen.getByTestId("tr-new").textContent).toBe("Bienvenido a Alozaina");
    expect(screen.getByTestId("text").textContent).toBe("Sobre Aquí Alozaina");
    expect(screen.getByTestId("text-old").textContent).toBe("Servicios públicos");
  });
});
