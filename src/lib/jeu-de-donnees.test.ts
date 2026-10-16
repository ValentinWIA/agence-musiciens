import { describe, expect, it } from "vitest";
import { ENGAGEMENTS, LIEUX } from "../../scripts/donnees-fictives";
import { versUniteMinimale } from "./argent";
import { jourLocal, septJours } from "./calendrier";
import { trouverConflits, type Concert } from "./conflit";
import { dateDepassee, estEnCours } from "./cycle-de-vie";

// Le jeu de données sert à la démonstration : ce test garantit que ses cas « CAS » donnent toujours le résultat
// annoncé, même si l'on change un réglage de la règle (la marge ramenée de 4 h à 1 h en avait déjà défait un).

const concerts: Concert[] = ENGAGEMENTS.flatMap((e, i) =>
  e.duree ? [{ id: String(i), statut: e.statut, debut: new Date(e.debut), dureeMinutes: e.duree, lieu: LIEUX[e.lieu], musiciens: [...e.musiciens] }] : [],
);

// Pour chaque engagement à confirmer (lieu et date) : les musiciens en conflit, et le lieu de l'autre concert.
function conflitsDe(lieu: string, debut: string) {
  const c = concerts.find((x) => ENGAGEMENTS[Number(x.id)].lieu === lieu && ENGAGEMENTS[Number(x.id)].debut === debut);
  if (!c) throw new Error(`Engagement absent du jeu de données : ${lieu} ${debut}`);
  return trouverConflits(c, concerts).map((k) => `${k.musicien}@${ENGAGEMENTS[Number(k.autre.id)].lieu}`);
}

describe("jeu de données : les cas de démonstration de la règle de conflit", () => {
  it("duo à Genève : refusé à cause de Louis seul (Londres la veille)", () => {
    expect(conflitsDe("geneve", "2026-11-21T11:00:00+01:00")).toEqual(["louis@wigmore"]);
  });

  it("cas piégé : Inès à Menton à 10 h, refusée (Paris la veille jusqu'à 22 h)", () => {
    expect(conflitsDe("menton", "2026-12-05T10:00:00+01:00")).toEqual(["ines@gaveau"]);
  });

  it("cas normaux : Anna à Lyon et Hugo au Théâtre des Champs-Élysées sont confirmables", () => {
    expect(conflitsDe("lyon", "2026-12-12T20:00:00+01:00")).toEqual([]);
    expect(conflitsDe("tce", "2027-01-16T20:00:00+01:00")).toEqual([]);
  });

  it("aucun autre engagement « contrat envoyé » n'attend d'être confirmé", () => {
    expect(concerts.filter((c) => c.statut === "contrat_envoye")).toHaveLength(4);
  });
});

// Le jeu de données décrit l'automne 2026 : on le juge à une date fixe, pour que le test ne change pas avec le temps.
const le16octobre = new Date("2026-10-16T12:00:00+02:00");
const suivis = ENGAGEMENTS.map((e) => {
  const etat = {
    statut: e.statut,
    cachet: e.cachet === undefined ? null : versUniteMinimale(e.cachet, e.devise ?? "EUR"),
    debut: new Date(e.debut),
    precisionDate: e.precision ?? "jour",
  };
  return { ...etat, enCours: estEnCours(etat), passe: dateDepassee(etat, LIEUX[e.lieu].pays, le16octobre) };
});

describe("jeu de données : les cas de démonstration de « En cours »", () => {
  it("contient un impayé d'un concert passé, en cours", () => {
    expect(suivis.some((e) => e.statut === "facture" && e.passe && e.enCours)).toBe(true);
  });

  it("contient une demande à date passée, en cours (mention « date passée »)", () => {
    expect(suivis.some((e) => e.statut === "demande" && e.passe && e.enCours)).toBe(true);
  });

  it("contient un concert bénévole joué, hors « En cours »", () => {
    expect(suivis.some((e) => e.statut === "joue" && e.cachet === 0 && !e.enCours)).toBe(true);
  });
});

// Les dates du jeu sont fixes : la démo (avant mi-décembre 2026, décidé le 17/10) ne doit jamais tomber sur des
// « 7 prochains jours » vides. Au-delà du 19/12, trou des fêtes : il faudra décaler les dates.
const joursOccupes = ENGAGEMENTS.filter((e) => e.statut !== "annule" && (e.precision ?? "jour") === "jour").map((e) =>
  jourLocal(new Date(e.debut), LIEUX[e.lieu].pays),
);

describe("jeu de données : les cas de démonstration du calendrier", () => {
  it("chaque fenêtre des 7 prochains jours, du 17 octobre au 19 décembre 2026, contient un concert", () => {
    const videsSansConcert: string[] = [];
    for (let jour = "2026-10-17"; jour <= "2026-12-19"; jour = septJours(jour)[1]) {
      const fenetre = septJours(jour);
      if (!joursOccupes.some((j) => fenetre.includes(j))) videsSansConcert.push(jour);
    }
    expect(videsSansConcert).toEqual([]);
  });

  it("contient un jour à venir avec deux concerts (la case du calendrier s'allonge)", () => {
    const aVenir = joursOccupes.filter((j) => j >= "2026-10-17" && j <= "2026-12-19");
    expect(aVenir.some((j, i) => aVenir.indexOf(j) !== i)).toBe(true);
  });
});
