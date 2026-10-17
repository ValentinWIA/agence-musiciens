"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { demandesRecues, engagementMusiciens, engagements } from "@/db/schema";
import { verifierAdmin } from "@/lib/session";
import { lireFormulaire, type EtatFormulaire } from "../saisie";

const DEJA_TRAITEE = "Cette demande a déjà son engagement ou a été écartée : rien n'a été créé.";

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

  // L'identifiant est tiré ici pour écrire l'engagement et ses musiciens en une seule opération indivisible.
  const id = crypto.randomUUID();
  const engagement = db.insert(engagements).values({
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
  });

  if (!demande) {
    await db.batch([engagement, db.insert(engagementMusiciens).values(s.musiciens.map((m) => ({ engagementId: id, musicienId: m })))]);
  } else {
    // Une mise à jour qui ne touche aucune ligne n'annule pas le bloc. Les musiciens prennent donc l'engagement
    // dans la demande elle-même : si elle a été reliée ou écartée entre-temps (deux onglets), la valeur lue est
    // vide, la base refuse la ligne (23502) et rien du bloc n'est gardé.
    const relie = sql`(select ${demandesRecues.engagementId} from ${demandesRecues} where ${demandesRecues.id} = ${demande.id} and ${demandesRecues.engagementId} = ${id})`;
    try {
      await db.batch([
        engagement,
        db
          .update(demandesRecues)
          .set({ engagementId: id })
          .where(and(eq(demandesRecues.id, demande.id), isNull(demandesRecues.engagementId), isNull(demandesRecues.ecarteeLe))),
        db.insert(engagementMusiciens).values(s.musiciens.map((m) => ({ engagementId: relie, musicienId: m }))),
      ]);
    } catch (e) {
      const code = ((e as { cause?: { code?: string } })?.cause ?? (e as { code?: string }))?.code;
      if (code !== "23502") throw e;
      console.warn(`Création d'engagement refusée (demande ${demande.reference} traitée entre-temps) par ${agent.nom}`);
      return { erreur: DEJA_TRAITEE };
    }
  }

  const origine = demande ? `, depuis la demande ${demande.reference}` : "";
  console.log(`Engagement créé : ${id} (${lu.lieu.nom}, ${s.musiciens.length} musicien(s)${origine}) par ${agent.nom}`);
  redirect(`/engagements/${id}?cree=1`);
}
