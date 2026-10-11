import { describe, expect, it } from "vitest";
import { ENGAGEMENTS, LIEUX } from "../../scripts/donnees-fictives";
import { trouverConflits, type Concert } from "./conflit";

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
