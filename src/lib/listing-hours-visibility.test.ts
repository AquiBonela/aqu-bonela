import { describe, expect, it } from "vitest";
import { HIDE_HOURS_TAG, hoursHidden, searchTags, withAvailability, withHoursVisibility } from "./listing-availability";

describe("ocultar horario", () => {
  it("el titular oculta el horario", () => {
    expect(hoursHidden(withHoursVisibility(["pan"], false))).toBe(true);
  });
  it("el titular vuelve a mostrarlo", () => {
    expect(withHoursVisibility(["pan", HIDE_HOURS_TAG], true)).toEqual(["pan"]);
  });
  it("no aparece como palabra de búsqueda y se conserva al guardar en el panel", () => {
    expect(searchTags(["pan", HIDE_HOURS_TAG])).toEqual(["pan"]);
    expect(withAvailability(["pan"], [HIDE_HOURS_TAG])).toContain(HIDE_HOURS_TAG);
  });
});
