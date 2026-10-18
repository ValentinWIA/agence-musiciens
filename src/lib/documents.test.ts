import { describe, expect, it } from "vitest";
import { clePassage, documentFlux, empreinte, passagesACalculer, passagesDe } from "./documents";

// Forme réelle d'un document du flux (DOC-reservations-01, lu le 18/10), pages raccourcies.
const doc = documentFlux.parse({
  sujet: "reservations",
  id: "DOC-reservations-01",
  type: "procedure",
  titre: "Procédure de traitement d'une réservation",
  pages: ["# Procédure\n\nVersion 3.0.", "## Délais\n\nAccusé sous 1 jour ouvré.", "## Cas particuliers\n\nDouble validation."],
  nombre_pages: 3,
});

describe("passagesDe", () => {
  it("fait un passage par page, numérotée à partir de 1", () => {
    const passages = passagesDe(doc);
    expect(passages.map((p) => p.page)).toEqual([1, 2, 3]);
    expect(passages[1]).toMatchObject({ documentId: "DOC-reservations-01", texte: "## Délais\n\nAccusé sous 1 jour ouvré." });
  });

  it("ignore une page vide sans décaler les numéros des autres", () => {
    const passages = passagesDe({ ...doc, pages: ["Page un", "   ", "Page trois"] });
    expect(passages.map((p) => p.page)).toEqual([1, 3]);
  });

  it("refuse un document sans pages (forme inattendue du flux)", () => {
    expect(documentFlux.safeParse({ id: "DOC-x", titre: "x" }).success).toBe(false);
  });
});

describe("passagesACalculer", () => {
  const passages = passagesDe(doc);
  const tousConnus = new Map(passages.map((p) => [clePassage(p), p.empreinte]));

  it("ne recalcule rien si aucune page n'a changé", () => {
    expect(passagesACalculer(passages, tousConnus)).toEqual([]);
  });

  it("recalcule tout la première fois", () => {
    expect(passagesACalculer(passages, new Map())).toHaveLength(3);
  });

  it("recalcule seulement la page dont le texte a changé", () => {
    const modifie = passagesDe({ ...doc, pages: [doc.pages[0], "## Délais\n\nAccusé sous 2 jours ouvrés.", doc.pages[2]] });
    expect(passagesACalculer(modifie, tousConnus).map((p) => p.page)).toEqual([2]);
  });

  it("recalcule une page dont seul le titre du document a changé", () => {
    expect(passagesACalculer(passagesDe({ ...doc, titre: "Procédure v4" }), tousConnus)).toHaveLength(3);
  });
});

describe("empreinte", () => {
  it("est la même pour le même texte et change avec un seul caractère", () => {
    expect(empreinte("abc")).toBe(empreinte("abc"));
    expect(empreinte("abc")).not.toBe(empreinte("abd"));
  });
});
