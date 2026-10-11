import { and, asc, desc, eq, gte, ilike, inArray, lt, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { engagementMusiciens, engagements, lieux, utilisateurs } from "@/db/schema";

export const LIBELLES_STATUT = {
  demande: "demande",
  option: "option",
  contrat_envoye: "contrat envoyé",
  confirme: "confirmé",
  joue: "joué",
  facture: "facturé",
  paye: "payé",
  annule: "annulé",
} as const;
export type Statut = keyof typeof LIBELLES_STATUT;

export type Filtres = {
  statut?: Statut;
  musicien?: string;
  periode: "a-venir" | "passes";
  recherche?: string;
};

type Lecteur = { id: string; role: "admin" | "musicien" };

// Lit les engagements visibles par ce lecteur : tous pour l'agent, les siens seulement pour un musicien.
// C'est ici, côté serveur, que la règle de visibilité s'applique, quels que soient les filtres demandés.
export async function listerEngagements(lecteur: Lecteur, filtres: Filtres) {
  const debutDuJour = new Date();
  debutDuJour.setHours(0, 0, 0, 0);

  const conditions: SQL[] = [
    filtres.periode === "a-venir" ? gte(engagements.debut, debutDuJour) : lt(engagements.debut, debutDuJour),
  ];
  if (filtres.statut) conditions.push(eq(engagements.statut, filtres.statut));
  if (filtres.recherche) {
    const motif = `%${filtres.recherche}%`;
    conditions.push(or(ilike(lieux.nom, motif), ilike(lieux.ville, motif), ilike(engagements.titre, motif))!);
  }
  const musicienVise = lecteur.role === "musicien" ? lecteur.id : filtres.musicien;
  if (musicienVise) {
    const sesEngagements = db
      .select({ id: engagementMusiciens.engagementId })
      .from(engagementMusiciens)
      .where(eq(engagementMusiciens.musicienId, musicienVise));
    conditions.push(inArray(engagements.id, sesEngagements));
  }

  const lignes = await db
    .select({
      id: engagements.id,
      titre: engagements.titre,
      debut: engagements.debut,
      precisionDate: engagements.precisionDate,
      statut: engagements.statut,
      cachet: engagements.cachet,
      devise: engagements.devise,
      lieu: lieux.nom,
      ville: lieux.ville,
      pays: lieux.pays,
    })
    .from(engagements)
    .innerJoin(lieux, eq(engagements.lieuId, lieux.id))
    .where(and(...conditions))
    .orderBy(filtres.periode === "a-venir" ? asc(engagements.debut) : desc(engagements.debut));

  const musiciens = lignes.length
    ? await db
        .select({ engagementId: engagementMusiciens.engagementId, nom: utilisateurs.nom, instrument: utilisateurs.instrument })
        .from(engagementMusiciens)
        .innerJoin(utilisateurs, eq(engagementMusiciens.musicienId, utilisateurs.id))
        .where(inArray(engagementMusiciens.engagementId, lignes.map((l) => l.id)))
    : [];

  return lignes.map((l) => ({ ...l, musiciens: musiciens.filter((m) => m.engagementId === l.id) }));
}

export async function listerMusiciens() {
  return db
    .select({ id: utilisateurs.id, nom: utilisateurs.nom })
    .from(utilisateurs)
    .where(eq(utilisateurs.role, "musicien"))
    .orderBy(asc(utilisateurs.nom));
}
