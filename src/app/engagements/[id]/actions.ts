"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { engagements } from "@/db/schema";
import { messageConflits, trouverConflits, verifierRaisonConflit } from "@/lib/conflit";
import { jugerTransition, statutApres, TRANSITIONS, type Transition } from "@/lib/cycle-de-vie";
import { LIBELLES_STATUT, lireAgendaPourConfirmer } from "@/lib/engagements";
import { verifierAdmin } from "@/lib/session";

const schemaChangement = z.object({
  id: z.uuid(),
  transition: z.enum(Object.keys(TRANSITIONS) as [Transition, ...Transition[]]),
  // Présente seulement quand l'agent confirme quand même (docs/engagements.md, section 11).
  raisonConflit: z.string().optional(),
});

// conflit : le refus vient de la règle de conflit, que l'agent peut passer outre avec une raison.
export type EtatChangement = { message?: string; erreur?: string; conflit?: boolean; erreurRaison?: string };

export async function changerStatut(_etat: EtatChangement, formData: FormData): Promise<EtatChangement> {
  const agent = await verifierAdmin("/engagements (changement de statut)");

  const donnees = schemaChangement.safeParse(Object.fromEntries(formData));
  if (!donnees.success) return { erreur: "Demande invalide." };
  const { id, transition, raisonConflit } = donnees.data;

  // On relit l'engagement en base : on ne fait jamais confiance au statut affiché dans le navigateur.
  const engagement = await db.query.engagements.findFirst({ where: eq(engagements.id, id) });
  if (!engagement) return { erreur: "Engagement introuvable." };

  const verdict = jugerTransition(engagement, transition);
  if (!verdict.permis) {
    console.warn(`Changement de statut refusé : ${transition} sur ${id} par ${agent.nom} — ${verdict.raison}`);
    return { erreur: verdict.raison };
  }

  // Règle de conflit d'agenda : relue en base au moment de confirmer (docs/engagements.md, section 8).
  // L'agent peut passer outre avec une raison écrite ; les conflits sont recalculés à chaque clic : s'il n'y en a
  // plus, la confirmation est normale et la raison n'est pas gardée.
  let raisonGardee: string | null = null;
  if (transition === "confirmer") {
    const { aConfirmer, autres, noms } = await lireAgendaPourConfirmer(id);
    const conflits = aConfirmer ? trouverConflits(aConfirmer, autres) : [];
    if (aConfirmer && conflits.length) {
      const constat = messageConflits(aConfirmer, conflits, noms);
      if (raisonConflit === undefined) {
        console.warn(`Confirmation refusée (conflit d'agenda) : ${id} par ${agent.nom} — ${constat}`);
        return { erreur: constat, conflit: true };
      }
      const verdictRaison = verifierRaisonConflit(raisonConflit);
      if ("erreur" in verdictRaison) return { erreur: constat, conflit: true, erreurRaison: verdictRaison.erreur };
      raisonGardee = verdictRaison.raison;
      console.warn(`Confirmé malgré un conflit d'agenda : ${id} par ${agent.nom} — ${constat} Raison : « ${raisonGardee} »`);
    }
  }

  const vers = statutApres(engagement, transition);
  // La condition sur l'ancien statut évite qu'un double clic (ou deux onglets) applique deux fois la transition.
  const misAJour = await db
    .update(engagements)
    .set({
      statut: vers,
      // On retient le statut quitté à l'annulation (pour rétablir), on l'oublie au rétablissement.
      statutAvantAnnulation: transition === "annuler" ? engagement.statut : null,
      // Posée en confirmant ; oubliée au rétablissement (la règle sera rejouée à la prochaine confirmation).
      ...(transition === "confirmer" || transition === "retablir" ? { raisonConflit: raisonGardee } : {}),
      modifieLe: new Date(),
    })
    .where(and(eq(engagements.id, id), eq(engagements.statut, engagement.statut)))
    .returning({ id: engagements.id });
  if (!misAJour.length) return { erreur: "L'engagement a changé entre-temps : rechargez la page." };

  refresh();
  console.log(`Statut changé : ${id} ${engagement.statut} → ${vers} par ${agent.nom}`);
  return { message: `Nouveau statut : « ${LIBELLES_STATUT[vers]} ».` };
}
