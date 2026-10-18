import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { demandesRecues, engagementMusiciens, engagements, lieux, utilisateurs } from "@/db/schema";
import { estATraiter } from "./demandes";

// Les engagements qui attendent un geste de l'agent : options (contrat à envoyer, échéance) et concerts joués ou
// facturés (cachet à relancer). Lus une fois pour le récap du matin et pour le panneau « À faire » : les deux
// montrent les mêmes engagements. Réservé à l'agent : l'appelant a vérifié le rôle.
export async function lireEngagementsASuivre() {
  const lignes = await db
    .select({
      id: engagements.id,
      titre: engagements.titre,
      debut: engagements.debut,
      statut: engagements.statut,
      cachet: engagements.cachet,
      devise: engagements.devise,
      expireLe: engagements.optionExpireLe,
      salle: lieux.nom,
      ville: lieux.ville,
      pays: lieux.pays,
    })
    .from(engagements)
    .innerJoin(lieux, eq(engagements.lieuId, lieux.id))
    .where(inArray(engagements.statut, ["option", "joue", "facture"]));

  // Les musiciens de chaque engagement, en une seule requête.
  const ids = lignes.map((e) => e.id);
  const liens = ids.length
    ? await db
        .select({ engagementId: engagementMusiciens.engagementId, nom: utilisateurs.nom })
        .from(engagementMusiciens)
        .innerJoin(utilisateurs, eq(engagementMusiciens.musicienId, utilisateurs.id))
        .where(inArray(engagementMusiciens.engagementId, ids))
        .orderBy(asc(utilisateurs.nom))
    : [];
  return lignes.map((e) => ({ ...e, musiciens: liens.filter((l) => l.engagementId === e.id).map((l) => l.nom) }));
}

// Même règle que l'onglet « À traiter » de /demandes.
export async function compterDemandesATraiter(): Promise<number> {
  const demandes = await db
    .select({
      reference: demandesRecues.reference,
      statut: demandesRecues.statut,
      dateConcert: demandesRecues.dateConcert,
      engagementId: demandesRecues.engagementId,
      ecarteeLe: demandesRecues.ecarteeLe,
    })
    .from(demandesRecues);
  return demandes.filter(estATraiter).length;
}
