import { and, eq, isNotNull, lt, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { db } from "@/db";
import { demandesRecues, evenementsFlux, executions } from "@/db/schema";
import { appelerFlux } from "./appel-flux";
import { CONSIGNE, donneesDeLaNuit, lireAnalyse } from "./analyse-nuit";
import { alerterPanne, signalerSansCourriel } from "./envoi-alerte";
import { appelerModele, texteDe } from "./ia";
import { jourLocal } from "./calendrier";
import { bilanNuit, lireNuit, nuitsManquantes, prochaineNuit, type Compteurs, type EvenementLu } from "./flux";

// Import d'une nuit du flux : verrou, appel, lecture, écriture en un seul bloc. Ne lève jamais d'erreur.

export type ResultatImport =
  | { ok: true; nuitDu: string; compteurs: Compteurs; executionId: string; donnees: string }
  | { ok: false; nuitDu: string; erreur: string };

const VERROU_PERIME = sql`now() - interval '5 minutes'`;

// Drizzle enveloppe l'erreur de la base : on garde le message et le code d'origine, sans la requête ni ses valeurs.
function origine(e: unknown): { message: string; code?: string } {
  const cause = (e as { cause?: unknown })?.cause ?? e;
  return {
    message: cause instanceof Error ? cause.message : String(cause),
    code: (cause as { code?: string })?.code,
  };
}

export async function importerNuit(nuitDu: string, declencheur: "cron" | "bouton"): Promise<ResultatImport> {
  // Une fonction coupée en plein import laisserait le verrou pris : au-delà de 5 min, l'exécution est déclarée interrompue.
  const interrompues = await db
    .update(executions)
    .set({ etat: "en_echec", erreur: "interrompue (plus de 5 min)", finLe: new Date() })
    .where(and(eq(executions.etat, "en_cours"), lt(executions.debutLe, VERROU_PERIME)))
    .returning({ nuitDu: executions.nuitDu });
  for (const { nuitDu: nuit } of interrompues) {
    console.warn(`Import de la nuit du ${nuit} déclaré interrompu (plus de 5 min)`);
    await signalerSansCourriel(`Import de la nuit du ${nuit} interrompu (plus de 5 min)`);
  }

  let executionId: string;
  try {
    [{ id: executionId }] = await db.insert(executions).values({ nuitDu, declencheur }).returning({ id: executions.id });
  } catch (e) {
    const { code, message } = origine(e);
    // 23505 : l'index « une seule exécution en cours » refuse la ligne.
    if (code === "23505") {
      console.warn(`Import de la nuit du ${nuitDu} (${declencheur}) refusé : un import est déjà en cours`);
      return { ok: false, nuitDu, erreur: "Un import est déjà en cours." };
    }
    console.error(`Import de la nuit du ${nuitDu} : exécution impossible à créer (${message})`);
    await signalerSansCourriel(`Import de la nuit du ${nuitDu} (${declencheur}) : la base ne répond pas (${message})`);
    return { ok: false, nuitDu, erreur: "La base ne répond pas." };
  }

  let appels = 0;
  const echouer = async (erreur: string): Promise<ResultatImport> => {
    console.warn(`Import de la nuit du ${nuitDu} (${declencheur}) en échec : ${erreur}`);
    // Avant de libérer le verrou : un second import ne peut pas alerter en même temps.
    const alerteLe = await alerterPanne({ executionId, nuitDu, erreur, declencheur });
    await db
      .update(executions)
      .set({ etat: "en_echec", erreur, appels, finLe: new Date(), alerteLe })
      .where(eq(executions.id, executionId))
      .catch(() => {}); // si la base ne répond plus, le verrou sera libéré au bout de 5 min
    return { ok: false, nuitDu, erreur };
  };

  try {
    const cle = process.env.FLUX_DE_NUIT_CLE;
    if (!cle) return await echouer("clé du flux absente (FLUX_DE_NUIT_CLE)");

    const appel = await appelerFlux(nuitDu, cle);
    appels = appel.appels;
    if (!appel.ok) return await echouer(`flux : ${appel.erreur}`);

    const [ids, references] = await Promise.all([
      db.select({ id: evenementsFlux.fluxId }).from(evenementsFlux).where(isNotNull(evenementsFlux.fluxId)),
      db.select({ reference: demandesRecues.reference }).from(demandesRecues),
    ]);
    const idsEnBase = new Set(ids.map((l) => l.id!));
    const nuit = lireNuit(appel.reponse, { ids: idsEnBase, references: new Set(references.map((l) => l.reference)) });
    if (!nuit.ok) return await echouer(nuit.raison);
    if (nuit.nuitDu !== nuitDu) return await echouer(`le flux a rendu la nuit du ${nuit.nuitDu}`);

    const { aEcrire, compteurs } = bilanNuit(nuit.evenements, idsEnBase);
    // Tout ou rien : les événements, leurs effets sur les demandes, puis l'exécution réussie (qui libère le verrou).
    const requetes: BatchItem<"pg">[] = [
      ...(aEcrire.length ? [db.insert(evenementsFlux).values(aEcrire.map((e) => versLigne(e, executionId)))] : []),
      ...aEcrire.flatMap(effetSurLesDemandes),
      db
        .update(executions)
        .set({ etat: "reussie", appels, ...compteurs, finLe: new Date() })
        .where(eq(executions.id, executionId)),
    ];
    await db.batch(requetes as [BatchItem<"pg">, ...BatchItem<"pg">[]]);

    console.log(
      `Import de la nuit du ${nuitDu} (${declencheur}) : ${compteurs.recus} reçus, ${compteurs.traites} traités, ` +
        `${compteurs.doublons} doublons, ${compteurs.misDeCote} mis de côté, ${appels} appel(s)`,
    );
    return { ok: true, nuitDu, compteurs, executionId, donnees: donneesDeLaNuit(nuitDu, compteurs, aEcrire) };
  } catch (e) {
    return await echouer(`écriture en base : ${origine(e).message}`);
  }
}

const ETATS = { "a-traiter": "traite", doublon: "doublon", "mis-de-cote": "mis_de_cote" } as const;

function versLigne(e: EvenementLu, executionId: string): typeof evenementsFlux.$inferInsert {
  const brut = e.brut as { type?: unknown; donnees?: { reference?: unknown } } | null;
  return {
    fluxId: e.id,
    executionId,
    type: typeof brut?.type === "string" ? brut.type : null,
    reference: typeof brut?.donnees?.reference === "string" ? brut.donnees.reference : null,
    horodatage: e.horodatage,
    brut: e.brut ?? null,
    etat: ETATS[e.etat],
    raison: e.etat === "mis-de-cote" ? e.raison : e.etat === "doublon" ? "référence déjà reçue" : null,
  };
}

// Un message ne change rien : il est lu dans evenements_flux. Le flux ne touche jamais un engagement.
function effetSurLesDemandes(e: EvenementLu): BatchItem<"pg">[] {
  if (e.etat !== "a-traiter") return [];
  const effet = e.effet;
  if (effet.type === "creation") {
    return [
      db.insert(demandesRecues).values({
        reference: effet.reference,
        statut: effet.statut,
        programmateur: effet.programmateur,
        lieu: effet.lieu,
        dateConcert: effet.date,
        dureeMinutes: effet.dureeMinutes,
        categorie: effet.categorie,
        recueLe: effet.recueLe,
      }),
    ];
  }
  if (effet.type === "changement-statut") {
    return [
      db
        .update(demandesRecues)
        .set({ statut: effet.statut, commentaire: effet.commentaire })
        .where(eq(demandesRecues.reference, effet.reference)),
    ];
  }
  return [];
}

// Appelée après l'import, une fois la nuit écrite : une panne de l'IA ne peut pas faire échouer l'import.
// Ne lève jamais d'erreur ; le texte ou la raison de l'échec est gardé sur l'exécution.
export async function analyserNuit({ executionId, nuitDu, donnees }: { executionId: string; nuitDu: string; donnees: string }) {
  try {
    const resultat = await appelerModele("analyse", null, {
      max_tokens: 600,
      system: CONSIGNE,
      messages: [{ role: "user", content: donnees }],
    });
    const lue = resultat.ok ? lireAnalyse(texteDe(resultat.reponse)) : resultat;
    await db
      .update(executions)
      .set(lue.ok ? { analyse: lue.analyse, analyseErreur: null } : { analyse: null, analyseErreur: lue.erreur })
      .where(eq(executions.id, executionId));
    if (lue.ok) console.log(`Analyse de la nuit du ${nuitDu} enregistrée`);
    else console.warn(`Analyse de la nuit du ${nuitDu} non faite : ${lue.erreur}`);
  } catch (e) {
    console.warn(`Analyse de la nuit du ${nuitDu} non enregistrée : ${origine(e).message}`);
  }
}

async function nuitsReussies(): Promise<Set<string>> {
  const reussies = await db
    .selectDistinct({ nuitDu: executions.nuitDu })
    .from(executions)
    .where(eq(executions.etat, "reussie"));
  return new Set(reussies.map((l) => l.nuitDu));
}

// Nuit proposée dans le formulaire : le premier trou depuis le 20/09, sinon la nuit qui vient de finir.
export async function nuitAProposer(): Promise<string> {
  return prochaineNuit(await nuitsReussies(), jourLocal(new Date(), "France"));
}

export type ResultatRattrapage = {
  importees: string[];
  restantes: number;
  echec?: { nuitDu: string; erreur: string };
};

// Une fonction Hobby est coupée à 300 s ; une nuit coûte au pire ~40 s (3 essais de 10 s, attentes, écriture),
// et l'analyse de la dernière nuit jusqu'à ~120 s (60 s, un nouvel essai) : 150 + 40 + 120 < 300.
const BUDGET_MS = 150_000;

// Rattrapage : les nuits manquantes une à une, de la plus ancienne à celle du matin. S'arrête à la première nuit en
// échec (flux en panne, import déjà en cours) ou à la fin du budget ; le passage suivant reprend où celui-ci s'arrête.
export async function rattraper(declencheur: "cron" | "bouton"): Promise<ResultatRattrapage> {
  const debut = Date.now();
  const nuits = nuitsManquantes(await nuitsReussies(), jourLocal(new Date(), "France"));
  const importees: string[] = [];
  let echec: ResultatRattrapage["echec"];
  let derniere: Extract<ResultatImport, { ok: true }> | undefined;
  for (const nuitDu of nuits) {
    if (Date.now() - debut > BUDGET_MS) break;
    const resultat = await importerNuit(nuitDu, declencheur);
    if (!resultat.ok) {
      echec = { nuitDu, erreur: resultat.erreur };
      break;
    }
    importees.push(nuitDu);
    derniere = resultat;
  }
  const restantes = nuits.length - importees.length;
  console.log(
    `Rattrapage (${declencheur}) : ${importees.length} nuit(s) importée(s), ${restantes} restante(s)` +
      (echec ? `, arrêté sur la nuit du ${echec.nuitDu}` : ""),
  );
  // Une seule analyse par passage (la dernière nuit) : rattraper 28 nuits ne coûte pas 28 appels.
  if (derniere) await analyserNuit(derniere);
  return { importees, restantes, echec };
}
