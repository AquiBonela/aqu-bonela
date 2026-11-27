import { describe, expect, it } from "vitest";
import { availabilityTags, searchTags, showsHours, withAvailability } from "./listing-availability";

describe("distinciones de disponibilidad", () => {
  it("guarda Guardia fin de semana sin consumir etiquetas del negocio", () => {
    expect(withAvailability(["electricista"], ["Guardia fin de semana"])).toEqual([
      "electricista",
      "Guardia fin de semana",
    ]);
    expect(availabilityTags(["electricista", "Guardia fin de semana"])).toEqual([
      "Guardia fin de semana",
    ]);
  });
  it("guarda Atención en festivos", () => {
    expect(withAvailability([], ["Atención en festivos"])).toEqual(["Atención en festivos"]);
  });
  it("quitar una distinción conserva las palabras de búsqueda", () => {
    expect(withAvailability(["electricista", "Guardia fin de semana"], [])).toEqual([
      "electricista",
    ]);
    expect(searchTags(["Guardia fin de semana", "molletes"])).toEqual(["molletes"]);
  });
});

describe("horario de la ficha", () => {
  const hours = [{ weekday: 1, opens: "10:00", closes: "13:00" }];

  // Reproduce el fallo del PR #9: la vista pública entrega tags sin la marca reservada y,
  // con sesión de administrador en el navegador, RLS sí devuelve las filas del horario oculto.
  it("no muestra un horario oculto aunque lleguen sus filas (sesión de administrador)", () => {
    expect(showsHours({ hours, tags: [], hours_hidden: true }, false)).toBe(false);
  });

  it("no muestra un horario oculto marcado en las etiquetas (datos sin pasar por la vista)", () => {
    expect(showsHours({ hours, tags: ["__ocultar_horario"] }, false)).toBe(false);
  });

  it("muestra el horario visible y nunca un horario vacío", () => {
    expect(showsHours({ hours, tags: [], hours_hidden: false }, false)).toBe(true);
    expect(showsHours({ hours: [], tags: [], hours_hidden: false }, false)).toBe(false);
  });

  it("en la revisión el titular ve su horario aunque esté oculto, para decidir", () => {
    expect(showsHours({ hours, tags: ["__ocultar_horario"], hours_hidden: true }, true)).toBe(true);
  });
});
