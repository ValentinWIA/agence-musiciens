"use server";

import { db } from "@/db";
import { programmateurs } from "@/db/schema";
import { lireProgrammateur, trouverDoublonProgrammateur, type ErreursProgrammateur } from "@/lib/programmateurs";
import { verifierAdmin } from "@/lib/session";

// Création d'un programmateur depuis le formulaire d'engagement (N5f, docs/flux-de-nuit.md, décision 1).

export type EtatProgrammateur = {
  programmateur?: { id: string; nom: string; structure: string };
  erreurs?: ErreursProgrammateur;
};

export async function creerProgrammateur(_etat: EtatProgrammateur, formData: FormData): Promise<EtatProgrammateur> {
  const agent = await verifierAdmin("création de programmateur");

  const lu = lireProgrammateur(Object.fromEntries(formData));
  if (!lu.programmateur) {
    console.warn(`Création de programmateur refusée (${Object.keys(lu.erreurs).join(", ")}) par ${agent.nom}`);
    return { erreurs: lu.erreurs };
  }
  const d = lu.programmateur;

  // Les programmateurs sont peu nombreux : on les relit tous et on compare ici (règle testée dans src/lib/programmateurs.ts).
  const existants = await db
    .select({ nom: programmateurs.nom, structure: programmateurs.structure, email: programmateurs.email })
    .from(programmateurs);
  const doublon = trouverDoublonProgrammateur(d.email, existants);
  if (doublon) {
    console.warn(`Création de programmateur refusée (e-mail déjà connu) par ${agent.nom}`);
    return { erreurs: { email: [`Cette adresse est déjà celle de ${doublon.nom} (${doublon.structure}).`] } };
  }

  const [programmateur] = await db
    .insert(programmateurs)
    .values(d)
    .returning({ id: programmateurs.id, nom: programmateurs.nom, structure: programmateurs.structure });
  console.log(`Programmateur créé : ${programmateur.id} (${programmateur.nom}, ${programmateur.structure}) par ${agent.nom}`);
  return { programmateur };
}
