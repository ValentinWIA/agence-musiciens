"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { engagementMusiciens, engagements } from "@/db/schema";
import { verifierAdmin } from "@/lib/session";
import { lireFormulaire, type EtatFormulaire } from "../saisie";

export async function creerEngagement(_etat: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const agent = await verifierAdmin("/engagements/nouveau (création)");

  const lu = await lireFormulaire(formData);
  if (!lu.saisie) {
    console.warn(`Création d'engagement refusée (${Object.keys(lu.erreurs).join(", ")}) par ${agent.nom}`);
    return { erreurs: lu.erreurs };
  }
  const s = lu.saisie;

  // L'identifiant est tiré ici pour écrire l'engagement et ses musiciens en une seule opération indivisible.
  const id = crypto.randomUUID();
  await db.batch([
    db.insert(engagements).values({
      id,
      titre: s.titre,
      debut: s.debut,
      precisionDate: s.precision,
      dureeMinutes: s.duree,
      lieuId: s.lieuId,
      programmateurId: s.programmateurId,
      cachet: s.cachet,
      devise: s.devise,
      programme: s.programme,
      notes: s.notes,
    }),
    db.insert(engagementMusiciens).values(s.musiciens.map((m) => ({ engagementId: id, musicienId: m }))),
  ]);

  console.log(`Engagement créé : ${id} (${lu.lieu.nom}, ${s.musiciens.length} musicien(s)) par ${agent.nom}`);
  redirect(`/engagements/${id}?cree=1`);
}
