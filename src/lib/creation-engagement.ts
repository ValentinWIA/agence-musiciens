import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { demandesRecues, engagementMusiciens, engagements } from "@/db/schema";
import type { Devise } from "./argent";

// L'écriture d'un nouvel engagement, partagée par le formulaire et par l'assistant (docs/semaine-4.md) : l'appelant
// a vérifié le rôle et la saisie (lireFormulaire). Tout ou rien, comme avant.

export const DEJA_TRAITEE = "Cette demande a déjà son engagement ou a été écartée : rien n'a été créé.";

export type SaisieEngagement = {
  titre: string | null;
  debut: Date;
  precision: "jour" | "mois" | "saison";
  duree: number | null;
  lieuId: string;
  programmateurId: string;
  cachet: number | null;
  devise: Devise;
  programme: string | null;
  notes: string | null;
  musiciens: string[];
};

// demande : la demande reçue dont l'engagement est fait, encore libre au moment de la lecture.
export async function ecrireEngagement(s: SaisieEngagement, demande?: { id: string }): Promise<{ id: string } | { erreur: string }> {
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
    return { id };
  }
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
    return { erreur: DEJA_TRAITEE };
  }
  return { id };
}
