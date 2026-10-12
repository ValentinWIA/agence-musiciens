"use server";

import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { engagements, piecesJointes } from "@/db/schema";
import { LIBELLES_TYPE_PIECE, OCTETS_A_LIRE, verifierPiece, type ErreursPiece } from "@/lib/pieces-jointes";
import { verifierAdmin } from "@/lib/session";

export type EtatAjoutPiece = { message?: string; erreur?: string; erreurs?: ErreursPiece; envois?: number };

export async function ajouterPiece(etat: EtatAjoutPiece, formData: FormData): Promise<EtatAjoutPiece> {
  const agent = await verifierAdmin("/engagements (ajout de pièce jointe)");

  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { erreur: "Demande invalide." };
  const engagementId = id.data;

  const engagement = await db.query.engagements.findFirst({ where: eq(engagements.id, engagementId), columns: { id: true } });
  if (!engagement) return { erreur: "Engagement introuvable." };

  // Sans fichier choisi, le navigateur envoie un fichier vide sans nom : verifierPiece le refuse.
  const fichier = formData.get("fichier");
  const fichierRecu = fichier instanceof File ? fichier : new File([], "");
  const verdict = verifierPiece({
    type: String(formData.get("type") ?? ""),
    nom: fichierRecu.name,
    taille: fichierRecu.size,
    debut: new Uint8Array(await fichierRecu.slice(0, OCTETS_A_LIRE).arrayBuffer()),
  });
  if ("erreurs" in verdict) {
    const raisons = [...(verdict.erreurs.type ?? []), ...(verdict.erreurs.fichier ?? [])].join(" ");
    console.warn(`Pièce jointe refusée : « ${fichierRecu.name} » (${fichierRecu.size} o) sur ${engagementId} par ${agent.nom} — ${raisons}`);
    return { erreurs: verdict.erreurs };
  }
  const { type, nom, taille } = verdict.piece;

  // Chemin aléatoire, sans le nom du fichier (qui peut contenir n'importe quoi) ; stockage privé : aucune adresse publique.
  const chemin = `engagements/${engagementId}/${randomUUID()}.pdf`;
  try {
    await put(chemin, fichierRecu, { access: "private", contentType: "application/pdf", addRandomSuffix: false });
  } catch (e) {
    console.error(`Envoi au stockage échoué : ${engagementId} par ${agent.nom} —`, e);
    return { erreur: "L'envoi du fichier a échoué. Réessayez." };
  }

  try {
    await db.insert(piecesJointes).values({ engagementId, type, nomFichier: nom, taille, chemin, ajouteePar: agent.id });
  } catch (e) {
    // Engagement supprimé entre-temps, ou base indisponible : on n'abandonne pas un fichier sans trace dans le stockage.
    await del(chemin).catch(() => {});
    console.error(`Enregistrement de la pièce échoué : ${engagementId} par ${agent.nom} —`, e);
    return { erreur: "L'enregistrement de la pièce a échoué. Réessayez." };
  }

  refresh();
  console.log(`Pièce jointe ajoutée : « ${nom} » (${LIBELLES_TYPE_PIECE[type]}, ${taille} o) sur ${engagementId} par ${agent.nom}`);
  // « envois » change à chaque réussite : le formulaire s'en sert pour se vider.
  return { message: `« ${nom} » ajouté.`, envois: (etat.envois ?? 0) + 1 };
}

export type EtatSuppressionPiece = { erreur?: string };

// Suppression, à tout statut, par l'agent seulement. La ligne d'abord, le fichier ensuite : si l'effacement du
// fichier échoue, il reste un fichier sans lien (inaccessible), jamais un lien vers un fichier disparu.
export async function supprimerPiece(_etat: EtatSuppressionPiece, formData: FormData): Promise<EtatSuppressionPiece> {
  const agent = await verifierAdmin("/engagements (suppression de pièce jointe)");

  const ids = z.object({ id: z.uuid(), pieceId: z.uuid() }).safeParse({ id: formData.get("id"), pieceId: formData.get("pieceId") });
  if (!ids.success) return { erreur: "Demande invalide." };
  const { id: engagementId, pieceId } = ids.data;

  const [piece] = await db
    .delete(piecesJointes)
    .where(and(eq(piecesJointes.id, pieceId), eq(piecesJointes.engagementId, engagementId)))
    .returning({ nom: piecesJointes.nomFichier, chemin: piecesJointes.chemin });
  // Déjà supprimée (autre onglet, double clic) : rien à faire, la liste se met à jour.
  if (!piece) {
    refresh();
    return { erreur: "Cette pièce n'existe plus." };
  }

  await del(piece.chemin).catch((e) => console.error(`Fichier non effacé du stockage : ${piece.chemin} —`, e));
  refresh();
  console.log(`Pièce jointe supprimée : « ${piece.nom} » sur ${engagementId} par ${agent.nom}`);
  return {};
}
