import { describe, expect, it } from "vitest";
import { blocs, insecables, segments, separerBilan } from "./reponse-assistant";

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

describe("insecables", () => {
  it("empêche de couper un montant ou une heure", () => {
    expect(insecables("cachet 2 200,00 €, 20 h 00, 450 000 JPY, le 8 mai")).toBe(
      "cachet 2\u00a0200,00\u00a0€, 20\u00a0h\u00a000, 450\u00a0000\u00a0JPY, le 8 mai",
    );
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

  it("sépare une liste collée à la phrase qui l'annonce (scénario 15), et les listes numérotées", () => {
    const b = blocs("Pour Anna Petit, deux engagements sont impayés :\n- **Duo**, Menton\n- **Récital**, Tokyo\n1. premier\n2. second");
    expect(b.map((x) => (x.liste ? (x.numerotee ? "1." : "-") : "p"))).toEqual(["p", "-", "1."]);
    expect(b[0]).toEqual({ liste: false, texte: [{ texte: "Pour Anna Petit, deux engagements sont impayés :" }] });
  });

  it("garde les retours à la ligne d'un paragraphe", () => {
    expect(blocs("Ligne un\nLigne deux")).toEqual([{ liste: false, texte: [{ texte: "Ligne un\nLigne deux" }] }]);
  });
});

describe("numéros des listes (retour du 26/10)", () => {
  it("des options séparées par une ligne vide gardent leur numéro", () => {
    const b = blocs("Options :\n\n1. **Récital à Lyon**\nFiche : …\n\n2. **Trio à Genève**\n\n3. **Concert à Lille**");
    const listes = b.filter((x) => x.liste);
    expect(listes.map((x) => (x.liste ? x.debut : 0))).toEqual([1, 2, 3]);
  });

  it("une liste à tirets commence à 1", () => {
    const [b] = blocs("- un\n- deux");
    expect(b.liste && b.debut).toBe(1);
  });
});
