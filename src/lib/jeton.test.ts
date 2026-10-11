import { describe, expect, it } from "vitest";
import { empreinte, nouveauJeton } from "./jeton";

describe("jetons des liens (invitation, réinitialisation)", () => {
  it("l'empreinte stockée correspond au jeton envoyé dans le lien", () => {
    const { jeton, jetonHash } = nouveauJeton();
    expect(empreinte(jeton)).toBe(jetonHash);
  });

  it("le jeton n'est jamais stocké tel quel", () => {
    const { jeton, jetonHash } = nouveauJeton();
    expect(jetonHash).not.toBe(jeton);
  });

  it("un jeton modifié d'un seul caractère ne correspond plus (cas piégé)", () => {
    const { jeton, jetonHash } = nouveauJeton();
    const modifie = (jeton[0] === "a" ? "b" : "a") + jeton.slice(1);
    expect(empreinte(modifie)).not.toBe(jetonHash);
  });

  it("deux jetons ne sont jamais identiques", () => {
    expect(nouveauJeton().jeton).not.toBe(nouveauJeton().jeton);
  });
});
