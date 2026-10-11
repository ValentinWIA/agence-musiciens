import { describe, expect, it } from "vitest";
import { regleMotDePasse } from "./mot-de-passe";

describe("règle du mot de passe (installation, invitation, réinitialisation)", () => {
  it("accepte 12 caractères (cas normal, à la limite)", () => {
    expect(regleMotDePasse.safeParse("a".repeat(12)).success).toBe(true);
  });

  it("refuse 11 caractères, avec le message affiché à l'utilisateur", () => {
    const resultat = regleMotDePasse.safeParse("a".repeat(11));
    expect(resultat.success).toBe(false);
    expect(resultat.error?.issues[0].message).toBe("Au moins 12 caractères.");
  });

  it("refuse un mot de passe vide (cas vide)", () => {
    expect(regleMotDePasse.safeParse("").success).toBe(false);
  });

  it("refuse une valeur absente du formulaire (cas piégé)", () => {
    expect(regleMotDePasse.safeParse(null).success).toBe(false);
  });
});
