import { describe, expect, it } from "vitest";
import {
  composeAddress,
  hoursOn,
  mapLink,
  normalizeWebsite,
  periodRange,
  validateListingDetails,
  validatePeriods,
  type HourPeriod,
} from "./listing-details";

const regular = [{ weekday: 1, opens: "09:00", closes: "14:00" }];
const summer: HourPeriod = {
  kind: "temporada",
  starts_on: "2026-07-01",
  ends_on: "2026-08-31",
  label: "Verano",
  hours: [{ weekday: 1, opens: "08:00", closes: "13:00" }],
};
const holiday: HourPeriod = {
  kind: "vacaciones",
  starts_on: "2026-08-10",
  ends_on: "2026-08-20",
  label: "",
  hours: [],
};

const base = {
  postal_code: "",
  latitude: "",
  longitude: "",
  website: "",
  cover_alt: "",
  hours_note: "",
  periods: [],
};

describe("dirección y ubicación de la ficha", () => {
  it("compone la dirección como la base y respeta la dirección libre antigua", () => {
    expect(
      composeAddress({
        street: "Calle Mayor",
        street_number: "3",
        postal_code: "12345",
        locality: "Villa",
      }),
    ).toBe("Calle Mayor 3, 12345 Villa");
    expect(composeAddress({ address: "Plaza 1", postal_code: "12345" })).toBe("Plaza 1");
  });

  it("valida código postal, coordenadas y web", () => {
    expect(validateListingDetails({ ...base, postal_code: "1234" }).postal_code).toBeDefined();
    expect(validateListingDetails({ ...base, latitude: "40,1" }).longitude).toMatch(
      /latitud y longitud/,
    );
    expect(
      validateListingDetails({ ...base, latitude: "95", longitude: "1" }).latitude,
    ).toBeDefined();
    expect(validateListingDetails({ ...base, website: "mi web" }).website).toBeDefined();
    expect(
      validateListingDetails({
        ...base,
        website: "ejemplo.es",
        latitude: "40.1",
        longitude: "-3.2",
      }),
    ).toEqual({});
    expect(normalizeWebsite("ejemplo.es")).toBe("https://ejemplo.es");
  });

  it("enlaza el mapa con coordenadas, dirección o localidad, por ese orden", () => {
    expect(
      mapLink({ public_latitude: 40.1, public_longitude: -3.2, public_address: "x" }),
    ).toContain("40.1,-3.2");
    expect(mapLink({ public_locality: "12345 Villa" })).toContain("12345%20Villa");
    expect(mapLink({})).toBeNull();
  });
});

describe("periodos de horario", () => {
  it("una temporada sustituye al horario habitual mientras dura", () => {
    expect(hoursOn(regular, [summer], "2026-07-15")).toMatchObject({
      season: summer,
      closure: null,
      hours: summer.hours,
    });
    expect(hoursOn(regular, [summer], "2026-09-01").hours).toBe(regular);
  });

  it("un cierre manda sobre la temporada: no hay horarios contradictorios", () => {
    const now = hoursOn(regular, [summer, holiday], "2026-08-15");
    expect(now.closure).toBe(holiday);
    expect(now.season).toBe(summer);
  });

  it("anuncia los cambios de los próximos 60 días, ordenados", () => {
    expect(hoursOn(regular, [holiday, summer], "2026-06-15").upcoming).toEqual([summer, holiday]);
    expect(hoursOn(regular, [summer], "2026-01-01").upcoming).toEqual([]);
  });

  it("rechaza periodos incoherentes", () => {
    expect(validatePeriods([{ ...summer, hours: [] }])).toMatch(/añade su horario/);
    expect(validatePeriods([{ ...holiday, hours: regular }])).toMatch(/no lleva horario/);
    expect(validatePeriods([{ ...holiday, ends_on: "2026-08-01" }])).toMatch(/anterior/);
    expect(validatePeriods([{ ...holiday, ends_on: "2028-01-01" }])).toMatch(/un año/);
    expect(validatePeriods([summer, holiday])).toBeNull();
  });

  it("describe el periodo con fechas legibles", () => {
    expect(periodRange(summer)).toBe("del 1 de julio al 31 de agosto");
    expect(periodRange({ starts_on: "2026-12-24", ends_on: "2026-12-24" })).toBe(
      "el 24 de diciembre",
    );
  });
});
