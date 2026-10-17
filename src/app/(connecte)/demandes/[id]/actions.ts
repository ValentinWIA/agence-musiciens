"use server";

import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { demandesRecues } from "@/db/schema";
import { verifierAdmin } from "@/lib/session";

export type EtatEcart = { erreur?: string };

// La condition est dans la requête elle-même : une demande devenue engagement entre-temps n'est pas écartée.
export async function ecarterDemande(_etat: EtatEcart, formData: FormData): Promise<EtatEcart> {
  const agent = await verifierAdmin("/demandes (écarter)");
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { erreur: "Demande introuvable." };

  const lignes = await db
    .update(demandesRecues)
    .set({ ecarteeLe: new Date() })
    .where(and(eq(demandesRecues.id, id.data), isNull(demandesRecues.engagementId), isNull(demandesRecues.ecarteeLe)))
    .returning({ reference: demandesRecues.reference });
  if (lignes.length === 0) return { erreur: "Cette demande est déjà écartée ou a déjà son engagement." };

  console.log(`Demande ${lignes[0].reference} écartée par ${agent.nom}`);
  refresh();
  return {};
}

export async function remettreATraiter(_etat: EtatEcart, formData: FormData): Promise<EtatEcart> {
  const agent = await verifierAdmin("/demandes (remettre à traiter)");
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { erreur: "Demande introuvable." };

  const lignes = await db
    .update(demandesRecues)
    .set({ ecarteeLe: null })
    .where(and(eq(demandesRecues.id, id.data), isNotNull(demandesRecues.ecarteeLe)))
    .returning({ reference: demandesRecues.reference });
  if (lignes.length === 0) return { erreur: "Cette demande n'est pas écartée." };

  console.log(`Demande ${lignes[0].reference} remise à traiter par ${agent.nom}`);
  refresh();
  return {};
}
