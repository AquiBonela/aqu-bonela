import { describe, expect, it } from "vitest";
import { parseProcedureText } from "./procedure-text";

describe("procedure text", () => {
  it("respects a custom external link instead of replacing it with Punto Vuela", () => {
    expect(parseProcedureText("/Punto Vuela*www.casarabonela.es/")).toEqual([
      { text: "Punto Vuela", bold: false, italic: false, href: "https://www.casarabonela.es/", puntoVuela: false },
    ]);
  });
  it("uses double asterisks for bold in procedure text", () => {
    expect(parseProcedureText("**Documento obligatorio**")).toEqual([
      { text: "Documento obligatorio", bold: true, italic: false, puntoVuela: false },
    ]);
  });
  it("uses single asterisks for italic in procedure text", () => {
    expect(parseProcedureText("*Lleva el original*")).toEqual([
      { text: "Lleva el original", bold: false, italic: true, puntoVuela: false },
    ]);
  });
  it("does not create automatic links for Punto Vuela mentions", () => {
    expect(parseProcedureText("Importante: el Punto Vuela ofrece apoyo")).toEqual([
      { text: "Importante: el Punto Vuela ofrece apoyo", bold: false, italic: false, puntoVuela: false },
    ]);
    expect(parseProcedureText("**Acude a Punto Vuela**")).toEqual([
      { text: "Acude a Punto Vuela", bold: true, italic: false, puntoVuela: false },
    ]);
  });
  it("avoids creating nested links in link labels and directory cards", () => {
    expect(parseProcedureText("*Punto Vuela*", false)).toEqual([
      { text: "Punto Vuela", bold: false, italic: true, puntoVuela: false },
    ]);
  });
  it("keeps HTML, line breaks and incomplete marks literal", () => {
    expect(parseProcedureText("<script>texto</script>\n**sin cierre")).toEqual([
      { text: "<script>texto</script>\n**sin cierre", bold: false, italic: false, puntoVuela: false },
    ]);
  });
});