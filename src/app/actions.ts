"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { lireSession } from "@/lib/session";

export type EtatConnexion = { message?: string };

export async function seConnecter(_etat: EtatConnexion, formData: FormData): Promise<EtatConnexion> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      motDePasse: formData.get("motDePasse"),
      redirectTo: "/tableau-de-bord",
    });
  } catch (erreur) {
    // Message unique : on ne dit pas si c'est l'e-mail ou le mot de passe qui est faux.
    if (erreur instanceof AuthError) return { message: "Identifiants incorrects." };
    throw erreur; // la redirection vers le tableau de bord passe par ici
  }
  return {};
}

export async function seDeconnecter() {
  const session = await lireSession();
  if (session?.user) console.log(`Déconnexion : ${session.user.nom} (${session.user.role})`);
  await signOut({ redirectTo: "/" });
}
