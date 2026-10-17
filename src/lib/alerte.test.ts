import { describe, expect, it } from "vitest";
import { alerteDue, composerAlerte, type ExecutionPassee } from "./alerte";

const reussie: ExecutionPassee = { etat: "reussie", alerteLe: null };
const echec: ExecutionPassee = { etat: "en_echec", alerteLe: null };
const alertee: ExecutionPassee = { etat: "en_echec", alerteLe: new Date("2026-10-18T05:00:00Z") };

describe("alerte de panne : une seule par panne", () => {
  it("premier échec après une réussite : alerte", () => {
    expect(alerteDue([reussie, echec])).toBe(true);
  });

  it("aucune exécution passée (tout premier import) : alerte", () => {
    expect(alerteDue([])).toBe(true);
  });

  it("panne déjà signalée depuis la dernière réussite : pas de seconde alerte", () => {
    expect(alerteDue([echec, alertee, reussie])).toBe(false);
  });

  it("échecs sans alerte (interrompue, courriel non parti) : l'alerte reste due", () => {
    expect(alerteDue([echec, echec, reussie, alertee])).toBe(true);
  });

  it("nouvelle panne après une réussite : l'alerte de la panne précédente ne compte plus", () => {
    expect(alerteDue([reussie, alertee, echec])).toBe(true);
  });
});

describe("courriel d'alerte", () => {
  it("dit la nuit, la panne, qui l'a lancée, et donne le lien du journal", () => {
    const { sujet, texte } = composerAlerte({
      nuitDu: "2026-10-17",
      erreur: "flux : clé refusée (401)",
      declencheur: "cron",
      nomAgent: "Claire",
      lienSite: "https://exemple.vercel.app",
    });
    expect(sujet).toBe("Panne du flux de nuit : la nuit du 17/10/2026 n'est pas importée");
    expect(texte).toContain("flux : clé refusée (401)");
    expect(texte).toContain("le passage automatique");
    expect(texte).toContain("https://exemple.vercel.app/nuit");
  });
});
