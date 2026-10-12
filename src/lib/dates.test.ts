import { describe, expect, it } from "vitest";
import { formaterDebut, lireSaisieDate, versChampsDate, versInstant } from "./dates";

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

describe("saisie de la date d'un engagement", () => {
  it("lit l'heure saisie à l'heure du lieu : 11 h à Genève en hiver = 10 h universelle", () => {
    expect(versInstant("2026-11-16", "11:00", "Suisse").toISOString()).toBe("2026-11-16T10:00:00.000Z");
  });

  it("tient compte de l'heure d'été : 20 h à Paris en juillet = 18 h universelle", () => {
    expect(versInstant("2027-07-10", "20:00", "France").toISOString()).toBe("2027-07-10T18:00:00.000Z");
  });

  it("ne dépend pas du fuseau de l'agent : 19 h à Tokyo = 10 h universelle (cas piégé)", () => {
    expect(versInstant("2027-02-13", "19:00", "Japon").toISOString()).toBe("2027-02-13T10:00:00.000Z");
  });

  it("le jour du passage à l'heure d'hiver, l'heure du soir reste juste", () => {
    expect(versInstant("2026-10-25", "20:00", "France").toISOString()).toBe("2026-10-25T19:00:00.000Z");
  });

  it("« mai 2027 » commence le 1er mai à minuit et finit le 1er juin", () => {
    const { debut, finPeriode } = lireSaisieDate({ precision: "mois", mois: "2027-05" }, "Suisse");
    expect(debut.toISOString()).toBe("2027-04-30T22:00:00.000Z");
    expect(finPeriode.toISOString()).toBe("2027-05-31T22:00:00.000Z");
  });

  it("« hiver 2027 » commence le 1er décembre 2027 et finit le 1er mars 2028 (passage d'année)", () => {
    const { debut, finPeriode } = lireSaisieDate({ precision: "saison", saison: "hiver", annee: 2027 }, "France");
    expect(debut.toISOString()).toBe("2027-11-30T23:00:00.000Z");
    expect(finPeriode.toISOString()).toBe("2028-02-29T23:00:00.000Z");
    expect(formaterDebut(debut, "saison", "France")).toBe("hiver 2027");
  });
});

describe("pré-remplissage du formulaire de modification", () => {
  it("rend le jour et l'heure à l'heure du lieu : 19 h à Tokyo reste 19 h (cas piégé)", () => {
    const champs = versChampsDate(versInstant("2027-02-13", "19:00", "Japon"), "jour", "Japon");
    expect(champs).toMatchObject({ jour: "2027-02-13", heure: "19:00" });
  });

  it("rend minuit « 00:00 », pas « 24:00 »", () => {
    expect(versChampsDate(versInstant("2026-12-31", "00:00", "France"), "jour", "France").heure).toBe("00:00");
  });

  it("rend « mai 2027 » au mois, sans jour ni heure", () => {
    const { debut } = lireSaisieDate({ precision: "mois", mois: "2027-05" }, "Suisse");
    expect(versChampsDate(debut, "mois", "Suisse")).toMatchObject({ mois: "2027-05", jour: "", heure: "" });
  });

  it("rend « hiver 2027 » avec l'année de décembre, pas celle d'après", () => {
    const { debut } = lireSaisieDate({ precision: "saison", saison: "hiver", annee: 2027 }, "France");
    expect(versChampsDate(debut, "saison", "France")).toMatchObject({ saison: "hiver", annee: "2027" });
  });
});
