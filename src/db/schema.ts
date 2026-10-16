import { doublePrecision, integer, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const role = pgEnum("role", ["admin", "musicien"]);
export const instrument = pgEnum("instrument", ["piano", "violon"]);
export const statut = pgEnum("statut", ["demande", "option", "contrat_envoye", "confirme", "joue", "facture", "paye", "annule"]);
export const devise = pgEnum("devise", ["EUR", "CHF", "USD", "GBP", "JPY"]);
export const precisionDate = pgEnum("precision_date", ["jour", "mois", "saison"]);
export const typePiece = pgEnum("type_piece", ["contrat", "fiche_technique", "autre"]); // = TYPES_PIECE

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
