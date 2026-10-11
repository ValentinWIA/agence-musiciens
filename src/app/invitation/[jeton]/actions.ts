"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { invitations, utilisateurs } from "@/db/schema";
import { trouverInvitation } from "./trouver-invitation";

const schemaMotDePasse = z.string().min(12, { error: "Au moins 12 caractères." });

export type EtatAcceptation = { erreur?: string; reussi?: boolean };

export async function accepterInvitation(
  jeton: string,
  _etat: EtatAcceptation,
  formData: FormData,
): Promise<EtatAcceptation> {
  // Le lien est revérifié à l'envoi : il a pu expirer ou servir entre-temps.
  const resultat = await trouverInvitation(jeton);
  if (resultat.etat !== "valide") return { erreur: "Ce lien d'invitation n'est plus valide." };
  const { invitation } = resultat;

  const motDePasse = schemaMotDePasse.safeParse(formData.get("motDePasse"));
  if (!motDePasse.success) return { erreur: motDePasse.error.issues[0].message };

  const compteExistant = await db.query.utilisateurs.findFirst({
    where: eq(utilisateurs.email, invitation.email),
  });
  if (compteExistant) return { erreur: "Un compte existe déjà avec cette adresse." };

  // Les deux écritures réussissent ensemble ou échouent ensemble.
  await db.batch([
    db.insert(utilisateurs).values({
      email: invitation.email,
      nom: invitation.nom,
      role: "musicien",
      instrument: invitation.instrument,
      motDePasseHash: await bcrypt.hash(motDePasse.data, 12),
    }),
    db.update(invitations).set({ accepteeLe: new Date() }).where(eq(invitations.id, invitation.id)),
  ]);

  console.log(`Invitation acceptée : ${invitation.email} (${invitation.instrument})`);
  return { reussi: true };
}
