import { describe, expect, it } from "vitest";
import { parseDescription } from "./description";

describe("description formatting", () => {
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
