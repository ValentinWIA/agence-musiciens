import "server-only"; // la construction échoue si ce fichier est importé dans le code du navigateur
import Anthropic from "@anthropic-ai/sdk";
import * as Sentry from "@sentry/nextjs";
import { and, count, eq, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import { appelsIa } from "@/db/schema";
import { coutAppel, formaterDollars, PLAFOND_MENSUEL, refusAppel, type Modele } from "./couts-ia";

// Le seul endroit qui appelle Claude. Le modèle de chaque fonction s'écrit ici, une ligne par fonction.
export const MODELE_PAR_FONCTION = {
  test: "claude-haiku-5-5",
  courrier: "claude-haiku-5-5",
} as const satisfies Record<string, Modele>;
export type FonctionIa = keyof typeof MODELE_PAR_FONCTION;

export const MOIS_EN_COURS = sql`date_trunc('month', ${appelsIa.creeLe} at time zone 'Europe/Paris') = date_trunc('month', now() at time zone 'Europe/Paris')`;
const JOUR_EN_COURS = sql`(${appelsIa.creeLe} at time zone 'Europe/Paris')::date = (now() at time zone 'Europe/Paris')::date`;

export async function depenseDuMois(): Promise<number> {
  const [{ total }] = await db.select({ total: sum(appelsIa.cout) }).from(appelsIa).where(MOIS_EN_COURS);
  return Number(total ?? 0);
}

async function verifierLimites(utilisateurId: string | null): Promise<string | null> {
  const [depense, [{ appels }]] = await Promise.all([
    depenseDuMois(),
    db
      .select({ appels: count() })
      .from(appelsIa)
      .where(and(JOUR_EN_COURS, utilisateurId ? eq(appelsIa.utilisateurId, utilisateurId) : sql`${appelsIa.utilisateurId} is null`)),
  ]);
  const refus = refusAppel({ appelsDuJour: appels, depenseDuMois: depense });
  if (refus && depense >= PLAFOND_MENSUEL) {
    // Un seul problème dans Sentry (même message à chaque fois), donc un seul courriel à l'agent.
    Sentry.captureMessage(`Plafond IA atteint : ${formaterDollars(depense)} dépensés ce mois-ci`, "warning");
    await Sentry.flush(3000);
  }
  return refus;
}

export type ResultatIa = { ok: true; reponse: Anthropic.Message } | { ok: false; erreur: string };

// Vérifie les limites, appelle le modèle de la fonction, enregistre l'appel (même en échec) et le journalise.
export async function appelerModele(
  fonction: FonctionIa,
  utilisateurId: string | null,
  requete: Omit<Anthropic.MessageCreateParamsNonStreaming, "model">,
  modeleChoisi?: Modele, // provisoire : comparer Haiku et Opus sur les courriers (décision 1)
): Promise<ResultatIa> {
  const refus = await verifierLimites(utilisateurId);
  if (refus) {
    console.warn(`IA refusée (${fonction}) : ${refus}`);
    return { ok: false, erreur: refus };
  }

  const modele = modeleChoisi ?? MODELE_PAR_FONCTION[fonction];
  const debut = Date.now();
  let reponse: Anthropic.Message | null = null;
  let erreur: string | null = null;
  try {
    // Créé à chaque appel : sans clé, le constructeur échoue, et il ne doit pas faire échouer la construction du site.
    // 60 s au plus par essai, un seul nouvel essai : une fonction Vercel ne doit pas attendre des minutes.
    reponse = await new Anthropic({ timeout: 60_000, maxRetries: 1 }).messages.create({ ...requete, model: modele });
  } catch (e) {
    erreur = messageErreur(e);
  }

  const jetonsEntree = reponse?.usage.input_tokens ?? 0;
  const jetonsSortie = reponse?.usage.output_tokens ?? 0;
  const cout = coutAppel(modele, jetonsEntree, jetonsSortie);
  const dureeMs = Date.now() - debut;
  await db.insert(appelsIa).values({ utilisateurId, fonction, modele, jetonsEntree, jetonsSortie, cout, dureeMs, reussi: !erreur });

  if (erreur || !reponse) {
    console.warn(`IA en échec (${fonction}, ${modele}, ${dureeMs} ms) : ${erreur}`);
    return { ok: false, erreur: erreur ?? "réponse vide" };
  }
  console.log(`IA (${fonction}, ${modele}) : ${jetonsEntree} + ${jetonsSortie} jetons, ${formaterDollars(cout)}, ${dureeMs} ms`);
  return { ok: true, reponse };
}

function messageErreur(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return "clé de l'IA refusée (ANTHROPIC_API_KEY)";
  if (e instanceof Anthropic.RateLimitError) return "l'IA est surchargée : réessayez dans une minute";
  if (e instanceof Anthropic.APIConnectionError) return "l'IA n'a pas répondu à temps";
  if (e instanceof Anthropic.APIError) return `l'IA a répondu une erreur (${e.status ?? "sans code"})`;
  if (e instanceof Anthropic.AnthropicError) return "clé de l'IA absente (ANTHROPIC_API_KEY)";
  return "l'IA n'a pas répondu";
}

// Le texte de la réponse, blocs de texte mis bout à bout (la réflexion du modèle n'est pas montrée).
export function texteDe(reponse: Anthropic.Message): string {
  return reponse.content.map((bloc) => (bloc.type === "text" ? bloc.text : "")).join("").trim();
}
