import { pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const role = pgEnum("role", ["admin", "musicien"]);
export const instrument = pgEnum("instrument", ["piano", "violon"]);

// L'agent (admin) et les musiciens. Les programmateurs n'ont pas de compte.
export const utilisateurs = pgTable("utilisateurs", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  nom: text("nom").notNull(),
  role: role("role").notNull(),
  instrument: instrument("instrument"), // vide pour l'agent
  motDePasseHash: text("mot_de_passe_hash").notNull(),
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
