import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { question, resultatDeRecherche, sourcesCitees, type PassageTrouve } from "./questions";

const passages: PassageTrouve[] = [
  { documentId: "DOC-reservations-01", titre: "Procédure", page: 3, texte: "Un montant supérieur à 4 139,80 euros exige une double validation." },
  { documentId: "DOC-reservations-06", titre: "Procédure", page: 3, texte: "Un montant supérieur à 5 000 euros exige une double validation." },
  { documentId: "DOC-reservations-05", titre: "FAQ", page: 1, texte: "Les réservations se font en ligne." },
];

const citation = (i: number, texte: string) => ({
  type: "search_result_location" as const,
  search_result_index: i,
  cited_text: texte,
  source: `${passages[i]?.documentId}#${passages[i]?.page}`,
  title: null,
  start_block_index: 0,
  end_block_index: 0,
});

// Réponse fabriquée, de la forme que renvoie l'API avec des citations.
const reponse = (blocs: { text: string; citations?: ReturnType<typeof citation>[] }[]) =>
  ({ content: blocs.map((b) => ({ type: "text", text: b.text, citations: b.citations ?? null })) }) as unknown as Anthropic.Message;

describe("sourcesCitees", () => {
  it("rend les pages citées, dans l'ordre des passages, sans doublon d'extrait", () => {
    const sources = sourcesCitees(
      reponse([
        { text: "Le seuil est de 5 000 €", citations: [citation(1, "Un montant supérieur à 5 000 euros")] },
        { text: " (4 139,80 € dans l'ancienne version)", citations: [citation(0, "4 139,80 euros"), citation(1, "Un montant supérieur à 5 000 euros")] },
      ]),
      passages,
    );
    expect(sources.map((s) => s.documentId)).toEqual(["DOC-reservations-01", "DOC-reservations-06"]);
    expect(sources[1].extraits).toEqual(["Un montant supérieur à 5 000 euros"]);
  });

  it("ne rend aucune source pour une réponse sans citation (question hors sujet)", () => {
    expect(sourcesCitees(reponse([{ text: "Aucun passage des documents ne répond à cette question." }]), passages)).toEqual([]);
  });

  it("ignore une citation qui désigne un passage qui n'a pas été fourni", () => {
    expect(sourcesCitees(reponse([{ text: "x", citations: [citation(7, "inventé")] }]), passages)).toEqual([]);
  });
});

describe("question", () => {
  it("refuse une question vide ou trop longue, accepte une question normale", () => {
    expect(question.safeParse("  ").success).toBe(false);
    expect(question.safeParse("a".repeat(501)).success).toBe(false);
    expect(question.parse("  Quel est le seuil de double validation ?  ")).toBe("Quel est le seuil de double validation ?");
  });
});

describe("resultatDeRecherche", () => {
  it("donne au modèle le document et la page dans le titre, citations activées", () => {
    expect(resultatDeRecherche(passages[0])).toMatchObject({
      type: "search_result",
      title: "Procédure (DOC-reservations-01, page 3)",
      citations: { enabled: true },
    });
  });
});
