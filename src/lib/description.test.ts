import { describe, expect, it } from "vitest";
import { parseDescription } from "./description";

describe("description formatting", () => {
  it.each([
    ["servicios/punto-vuela-casarabonela", "/servicios/punto-vuela-casarabonela"],
    ["punto-vuela", "/punto-vuela"],
    ["tramites/documentacion/nie", "/tramites/documentacion/nie"],
  ])("recognizes the internal path %s without a leading slash", (input, href) => {
    expect(parseDescription(`*** Punto Vuela (${input}) ***`)).toEqual([
      { text: "Punto Vuela", bold: false, italic: false, href },
    ]);
  });
  it("does not guess arbitrary words as internal routes", () => {
    const text = "*** Centro (centro-inventado) ***";
    expect(parseDescription(text)).toEqual([{ text, bold: false, italic: false }]);
  });
  it("supports triple-asterisk local links without tying them to a domain", () => {
    expect(parseDescription("*** Centro médico (/servicios/consultorio-medico) ***")).toEqual([
      { text: "Centro médico", bold: false, italic: false, href: "/servicios/consultorio-medico" },
    ]);
  });
  it("supports triple-asterisk external links and URL parentheses", () => {
    expect(parseDescription("***Web (https://example.org/info_(a))***")).toEqual([
      { text: "Web", bold: false, italic: false, href: "https://example.org/info_(a)" },
    ]);
  });
  it("does not confuse triple-asterisk links with bold and italic", () => {
    expect(
      parseDescription("**Título** *** Centro (/punto-vuela) *** *Nota*").filter(
        (p) => p.href || p.bold || p.italic,
      ),
    ).toEqual([
      { text: "Título", bold: true, italic: false },
      { text: "Centro", bold: false, italic: false, href: "/punto-vuela" },
      { text: "Nota", bold: false, italic: true },
    ]);
  });
  it.each(["javascript:alert(1)", "//evil.example", "/\\evil.example"])(
    "rejects unsafe new-format links %s",
    (url) => {
      const text = `*** Enlace (${url}) ***`;
      expect(parseDescription(text)).toEqual([{ text, bold: false, italic: false }]);
    },
  );
  it("creates the requested ayuntamiento link from a bare website", () => {
    expect(parseDescription("/ayuntamiento*www.casarabonela.es/")).toEqual([
      { text: "ayuntamiento", bold: false, italic: false, href: "https://www.casarabonela.es/" },
    ]);
  });
  it("supports explicit HTTPS URLs with paths, query parameters and fragments", () => {
    expect(
      parseDescription(
        "/Solicitar cita*https://www.casarabonela.es/tramites/cita?q=nie#solicitud/",
      ),
    ).toEqual([
      {
        text: "Solicitar cita",
        bold: false,
        italic: false,
        href: "https://www.casarabonela.es/tramites/cita?q=nie#solicitud",
      },
    ]);
  });
  it("keeps links separate from bold and italic text", () => {
    expect(parseDescription("**Consulta** /ayuntamiento*www.casarabonela.es/ *oficial*")).toEqual([
      { text: "Consulta", bold: true, italic: false },
      { text: " ", bold: false, italic: false },
      { text: "ayuntamiento", bold: false, italic: false, href: "https://www.casarabonela.es/" },
      { text: " ", bold: false, italic: false },
      { text: "oficial", bold: false, italic: true },
    ]);
  });
  it.each([
    "javascript:alert(1)",
    "data:text/html,test",
    "//evil.example",
    "https://user:pass@example.com",
    "https://example.com/<script>",
  ])("does not create an unsafe link to %s", (url) => {
    const text = `/enlace*${url}/`;
    expect(parseDescription(text)).toEqual([{ text, bold: false, italic: false }]);
  });
  it("parses multiple links without consuming the intervening text", () => {
    expect(
      parseDescription("/Uno*www.casarabonela.es/ y /Dos*https://example.com/info/")
        .filter((part) => part.href)
        .map((part) => part.href),
    ).toEqual(["https://www.casarabonela.es/", "https://example.com/info"]);
  });
  it("marks text between paired double asterisks as bold", () => {
    expect(parseDescription("**Horario:** de 9:00 a 14:00. **Servicios** disponibles.")).toEqual([
      { text: "Horario:", bold: true, italic: false },
      { text: " de 9:00 a 14:00. ", bold: false, italic: false },
      { text: "Servicios", bold: true, italic: false },
      { text: " disponibles.", bold: false, italic: false },
    ]);
  });

  it("marks text between paired single asterisks as italic", () => {
    expect(parseDescription("Llamar a *Fermín* para *avisar*")).toEqual([
      { text: "Llamar a ", bold: false, italic: false },
      { text: "Fermín", bold: false, italic: true },
      { text: " para ", bold: false, italic: false },
      { text: "avisar", bold: false, italic: true },
    ]);
  });

  it("keeps bold and italic independent in the same line", () => {
    expect(parseDescription("**Cerrado** *por obras*")).toEqual([
      { text: "Cerrado", bold: true, italic: false },
      { text: " ", bold: false, italic: false },
      { text: "por obras", bold: false, italic: true },
    ]);
  });

  it("preserves line breaks and unpaired or lone asterisks", () => {
    expect(parseDescription("Primera línea\n**sin cierre y sin cerrar")).toEqual([
      { text: "Primera línea\n**sin cierre y sin cerrar", bold: false, italic: false },
    ]);
    expect(parseDescription("2 * 3 = 6")).toEqual([
      { text: "2 * 3 = 6", bold: false, italic: false },
    ]);
  });

  it("keeps HTML as literal text rather than interpreting it", () => {
    expect(parseDescription('**<script>alert("hola")</script>**')).toEqual([
      { text: '<script>alert("hola")</script>', bold: true, italic: false },
    ]);
    expect(parseDescription("*<em>hola</em>*")).toEqual([
      { text: "<em>hola</em>", bold: false, italic: true },
    ]);
  });
});
