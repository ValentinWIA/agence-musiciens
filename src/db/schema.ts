import { sql } from "drizzle-orm";
import { date, doublePrecision, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const role = pgEnum("role", ["admin", "musicien"]);
export const instrument = pgEnum("instrument", ["piano", "violon"]);
export const statut = pgEnum("statut", ["demande", "option", "contrat_envoye", "confirme", "joue", "facture", "paye", "annule"]);
export const devise = pgEnum("devise", ["EUR", "CHF", "USD", "GBP", "JPY"]);
export const precisionDate = pgEnum("precision_date", ["jour", "mois", "saison"]);
export const typePiece = pgEnum("type_piece", ["contrat", "fiche_technique", "autre"]); // = TYPES_PIECE
export const statutDemande = pgEnum("statut_demande", ["demandee", "confirmee", "terminee", "annulee"]); // = STATUTS_DEMANDE
export const declencheur = pgEnum("declencheur", ["cron", "bouton"]);
export const etatExecution = pgEnum("etat_execution", ["en_cours", "reussie", "en_echec"]);
export const etatEvenement = pgEnum("etat_evenement", ["traite", "doublon", "mis_de_cote"]);

// L'agent (admin) et les musiciens. Les programmateurs n'ont pas de compte.
export const utilisateurs = pgTable("utilisateurs", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  nom: text("nom").notNull(),
  role: role("role").notNull(),
  instrument: instrument("instrument"), // vide pour l'agent
  motDePasseHash: text("mot_de_passe_hash").notNull(),
  // Fiche du musicien, vide pour l'agent. Le répertoire : une œuvre par ligne.
  biographie: text("biographie"),
  repertoire: text("repertoire"),
  photoChemin: text("photo_chemin"), // chemin dans le stockage privé : jamais envoyé au navigateur
  notesAgent: text("notes_agent"), // lues et écrites par l'agent seulement : jamais lues pour un musicien
  creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
});

// Un musicien invité par l'agent. Le compte n'est créé qu'à l'acceptation.
export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  nom: text("nom").notNull(),
  instrument: instrument("instrument").notNull(),
  jetonHash: text("jeton_hash").notNull().unique(), // le jeton lui-même n'est jamais stocké
  expireLe: timestamp("expire_le", { withTimezone: true }).notNull(),
  accepteeLe: timestamp("acceptee_le", { withTimezone: true }),
  creePar: uuid("cree_par")
    .notNull()
    .references(() => utilisateurs.id),
  creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
});

// Demande de nouveau mot de passe : lien à usage unique, valable une heure.
export const reinitialisations = pgTable("reinitialisations", {
  id: uuid("id").primaryKey().defaultRandom(),
  utilisateurId: uuid("utilisateur_id")
    .notNull()
    .references(() => utilisateurs.id),
  jetonHash: text("jeton_hash").notNull().unique(),
  expireLe: timestamp("expire_le", { withTimezone: true }).notNull(),
  utiliseeLe: timestamp("utilisee_le", { withTimezone: true }),
  creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
});

// Salles et festivals. Coordonnées obligatoires : la règle de conflit calcule les distances.
export const lieux = pgTable("lieux", {
  id: uuid("id").primaryKey().defaultRandom(),
  nom: text("nom").notNull(),
  adresse: text("adresse").notNull(),
  ville: text("ville").notNull(),
  pays: text("pays").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
});

// Contacts des salles et festivals : ils n'ont pas de compte.
export const programmateurs = pgTable("programmateurs", {
  id: uuid("id").primaryKey().defaultRandom(),
  nom: text("nom").notNull(),
  structure: text("structure").notNull(),
  email: text("email").notNull(),
  telephone: text("telephone"),
});

// L'objet principal : un concert proposé par un programmateur (voir docs/engagements.md).
export const engagements = pgTable("engagements", {
  id: uuid("id").primaryKey().defaultRandom(),
  titre: text("titre"),
  // Date précise, ou premier jour du mois / de la saison quand la date est approximative.
  debut: timestamp("debut", { withTimezone: true }).notNull(),
  precisionDate: precisionDate("precision_date").notNull().default("jour"),
  dureeMinutes: integer("duree_minutes"),
  lieuId: uuid("lieu_id")
    .notNull()
    .references(() => lieux.id),
  programmateurId: uuid("programmateur_id")
    .notNull()
    .references(() => programmateurs.id),
  statut: statut("statut").notNull().default("demande"),
  // Retenu à l'annulation, pour pouvoir rétablir un engagement annulé par erreur.
  statutAvantAnnulation: statut("statut_avant_annulation"),
  // Dans la plus petite unité de la devise (centimes, ou yens) : jamais de nombre à virgule pour de l'argent.
  cachet: integer("cachet"),
  devise: devise("devise").notNull().default("EUR"),
  programme: text("programme"),
  notes: text("notes"),
  // Écrite par l'agent quand il confirme malgré un conflit d'agenda (docs/engagements.md, section 11).
  raisonConflit: text("raison_conflit"),
  creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
  modifieLe: timestamp("modifie_le", { withTimezone: true }).notNull().defaultNow(),
});

