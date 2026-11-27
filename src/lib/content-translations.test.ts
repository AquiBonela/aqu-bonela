import { describe, expect, it } from "vitest";
import {
  editTranslation,
  languagesToGenerate,
  listingText,
  mapContent,
  readTranslations,
  translationMap,
  type Translations,
} from "./content-translations";
import { validateTranslatedStrings } from "./translation-validation";

describe("independent saved content languages", () => {
  const source = { description: "Texto original", short_description: "Resumen original" };
  it("prepares English, German, Dutch, French and Ukrainian from Spanish", () => {
    expect(languagesToGenerate({}, source)).toEqual(["en", "de", "nl", "fr", "uk"]);
  });
  it("does not regenerate saved versions on a visit or unchanged save", () => {
    const versions: Translations = Object.fromEntries(
      ["en", "de", "nl", "fr", "uk"].map((lang) => [
        lang,
        { source, content: { description: lang, short_description: lang }, manual: false },
      ]),
    );
    expect(languagesToGenerate(versions, source)).toEqual([]);
  });
  it("does not charge for regenerating unchanged content after jsonb reorders its keys", () => {
    const savedSource = { description: "Texto original", short_description: "Resumen original" };
    const nextSource = { short_description: "Resumen original", description: "Texto original" };
    const versions: Translations = Object.fromEntries(
      ["en", "de", "nl", "fr", "uk"].map((lang) => [
        lang,
        {
          source: savedSource,
          content: { description: lang, short_description: lang },
          manual: false,
        },
      ]),
    );
    expect(languagesToGenerate(versions, nextSource)).toEqual([]);
  });
  it("preserves Dutch corrections after Spanish changes", () => {
    const original: Translations = {
      en: { content: { description: "English" }, source, manual: false },
    };
    const edited = editTranslation(original, "nl", { description: "Nederlands correct" }, source);
    expect(edited.en?.content["description"]).toBe("English");
    expect(source.description).toBe("Texto original");
    expect(languagesToGenerate(edited, { ...source, description: "Español actualizado" })).toEqual([
      "en",
      "de",
      "nl",
      "fr",
      "uk",
    ]);
    expect(edited.nl?.content["description"]).toBe("Nederlands correct");
  });
  it("gives saved manual versions priority over the legacy dictionary", () => {
    const listing = {
      ...source,
      translations: {
        nl: { source, content: { description: "Una corrección literal" }, manual: true },
      },
    };
    expect(listingText(listing, "nl", "description")).toBe("Una corrección literal");
    expect(listingText(listing, "es", "description")).toBe("Texto original");
  });
  it("preserves URLs, business names, category IDs and tags", () => {
    expect(
      mapContent(
        {
          name: "Farmacia Bonela",
          slug: "farmacia",
          cat: "salud",
          tags: ["gratis"],
          url: "https://casarabonela.es",
          href: "tel:112",
          description: "Texto",
        },
        () => "Translated",
      ),
    ).toEqual({
      name: "Farmacia Bonela",
      slug: "farmacia",
      cat: "salud",
      tags: ["gratis"],
      url: "https://casarabonela.es",
      href: "tel:112",
      description: "Translated",
    });
  });
  it("ignores malformed and unsupported saved languages", () => {
    expect(readTranslations({ ar: { content: {} }, nl: "broken" })).toEqual({});
  });
  it("maps nested procedure paragraphs without translating destinations", () => {
    expect(
      translationMap(
        { guia: { pasos: [{ t: "Solicitud", d: ["Documento"] }] }, url: "https://example.com" },
        { guia: { pasos: [{ t: "Aanvraag", d: ["Document"] }] }, url: "changed" },
      ),
    ).toEqual({ Solicitud: "Aanvraag", Documento: "Document" });
  });
});
describe("translation integrity", () => {
  it("rejects changed phone numbers and hours", () => {
    expect(() =>
      validateTranslatedStrings(
        ["Llama al 112 de 09:00 a 14:00"],
        ["Call 911 from 09:00 to 14:00"],
      ),
    ).toThrow();
  });
  it("accepts formatted external links without changing their destination", () => {
    expect(() =>
      validateTranslatedStrings(
        ["**Horario**\nConsulta /Ayuntamiento*www.casarabonela.es/."],
        ["**Openingstijden**\nBekijk /Gemeentehuis*www.casarabonela.es/."],
      ),
    ).not.toThrow();
  });
  it("rejects incomplete translations", () => {
    expect(() => validateTranslatedStrings(["Título", "Resumen"], ["Title"])).toThrow();
  });
});
