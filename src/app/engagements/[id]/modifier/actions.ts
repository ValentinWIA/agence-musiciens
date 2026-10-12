"use server";

import { and, eq, exists, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { engagementMusiciens, engagements, utilisateurs } from "@/db/schema";
import { controlerModification, estVerrouille } from "@/lib/cycle-de-vie";
import { verifierAdmin } from "@/lib/session";
import { lireFormulaire, schemaTextes, type Erreurs, type EtatFormulaire } from "../../saisie";

const CHANGE_ENTRE_TEMPS = "L'engagement a changé entre-temps (statut) : rechargez la page.";

export async function modifierEngagement(_etat: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  const agent = await verifierAdmin("/engagements (modification)");

  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { erreur: "Demande invalide." };

  // On relit l'engagement en base : c'est son statut actuel qui dit ce qui est modifiable, pas la page affichée.
  const actuel = await db.query.engagements.findFirst({ where: eq(engagements.id, id.data) });
  if (!actuel) return { erreur: "Engagement introuvable." };
  // Chaque écriture n'a lieu que si le statut n'a pas bougé depuis cette lecture (confirmation dans un autre onglet…).
  const inchange = and(eq(engagements.id, actuel.id), eq(engagements.statut, actuel.statut));

  if (estVerrouille(actuel.statut)) {
    // Seuls titre, programme et notes sont lus : les autres champs envoyés (même trafiqués) sont ignorés.
    const textes = schemaTextes.safeParse(Object.fromEntries(formData));
    if (!textes.success) return refuser(z.flattenError(textes.error).fieldErrors);
    const misAJour = await db
      .update(engagements)
      .set({ ...textes.data, modifieLe: new Date() })
      .where(inchange)
      .returning({ id: engagements.id });
    if (!misAJour.length) return { erreur: CHANGE_ENTRE_TEMPS };
  } else {
    const lu = await lireFormulaire(formData, actuel);
    if (!lu.saisie) return refuser(lu.erreurs);
    const s = lu.saisie;

    // Ne pas défaire une étape franchie (option posée, contrat envoyé).
    const regles = controlerModification(actuel.statut, { precisionDate: s.precision, dureeMinutes: s.duree, cachet: s.cachet });
    if (Object.keys(regles).length) {
      return refuser(Object.fromEntries(Object.entries(regles).map(([champ, message]) => [champ, [message]])));
    }

    // Trois écritures indivisibles ; les musiciens ne sont remplacés que si le statut est toujours le même.
    const [misAJour] = await db.batch([
      db
        .update(engagements)
        .set({
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
          modifieLe: new Date(),
        })
        .where(inchange)
        .returning({ id: engagements.id }),
      db
        .delete(engagementMusiciens)
        .where(
          and(
            eq(engagementMusiciens.engagementId, actuel.id),
            exists(db.select({ id: engagements.id }).from(engagements).where(inchange)),
          ),
        ),
      db.insert(engagementMusiciens).select(
        db
          .select({ engagementId: engagements.id, musicienId: utilisateurs.id })
          .from(engagements)
          .innerJoin(utilisateurs, inArray(utilisateurs.id, s.musiciens))
          .where(inchange),
      ),
    ]);
    if (!misAJour.length) return { erreur: CHANGE_ENTRE_TEMPS };
  }

  console.log(`Engagement modifié : ${actuel.id} (statut ${actuel.statut}) par ${agent.nom}`);
  redirect(`/engagements/${actuel.id}?modifie=1`);

  function refuser(erreurs: Erreurs): EtatFormulaire {
    console.warn(`Modification refusée (${Object.keys(erreurs).join(", ")}) sur ${actuel!.id} par ${agent.nom}`);
    return { erreurs };
  }
}
