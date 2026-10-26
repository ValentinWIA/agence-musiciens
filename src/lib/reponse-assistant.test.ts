import { describe, expect, it } from "vitest";
import { blocs, segments, separerBilan } from "./reponse-assistant";

// Réponse réelle du scénario 1 (26/10), raccourcie.
const REPONSE = `Trois options sont à surveiller.

- **Récital violon, Wigmore Hall, Londres**, sam. 23 janv. 2027. Fiche : https://x/engagements/1
- **Duo piano-violon, Tonhalle, Zurich**, sam. 19 déc. 2026.
  Fiche : https://x/engagements/2

Je peux préparer une relance.

**Lu**
- Les options dont l'échéance est dans les 7 jours ou déjà passée.

**Fait**
- rien

**Proposé (à valider)**
- Rien.`;

describe("segments", () => {
  it("met en gras ce qui est entre ** et garde le reste", () => {
    expect(segments("- **Récital**, sam.")).toEqual([{ texte: "- " }, { texte: "Récital", gras: true }, { texte: ", sam." }]);
    expect(segments("sans gras")).toEqual([{ texte: "sans gras" }]);
  });
});

describe("separerBilan", () => {
  it("met à part Lu, Fait et Proposé ; « rien » donne une liste vide", () => {
    const { corps, bilan } = separerBilan(REPONSE);
    expect(corps.endsWith("Je peux préparer une relance.")).toBe(true);
    expect(bilan).toEqual({ lu: ["Les options dont l'échéance est dans les 7 jours ou déjà passée."], fait: [], propose: [] });
  });

  it("laisse une réponse sans bilan telle quelle", () => {
    expect(separerBilan("Aucune option à relancer.")).toEqual({ corps: "Aucune option à relancer.", bilan: null });
  });
});

describe("blocs", () => {
  it("fait des paragraphes et des listes ; une ligne sans tiret prolonge l'élément", () => {
    const b = blocs(separerBilan(REPONSE).corps);
    expect(b.map((x) => x.liste)).toEqual([false, true, false]);
    const liste = b[1];
    if (!liste.liste) throw new Error("liste attendue");
    expect(liste.elements).toHaveLength(2);
    expect(liste.elements[0][0]).toEqual({ texte: "Récital violon, Wigmore Hall, Londres", gras: true });
    expect(liste.elements[1].at(-1)?.texte).toBe(", sam. 19 déc. 2026. Fiche : https://x/engagements/2");
  });
});
