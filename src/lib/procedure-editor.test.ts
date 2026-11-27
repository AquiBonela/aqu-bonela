import { describe, expect, it } from "vitest";
import {
  defaultVisibility,
  editableContent,
  procedureContentSchema,
  readVisibility,
  translateContent,
  visibleContent,
} from "./procedure-editor";
import { TRAMITES, TRAMITE_TAGS } from "./tramites";

describe("procedure editor", () => {
  it("preserves every existing guide and all its steps when preparing the editor", () => {
    for (const t of TRAMITES) {
      const prepared = editableContent(t);
      expect(procedureContentSchema.safeParse(prepared).success).toBe(true);
      if (t.guia) expect(prepared["guia"]).toMatchObject(t.guia);
      expect(prepared["links"]).toEqual(t.links);
      expect(prepared["title"]).toBe(t.title);
    }
  });
  it("only accepts Gratuito, Con tasa, Online and Requiere acudir en persona tags", () => {
    for (const tag of TRAMITE_TAGS)
      expect(procedureContentSchema.safeParse({ ...editableContent(), tags: [tag] }).success).toBe(
        true,
      );
    expect(
      procedureContentSchema.safeParse({ ...editableContent(), tags: ["ayuntamiento"] }).success,
    ).toBe(false);
    expect(
      procedureContentSchema.safeParse({ ...editableContent(), tags: ["policia"] }).success,
    ).toBe(false);
  });
  it("rejects executable links", () => {
    expect(
      procedureContentSchema.safeParse({
        ...editableContent(),
        primaryAction: { label: "Open", url: "javascript:alert(1)" },
      }).success,
    ).toBe(false);
  });
  it("translates text but preserves URLs and identifiers", () => {
    expect(
      translateContent({
        title: "Guía de trámites",
        slug: "tramites",
        url: "https://example.org",
        cat: "documentacion",
      }),
    ).toEqual({
      title: "Procedure guide",
      slug: "tramites",
      url: "https://example.org",
      cat: "documentacion",
    });
  });
  const rules: Record<string, { root?: string; guide?: string; value: unknown }> = {
    short: { root: "short", value: "Descripción" },
    primaryAction: { root: "primaryAction", value: { label: "Open", url: "https://example.org" } },
    tags: { root: "tags", value: ["gratis"] },
    para: { root: "para", value: ["Uses"] },
    quien: { root: "quien", value: ["Who"] },
    necesitas: { root: "necesitas", value: ["Documents"] },
    pasos: { guide: "pasos", value: [{ t: "Step", d: ["Text"] }] },
    lugares: {
      guide: "lugares",
      value: [{ title: "Office", subtitle: "", description: ["Text"] }],
    },
    coste: { guide: "costeImporte", value: "0 €" },
    ayuda: { guide: "ayuda", value: ["Help"] },
    aclaracion: {
      guide: "aclaracion",
      value: { titulo: "Note", introduccion: "", puntos: ["Note"], nota: "" },
    },
    seguridad: { guide: "seguridad", value: "Security" },
    fuentes: { guide: "fuentes", value: [{ label: "Official", url: "https://example.org" }] },
    links: { root: "links", value: [{ label: "Link", url: "https://example.org" }] },
    revision: { guide: "revision", value: "November 2026" },
  };
  for (const [key, rule] of Object.entries(rules))
    it(`the ${key} selector hides content without deleting it`, () => {
      const input = {
        ...editableContent(),
        ...(rule.root ? { [rule.root]: rule.value } : {}),
        guia: {
          ...(editableContent()["guia"] as Record<string, unknown>),
          ...(rule.guide ? { [rule.guide]: rule.value } : {}),
        },
      };
      const result = visibleContent(input, { ...defaultVisibility(), [key]: false });
      const before = rule.root
        ? input[rule.root as keyof typeof input]
        : input.guia[rule.guide ?? ""];
      const after = rule.root
        ? result[rule.root]
        : (result["guia"] as Record<string, unknown>)[rule.guide ?? ""];
      expect(before).toEqual(rule.value);
      expect(after).not.toEqual(rule.value);
      expect(readVisibility({ [key]: false })[key]).toBe(false);
    });
});
