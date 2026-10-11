import { describe, expect, it } from "vitest";
import { jugerTransition, statutApres, transitionsProposees, type EtatEngagement } from "./cycle-de-vie";

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
