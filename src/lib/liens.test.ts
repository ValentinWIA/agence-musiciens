import { describe, expect, it } from "vitest";
import { decouperLiens } from "./liens";

const SITE = "https://agence-musiciens.vercel.app";

describe("decouperLiens", () => {
  it("rend cliquable une adresse de notre site, sans la ponctuation qui la suit", () => {
    expect(decouperLiens(`Créé : ${SITE}/engagements/abc.`, SITE)).toEqual([
      { texte: "Créé : " },
      { texte: `${SITE}/engagements/abc`, lien: `${SITE}/engagements/abc` },
      { texte: "." },
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
