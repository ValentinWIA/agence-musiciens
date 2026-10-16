"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { utilisateurs } from "@/db/schema";
import { verifierFiche, type EtatFiche } from "@/lib/musiciens";
import { verifierSession } from "@/lib/session";

// Modifiable par l'agent (toute fiche de musicien) et par le musicien lui-même (la sienne, sans les notes de l'agent).
export async function modifierFiche(_etat: EtatFiche, formData: FormData): Promise<EtatFiche> {
  const utilisateur = await verifierSession();
  const agent = utilisateur.role === "admin";

  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { erreur: "Demande invalide." };
  if (!agent && utilisateur.id !== id.data) {
    console.warn(`Accès refusé : ${utilisateur.nom} (musicien) sur la modification de la fiche ${id.data}`);
    return { erreur: "Fiche introuvable." };
  }
  // Le formulaire du musicien n'a pas ce champ : s'il arrive quand même, la requête a été fabriquée.
  if (!agent && formData.has("notesAgent")) {
    console.warn(`Accès refusé : ${utilisateur.nom} (musicien) a envoyé les notes de l'agent sur sa fiche`);
    return { erreur: "Les notes de l'agent ne sont modifiables que par l'agent." };
  }

  const texte = (nom: string) => {
    const valeur = formData.get(nom);
    return typeof valeur === "string" ? valeur : "";
  };
  const verifie = verifierFiche({
    biographie: texte("biographie"),
    repertoire: texte("repertoire"),
    notesAgent: agent ? texte("notesAgent") : undefined,
  });
  if ("erreurs" in verifie) {
    console.warn(`Fiche refusée (${Object.keys(verifie.erreurs).join(", ")}) sur ${id.data} par ${utilisateur.nom}`);
    return verifie;
  }

  // Seule la fiche d'un musicien se modifie (l'identifiant de l'agent → introuvable).
  const misAJour = await db
    .update(utilisateurs)
    .set(verifie.fiche)
    .where(and(eq(utilisateurs.id, id.data), eq(utilisateurs.role, "musicien")))
    .returning({ nom: utilisateurs.nom });
  if (!misAJour.length) return { erreur: "Fiche introuvable." };

  console.log(`Fiche modifiée : ${misAJour[0].nom} par ${utilisateur.nom}`);
  redirect(`/musiciens/${id.data}?modifie=1`);
}
