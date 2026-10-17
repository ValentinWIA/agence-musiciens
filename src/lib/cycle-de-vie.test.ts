import { describe, expect, it } from "vitest";
import {
  controlerModification,
  dateDepassee,
  echeanceProposee,
  estEnCours,
  estVerrouille,
  jugerTransition,
  statutApres,
  transitionsProposees,
  verifierEcheanceOption,
  type EtatEngagement,
} from "./cycle-de-vie";
import type { Statut } from "./engagements";

const maintenant = new Date("2026-10-12T12:00:00Z");

// Un engagement complet, au statut « demande » ; chaque test change ce qui l'intéresse.
function engagement(modif: Partial<EtatEngagement> = {}): EtatEngagement {
  return {
    statut: "demande",
    debut: new Date("2026-11-16T10:00:00Z"),
    precisionDate: "jour",
    dureeMinutes: 90,
    cachet: 350000,
    statutAvantAnnulation: null,
    ...modif,
  };
}

describe("cycle de vie : le parcours normal", () => {
  it("permet chaque étape, de la demande au paiement", () => {
    expect(jugerTransition(engagement(), "poser_option", maintenant)).toEqual({ permis: true });
    expect(jugerTransition(engagement({ statut: "option" }), "envoyer_contrat", maintenant)).toEqual({ permis: true });
    expect(jugerTransition(engagement({ statut: "contrat_envoye" }), "confirmer", maintenant)).toEqual({ permis: true });
    const passe = new Date("2026-10-01T18:00:00Z");
    expect(jugerTransition(engagement({ statut: "confirme", debut: passe }), "marquer_joue", maintenant)).toEqual({ permis: true });
    expect(jugerTransition(engagement({ statut: "joue" }), "facturer", maintenant)).toEqual({ permis: true });
    expect(jugerTransition(engagement({ statut: "facture" }), "encaisser", maintenant)).toEqual({ permis: true });
  });

  it("propose à l'agent les seuls boutons permis par le statut", () => {
    expect(transitionsProposees(engagement())).toEqual(["poser_option", "annuler"]);
    expect(transitionsProposees(engagement({ statut: "joue" }))).toEqual(["facturer"]);
  });
});

describe("cycle de vie : les conditions", () => {
  it("refuse de poser une option sur une date approximative ou sans durée", () => {
    expect(jugerTransition(engagement({ precisionDate: "saison" }), "poser_option", maintenant).permis).toBe(false);
    expect(jugerTransition(engagement({ precisionDate: "mois" }), "poser_option", maintenant).permis).toBe(false);
    expect(jugerTransition(engagement({ dureeMinutes: null }), "poser_option", maintenant).permis).toBe(false);
  });

  it("refuse d'envoyer le contrat sans cachet, et explique pourquoi", () => {
    const verdict = jugerTransition(engagement({ statut: "option", cachet: null }), "envoyer_contrat", maintenant);
    expect(verdict).toEqual({
      permis: false,
      raison: "Envoi du contrat impossible : le cachet n'est pas encore défini (saisissez 0 pour un concert bénévole).",
    });
  });

  it("refuse de marquer joué un concert qui n'a pas encore eu lieu", () => {
    expect(jugerTransition(engagement({ statut: "confirme" }), "marquer_joue", maintenant).permis).toBe(false);
  });
});

describe("cycle de vie : le concert bénévole (cachet 0)", () => {
  const benevole = { cachet: 0 };

  it("accepte d'envoyer le contrat avec un cachet de 0", () => {
    expect(jugerTransition(engagement({ ...benevole, statut: "option" }), "envoyer_contrat", maintenant)).toEqual({ permis: true });
  });

  it("s'arrête à « joué » : pas de bouton ni de facture", () => {
    expect(transitionsProposees(engagement({ ...benevole, statut: "joue" }))).toEqual([]);
    expect(jugerTransition(engagement({ ...benevole, statut: "joue" }), "facturer", maintenant).permis).toBe(false);
  });
});

describe("cycle de vie : les interdits", () => {
  it("refuse de sauter une étape ou de revenir en arrière", () => {
    expect(jugerTransition(engagement(), "confirmer", maintenant)).toEqual({
      permis: false,
      raison: "« Confirmer » est impossible au statut « demande ».",
    });
    expect(jugerTransition(engagement({ statut: "confirme" }), "poser_option", maintenant).permis).toBe(false);
  });

  it("permet d'annuler jusqu'à « confirmé », plus après « joué »", () => {
    for (const statut of ["demande", "option", "contrat_envoye", "confirme"] as const) {
      expect(jugerTransition(engagement({ statut }), "annuler", maintenant)).toEqual({ permis: true });
    }
    expect(jugerTransition(engagement({ statut: "joue" }), "annuler", maintenant).permis).toBe(false);
  });

  it("ne change plus un statut final (payé) ; un annulé ne peut qu'être rétabli", () => {
    expect(transitionsProposees(engagement({ statut: "paye" }))).toEqual([]);
    expect(transitionsProposees(engagement({ statut: "annule" }))).toEqual(["retablir"]);
    expect(jugerTransition(engagement({ statut: "annule" }), "poser_option", maintenant).permis).toBe(false);
  });
});

