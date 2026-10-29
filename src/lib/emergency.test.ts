import { describe, it, expect } from "vitest";
import { isEmergencyService } from "./listing-availability";
describe("acceso a urgencias", () => {
  it("incluye urgencias 24h", () => expect(isEmergencyService({ urgent_24h: true, tags: [] })).toBe(true));
  it("incluye guardia fin de semana", () => expect(isEmergencyService({ urgent_24h: false, tags: ["Guardia fin de semana"] })).toBe(true));
  it("excluye fichas sin guardias", () => expect(isEmergencyService({ urgent_24h: false, tags: ["Pan"] })).toBe(false));
});
