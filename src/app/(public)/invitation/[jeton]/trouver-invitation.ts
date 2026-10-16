import { eq } from "drizzle-orm";
import { db } from "@/db";
import { invitations } from "@/db/schema";
import { empreinte } from "@/lib/jeton";

// Retrouve l'invitation d'un lien et dit si elle est encore utilisable.
export async function trouverInvitation(jeton: string) {
  const invitation = await db.query.invitations.findFirst({
    where: eq(invitations.jetonHash, empreinte(jeton)),
  });
  if (!invitation) return { etat: "invalide" as const };
  if (invitation.accepteeLe) return { etat: "utilisee" as const };
  if (invitation.expireLe < new Date()) return { etat: "expiree" as const };
  return { etat: "valide" as const, invitation };
}
