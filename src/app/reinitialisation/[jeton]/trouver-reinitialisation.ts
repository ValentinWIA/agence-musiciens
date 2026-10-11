import { eq } from "drizzle-orm";
import { db } from "@/db";
import { reinitialisations } from "@/db/schema";
import { empreinte } from "@/lib/jeton";

// Retrouve la demande d'un lien et dit si elle est encore utilisable.
export async function trouverReinitialisation(jeton: string) {
  const demande = await db.query.reinitialisations.findFirst({
    where: eq(reinitialisations.jetonHash, empreinte(jeton)),
  });
  if (!demande || demande.utiliseeLe || demande.expireLe < new Date()) return null;
  return demande;
}
