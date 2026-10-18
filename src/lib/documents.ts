// Les 20 documents du flux, découpés pour la recherche (docs/semaine-3.md, I4).
// Une page = un passage : le flux les découpe déjà, et la réponse doit citer « tel document, page N ».
import { createHash } from "node:crypto";
import { z } from "zod";

export const listeDocuments = z.object({
  documents: z.array(z.object({ id: z.string().min(1), titre: z.string() })),
});

export const documentFlux = z.object({
  id: z.string().min(1),
  titre: z.string(),
  pages: z.array(z.string()),
});
export type DocumentFlux = z.infer<typeof documentFlux>;

export type Passage = { documentId: string; titre: string; page: number; texte: string; empreinte: string };

// Signature du texte : si elle n'a pas changé, la page n'est jamais recalculée.
export function empreinte(texte: string): string {
  return createHash("sha256").update(texte).digest("hex");
}

export function passagesDe(document: DocumentFlux): Passage[] {
  return document.pages
    .map((texte, i) => ({ documentId: document.id, titre: document.titre, page: i + 1, texte: texte.trim() }))
    .filter((p) => p.texte !== "") // une page vide n'apporte rien à la recherche
    .map((p) => ({ ...p, empreinte: empreinte(`${p.titre}\n${p.texte}`) }));
}

export const clePassage = (p: { documentId: string; page: number }) => `${p.documentId}#${p.page}`;

// Les passages nouveaux ou modifiés : les seuls à envoyer à Voyage.
export function passagesACalculer(passages: Passage[], connus: Map<string, string>): Passage[] {
  return passages.filter((p) => connus.get(clePassage(p)) !== p.empreinte);
}

// Le texte envoyé pour l'embedding : le titre donne le contexte d'une page isolée.
export const texteAIndexer = (p: Passage) => `${p.titre} — page ${p.page}\n\n${p.texte}`;
