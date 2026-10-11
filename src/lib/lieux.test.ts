import { describe, expect, it } from "vitest";
import { lireLieu } from "./lieux";

const valide = {
  nom: " Salle Cortot ",
  adresse: "78 rue Cardinet",
  ville: "Paris",
  pays: "France",
  latitude: "48.8846",
  longitude: "2.3089",
};

describe("lireLieu", () => {
  it("accepte un lieu complet, retire les espaces et convertit les coordonnées en nombres", () => {
    expect(lireLieu(valide).lieu).toEqual({ ...valide, nom: "Salle Cortot", latitude: 48.8846, longitude: 2.3089 });
  });

  it("accepte des coordonnées négatives (ouest, sud)", () => {
    expect(lireLieu({ ...valide, pays: "Royaume-Uni", latitude: "51.5", longitude: "-0.1167" }).lieu?.longitude).toBe(-0.1167);
  });

  it("refuse un pays hors de la liste (son fuseau serait inconnu)", () => {
    expect(lireLieu({ ...valide, pays: "Allemagne" }).erreurs?.pays).toBeDefined();
  });

  it("refuse une coordonnée hors bornes ou écrite avec une virgule", () => {
    expect(lireLieu({ ...valide, latitude: "91" }).erreurs?.latitude).toBeDefined();
    expect(lireLieu({ ...valide, longitude: "-180.5" }).erreurs?.longitude).toBeDefined();
    expect(lireLieu({ ...valide, latitude: "48,88" }).erreurs?.latitude).toBeDefined();
  });

  it("refuse des coordonnées absentes (pas de lieu sans coordonnées)", () => {
    expect(lireLieu({ ...valide, latitude: "", longitude: undefined }).erreurs).toMatchObject({
      latitude: expect.any(Array),
      longitude: expect.any(Array),
    });
  });

  it("refuse un nom vide", () => {
    expect(lireLieu({ ...valide, nom: "   " }).erreurs?.nom).toBeDefined();
  });
});
