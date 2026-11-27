import { describe, it, expect } from "vitest";
import {
  modularContent,
  readSections,
  newElement,
  alignedModuleContent,
  elementHasContent,
  ELEMENT_LABELS,
} from "./procedure-sections";
import { editableContent, procedureContentSchema, visibleContent } from "./procedure-editor";
import { catalogContent, translationMap } from "./content-translations";
import { TRAMITES } from "./tramites";
import { euroAmount } from "./procedure-display";

describe("modular procedures", () => {
  it("keeps uploaded images shared across languages while translating captions", () => {
    const image = {
      id: "photo",
      kind: "image",
      storagePath: "photo/new.webp",
      alt: "Centro médico",
      caption: "Entrada principal",
    };
    const source = { sections: [{ id: "s", title: "Ubicación", elements: [image] }] };
    const target = {
      sections: [
        {
          id: "s",
          title: "Location",
          elements: [
            {
              ...image,
              storagePath: "photo/old.webp",
              alt: "Medical centre",
              caption: "Main entrance",
            },
          ],
        },
      ],
    };
    expect(readSections(alignedModuleContent(source, target)["sections"])[0]?.elements[0]).toEqual({
      ...image,
      alt: "Medical centre",
      caption: "Main entrance",
    });
    expect(readSections(catalogContent(source, "en")["sections"])[0]?.elements[0]).toMatchObject({
      storagePath: "photo/new.webp",
    });
    expect(
      elementHasContent({
        id: "empty",
        kind: "image",
        storagePath: "",
        alt: "Sin imagen",
        caption: "Texto",
      }),
    ).toBe(false);
  });
  it("starts a new guide without predefined sections and with optional final notes", () => {
    const content = modularContent(editableContent());
    expect(content["sections"]).toEqual([]);
    expect(content["notes"]).toBe("");
  });
  it("supports all nine element kinds without requiring filled optional fields", () => {
    const elements = Object.keys(ELEMENT_LABELS).map((kind) =>
      newElement(kind as keyof typeof ELEMENT_LABELS, kind),
    );
    expect(elements.map((v) => v.kind)).toEqual([
      "text",
      "list",
      "steps",
      "places",
      "value",
      "sources",
      "notice",
      "timing",
      "image",
    ]);
    expect(
      procedureContentSchema.safeParse({
        ...editableContent(),
        sections: [{ id: "section", title: "¿Para qué sirve?", elements }],
      }).success,
    ).toBe(true);
    expect(elements.every((v) => !elementHasContent(v))).toBe(true);
  });
  it("keeps every existing template and all legacy data unchanged during adaptation", () => {
    for (const guide of TRAMITES) {
      const original = structuredClone(guide);
      const migrated = modularContent(editableContent(guide));
      expect(guide).toEqual(original);
      expect(migrated).toMatchObject(original);
      expect(procedureContentSchema.safeParse(migrated).success).toBe(true);
      if (guide.guia?.pasos.length)
        expect(
          readSections(migrated["sections"])
            .flatMap((s) => s.elements)
            .find((e) => e.kind === "steps"),
        ).toMatchObject({ items: guide.guia.pasos });
      expect(modularContent(migrated)).toBe(migrated);
    }
  });
  it("preserves hidden legacy requirements without publishing the adapted section", () => {
    const content = modularContent(
      { ...editableContent(), necesitas: ["DNI vigente"] },
      { necesitas: false },
    );
    const requirements = readSections(content["sections"]).find((s) => s.id === "legacy-necesitas");
    expect(requirements?.visible).toBe(false);
    expect(requirements?.elements).toContainEqual({
      id: "necesitas-list",
      kind: "list",
      title: "",
      items: [{ title: "DNI vigente", description: "" }],
    });
  });
  it("keeps optional list titles and per-requirement descriptions", () => {
    const sections = [
      {
        id: "req",
        title: "¿Qué necesitas?",
        elements: [
          {
            id: "minors",
            kind: "list",
            title: "Menores",
            items: [{ title: "DNI", description: "Original y copia" }],
          },
        ],
      },
    ];
    expect(readSections(sections)).toEqual(sections);
  });
  it("retains optional step groups, descriptions and links", () => {
    const sections = [
      {
        id: "steps",
        title: "Cómo solicitarlo",
        elements: [
          {
            id: "online",
            kind: "steps",
            items: [
              {
                grupo: "Online",
                t: "Solicitar",
                d: ["Primera línea\nSegunda línea"],
                link: { label: "Solicitud", url: "/tramites/documentacion/nie" },
              },
            ],
          },
        ],
      },
    ];
    expect(readSections(sections)).toEqual(sections);
  });
  it("keeps empty sources invisible and rejects executable modular links", () => {
    expect(
      elementHasContent({ id: "sources", kind: "sources", items: [{ label: "", url: "" }] }),
    ).toBe(false);
    expect(
      procedureContentSchema.safeParse({
        ...editableContent(),
        sections: [
          {
            id: "s",
            title: "Fuentes",
            elements: [
              { id: "e", kind: "sources", items: [{ label: "Abrir", url: "javascript:alert(1)" }] },
            ],
          },
        ],
      }).success,
    ).toBe(false);
  });
  it("adds euros without changing the stored amount and prunes incomplete links safely", () => {
    const content = {
      ...editableContent(),
      sections: [
        {
          id: "s",
          title: "Coste",
          elements: [
            { id: "v", kind: "value", title: "", amount: "12,50", explanation: "" },
            { id: "l", kind: "sources", items: [{ label: "", url: "" }] },
          ],
        },
      ],
    };
    const displayed = visibleContent(content, {});
    expect(readSections(displayed["sections"])).toHaveLength(1);
    expect(euroAmount("12,50")).toBe("12,50 €");
    expect(content.sections[0]?.elements[0]?.amount).toBe("12,50");
  });
  it("aligns translations by IDs when sections or elements move or are added", () => {
    const a = {
      id: "a",
      title: "Requisitos",
      elements: [{ id: "text-a", kind: "text", text: "DNI vigente" }],
    };
    const b = {
      id: "b",
      title: "Pasos",
      elements: [{ id: "text-b", kind: "text", text: "Solicitar cita" }],
    };
    const source = {
      sections: [
        b,
        a,
        {
          id: "new",
          title: "Nueva sección",
          elements: [{ id: "new-text", kind: "text", text: "Texto nuevo" }],
        },
      ],
    };
    const target = {
      sections: [
        {
          ...a,
          title: "Requirements",
          elements: [{ id: "text-a", kind: "text", text: "Valid ID" }],
        },
        {
          ...b,
          title: "Steps",
          elements: [{ id: "text-b", kind: "text", text: "Book an appointment" }],
        },
      ],
    };
    const translated = alignedModuleContent(source, target);
    const map = translationMap(source, translated);
    expect(map["DNI vigente"]).toBe("Valid ID");
    expect(map["Solicitar cita"]).toBe("Book an appointment");
    expect(map["Texto nuevo"]).toBe("");
    expect(readSections(translated["sections"]).map((s) => s.id)).toEqual(["b", "a", "new"]);
  });
  it("preserves type discriminators and IDs in each of the five translations", () => {
    const source = {
      sections: [
        { id: "s", title: "Requisitos", elements: [{ id: "t", kind: "text", text: "DNI" }] },
      ],
    };
    for (const lang of ["en", "de", "nl", "fr", "uk"] as const) {
      expect(readSections(catalogContent(source, lang)["sections"])[0]?.elements[0]).toMatchObject({
        id: "t",
        kind: "text",
      });
    }
  });
});
