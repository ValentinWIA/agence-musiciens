import { describe, expect, it } from "vitest";
import { distanceApprocheeMetres, lireLieu, trouverDoublon } from "./lieux";

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

describe("trouverDoublon", () => {
  const colonne = { nom: "Salle Colonne", ville: "Paris 75013", latitude: 48.8322, longitude: 2.3755 };

  it("refuse le cas constaté : même nom en minuscules, code postal placé avant la ville", () => {
    expect(trouverDoublon({ ...colonne, nom: "salle colonne", ville: "75013 Paris" }, [colonne])).toBe(colonne);
  });

  it("ignore les espaces en trop dans le nom", () => {
    expect(trouverDoublon({ ...colonne, nom: "  Salle   Colonne " }, [colonne])).toBe(colonne);
  });

  it("refuse le même nom à moins de 100 m, même si la ville est écrite autrement", () => {
    // 0,0005° de latitude ≈ 56 m.
    expect(trouverDoublon({ ...colonne, ville: "Paris 13e", latitude: 48.8327 }, [colonne])).toBe(colonne);
  });

  it("accepte une autre salle à la même adresse", () => {
    expect(trouverDoublon({ ...colonne, nom: "Petite salle Colonne" }, [colonne])).toBeUndefined();
  });

  it("accepte le même nom dans une autre ville, loin", () => {
    expect(trouverDoublon({ ...colonne, ville: "Lyon", latitude: 45.764, longitude: 4.8357 }, [colonne])).toBeUndefined();
  });
});

describe("distanceApprocheeMetres", () => {
  it("donne environ 111 km pour un degré de latitude", () => {
    const a = { nom: "", ville: "", latitude: 48, longitude: 2 };
    expect(distanceApprocheeMetres(a, { ...a, latitude: 49 })).toBeCloseTo(111_195, -1);
  });
});
