import { describe, expect, it } from "vitest";
import { parseDescription } from "./description";

describe("description bold formatting", () => {
  it("marks text between paired double asterisks as bold", () => {
    expect(parseDescription("**Horario:** de 9:00 a 14:00. **Servicios** disponibles.")).toEqual([
      { text: "Horario:", bold: true },
      { text: " de 9:00 a 14:00. ", bold: false },
      { text: "Servicios", bold: true },
      { text: " disponibles.", bold: false },
    ]);
  });

  it("preserves line breaks and unpaired or single asterisks", () => {
    expect(parseDescription("Primera línea\n*texto* y **sin cierre")).toEqual([
      { text: "Primera línea\n*texto* y **sin cierre", bold: false },
    ]);
  });

  it("keeps HTML as literal text rather than interpreting it", () => {
    expect(parseDescription('**<script>alert("hola")</script>**')).toEqual([
      { text: '<script>alert("hola")</script>', bold: true },
    ]);
  });
});