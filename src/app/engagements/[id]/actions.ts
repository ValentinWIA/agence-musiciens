"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { engagements } from "@/db/schema";
import { jugerTransition, statutApres, TRANSITIONS, type Transition } from "@/lib/cycle-de-vie";
import { LIBELLES_STATUT } from "@/lib/engagements";
import { verifierAdmin } from "@/lib/session";

const schemaChangement = z.object({
  id: z.uuid(),
  transition: z.enum(Object.keys(TRANSITIONS) as [Transition, ...Transition[]]),
});

export type EtatChangement = { message?: string; erreur?: string };

export async function changerStatut(_etat: EtatChangement, formData: FormData): Promise<EtatChangement> {
  const agent = await verifierAdmin("/engagements (changement de statut)");

  const donnees = schemaChangement.safeParse(Object.fromEntries(formData));
  if (!donnees.success) return { erreur: "Demande invalide." };
  const { id, transition } = donnees.data;

  // On relit l'engagement en base : on ne fait jamais confiance au statut affiché dans le navigateur.
  const engagement = await db.query.engagements.findFirst({ where: eq(engagements.id, id) });
  if (!engagement) return { erreur: "Engagement introuvable." };

  const verdict = jugerTransition(engagement, transition);
  if (!verdict.permis) {
    console.warn(`Changement de statut refusé : ${transition} sur ${id} par ${agent.nom} — ${verdict.raison}`);
    return { erreur: verdict.raison };
  }

  const vers = statutApres(engagement, transition);
  // La condition sur l'ancien statut évite qu'un double clic (ou deux onglets) applique deux fois la transition.
  const misAJour = await db
    .update(engagements)
    .set({
      statut: vers,
      // On retient le statut quitté à l'annulation (pour rétablir), on l'oublie au rétablissement.
      statutAvantAnnulation: transition === "annuler" ? engagement.statut : null,
      modifieLe: new Date(),
    })
    .where(and(eq(engagements.id, id), eq(engagements.statut, engagement.statut)))
    .returning({ id: engagements.id });
  if (!misAJour.length) return { erreur: "L'engagement a changé entre-temps : rechargez la page." };

  refresh();
  console.log(`Statut changé : ${id} ${engagement.statut} → ${vers} par ${agent.nom}`);
  return { message: `Nouveau statut : « ${LIBELLES_STATUT[vers]} ».` };
}
