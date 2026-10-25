import { sql } from "drizzle-orm";
import { boolean, date, doublePrecision, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid, vector } from "drizzle-orm/pg-core";

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
export const porteAgent = pgEnum("porte_agent", ["page", "mcp"]);
// = ETATS_AGENT (src/lib/agent-regles.ts)
export const etatAgent = pgEnum("etat_agent", ["en_cours", "terminee", "arretee_tours", "arretee_budget", "arretee_duree", "en_echec"]);
// = ETATS_PROPOSITION (src/lib/propositions.ts)
export const etatProposition = pgEnum("etat_proposition", ["en_attente", "envoi_en_cours", "envoyee", "non_envoyee", "refusee"]);

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
  // Facultative (décidé le 18/10) : un programmateur venu du flux n'a souvent que son nom.
  structure: text("structure"),
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
  // Échéance de l'option, saisie quand l'agent la pose : le récap du matin signale celles qui arrivent.
  optionExpireLe: date("option_expire_le"),
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
  alerteLe: timestamp("alerte_le", { withTimezone: true }), // courriel d'alerte parti (une seule alerte par panne)
  // Analyse par l'IA, faite pour la dernière nuit de chaque passage seulement ; sinon, pourquoi elle manque.
  analyse: text("analyse"),
  analyseErreur: text("analyse_erreur"),
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
  ecarteeLe: timestamp("ecartee_le", { withTimezone: true }), // l'agent n'y donne pas suite ; vide = à traiter
});

// Un récap du matin par jour (jour de Paris). La ligne est écrite avant l'envoi : un second passage le même jour
// (cron et clic) ne renvoie rien. Envoi en échec → ligne retirée, pour pouvoir réessayer.
export const recaps = pgTable("recaps", {
  jour: date("jour").primaryKey(),
  creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
  envoyeLe: timestamp("envoye_le", { withTimezone: true }), // vide tant que l'envoi est en cours
  destinataire: text("destinataire"),
});

// Chaque appel à l'IA, réussi ou non : sert aux limites (par jour, par mois) et à la page des coûts.
// Jamais le texte envoyé ni la réponse : seulement ce qui se compte.
export const appelsIa = pgTable("appels_ia", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Vide pour un appel sans utilisateur (analyse de la nuit par le cron).
  utilisateurId: uuid("utilisateur_id").references(() => utilisateurs.id, { onDelete: "set null" }),
  fonction: text("fonction").notNull(),
  modele: text("modele").notNull(),
  jetonsEntree: integer("jetons_entree").notNull(),
  jetonsSortie: integer("jetons_sortie").notNull(),
  cout: integer("cout").notNull(), // en millionièmes de dollar (src/lib/couts-ia.ts)
  dureeMs: integer("duree_ms").notNull(),
  reussi: boolean("reussi").notNull(),
  creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
});

// Un courrier lu par l'IA puis relu et validé par l'agent (docs/semaine-3.md, I2). Champs vides = absents du courrier.
export const courriers = pgTable("courriers", {
  id: uuid("id").primaryKey().defaultRandom(),
  texte: text("texte").notNull(), // gardé pour le brouillon de réponse
  structure: text("structure"),
  signataire: text("signataire"),
  dateCourrier: date("date_courrier"),
  reference: text("reference"),
  montant: integer("montant"), // en centimes d'euro
  typeDossier: text("type_dossier"),
  classement: text("classement").notNull(), // = CLASSEMENTS (src/lib/courrier.ts)
  resume: text("resume"), // une phrase, proposée par l'IA puis relue par l'agent
  modele: text("modele").notNull(), // le modèle qui l'a lu
  creePar: uuid("cree_par").references(() => utilisateurs.id, { onDelete: "set null" }),
  creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
});

// Une page des documents du flux et son embedding (docs/semaine-3.md, I4). Jamais vidée par le jeu de données :
// l'empreinte évite de recalculer une page dont le texte n'a pas changé.
export const passages = pgTable(
  "passages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: text("document_id").notNull(),
    titre: text("titre").notNull(),
    page: integer("page").notNull(), // à partir de 1
    texte: text("texte").notNull(),
    empreinte: text("empreinte").notNull(), // SHA-256 du titre et du texte
    vecteur: vector("vecteur", { dimensions: 1024 }).notNull(), // voyage-4
    indexeLe: timestamp("indexe_le", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("passages_document_page").on(t.documentId, t.page)],
);

// Une demande faite à l'agent et son journal (docs/semaine-4.md, section 7). Jamais vidée par le jeu de données :
// c'est le journal qu'on relit après les scénarios et qu'on montre à la démo.
export const executionsAgent = pgTable("executions_agent", {
  id: uuid("id").primaryKey().defaultRandom(),
  utilisateurId: uuid("utilisateur_id").references(() => utilisateurs.id, { onDelete: "set null" }),
  porte: porteAgent("porte").notNull(),
  demande: text("demande").notNull(),
  etat: etatAgent("etat").notNull().default("en_cours"),
  debutLe: timestamp("debut_le", { withTimezone: true }).notNull().defaultNow(),
  finLe: timestamp("fin_le", { withTimezone: true }),
  tours: integer("tours"),
  cout: integer("cout"), // en millionièmes de dollar, estimé par le SDK
  reponse: text("reponse"),
  erreur: text("erreur"),
  // Chaque appel d'outil : son nom, ce qu'on lui a demandé, un résumé de ce qu'il a renvoyé (ou son refus).
  etapes: jsonb("etapes").$type<{ outil: string; entree: unknown; sortie: string }[]>().notNull().default([]),
}, (t) => [
  // Verrou : une seule exécution de l'agent à la fois (deux demandes ne travaillent jamais sur le même dossier).
  uniqueIndex("un_seul_agent_en_cours").on(t.etat).where(sql`${t.etat} = 'en_cours'`),
]);

// Un courriel préparé par l'assistant, qui attend la décision de l'agente sur /validations (docs/semaine-4.md,
// section 6). L'assistant ne sait qu'écrire cette ligne : seul « Envoyer » fait partir le courriel.
export const propositions = pgTable("propositions", {
  id: uuid("id").primaryKey().defaultRandom(),
  executionId: uuid("execution_id").references(() => executionsAgent.id, { onDelete: "set null" }),
  // Engagement supprimé (rechargement du jeu de données) : la proposition et sa décision restent.
  engagementId: uuid("engagement_id").references(() => engagements.id, { onDelete: "set null" }),
  objet: text("objet").notNull(), // ce que la relance concerne, recopié : « Option — Récital, Salle Pleyel, 14 mars 2027 »
  destinataire: text("destinataire").notNull(), // l'e-mail du programmateur, lu en base (jamais écrit par le modèle)
  destinataireNom: text("destinataire_nom").notNull(),
  sujet: text("sujet").notNull(),
  texte: text("texte").notNull(), // celui qui part : modifié par l'agente s'il l'a corrigé
  etat: etatProposition("etat").notNull().default("en_attente"),
  erreur: text("erreur"), // dernier échec d'envoi
  creeLe: timestamp("cree_le", { withTimezone: true }).notNull().defaultNow(),
  decideLe: timestamp("decide_le", { withTimezone: true }),
  decidePar: uuid("decide_par").references(() => utilisateurs.id, { onDelete: "set null" }),
});
