import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Connexion mutualisée (pooler) : celle que l'application utilise à chaque requête.
export const db = drizzle(neon(process.env.DATABASE_URL!), { schema });
