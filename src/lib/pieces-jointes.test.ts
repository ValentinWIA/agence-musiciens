import { describe, expect, it } from "vitest";
import { estUnPdf, formaterTaille, TAILLE_MAX_OCTETS, verifierPiece } from "./pieces-jointes";

const octets = (texte: string) => new TextEncoder().encode(texte);
const PDF = octets("%PDF-1.7");

describe("vérification d'une pièce jointe", () => {
  it("accepte un vrai PDF typé (cas normal) et nettoie le nom", () => {
    expect(verifierPiece({ type: "contrat", nom: " contrat-geneve.pdf ", taille: 120_000, debut: PDF })).toEqual({
      piece: { type: "contrat", nom: "contrat-geneve.pdf", taille: 120_000 },
    });
  });

  it("accepte un PDF de 4 Mo pile, refuse un octet de plus (limite)", () => {
    expect(verifierPiece({ type: "autre", nom: "a.pdf", taille: TAILLE_MAX_OCTETS, debut: PDF })).toHaveProperty("piece");
    expect(verifierPiece({ type: "autre", nom: "a.pdf", taille: TAILLE_MAX_OCTETS + 1, debut: PDF })).toEqual({
      erreurs: { fichier: ["Ce fichier dépasse 4 Mo."] },
    });
  });

  it("refuse un faux PDF : bonne extension, mauvais contenu (cas piégé)", () => {
    const image = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]); // début d'un PNG
    expect(verifierPiece({ type: "fiche_technique", nom: "plan.pdf", taille: 5000, debut: image })).toEqual({
      erreurs: { fichier: ["Ce fichier n'est pas un PDF (seuls les PDF sont acceptés)."] },
    });
  });

  it("accepte un PDF quelle que soit son extension : seul le contenu compte", () => {
    expect(verifierPiece({ type: "autre", nom: "scan", taille: 5000, debut: PDF })).toHaveProperty("piece");
  });

  it("distingue « aucun fichier choisi » et « fichier vide » (cas vides)", () => {
    const vide = new Uint8Array();
    expect(verifierPiece({ type: "contrat", nom: "", taille: 0, debut: vide })).toEqual({
      erreurs: { fichier: ["Choisissez un fichier."] },
    });
    expect(verifierPiece({ type: "contrat", nom: "vide.pdf", taille: 0, debut: vide })).toEqual({
      erreurs: { fichier: ["Ce fichier est vide."] },
    });
  });

  it("refuse un type absent ou inventé, et signale les deux champs à la fois", () => {
    expect(verifierPiece({ type: "", nom: "a.pdf", taille: 10, debut: PDF })).toEqual({
      erreurs: { type: ["Choisissez le type de la pièce."] },
    });
    expect(verifierPiece({ type: "facture", nom: "", taille: 0, debut: new Uint8Array() })).toEqual({
      erreurs: { type: ["Choisissez le type de la pièce."], fichier: ["Choisissez un fichier."] },
    });
  });
});

describe("signature PDF", () => {
  it("exige « %PDF- » au tout début, en entier", () => {
    expect(estUnPdf(octets("%PDF-1.4\n…"))).toBe(true);
    expect(estUnPdf(octets("%PDF"))).toBe(false);
    expect(estUnPdf(octets(" %PDF-1.4"))).toBe(false);
    expect(estUnPdf(octets("%pdf-1.4"))).toBe(false);
  });
});

describe("affichage de la taille", () => {
  it("choisit l'unité et écrit à la française", () => {
    expect(formaterTaille(512)).toBe("512 o");
    expect(formaterTaille(1536)).toBe("1,5 Ko");
    expect(formaterTaille(2_500_000)).toBe("2,4 Mo");
  });
});