describe("cycle de vie : rétablir un engagement annulé par erreur", () => {
  it("ramène au statut d'avant l'annulation", () => {
    const annule = engagement({ statut: "annule", statutAvantAnnulation: "option" });
    expect(transitionsProposees(annule)).toEqual(["retablir"]);
    expect(jugerTransition(annule, "retablir", maintenant)).toEqual({ permis: true });
    expect(statutApres(annule, "retablir")).toBe("option");
  });

  it("ramène un engagement confirmé à « contrat envoyé », pour reconfirmer", () => {
    expect(statutApres(engagement({ statut: "annule", statutAvantAnnulation: "confirme" }), "retablir")).toBe("contrat_envoye");
  });

  it("refuse une fois la date passée, ou si le statut d'avant est inconnu", () => {
    const passe = new Date("2026-10-01T18:00:00Z");
    expect(jugerTransition(engagement({ statut: "annule", statutAvantAnnulation: "option", debut: passe }), "retablir", maintenant).permis).toBe(false);
    expect(jugerTransition(engagement({ statut: "annule" }), "retablir", maintenant).permis).toBe(false);
  });
});

describe("modification : ce qui reste modifiable selon le statut", () => {
  it("laisse tout modifier jusqu'à « contrat envoyé », verrouille ensuite (annulé compris)", () => {
    expect(["demande", "option", "contrat_envoye"].map((s) => estVerrouille(s as Statut))).toEqual([false, false, false]);
    expect(["confirme", "joue", "facture", "paye", "annule"].every((s) => estVerrouille(s as Statut))).toBe(true);
  });

  it("au stade « demande », accepte une date approximative, sans durée ni cachet", () => {
    expect(controlerModification("demande", { precisionDate: "saison", dureeMinutes: null, cachet: null })).toEqual({});
  });

  it("une option posée exige de garder une date précise et une durée", () => {
    expect(controlerModification("option", { precisionDate: "mois", dureeMinutes: null, cachet: null })).toEqual({
      date: expect.stringContaining("précise"),
      duree: expect.stringContaining("durée"),
    });
    expect(controlerModification("option", { precisionDate: "jour", dureeMinutes: 90, cachet: null })).toEqual({});
  });

  it("un contrat envoyé interdit de vider le cachet, mais accepte 0 (bénévole)", () => {
    expect(controlerModification("contrat_envoye", { precisionDate: "jour", dureeMinutes: 90, cachet: null })).toEqual({
      cachet: expect.stringContaining("cachet"),
    });
    expect(controlerModification("contrat_envoye", { precisionDate: "jour", dureeMinutes: 90, cachet: 0 })).toEqual({});
  });
});

describe("suivi : ce qui est « en cours »", () => {
  it("exclut payé et annulé, quelle que soit la date", () => {
    expect(estEnCours(engagement({ statut: "paye" }))).toBe(false);
    expect(estEnCours(engagement({ statut: "annule" }))).toBe(false);
  });

  it("garde les étapes avant le paiement, dont le facturé (un impayé)", () => {
    for (const statut of ["demande", "option", "contrat_envoye", "confirme", "facture"] as Statut[]) {
      expect(estEnCours(engagement({ statut }))).toBe(true);
    }
  });

  it("exclut un concert bénévole joué, mais garde un joué au cachet « à définir » ou payant", () => {
    expect(estEnCours(engagement({ statut: "joue", cachet: 0 }))).toBe(false);
    expect(estEnCours(engagement({ statut: "joue", cachet: null }))).toBe(true);
    expect(estEnCours(engagement({ statut: "joue", cachet: 350000 }))).toBe(true);
  });
});

describe("suivi : la date est-elle passée ?", () => {
  it("une date précise est passée dès son heure de début", () => {
    expect(dateDepassee(engagement({ debut: new Date("2026-10-12T11:59:00Z") }), "France", maintenant)).toBe(true);
    expect(dateDepassee(engagement({ debut: new Date("2026-10-12T12:01:00Z") }), "France", maintenant)).toBe(false);
  });

  it("un mois n'est passé qu'à sa fin, à l'heure du lieu", () => {
    // « octobre 2026 » commence le 1er octobre à minuit à Paris (30/09, 22 h UTC).
    const octobre = engagement({ debut: new Date("2026-09-30T22:00:00Z"), precisionDate: "mois" });
    expect(dateDepassee(octobre, "France", maintenant)).toBe(false);
    expect(dateDepassee(octobre, "France", new Date("2026-10-31T22:59:00Z"))).toBe(false);
    expect(dateDepassee(octobre, "France", new Date("2026-10-31T23:00:00Z"))).toBe(true);
  });

  it("une saison n'est passée qu'à la fin de ses trois mois", () => {
    // « été 2026 » : du 1er juin au 31 août, à Paris.
    const ete = engagement({ debut: new Date("2026-05-31T22:00:00Z"), precisionDate: "saison" });
    expect(dateDepassee(ete, "France", new Date("2026-08-31T12:00:00Z"))).toBe(false);
    expect(dateDepassee(ete, "France", maintenant)).toBe(true);
  });
});

describe("échéance de l'option", () => {
  it("proposée à J+14, ou au jour du concert s'il tombe avant", () => {
    expect(echeanceProposee("2026-10-18", "2026-12-19")).toBe("2026-11-01");
    expect(echeanceProposee("2026-10-18", "2026-10-25")).toBe("2026-10-25");
  });

  it("acceptée d'aujourd'hui au jour du concert, bornes comprises", () => {
    expect(verifierEcheanceOption("2026-10-18", "2026-10-18", "2026-12-19")).toEqual({ echeance: "2026-10-18" });
    expect(verifierEcheanceOption("2026-12-19", "2026-10-18", "2026-12-19")).toEqual({ echeance: "2026-12-19" });
  });

  it("refusée si vide, passée, après le concert ou mal écrite", () => {
    for (const saisie of [undefined, "", "2026-10-17", "2026-12-20", "18/10/2026"]) {
      expect(verifierEcheanceOption(saisie, "2026-10-18", "2026-12-19")).toHaveProperty("erreur");
    }
  });
});
