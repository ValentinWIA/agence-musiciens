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
