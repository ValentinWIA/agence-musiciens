"use server";

import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { reinitialisations, utilisateurs } from "@/db/schema";
import { regleMotDePasse } from "@/lib/mot-de-passe";
import { trouverReinitialisation } from "./trouver-reinitialisation";

export type EtatNouveauMotDePasse = { erreur?: string; reussi?: boolean };

export async function changerMotDePasse(
  jeton: string,
  _etat: EtatNouveauMotDePasse,
  formData: FormData,
): Promise<EtatNouveauMotDePasse> {
  // Le lien est revérifié à l'envoi : il a pu expirer ou servir entre-temps.
  const demande = await trouverReinitialisation(jeton);
  if (!demande) return { erreur: "Ce lien n'est plus valide. Faites une nouvelle demande." };

  const motDePasse = regleMotDePasse.safeParse(formData.get("motDePasse"));
  if (!motDePasse.success) return { erreur: motDePasse.error.issues[0].message };

  // Nouveau mot de passe, et tous les liens encore ouverts pour ce compte sont consommés.
  await db.batch([
    db
      .update(utilisateurs)
      .set({ motDePasseHash: await bcrypt.hash(motDePasse.data, 12) })
      .where(eq(utilisateurs.id, demande.utilisateurId)),
    db
      .update(reinitialisations)
      .set({ utiliseeLe: new Date() })
      .where(and(eq(reinitialisations.utilisateurId, demande.utilisateurId), isNull(reinitialisations.utiliseeLe))),
  ]);

  console.log(`Mot de passe changé pour le compte ${demande.utilisateurId}`);
  return { reussi: true };
}
