import { count } from "drizzle-orm";
import { db } from "@/db";
import { utilisateurs } from "@/db/schema";

// Vrai tant qu'aucun compte n'existe : condition pour que l'installation soit possible.
export async function aucunCompte() {
  const [{ total }] = await db.select({ total: count() }).from(utilisateurs);
  return total === 0;
}
