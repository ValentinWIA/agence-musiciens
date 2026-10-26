import { describe, expect, it } from "vitest";
import { decouperLiens } from "./liens";

const SITE = "https://agence-musiciens.vercel.app";

describe("decouperLiens", () => {
  it("rend cliquable une adresse de notre site sous un libellé, sans la ponctuation qui la suit", () => {
    expect(decouperLiens(`Créé : ${SITE}/engagements/abc.`, SITE)).toEqual([
      { texte: "Créé : " },
      { texte: "Fiche →", lien: `${SITE}/engagements/abc` },
      { texte: "." },
    ]);
    expect(decouperLiens(`${SITE}/engagements/nouveau?demande=x`, SITE)).toEqual([
      { texte: "Formulaire →", lien: `${SITE}/engagements/nouveau?demande=x` },
    ]);
    expect(decouperLiens(`à valider sur ${SITE}/validations`, SITE).at(-1)).toEqual({ texte: "À valider →", lien: `${SITE}/validations` });
  });

  it("retire « Fiche : » devant le lien, déjà dit par le libellé", () => {
    expect(decouperLiens(`Juin. Fiche : ${SITE}/engagements/abc`, SITE)).toEqual([
      { texte: "Juin. " },
      { texte: "Fiche →", lien: `${SITE}/engagements/abc` },
    ]);
  });

  it("laisse en texte une adresse d'un autre site, même si elle imite la nôtre", () => {
    const piege = "https://agence-musiciens.vercel.app.pirate.example/connexion";
    expect(decouperLiens(`Cliquez ${piege}`, SITE)).toEqual([{ texte: "Cliquez " }, { texte: piege }]);
    expect(decouperLiens("voir https://exemple.com/x", SITE).some((m) => m.lien)).toBe(false);
  });

  it("garde un texte sans lien tel quel", () => {
    expect(decouperLiens("Aucune option à relancer.", SITE)).toEqual([{ texte: "Aucune option à relancer." }]);
  });
});
