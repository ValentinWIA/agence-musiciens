"use server";

import { and, eq, gt, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { envoyerCourriel } from "@/lib/courriel";
import { invitations, utilisateurs } from "@/db/schema";
import { nouveauJeton } from "@/lib/jeton";
import { verifierAdmin } from "@/lib/session";

const DUREE_VALIDITE_JOURS = 7;

const schemaInvitation = z.object({
  nom: z.string().trim().min(1, { error: "Le nom est obligatoire." }),
  email: z.email({ error: "Adresse e-mail invalide." }),
  instrument: z.enum(["piano", "violon"], { error: "Choisissez un instrument." }),
});

export type EtatInvitation = {
  erreurs?: Partial<Record<"nom" | "email" | "instrument", string[]>>;
  message?: string;
  lien?: string;
  courrielEnvoye?: boolean;
};

export async function creerInvitation(
  _etat: EtatInvitation,
  formData: FormData,
): Promise<EtatInvitation> {
  const agent = await verifierAdmin("/invitations (envoi)");

  const donnees = schemaInvitation.safeParse(Object.fromEntries(formData));
  if (!donnees.success) {
    return { erreurs: z.flattenError(donnees.error).fieldErrors };
  }
  const email = donnees.data.email.toLowerCase();

  const compteExistant = await db.query.utilisateurs.findFirst({ where: eq(utilisateurs.email, email) });
  if (compteExistant) return { message: "Un compte existe déjà avec cette adresse." };

  const enAttente = await db.query.invitations.findFirst({
    where: and(eq(invitations.email, email), isNull(invitations.accepteeLe), gt(invitations.expireLe, new Date())),
  });
  if (enAttente) return { message: "Une invitation est déjà en attente pour cette adresse." };

  const { jeton, jetonHash } = nouveauJeton();
  await db.insert(invitations).values({
    email,
    nom: donnees.data.nom,
    instrument: donnees.data.instrument,
    jetonHash,
    expireLe: new Date(Date.now() + DUREE_VALIDITE_JOURS * 24 * 60 * 60 * 1000),
    creePar: agent.id,
  });

  refresh(); // la liste des invitations en attente se met à jour
  console.log(`Invitation créée : ${email} (${donnees.data.instrument}) par ${agent.nom}`);

  const h = await headers();
  const origine = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;
  const lien = `${origine}/invitation/${jeton}`;

  const courrielEnvoye = await envoyerCourriel({
    a: email,
    sujet: "Votre invitation à rejoindre l'agence",
    texte: `Bonjour ${donnees.data.nom},\n\n${agent.nom} vous invite à rejoindre l'agence.\nCréez votre compte en ouvrant ce lien (valable ${DUREE_VALIDITE_JOURS} jours) :\n${lien}\n`,
  });
  return { lien, courrielEnvoye };
}
