import { describe, expect, it } from "vitest";
import {
  bornesDuMois,
  casesDuMois,
  heureLocale,
  jourLocal,
  libelleMois,
  lireMois,
  moisVoisin,
  rangerPourMois,
  rangerSeptJours,
  septJours,
  type EngagementCalendrier,
} from "./calendrier";
import { lireSaisieDate } from "./dates";

function engagement(modif: Partial<EngagementCalendrier> = {}): EngagementCalendrier {
  return { statut: "confirme", debut: new Date("2026-11-16T19:00:00Z"), precisionDate: "jour", pays: "France", ...modif };
}

describe("jourLocal", () => {
  it("compte à l'heure du lieu : Tokyo le 3 à 1 h (le 2 en UTC) est le 3", () => {
    expect(jourLocal(new Date("2026-12-02T16:00:00Z"), "Japon")).toBe("2026-12-03");
    expect(jourLocal(new Date("2026-12-02T16:00:00Z"), "France")).toBe("2026-12-02");
  });
});

describe("heureLocale et libelleMois", () => {
  it("écrit l'heure du lieu et le mois en toutes lettres", () => {
    expect(heureLocale(new Date("2026-12-02T16:00:00Z"), "Japon")).toBe("01 h 00");
    expect(heureLocale(new Date("2026-11-16T19:00:00Z"), "France")).toBe("20 h 00");
    expect(libelleMois({ annee: 2026, mois: 11 })).toBe("novembre 2026");
  });
});

describe("lireMois", () => {
  it("lit « 2026-11 »", () => {
    expect(lireMois("2026-11", "2026-10-17")).toEqual({ annee: 2026, mois: 11 });
  });

  it("absent, inventé ou impossible → le mois d'aujourd'hui", () => {
    for (const faux of [undefined, "", "novembre", "2026-13", "2026-00", "2026-1", "1850-05", "2026-11-01"]) {
      expect(lireMois(faux, "2026-10-17")).toEqual({ annee: 2026, mois: 10 });
    }
  });
});

describe("moisVoisin", () => {
  it("passe d'une année à l'autre", () => {
    expect(moisVoisin({ annee: 2026, mois: 12 }, 1)).toEqual({ annee: 2027, mois: 1 });
    expect(moisVoisin({ annee: 2027, mois: 1 }, -1)).toEqual({ annee: 2026, mois: 12 });
  });
});

describe("casesDuMois", () => {
  it("novembre 2026 commence un dimanche : 6 semaines du lundi au dimanche", () => {
    const semaines = casesDuMois({ annee: 2026, mois: 11 });
    expect(semaines).toHaveLength(6);
    expect(semaines.every((s) => s.length === 7)).toBe(true);
    expect(semaines[0][0]).toEqual({ jour: "2026-10-26", dansLeMois: false });
    expect(semaines[0][6]).toEqual({ jour: "2026-11-01", dansLeMois: true });
    expect(semaines[5][6]).toEqual({ jour: "2026-12-06", dansLeMois: false });
  });

  it("février 2027 (28 jours, commence un lundi) tient en 4 semaines", () => {
    const semaines = casesDuMois({ annee: 2027, mois: 2 });
    expect(semaines).toHaveLength(4);
    expect(semaines[0][0].jour).toBe("2027-02-01");
    expect(semaines.flat().every((c) => c.dansLeMois)).toBe(true);
  });
});

describe("septJours", () => {
  it("aujourd'hui et les 6 suivants, en passant au mois suivant", () => {
    expect(septJours("2026-10-28")).toEqual([
      "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03",
    ]);
  });
});

