import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  // Connexion directe (sans pooler) : nécessaire pour jouer les migrations.
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED! },
});
