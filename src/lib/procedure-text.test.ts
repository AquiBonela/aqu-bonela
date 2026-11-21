import { describe, expect, it } from "vitest";
import { parseProcedureText } from "./procedure-text";

describe("procedure text", () => {
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
  it("preserves emphasis around the existing Punto Vuela link", () => {
    expect(parseProcedureText("**Acude a Punto Vuela**")).toEqual([
      { text: "Acude a ", bold: true, italic: false, puntoVuela: false },
      { text: "Punto Vuela", bold: true, italic: false, puntoVuela: true },
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