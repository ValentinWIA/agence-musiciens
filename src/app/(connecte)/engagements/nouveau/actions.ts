"use server";

import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { demandesRecues } from "@/db/schema";
import { DEJA_TRAITEE, ecrireEngagement } from "@/lib/creation-engagement";
import { verifierAdmin } from "@/lib/session";
import { lireFormulaire, type EtatFormulaire } from "../saisie";

export async function creerEngagement(_etat: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const agent = await verifierAdmin("/engagements/nouveau (création)");

  // Venu d'une demande reçue : elle doit exister et être encore libre (ni reliée, ni écartée).
  const brut = formData.get("demandeId");
  let demande: { id: string; reference: string } | undefined;
  if (brut) {
    const demandeId = z.uuid().safeParse(brut);
    if (!demandeId.success) return { erreur: "Demande introuvable." };
    [demande] = await db
      .select({ id: demandesRecues.id, reference: demandesRecues.reference })
      .from(demandesRecues)
      .where(and(eq(demandesRecues.id, demandeId.data), isNull(demandesRecues.engagementId), isNull(demandesRecues.ecarteeLe)));
    if (!demande) {
      console.warn(`Création d'engagement refusée (demande ${demandeId.data} déjà traitée) par ${agent.nom}`);
      return { erreur: DEJA_TRAITEE };
    }
  }

  const lu = await lireFormulaire(formData);
  if (!lu.saisie) {
    console.warn(`Création d'engagement refusée (${Object.keys(lu.erreurs).join(", ")}) par ${agent.nom}`);
    return { erreurs: lu.erreurs };
  }
  const s = lu.saisie;

  const ecrit = await ecrireEngagement(s, demande);
  if ("erreur" in ecrit) {
    console.warn(`Création d'engagement refusée (demande ${demande?.reference} traitée entre-temps) par ${agent.nom}`);
    return { erreur: ecrit.erreur };
  }
  const { id } = ecrit;

  const origine = demande ? `, depuis la demande ${demande.reference}` : "";
  console.log(`Engagement créé : ${id} (${lu.lieu.nom}, ${s.musiciens.length} musicien(s)${origine}) par ${agent.nom}`);
  // Venu d'une demande : retour à la file « À traiter » pour enchaîner (décidé le 18/10) ; sinon la fiche créée.
  redirect(demande ? `/demandes?cree=${id}` : `/engagements/${id}?cree=1`);
}
