"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { reinitialisations, utilisateurs } from "@/db/schema";
import { envoyerCourriel } from "@/lib/courriel";
import { nouveauJeton } from "@/lib/jeton";
import { origineDuSite } from "@/lib/origine";

const DUREE_VALIDITE_MINUTES = 60;

export type EtatDemande = { erreur?: string; envoye?: boolean };

export async function demanderReinitialisation(_etat: EtatDemande, formData: FormData): Promise<EtatDemande> {
  const email = z.email().safeParse(formData.get("email"));
  if (!email.success) return { erreur: "Adresse e-mail invalide." };
  const adresse = email.data.toLowerCase();

  const utilisateur = await db.query.utilisateurs.findFirst({ where: eq(utilisateurs.email, adresse) });
  if (!utilisateur) {
    console.warn(`Réinitialisation demandée pour une adresse sans compte : ${adresse}`);
    return { envoye: true }; // même réponse que si le compte existait
  }

  const { jeton, jetonHash } = nouveauJeton();
  await db.insert(reinitialisations).values({
    utilisateurId: utilisateur.id,
    jetonHash,
    expireLe: new Date(Date.now() + DUREE_VALIDITE_MINUTES * 60 * 1000),
  });
  console.log(`Réinitialisation demandée : ${adresse}`);

  const lien = `${await origineDuSite()}/reinitialisation/${jeton}`;
  await envoyerCourriel({
    a: adresse,
    sujet: "Choisir un nouveau mot de passe",
    texte: `Bonjour ${utilisateur.nom},\n\nPour choisir un nouveau mot de passe, ouvrez ce lien (valable ${DUREE_VALIDITE_MINUTES} minutes, une seule fois) :\n${lien}\n\nSi vous n'avez rien demandé, ignorez ce courriel : votre mot de passe actuel reste valable.\n`,
  });
  return { envoye: true };
}
