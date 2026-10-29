import { describe, expect, it } from "vitest";
import { availabilityTags, searchTags, withAvailability } from "./listing-availability";

describe("distinciones de disponibilidad", () => {
  it("guarda Guardia fin de semana sin consumir etiquetas del negocio", () => {
    expect(withAvailability(["electricista"], ["Guardia fin de semana"])).toEqual(["electricista", "Guardia fin de semana"]);
    expect(availabilityTags(["electricista", "Guardia fin de semana"])).toEqual(["Guardia fin de semana"]);
  });
  it("guarda Atención en festivos", () => {
    expect(withAvailability([], ["Atención en festivos"])).toEqual(["Atención en festivos"]);
  });
  it("quitar una distinción conserva las palabras de búsqueda", () => {
    expect(withAvailability(["electricista", "Guardia fin de semana"], [])).toEqual(["electricista"]);
    expect(searchTags(["Guardia fin de semana", "molletes"])).toEqual(["molletes"]);
  });
});