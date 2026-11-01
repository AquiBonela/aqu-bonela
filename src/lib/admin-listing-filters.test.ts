import { describe, expect, it } from "vitest";
import { changeAdminCategory, changeAdminType, emptyAdminFilters, filterAdminListings } from "./admin-listing-filters";

const listings = [
  { id: "pan", name: "Panadería", status: "borrador", type: "comercio" as const, category_id: "alimentacion", activity: "Panadería" },
  { id: "carne", name: "Carnicería", status: "publicada", type: "comercio" as const, category_id: "alimentacion", activity: "Carnicería" },
  { id: "salud", name: "Consultorio", status: "borrador", type: "publico" as const, category_id: "salud", activity: "Atención primaria" },
];

describe("filtros de fichas del panel", () => {
  it("incluye los borradores al seleccionar un tipo", () => {
    expect(filterAdminListings(listings, { ...emptyAdminFilters, type: "comercio" }).map((l) => l.id)).toEqual(["pan", "carne"]);
  });
  it("combina categoría, actividad, estado y búsqueda", () => {
    expect(filterAdminListings(listings, { q: "panaderia", status: "borrador", type: "comercio", category: "alimentacion", activity: "Panadería" }).map((l) => l.id)).toEqual(["pan"]);
  });
  it("cambiar tipo reinicia categoría y actividad sin perder estado ni búsqueda", () => {
    expect(changeAdminType({ q: "c", status: "borrador", type: "comercio", category: "alimentacion", activity: "Panadería" }, "publico")).toEqual({ q: "c", status: "borrador", type: "publico", category: "", activity: "" });
  });
  it("elegir categoría ajusta el tipo y reinicia actividad", () => {
    expect(changeAdminCategory({ ...emptyAdminFilters, activity: "Panadería" }, "salud", "publico")).toEqual({ ...emptyAdminFilters, type: "publico", category: "salud" });
  });
});