describe("rangerPourMois", () => {
  const novembre = { annee: 2026, mois: 11 };

  it("range par jour, du plus tôt au plus tard, et écarte les autres mois", () => {
    const soir = engagement({ debut: new Date("2026-11-16T19:00:00Z") });
    const matin = engagement({ debut: new Date("2026-11-16T10:00:00Z") });
    const decembre = engagement({ debut: new Date("2026-12-01T19:00:00Z") });
    const { parJour, aPreciser } = rangerPourMois([soir, decembre, matin], novembre);
    expect(parJour.get("2026-11-16")).toEqual([matin, soir]);
    expect([...parJour.keys()]).toEqual(["2026-11-16"]);
    expect(aPreciser).toEqual([]);
  });

  it("cache les annulés", () => {
    const { parJour } = rangerPourMois([engagement({ statut: "annule" })], novembre);
    expect(parJour.size).toBe(0);
  });

  it("le jour est celui du lieu : Tokyo le 1er décembre à 1 h n'est pas en novembre", () => {
    const tokyo = engagement({ debut: new Date("2026-11-30T16:00:00Z"), pays: "Japon" });
    expect(rangerPourMois([tokyo], novembre).parJour.size).toBe(0);
    expect(rangerPourMois([tokyo], { annee: 2026, mois: 12 }).parJour.get("2026-12-01")).toEqual([tokyo]);
  });

  it("une date au mois va dans « Date à préciser » de ce mois seulement", () => {
    const { debut } = lireSaisieDate({ precision: "mois", mois: "2026-11" }, "France"); // 31 oct. 23 h UTC
    const auMois = engagement({ debut, precisionDate: "mois" });
    expect(rangerPourMois([auMois], novembre)).toEqual({ parJour: new Map(), aPreciser: [auMois] });
    expect(rangerPourMois([auMois], { annee: 2026, mois: 10 }).aPreciser).toEqual([]);
    expect(rangerPourMois([auMois], { annee: 2026, mois: 12 }).aPreciser).toEqual([]);
  });

  it("une saison est « à préciser » dans ses trois mois, même à cheval sur deux années (hiver)", () => {
    const { debut } = lireSaisieDate({ precision: "saison", saison: "hiver", annee: 2026 }, "France");
    const hiver = engagement({ debut, precisionDate: "saison" });
    const dans = (annee: number, mois: number) => rangerPourMois([hiver], { annee, mois }).aPreciser.length;
    expect([dans(2026, 11), dans(2026, 12), dans(2027, 1), dans(2027, 2), dans(2027, 3)]).toEqual([0, 1, 1, 1, 0]);
  });

  it("une date approximative annulée n'est pas non plus « à préciser »", () => {
    const { debut } = lireSaisieDate({ precision: "mois", mois: "2026-11" }, "France");
    expect(rangerPourMois([engagement({ debut, precisionDate: "mois", statut: "annule" })], novembre).aPreciser).toEqual([]);
  });
});

describe("bornesDuMois", () => {
  it("couvre une saison commencée deux mois plus tôt et les fuseaux au bord du mois", () => {
    const { depuis, jusqua } = bornesDuMois({ annee: 2027, mois: 1 });
    const { debut: hiver } = lireSaisieDate({ precision: "saison", saison: "hiver", annee: 2026 }, "France");
    const automne = lireSaisieDate({ precision: "saison", saison: "automne", annee: 2026 }, "France").debut;
    expect(hiver > depuis).toBe(true);
    expect(automne < depuis).toBe(true); // automne : sept. à nov., ne couvre pas janvier
    expect(new Date("2027-01-31T23:30:00Z") < jusqua).toBe(true);
  });
});

describe("rangerSeptJours", () => {
  it("donne les 7 jours, vides compris, sans dates approximatives ni annulés ni jours hors fenêtre", () => {
    const dedans = engagement({ debut: new Date("2026-10-20T18:00:00Z") });
    const annule = engagement({ debut: new Date("2026-10-20T18:00:00Z"), statut: "annule" });
    const auMois = engagement({ debut: new Date("2026-10-18T00:00:00Z"), precisionDate: "mois" });
    const apres = engagement({ debut: new Date("2026-10-24T18:00:00Z") });
    const avant = engagement({ debut: new Date("2026-10-16T18:00:00Z") });
    const r = rangerSeptJours([apres, annule, dedans, auMois, avant], "2026-10-17");
    expect(r.map((j) => j.jour)).toEqual(septJours("2026-10-17"));
    expect(r.flatMap((j) => j.engagements)).toEqual([dedans]);
    expect(r.find((j) => j.jour === "2026-10-20")!.engagements).toEqual([dedans]);
  });
});
