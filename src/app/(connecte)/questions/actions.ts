"use server";

import { refresh } from "next/cache";
import { indexerDocuments } from "@/lib/indexation";
import { verifierAdmin } from "@/lib/session";

export type EtatIndexation = { message?: string; reussi?: boolean };

export async function indexer(): Promise<EtatIndexation> {
  const agent = await verifierAdmin("/questions (indexation)");
  console.log(`Indexation des documents demandée par ${agent.nom}`);
  const resultat = await indexerDocuments(agent.id);
  refresh();
  if (!resultat.ok) return { message: `Indexation non faite : ${resultat.erreur}.` };
  return {
    reussi: true,
    message: `${resultat.documents} documents, ${resultat.passages} passages : ${resultat.calcules} recalculé(s), ${resultat.passages - resultat.calcules} inchangé(s).`,
  };
}