// Les musiciens d'un engagement (un ou deux).
export const engagementMusiciens = pgTable(
  "engagement_musiciens",
  {
    engagementId: uuid("engagement_id")
      .notNull()
      .references(() => engagements.id, { onDelete: "cascade" }),
    musicienId: uuid("musicien_id")
      .notNull()
      .references(() => utilisateurs.id),
  },
  (t) => [primaryKey({ columns: [t.engagementId, t.musicienId] })],
);

// Fichiers joints à un engagement (PDF). Le fichier vit dans le stockage Vercel Blob privé ; ici, sa trace.
export const piecesJointes = pgTable("pieces_jointes", {
  id: uuid("id").primaryKey().defaultRandom(),
  engagementId: uuid("engagement_id")
    .notNull()
    .references(() => engagements.id, { onDelete: "cascade" }),
  type: typePiece("type").notNull(),
  nomFichier: text("nom_fichier").notNull(),
  taille: integer("taille").notNull(), // en octets
  chemin: text("chemin").notNull().unique(), // chemin dans le stockage : jamais envoyé au navigateur
  ajouteePar: uuid("ajoutee_par")
    .notNull()
    .references(() => utilisateurs.id),
  ajouteeLe: timestamp("ajoutee_le", { withTimezone: true }).notNull().defaultNow(),
});

// Flux de nuit (docs/flux-de-nuit.md). Ce qui vient du flux est une donnée : rien ici n'est exécuté.

// Un passage de l'import, pour une nuit. Écrit au départ (en cours), complété à la fin.
export const executions = pgTable("executions", {
  id: uuid("id").primaryKey().defaultRandom(),
  nuitDu: date("nuit_du").notNull(),
  declencheur: declencheur("declencheur").notNull(),
  etat: etatExecution("etat").notNull().default("en_cours"),
  debutLe: timestamp("debut_le", { withTimezone: true }).notNull().defaultNow(),
  finLe: timestamp("fin_le", { withTimezone: true }),
  appels: integer("appels").notNull().default(0), // appels au flux, essais compris
  recus: integer("recus").notNull().default(0),
  doublons: integer("doublons").notNull().default(0),
  traites: integer("traites").notNull().default(0),
  misDeCote: integer("mis_de_cote").notNull().default(0),
  erreur: text("erreur"), // message de la panne, si l'exécution a échoué
}, (t) => [
  // Verrou : une seule exécution en cours. Un second import simultané (cron + bouton) est refusé par la base.
  uniqueIndex("une_seule_execution_en_cours").on(t.etat).where(sql`${t.etat} = 'en_cours'`),
]);

// Chaque événement reçu, gardé tel quel. Un id du flux déjà présent n'est pas retraité : une copie portant le même id
// n'est que comptée (executions.doublons). Les messages se lisent ici, par leur référence.
export const evenementsFlux = pgTable("evenements_flux", {
  id: uuid("id").primaryKey().defaultRandom(),
  fluxId: text("flux_id").unique(), // vide si l'événement était illisible au point de ne pas en avoir
  executionId: uuid("execution_id")
    .notNull()
    .references(() => executions.id),
  type: text("type"), // tel que reçu, même inconnu
  reference: text("reference"),
  horodatage: timestamp("horodatage", { withTimezone: true }),
  brut: jsonb("brut").notNull(),
  etat: etatEvenement("etat").notNull(),
  raison: text("raison"), // pourquoi il a été mis de côté
});

// Une réservation du flux, dans notre vocabulaire. L'agent en fait un engagement s'il le veut ; le flux ne touche
// jamais l'engagement.
export const demandesRecues = pgTable("demandes_recues", {
  id: uuid("id").primaryKey().defaultRandom(),
  reference: text("reference").notNull().unique(),
  statut: statutDemande("statut").notNull(),
  programmateur: text("programmateur").notNull(), // nom seulement : le flux ne donne ni structure ni e-mail
  lieu: text("lieu").notNull(), // nom seulement
  dateConcert: date("date_concert").notNull(), // sans heure
  dureeMinutes: integer("duree_minutes").notNull(),
  categorie: text("categorie").notNull(),
  recueLe: date("recue_le").notNull(),
  commentaire: text("commentaire"), // le dernier reçu avec un changement de statut
  // Si l'engagement est supprimé, la demande reste.
  engagementId: uuid("engagement_id").references(() => engagements.id, { onDelete: "set null" }),
});
