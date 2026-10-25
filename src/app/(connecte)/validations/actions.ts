"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { propositions } from "@/db/schema";
import { envoyerCourriel, estAdresseFictive } from "@/lib/courriel";
import { etatApresEnvoi, verifierCourriel } from "@/lib/propositions";
import { verifierAdmin } from "@/lib/session";

export type EtatDecision = { erreur?: string; message?: string };

const DEJA = "Cette proposition a déjà été envoyée ou refusée : rien n'est parti.";

// « Envoyer » : la ligne passe d'abord à « envoi en cours », condition dans la requête. Deux clics ou deux onglets
// n'envoient donc qu'une fois (même méthode que le récap du matin). Puis l'envoi, puis l'état final.
export async function envoyerProposition(_etat: EtatDecision, formData: FormData): Promise<EtatDecision> {
  const agent = await verifierAdmin("/validations (envoyer)");
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { erreur: "Proposition introuvable." };
  const courriel = verifierCourriel({ sujet: formData.get("sujet"), texte: formData.get("texte") });
  if ("erreur" in courriel) return { erreur: courriel.erreur };

  const [p] = await db
    .update(propositions)
    .set({ ...courriel, etat: "envoi_en_cours", decideLe: new Date(), decidePar: agent.id })
    .where(and(eq(propositions.id, id.data), eq(propositions.etat, "en_attente")))
    .returning({ destinataire: propositions.destinataire, objet: propositions.objet });
  if (!p) return { erreur: DEJA };

  const fictive = estAdresseFictive(p.destinataire);
  const parti = await envoyerCourriel({ a: p.destinataire, ...courriel });
  const etat = etatApresEnvoi(fictive, parti);
  await db
    .update(propositions)
    .set(etat === "en_attente" ? { etat, decideLe: null, decidePar: null, erreur: "L'envoi a échoué (Resend)." } : { etat, erreur: null })
    .where(eq(propositions.id, id.data));
  console.log(`Relance ${etat} (${p.objet}) par ${agent.nom}`);
  refresh();
  if (etat === "en_attente") return { erreur: "L'envoi a échoué : la proposition reste en attente. Réessayez plus tard." };
  return { message: etat === "envoyee" ? "Courriel envoyé." : "Validée, non envoyée : l'adresse est fictive (.test)." };
}

export async function refuserProposition(_etat: EtatDecision, formData: FormData): Promise<EtatDecision> {
  const agent = await verifierAdmin("/validations (refuser)");
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { erreur: "Proposition introuvable." };
  const [p] = await db
    .update(propositions)
    .set({ etat: "refusee", decideLe: new Date(), decidePar: agent.id })
    .where(and(eq(propositions.id, id.data), eq(propositions.etat, "en_attente")))
    .returning({ objet: propositions.objet });
  if (!p) return { erreur: DEJA };
  console.log(`Relance refusée (${p.objet}) par ${agent.nom}`);
  refresh();
  return {};
}
