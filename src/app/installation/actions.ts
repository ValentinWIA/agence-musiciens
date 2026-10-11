"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/db";
import { utilisateurs } from "@/db/schema";
import { regleMotDePasse } from "@/lib/mot-de-passe";
import { aucunCompte } from "./aucun-compte";

const schemaFormulaire = z.object({
  nom: z.string().trim().min(1, { error: "Le nom est obligatoire." }),
  email: z.email({ error: "Adresse e-mail invalide." }),
  motDePasse: regleMotDePasse,
});

export type EtatInstallation = {
  erreurs?: Partial<Record<"nom" | "email" | "motDePasse", string[]>>;
  message?: string;
  reussi?: boolean;
};

export async function creerPremierAdmin(
  _etat: EtatInstallation,
  formData: FormData,
): Promise<EtatInstallation> {
  // Second contrôle, côté serveur : le formulaire peut être envoyé sans passer par la page.
  if (!(await aucunCompte())) {
    return { message: "L'installation est déjà faite." };
  }

  const donnees = schemaFormulaire.safeParse(Object.fromEntries(formData));
  if (!donnees.success) {
    return { erreurs: z.flattenError(donnees.error).fieldErrors };
  }

  const { nom, email, motDePasse } = donnees.data;
  await db.insert(utilisateurs).values({
    nom,
    email: email.toLowerCase(),
    role: "admin",
    motDePasseHash: await bcrypt.hash(motDePasse, 12),
  });

  console.log(`Installation : compte administrateur créé (${email.toLowerCase()})`);
  return { reussi: true };
}
