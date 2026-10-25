import { describe, expect, it } from "vitest";
import { APPELS_PAR_JOUR, PLAFOND_MENSUEL, coutAppel, formaterDollars, refusAppel } from "./couts-ia";

describe("coût d'un appel", () => {
  it("compte les jetons au prix du modèle (Opus : 4 $ et 20 $ par million)", () => {
    // 1 000 jetons lus à 4 µ$ + 500 écrits à 20 µ$ = 14 000 µ$, soit 0,014 $
    expect(coutAppel("claude-opus-5-5", 1000, 500)).toBe(14_000);
  });

  it("arrondit au millionième supérieur (Haiku : 0,10 $ et 0,50 $ par million)", () => {
    // 15 × 0,1 + 3 × 0,5 = 3 µ$ ; 1 × 0,1 = 0,1 µ$ → compté 1
    expect(coutAppel("claude-haiku-5-5", 15, 3)).toBe(3);
    expect(coutAppel("claude-haiku-5-5", 1, 0)).toBe(1);
  });
});

describe("limites", () => {
  it("permet l'appel sous les deux limites", () => {
    expect(refusAppel({ appelsDuJour: APPELS_PAR_JOUR - 1, depenseDuMois: PLAFOND_MENSUEL - 1 })).toBeNull();
  });

  it("refuse le 31ᵉ appel de la journée", () => {
    expect(refusAppel({ appelsDuJour: APPELS_PAR_JOUR, depenseDuMois: 0 })).toMatch(/100 appels .* par jour/);
  });

  it("refuse dès que le plafond du mois est atteint, et le dit avant la limite du jour", () => {
    expect(refusAppel({ appelsDuJour: APPELS_PAR_JOUR, depenseDuMois: PLAFOND_MENSUEL })).toMatch(/Plafond de 5,00 \$/);
  });
});

describe("affichage en dollars", () => {
  it("garde quatre décimales pour les petits montants", () => {
    expect(formaterDollars(1_200)).toBe("0,0012 $");
    expect(formaterDollars(5_000_000)).toBe("5,00 $");
  });
});
