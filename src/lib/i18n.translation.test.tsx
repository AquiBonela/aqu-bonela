import { describe, expect, it } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import sources from "./locales/sources.json";
import { LANGS, hasTranslation, translateText, I18nProvider, useI18n } from "./i18n";

afterEach(() => { cleanup(); localStorage.clear(); });

describe("public translation coverage", () => {
  it.each(LANGS)("has a stored translation for every audited source in %s", (lang) => {
    expect(sources.filter((source) => !hasTranslation(source, lang))).toEqual([]);
  });

  it.each(LANGS)("preserves paragraph boundaries and source data in %s", (lang) => {
    const source = "Gratuito.\n\nConsultar en ficha\nPunto Vuela · 952 456 140";
    const translated = translateText(source, lang);
    expect(translated.split("\n")).toHaveLength(4);
    expect(translated.split("\n")[1]).toBe("");
    expect(translated).toContain("Punto Vuela");
    expect(translated).toContain("952 456 140");
    expect(source).toBe("Gratuito.\n\nConsultar en ficha\nPunto Vuela · 952 456 140");
  });

  it.each(LANGS)("does not rewrite an unknown owner's name, address or external link in %s", (lang) => {
    const original = "Ana López · Calle Nueva, 27 · https://example.org/contacto";
    expect(translateText(original, lang)).toBe(original);
  });

  it.each(LANGS.filter((lang) => lang !== "es"))("translates the procedures block in servicios públicos in %s", (lang) => {
    expect(translateText("¿Necesitas realizar un trámite y no sabes por dónde empezar?", lang)).not.toBe("¿Necesitas realizar un trámite y no sabes por dónde empezar?");
    expect(translateText("Aquí Bonela no realiza trámites. Te explicamos cómo hacerlos y te facilitamos el acceso a los organismos oficiales.", lang)).not.toBe("Aquí Bonela no realiza trámites. Te explicamos cómo hacerlos y te facilitamos el acceso a los organismos oficiales.");
    expect(translateText("Consulta nuestras guías paso a paso para conocer los requisitos, la documentación necesaria, dónde realizar cada gestión y cómo solicitarla.", lang)).not.toBe("Consulta nuestras guías paso a paso para conocer los requisitos, la documentación necesaria, dónde realizar cada gestión y cómo solicitarla.");
  });

  it.each(LANGS.filter((lang) => lang !== "es"))("translates the trámites page header in %s", (lang) => {
    expect(translateText("Guía de trámites", lang)).not.toBe("Guía de trámites");
    expect(translateText("¿Qué trámite necesitas consultar?", lang)).not.toBe("¿Qué trámite necesitas consultar?");
    expect(translateText("Aquí Bonela no realiza trámites. Te explicamos cómo hacerlos y te facilitamos el acceso a los organismos oficiales.", lang)).not.toBe("Aquí Bonela no realiza trámites. Te explicamos cómo hacerlos y te facilitamos el acceso a los organismos oficiales.");
  });

  it.each(LANGS.filter((lang) => lang !== "es"))("translates the Con tasa tag in %s", (lang) => {
    expect(translateText("Con tasa", lang)).not.toBe("Con tasa");
  });

  it("keeps administration Spanish without overwriting the saved public language", async () => {
    localStorage.setItem("aquibonela-lang", "nl");
    function State() { const { lang } = useI18n(); return <output>{lang}</output>; }
    const view = render(<I18nProvider fixedLanguage="es"><State /></I18nProvider>);
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("es"));
    expect(localStorage.getItem("aquibonela-lang")).toBe("nl");
    view.rerender(<I18nProvider><State /></I18nProvider>);
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe("nl"));
  });
});