import { describe, expect, it } from "vitest";
import {
  avertissementConflits,
  distanceKm,
  formaterTrajet,
  messageConflits,
  trajetMinutes,
  trouverConflits,
  type Concert,
  type ConcertSitue,
} from "./conflit";
import type { Statut } from "./engagements";

const paris = { latitude: 48.8846, longitude: 2.3089 };
const geneve = { latitude: 46.2044, longitude: 6.1432 };
// Un lieu à 800 km plein nord de Paris (le long d'un méridien, un degré de latitude vaut 111,19 km).
const loin = { latitude: paris.latitude + 800 / ((6371 * Math.PI) / 180), longitude: paris.longitude };

// Un concert confirmé d'Anna à Paris, de 20 h 30 à 22 h ; chaque test change ce qui l'intéresse.
function concert(modif: Partial<Concert> = {}): Concert {
  return {
    id: "autre",
    statut: "confirme",
    debut: new Date("2026-11-14T20:30:00Z"),
    dureeMinutes: 90,
    lieu: paris,
    musiciens: ["anna"],
    ...modif,
  };
}

// Celui qu'on veut confirmer : au statut « contrat envoyé ».
const aConfirmer = (modif: Partial<Concert> = {}) => concert({ id: "a-confirmer", statut: "contrat_envoye", ...modif });

// Le cas piégé du SPEC : fin à 22 h, puis le lendemain à 11 h à 800 km (13 h de trajet + 1 h > 13 h disponibles).
const lendemainLoin = { debut: new Date("2026-11-15T11:00:00Z"), lieu: loin };

describe("distanceKm et trajetMinutes", () => {
  it("donne 0 pour un même lieu et environ 410 km de Paris à Genève", () => {
    expect(distanceKm(paris, paris)).toBe(0);
    expect(distanceKm(paris, geneve)).toBeGreaterThan(400);
    expect(distanceKm(paris, geneve)).toBeLessThan(420);
  });

  it("mesure bien 800 km jusqu'au lieu d'essai", () => {
    expect(distanceKm(paris, loin)).toBeCloseTo(800, 6);
  });

  it("estime 800 km à 13 h de trajet (× 1,3 ÷ 80 km/h)", () => {
    expect(trajetMinutes(800)).toBe(780);
  });
});

describe("trouverConflits", () => {
  it("cas normal : deux concerts à une semaine d'intervalle, même à 800 km → aucun conflit", () => {
    const uneSemainePlusTard = aConfirmer({ debut: new Date("2026-11-21T11:00:00Z"), lieu: loin });
    expect(trouverConflits(uneSemainePlusTard, [concert()])).toEqual([]);
  });

  it("cas vide : musicien sans autre engagement → aucun conflit", () => {
    expect(trouverConflits(aConfirmer(lendemainLoin), [])).toEqual([]);
  });

  it("cas piégé : 22 h puis 11 h le lendemain à 800 km → conflit avec le concert d'avant", () => {
    const autre = concert();
    const conflits = trouverConflits(aConfirmer(lendemainLoin), [autre]);
    expect(conflits).toHaveLength(1);
    expect(conflits[0]).toMatchObject({ musicien: "anna", autre, position: "avant" });
    expect(conflits[0].trajetMinutes).toBeCloseTo(780, 6);
  });

  it("concert d'après : celui qu'on confirme finit à 22 h, l'autre est le lendemain à 11 h à 800 km → conflit", () => {
    const autre = concert(lendemainLoin);
    expect(trouverConflits(aConfirmer(), [autre])).toMatchObject([{ musicien: "anna", position: "apres" }]);
  });

  it("même lieu : 1 h de marge exigée même sans trajet (30 min ne suffisent pas)", () => {
    const conflits = trouverConflits(aConfirmer({ debut: new Date("2026-11-14T22:30:00Z") }), [concert()]);
    expect(conflits).toMatchObject([{ position: "avant", trajetMinutes: 0 }]);
  });

  it("égalité exacte : fin à 22 h, même lieu, début à 23 h → permis", () => {
    expect(trouverConflits(aConfirmer({ debut: new Date("2026-11-14T23:00:00Z") }), [concert()])).toEqual([]);
  });

  it("concerts qui se chevauchent → conflit, même à des milliers de kilomètres", () => {
    const pendant = aConfirmer({ debut: new Date("2026-11-14T21:00:00Z"), lieu: geneve });
    expect(trouverConflits(pendant, [concert()])).toMatchObject([{ position: "chevauchement" }]);
  });

  it("ignore les engagements non tenus (demande, option, contrat envoyé) et annulés", () => {
    for (const statut of ["demande", "option", "contrat_envoye", "annule"] as Statut[]) {
      expect(trouverConflits(aConfirmer(lendemainLoin), [concert({ statut })]), statut).toEqual([]);
    }
  });

  it("compte les engagements tenus, même déjà joués, facturés ou payés", () => {
    for (const statut of ["confirme", "joue", "facture", "paye"] as Statut[]) {
      expect(trouverConflits(aConfirmer(lendemainLoin), [concert({ statut })]), statut).toHaveLength(1);
    }
  });

  it("ignore le concert d'un autre musicien et l'engagement lui-même", () => {
    const piege = aConfirmer(lendemainLoin);
    expect(trouverConflits(piege, [concert({ musiciens: ["louis"] }), { ...piege, statut: "confirme" }])).toEqual([]);
  });

  it("duo : un seul musicien pris suffit à refuser, et c'est lui qui est cité", () => {
    const duo = aConfirmer({ ...lendemainLoin, musiciens: ["anna", "louis"] });
    expect(trouverConflits(duo, [concert({ musiciens: ["louis"] })])).toMatchObject([{ musicien: "louis" }]);
  });

  it("duo : tous les conflits sont rendus, pour être tous cités", () => {
    const duo = aConfirmer({ ...lendemainLoin, musiciens: ["anna", "louis"] });
    const conflits = trouverConflits(duo, [
      concert({ id: "a", musiciens: ["anna"] }),
      concert({ id: "b", musiciens: ["louis"], debut: new Date("2026-11-15T12:00:00Z"), lieu: paris }),
    ]);
    expect(conflits.map((c) => [c.musicien, c.autre.id, c.position])).toEqual([
      ["anna", "a", "avant"],
      ["louis", "b", "chevauchement"],
    ]);
  });
});

