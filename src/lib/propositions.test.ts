import { describe, expect, it } from "vitest";
import { ETATS_PROPOSITION, etatApresEnvoi, motifRelance, peutRevenirEnAttente, TEXTE_MAX, verifierCourriel } from "./propositions";

describe("motifRelance", () => {
  it("permet de relancer une option, ou un concert joué ou facturé", () => {
    expect(motifRelance("option")).toBe("Option");
    expect(motifRelance("joue")).toBe("Cachet impayé");
    expect(motifRelance("facture")).toBe("Cachet impayé");
  });

  it("refuse de relancer un engagement qui n'attend rien du programmateur", () => {
    for (const statut of ["demande", "contrat_envoye", "confirme", "paye", "annule"] as const) expect(motifRelance(statut)).toBeNull();
  });
});

describe("verifierCourriel", () => {
  it("garde un sujet et un texte normaux, espaces superflus retirés", () => {
    expect(verifierCourriel({ sujet: "  Option du 14   mars ", texte: " Bonjour,\nOù en êtes-vous ? " })).toEqual({
      sujet: "Option du 14 mars",
      texte: "Bonjour,\nOù en êtes-vous ?",
    });
  });

  it("refuse un sujet ou un texte vide ou trop long", () => {
    expect(verifierCourriel({ sujet: " ", texte: "x" })).toEqual({ erreur: "Le sujet est vide." });
    expect(verifierCourriel({ sujet: "x", texte: undefined })).toEqual({ erreur: "Le texte est vide." });
    expect("erreur" in verifierCourriel({ sujet: "x".repeat(151), texte: "x" })).toBe(true);
    expect("erreur" in verifierCourriel({ sujet: "x", texte: "x".repeat(TEXTE_MAX + 1) })).toBe(true);
  });
});

describe("etatApresEnvoi", () => {
  it("partie, non envoyée vers une adresse fictive, ou remise en attente si l'envoi a échoué", () => {
    expect(etatApresEnvoi(false, true)).toBe("envoyee");
    expect(etatApresEnvoi(true, false)).toBe("non_envoyee");
    expect(etatApresEnvoi(false, false)).toBe("en_attente");
  });
});

describe("peutRevenirEnAttente", () => {
  it("seule une relance refusée revient en attente", () => {
    expect(ETATS_PROPOSITION.filter(peutRevenirEnAttente)).toEqual(["refusee"]);
  });
});
