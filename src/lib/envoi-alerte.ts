import * as Sentry from "@sentry/nextjs";
import { desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { executions, utilisateurs } from "@/db/schema";
import { alerteDue, composerAlerte } from "./alerte";
import { envoyerCourriel } from "./courriel";
import { origineDuSite } from "./origine";

// Alerte de panne (docs/flux-de-nuit.md, section 16) : courriel à l'agent et erreur Sentry, une seule fois par panne.
// Appelée pendant que l'exécution en échec tient encore le verrou : deux imports ne peuvent pas alerter ensemble.
// Renvoie la date de l'alerte si le courriel est parti (à poser dans executions.alerte_le), sinon null.
export async function alerterPanne({
  executionId,
  nuitDu,
  erreur,
  declencheur,
}: {
  executionId: string;
  nuitDu: string;
  erreur: string;
  declencheur: "cron" | "bouton";
}): Promise<Date | null> {
  try {
    const historique = await db
      .select({ etat: executions.etat, alerteLe: executions.alerteLe })
      .from(executions)
      .where(ne(executions.id, executionId))
      .orderBy(desc(executions.debutLe));
    if (!alerteDue(historique)) {
      console.log(`Panne du flux déjà signalée : pas de nouvelle alerte pour la nuit du ${nuitDu}`);
      return null;
    }

    signalerASentry(`Import de la nuit du ${nuitDu} (${declencheur}) en échec : ${erreur}`);
    const [agent] = await db
      .select({ email: utilisateurs.email, nom: utilisateurs.nom })
      .from(utilisateurs)
      .where(eq(utilisateurs.role, "admin"))
      .limit(1);
    const { sujet, texte } = composerAlerte({ nuitDu, erreur, declencheur, nomAgent: agent?.nom ?? "", lienSite: origineDuSite() });
    const partie = agent ? await envoyerCourriel({ a: agent.email, sujet, texte }) : false;
    await Sentry.flush(5000); // sur Vercel, la fonction peut être figée dès la réponse
    console.warn(`Alerte de panne pour la nuit du ${nuitDu} : courriel ${partie ? "envoyé à l'agent" : "non parti"}`);
    return partie ? new Date() : null;
  } catch (e) {
    // La base ne répond plus : impossible de savoir si la panne est déjà signalée, Sentry seul.
    signalerASentry(`Import de la nuit du ${nuitDu} (${declencheur}) en échec : ${erreur} ; alerte impossible (${e instanceof Error ? e.message : String(e)})`);
    await Sentry.flush(5000);
    return null;
  }
}

// Pannes signalées à Sentry seul, sans courriel (docs/flux-de-nuit.md, section 16, cas limites).
export async function signalerSansCourriel(message: string) {
  signalerASentry(message);
  await Sentry.flush(5000);
}

function signalerASentry(message: string) {
  Sentry.captureException(new Error(message));
}
