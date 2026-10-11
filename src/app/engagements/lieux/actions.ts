"use server";

import { and, sql } from "drizzle-orm";
import { db } from "@/db";
import { lieux } from "@/db/schema";
import { chercherAdresse, type Proposition } from "@/lib/geocodage";
import { lireLieu, type ErreursLieu } from "@/lib/lieux";
import { verifierAdmin } from "@/lib/session";

// Création d'un lieu depuis le formulaire d'engagement (étape E, section 7 de docs/engagements.md).

export type EtatRecherche = { propositions?: Proposition[]; erreur?: string };
export type EtatLieu = { lieu?: { id: string; nom: string; ville: string }; erreurs?: ErreursLieu; erreur?: string };

const MESSAGES_GEOCODAGE = {
  "saisie-trop-courte": "Saisissez une adresse et une ville.",
  indisponible: "Service de géocodage indisponible, réessayez.",
  "reponse-invalide": "Service de géocodage indisponible, réessayez.",
};

// On cherche par adresse + ville, jamais par nom de salle (le service ne connaît que les adresses).
export async function chercherLieu(adresse: string, ville: string): Promise<EtatRecherche> {
  await verifierAdmin("recherche d'adresse (nouveau lieu)");
  const resultat = await chercherAdresse(`${String(adresse)} ${String(ville)}`.slice(0, 200));
  if (!resultat.ok) return { erreur: MESSAGES_GEOCODAGE[resultat.raison] };
  if (resultat.propositions.length === 0) return { erreur: "Aucune adresse trouvée : vérifiez l'orthographe." };
  return { propositions: resultat.propositions };
}

export async function creerLieu(_etat: EtatLieu, formData: FormData): Promise<EtatLieu> {
  const agent = await verifierAdmin("création de lieu");

  const lu = lireLieu(Object.fromEntries(formData));
  if (!lu.lieu) {
    const erreurs = lu.erreurs;
    console.warn(`Création de lieu refusée (${Object.keys(erreurs).join(", ")}) par ${agent.nom}`);
    return { erreurs };
  }
  const d = lu.lieu;

  // Même nom dans la même ville : sans tenir compte des majuscules ni des espaces autour.
  const doublon = await db.query.lieux.findFirst({
    where: and(sql`lower(${lieux.nom}) = lower(${d.nom})`, sql`lower(${lieux.ville}) = lower(${d.ville})`),
  });
  if (doublon) {
    console.warn(`Création de lieu refusée (doublon « ${d.nom} », ${d.ville}) par ${agent.nom}`);
    return { erreurs: { nom: [`« ${doublon.nom} » existe déjà à ${doublon.ville}.`] } };
  }

  const [lieu] = await db
    .insert(lieux)
    .values(d)
    .returning({ id: lieux.id, nom: lieux.nom, ville: lieux.ville });
  console.log(`Lieu créé : ${lieu.id} (${lieu.nom}, ${lieu.ville}, ${d.pays}) par ${agent.nom}`);
  return { lieu };
}
