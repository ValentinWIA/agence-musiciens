import { describe, expect, it } from "vitest";
import { formaterDebut } from "./dates";

describe("affichage de la date d'un engagement", () => {
  it("affiche une date précise à l'heure de Paris (cas normal)", () => {
    expect(formaterDebut(new Date("2026-10-24T20:00:00+02:00"), "jour", "France")).toBe("sam. 24 oct. 2026, 20 h 00");
  });

  it("affiche un concert à Tokyo à l'heure de Tokyo, pas de Paris (cas piégé)", () => {
    expect(formaterDebut(new Date("2027-02-13T19:00:00+09:00"), "jour", "Japon")).toBe("sam. 13 févr. 2027, 19 h 00");
  });

  it("affiche une date approximative au mois", () => {
    expect(formaterDebut(new Date("2027-05-01T00:00:00+02:00"), "mois", "Suisse")).toBe("mai 2027");
  });

  it("affiche une date approximative à la saison", () => {
    expect(formaterDebut(new Date("2027-09-01T00:00:00+02:00"), "saison", "France")).toBe("automne 2027");
    expect(formaterDebut(new Date("2027-03-01T00:00:00+01:00"), "saison", "Japon")).toBe("printemps 2027");
  });
});
