"use server";

import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { utilisateurs } from "@/db/schema";
import { OCTETS_A_LIRE_PHOTO, verifierFiche, verifierPhoto, type EtatFiche } from "@/lib/musiciens";
import { verifierSession } from "@/lib/session";

// Modifiable par l'agent (toute fiche de musicien) et par le musicien lui-même (la sienne, sans les notes de l'agent).
export async function modifierFiche(_etat: EtatFiche, formData: FormData): Promise<EtatFiche> {
  const acces = await controlerAcces(formData, "la modification de la fiche");
  if ("erreur" in acces) return acces;
  const { utilisateur, agent, id } = acces;

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
    console.warn(`Fiche refusée (${Object.keys(verifie.erreurs).join(", ")}) sur ${id} par ${utilisateur.nom}`);
    return verifie;
  }

  // Seule la fiche d'un musicien se modifie (l'identifiant de l'agent → introuvable).
  const misAJour = await db
    .update(utilisateurs)
    .set(verifie.fiche)
    .where(ficheDuMusicien(id))
    .returning({ nom: utilisateurs.nom });
  if (!misAJour.length) return { erreur: "Fiche introuvable." };

  console.log(`Fiche modifiée : ${misAJour[0].nom} par ${utilisateur.nom}`);
  redirect(`/musiciens/${id}?modifie=1`);
}

export type EtatPhoto = { message?: string; erreur?: string; envois?: number };

// Nouvelle photo, ou remplacement : la nouvelle est rangée d'abord, l'ancienne effacée ensuite.
export async function changerPhoto(etat: EtatPhoto, formData: FormData): Promise<EtatPhoto> {
  const acces = await controlerAcces(formData, "la photo");
  if ("erreur" in acces) return acces;
  const { utilisateur, id } = acces;

  const fichier = formData.get("photo");
  const fichierRecu = fichier instanceof File ? fichier : new File([], "");
  const verdict = verifierPhoto({
    nom: fichierRecu.name,
    taille: fichierRecu.size,
    debut: new Uint8Array(await fichierRecu.slice(0, OCTETS_A_LIRE_PHOTO).arrayBuffer()),
  });
  if ("erreur" in verdict) {
    console.warn(`Photo refusée : « ${fichierRecu.name} » (${fichierRecu.size} o) sur ${id} par ${utilisateur.nom} — ${verdict.erreur}`);
    return { erreur: verdict.erreur };
  }

  const [actuelle] = await db.select({ chemin: utilisateurs.photoChemin }).from(utilisateurs).where(ficheDuMusicien(id));
  if (!actuelle) return { erreur: "Fiche introuvable." };

  // Chemin aléatoire, sans le nom du fichier ; extension et type tirés du contenu, pas de ce qu'annonce le navigateur.
  const chemin = `musiciens/${id}/${randomUUID()}.${verdict.photo.type.split("/")[1]}`;
  try {
    await put(chemin, fichierRecu, { access: "private", contentType: verdict.photo.type, addRandomSuffix: false });
  } catch (e) {
    console.error(`Envoi au stockage échoué : photo de ${id} par ${utilisateur.nom} —`, e);
    return { erreur: "L'envoi de la photo a échoué. Réessayez." };
  }

  const misAJour = await db
    .update(utilisateurs)
    .set({ photoChemin: chemin })
    .where(ficheDuMusicien(id))
    .returning({ nom: utilisateurs.nom })
    .catch((e) => {
      console.error(`Enregistrement de la photo échoué : ${id} par ${utilisateur.nom} —`, e);
      return [];
    });
  if (!misAJour.length) {
    // On n'abandonne pas un fichier sans trace dans le stockage.
    await del(chemin).catch(() => {});
    return { erreur: "L'enregistrement de la photo a échoué. Réessayez." };
  }
  if (actuelle.chemin) await del(actuelle.chemin).catch((e) => console.error(`Ancienne photo non effacée : ${actuelle.chemin} —`, e));

  refresh();
  console.log(`Photo ${actuelle.chemin ? "remplacée" : "ajoutée"} : ${misAJour[0].nom} par ${utilisateur.nom}`);
  // « envois » change à chaque réussite : le formulaire s'en sert pour se vider.
  return { message: "Photo enregistrée.", envois: (etat.envois ?? 0) + 1 };
}

// Retrait : la ligne d'abord, le fichier ensuite (jamais un lien vers un fichier disparu).
export async function retirerPhoto(_etat: EtatPhoto, formData: FormData): Promise<EtatPhoto> {
  const acces = await controlerAcces(formData, "la photo");
  if ("erreur" in acces) return acces;
  const { utilisateur, id } = acces;

  const [actuelle] = await db.select({ chemin: utilisateurs.photoChemin }).from(utilisateurs).where(ficheDuMusicien(id));
  if (!actuelle?.chemin) {
    refresh();
    return { erreur: "Il n'y a plus de photo." };
  }
  // Seulement si la photo n'a pas changé depuis la lecture (remplacée dans un autre onglet).
  await db
    .update(utilisateurs)
    .set({ photoChemin: null })
    .where(and(ficheDuMusicien(id), eq(utilisateurs.photoChemin, actuelle.chemin)));
  await del(actuelle.chemin).catch((e) => console.error(`Photo non effacée du stockage : ${actuelle.chemin} —`, e));

  refresh();
  console.log(`Photo retirée : musicien ${id} par ${utilisateur.nom}`);
  return { message: "Photo retirée." };
}

// L'agent agit sur toute fiche de musicien ; un musicien sur la sienne seulement (refus journalisé).
async function controlerAcces(formData: FormData, quoi: string) {
  const utilisateur = await verifierSession();
  const agent = utilisateur.role === "admin";
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { erreur: "Demande invalide." };
  if (!agent && utilisateur.id !== id.data) {
    console.warn(`Accès refusé : ${utilisateur.nom} (musicien) sur ${quoi} du musicien ${id.data}`);
    return { erreur: "Fiche introuvable." };
  }
  return { utilisateur, agent, id: id.data };
}

function ficheDuMusicien(id: string) {
  return and(eq(utilisateurs.id, id), eq(utilisateurs.role, "musicien"));
}
