import { and, asc, desc, eq, gte, ilike, inArray, lt, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { STATUTS_TENUS, type ConcertSitue } from "@/lib/conflit";
import { engagementMusiciens, engagements, lieux, piecesJointes, programmateurs, utilisateurs } from "@/db/schema";

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

type Lecteur = { id: string; nom: string; role: "admin" | "musicien" };

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
    .select({ id: utilisateurs.id, nom: utilisateurs.nom, instrument: utilisateurs.instrument })
    .from(utilisateurs)
    .where(eq(utilisateurs.role, "musicien"))
    .orderBy(asc(utilisateurs.nom));
}

export async function listerLieux() {
  return db.select({ id: lieux.id, nom: lieux.nom, ville: lieux.ville }).from(lieux).orderBy(asc(lieux.ville), asc(lieux.nom));
}

export async function listerProgrammateurs() {
  return db
    .select({ id: programmateurs.id, nom: programmateurs.nom, structure: programmateurs.structure })
    .from(programmateurs)
    .orderBy(asc(programmateurs.nom));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Lit un engagement pour ce lecteur. Renvoie null s'il n'existe pas OU si un musicien n'en fait pas partie :
// dans les deux cas la page dit « introuvable », pour ne pas révéler qu'il existe. La tentative est journalisée.
export async function lireEngagement(lecteur: Lecteur, id: string) {
  if (!UUID.test(id)) return null;

  const [engagement] = await db
    .select({
      id: engagements.id,
      titre: engagements.titre,
      debut: engagements.debut,
      precisionDate: engagements.precisionDate,
      dureeMinutes: engagements.dureeMinutes,
      statut: engagements.statut,
      statutAvantAnnulation: engagements.statutAvantAnnulation,
      cachet: engagements.cachet,
      devise: engagements.devise,
      programme: engagements.programme,
      notes: engagements.notes,
      raisonConflit: engagements.raisonConflit,
      lieuId: engagements.lieuId,
      programmateurId: engagements.programmateurId,
      lieu: { nom: lieux.nom, adresse: lieux.adresse, ville: lieux.ville, pays: lieux.pays },
      programmateur: {
        nom: programmateurs.nom,
        structure: programmateurs.structure,
        email: programmateurs.email,
        telephone: programmateurs.telephone,
      },
    })
    .from(engagements)
    .innerJoin(lieux, eq(engagements.lieuId, lieux.id))
    .innerJoin(programmateurs, eq(engagements.programmateurId, programmateurs.id))
    .where(eq(engagements.id, id));
  if (!engagement) return null;

  const musiciens = await db
    .select({ id: utilisateurs.id, nom: utilisateurs.nom, instrument: utilisateurs.instrument })
    .from(engagementMusiciens)
    .innerJoin(utilisateurs, eq(engagementMusiciens.musicienId, utilisateurs.id))
    .where(eq(engagementMusiciens.engagementId, id));

  if (lecteur.role === "musicien" && !musiciens.some((m) => m.id === lecteur.id)) {
    console.warn(`Accès refusé : ${lecteur.nom} (musicien) sur l'engagement ${id}`);
    return null;
  }
  return { ...engagement, musiciens };
}

// Ce dont la règle de conflit a besoin pour confirmer un engagement : l'engagement lui-même, les engagements tenus
// de ses musiciens (avec lieu et coordonnées) et le nom de chaque musicien, pour le message de refus.
export async function lireAgendaPourConfirmer(id: string) {
  const sesMusiciens = await db
    .select({ id: utilisateurs.id, nom: utilisateurs.nom })
    .from(engagementMusiciens)
    .innerJoin(utilisateurs, eq(engagementMusiciens.musicienId, utilisateurs.id))
    .where(eq(engagementMusiciens.engagementId, id));
  const ids = sesMusiciens.map((m) => m.id);

  const lignes = await db
    .select({
      id: engagements.id,
      statut: engagements.statut,
      debut: engagements.debut,
      dureeMinutes: engagements.dureeMinutes,
      lieu: { ville: lieux.ville, pays: lieux.pays, latitude: lieux.latitude, longitude: lieux.longitude },
    })
    .from(engagements)
    .innerJoin(lieux, eq(engagements.lieuId, lieux.id))
    .where(
      and(
        inArray(
          engagements.id,
          db.select({ id: engagementMusiciens.engagementId }).from(engagementMusiciens).where(inArray(engagementMusiciens.musicienId, ids)),
        ),
        or(eq(engagements.id, id), inArray(engagements.statut, STATUTS_TENUS)),
      ),
    );

  const liens = lignes.length
    ? await db
        .select({ engagementId: engagementMusiciens.engagementId, musicienId: engagementMusiciens.musicienId })
        .from(engagementMusiciens)
        .where(inArray(engagementMusiciens.engagementId, lignes.map((l) => l.id)))
    : [];

  // La durée est exigée dès l'option : un engagement tenu (ou à confirmer) l'a toujours.
  const concerts: ConcertSitue[] = lignes.map((l) => ({
    ...l,
    dureeMinutes: l.dureeMinutes ?? 0,
    musiciens: liens.filter((x) => x.engagementId === l.id).map((x) => x.musicienId),
  }));
  return {
    aConfirmer: concerts.find((c) => c.id === id),
    autres: concerts.filter((c) => c.id !== id),
    noms: Object.fromEntries(sesMusiciens.map((m) => [m.id, m.nom])),
  };
}

// Pièces jointes d'un engagement, la plus récente en premier. À n'appeler qu'après lireEngagement, qui contrôle
// l'accès. Le chemin dans le stockage n'est pas lu : il ne doit jamais atteindre le navigateur.
export async function lirePiecesJointes(engagementId: string) {
  return db
    .select({
      id: piecesJointes.id,
      type: piecesJointes.type,
      nomFichier: piecesJointes.nomFichier,
      taille: piecesJointes.taille,
      ajouteeLe: piecesJointes.ajouteeLe,
    })
    .from(piecesJointes)
    .where(eq(piecesJointes.engagementId, engagementId))
    .orderBy(desc(piecesJointes.ajouteeLe));
}

// Une pièce jointe, avec son chemin dans le stockage, pour l'ouvrir côté serveur. La pièce doit appartenir à cet
// engagement : on ne peut pas ouvrir la pièce d'un autre engagement en passant par un engagement autorisé.
// À n'appeler qu'après lireEngagement, qui contrôle l'accès.
export async function lirePieceJointe(engagementId: string, pieceId: string) {
  if (!UUID.test(pieceId)) return null;
  const [piece] = await db
    .select({ nomFichier: piecesJointes.nomFichier, chemin: piecesJointes.chemin })
    .from(piecesJointes)
    .where(and(eq(piecesJointes.id, pieceId), eq(piecesJointes.engagementId, engagementId)));
  return piece ?? null;
}