describe("formaterTrajet", () => {
  it("arrondit au quart d'heure supérieur", () => {
    expect(formaterTrajet(412)).toBe("7 h");
    expect(formaterTrajet(405)).toBe("6 h 45");
    expect(formaterTrajet(20)).toBe("30 min");
    expect(formaterTrajet(780)).toBe("13 h");
  });
});

describe("messageConflits", () => {
  const situe = (id: string, ville: string, pays: string, debut: string): ConcertSitue =>
    ({ ...concert({ id, debut: new Date(debut) }), lieu: { ...paris, ville, pays } });
  const geneveLe16 = situe("a-confirmer", "Genève", "Suisse", "2026-11-16T10:00:00Z");
  const noms = { anna: "Anna Petit", louis: "Louis Roy" };

  it("reprend la maquette : heure locale du lieu de l'autre concert, trajet arrondi, marge", () => {
    // 21 h en heure universelle = 22 h à Paris en novembre.
    const autre = situe("b", "Paris", "France", "2026-11-15T21:00:00Z");
    expect(messageConflits(geneveLe16, [{ musicien: "louis", autre, position: "avant", trajetMinutes: 412 }], noms)).toBe(
      "Confirmation impossible : Louis Roy joue à Paris le 15/11 à 22 h, trop peu de temps pour rejoindre Genève " +
        "(trajet estimé 7 h + 1 h de marge).",
    );
  });

  it("l'avertissement de la fiche reprend le même constat", () => {
    const autre = situe("b", "Paris", "France", "2026-11-15T21:00:00Z");
    expect(avertissementConflits(geneveLe16, [{ musicien: "louis", autre, position: "avant", trajetMinutes: 412 }], noms)).toBe(
      "Attention : Louis Roy joue à Paris le 15/11 à 22 h, trop peu de temps pour rejoindre Genève " +
        "(trajet estimé 7 h + 1 h de marge). La confirmation sera refusée.",
    );
  });

  it("cite tous les conflits : concert d'après (heure de Tokyo), chevauchement, même lieu", () => {
    const tokyo = situe("c", "Tokyo", "Japon", "2026-11-16T11:30:00Z"); // 20 h 30 à Tokyo
    const memeLieu = situe("d", "Genève", "Suisse", "2026-11-16T08:00:00Z");
    expect(
      messageConflits(
        geneveLe16,
        [
          { musicien: "anna", autre: tokyo, position: "apres", trajetMinutes: 900 },
          { musicien: "louis", autre: tokyo, position: "chevauchement", trajetMinutes: 900 },
          { musicien: "louis", autre: memeLieu, position: "avant", trajetMinutes: 0 },
        ],
        noms,
      ),
    ).toBe(
      "Confirmation impossible : Anna Petit joue à Tokyo le 16/11 à 20 h 30, trop peu de temps pour s'y rendre " +
        "depuis Genève (trajet estimé 15 h + 1 h de marge) ; Louis Roy joue à Tokyo le 16/11 à 20 h 30, au même moment ; " +
        "Louis Roy joue à Genève le 16/11 à 9 h, trop peu de temps pour rejoindre Genève (même lieu, 1 h de marge).",
    );
  });
});
