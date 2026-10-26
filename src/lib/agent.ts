import "server-only";
import path from "node:path";
import { createSdkMcpServer, query } from "@anthropic-ai/claude-agent-sdk";
import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { appelsIa, executionsAgent, utilisateurs } from "@/db/schema";
import { outilsDeLAgent, type Etape, type Utilisateur } from "./agent-outils";
import {
  avecPageOuverte,
  CONSIGNE,
  dollarsEnMillioniemes,
  etatFinal,
  MAX_DOLLARS,
  MAX_SECONDES,
  MAX_TOURS,
  VERROU_PERIME_MINUTES,
  type EtatAgent,
  type PageOuverte,
} from "./agent-regles";
import { MODELE_PAR_FONCTION, verifierLimites } from "./ia";

// Le moteur de l'agent (docs/semaine-4.md, sections 2 à 8) : limites, verrou, SDK d'agents, journal, coût.
// Le même pour la page /assistant et pour le serveur MCP. Ne lève jamais d'erreur.

export type ResultatAgent =
  | { ok: true; executionId: string; etat: EtatAgent; reponse: string | null; erreur: string | null; tours: number; cout: number; dureeMs: number }
  | { ok: false; erreur: string };

const SERVEUR = "agence"; // les outils s'appellent mcp__agence__<nom> pour le SDK

export async function executerAgent(
  utilisateur: Utilisateur,
  porte: "page" | "mcp",
  demande: string,
  surEtape?: (etape: Etape) => void,
  page: PageOuverte | null = null, // bulle de chaque page seulement
): Promise<ResultatAgent> {
  if (utilisateur.role !== "admin") {
    console.warn(`Accès refusé : ${utilisateur.nom} (musicien) sur l'agent`);
    return { ok: false, erreur: "Réservé à l'agent." };
  }
  const limite = await verifierLimites(utilisateur.id);
  if (limite) {
    console.warn(`Agent refusé pour ${utilisateur.nom} : ${limite}`);
    return { ok: false, erreur: limite };
  }

  // Une fonction coupée en pleine exécution laisserait le verrou pris : au-delà de 3 min, elle est déclarée en échec.
  await db
    .update(executionsAgent)
    .set({ etat: "en_echec", erreur: `interrompue (plus de ${VERROU_PERIME_MINUTES} min)`, finLe: new Date() })
    .where(and(eq(executionsAgent.etat, "en_cours"), lt(executionsAgent.debutLe, sql`now() - make_interval(mins => ${VERROU_PERIME_MINUTES})`)));

  let executionId: string;
  try {
    [{ id: executionId }] = await db
      .insert(executionsAgent)
      // Au journal, la demande et la page qui l'accompagnait : ce que le modèle a reçu se relit.
      .values({ utilisateurId: utilisateur.id, porte, demande: page ? `${demande}\n(page ouverte : ${page.chemin})` : demande })
      .returning({ id: executionsAgent.id });
  } catch (e) {
    // 23505 : l'index « un seul agent en cours » refuse la ligne.
    if ((e as { cause?: { code?: string } })?.cause?.code === "23505") {
      console.warn(`Agent (${porte}) refusé pour ${utilisateur.nom} : une exécution est déjà en cours`);
      return { ok: false, erreur: "L'assistant est déjà occupé par une autre demande. Réessayez dans une minute." };
    }
    console.error(`Agent : exécution impossible à créer (${e instanceof Error ? e.message : e})`);
    return { ok: false, erreur: "La base ne répond pas." };
  }

  const journal: Etape[] = [];
  const nomMusicien =
    page?.type === "musicien"
      ? ((await db.select({ nom: utilisateurs.nom }).from(utilisateurs).where(eq(utilisateurs.id, page.id)).catch(() => []))[0]?.nom ?? null)
      : null;
  const modele = MODELE_PAR_FONCTION.agent;
  const outils = outilsDeLAgent(utilisateur, demande, executionId, journal, surEtape);
  const debut = Date.now();
  const arret = new AbortController();
  let coupeeParLaDuree = false;
  const minuterie = setTimeout(() => {
    coupeeParLaDuree = true;
    arret.abort();
  }, MAX_SECONDES * 1000);

  let subtype: string | null = null;
  let reponse: string | null = null;
  let erreur: string | null = null;
  let tours = 0;
  let dollars = 0;
  let jetonsEntree = 0;
  let jetonsSortie = 0;
  try {
    for await (const message of query({
      prompt: avecPageOuverte(demande, page, nomMusicien),
      options: {
        model: modele,
        systemPrompt: CONSIGNE,
        tools: [], // aucun outil intégré de Claude Code (fichiers, terminal, web) : seulement les nôtres
        mcpServers: { [SERVEUR]: createSdkMcpServer({ name: SERVEUR, tools: outils }) },
        allowedTools: outils.map((o) => `mcp__${SERVEUR}__${o.name}`),
        maxTurns: MAX_TOURS,
        maxBudgetUsd: MAX_DOLLARS,
        abortController: arret,
        settingSources: [],
        persistSession: false,
        // Sur Vercel, seul /tmp est inscriptible ; le programme du SDK y range ses fichiers de travail.
        cwd: "/tmp",
        env: { ...process.env, HOME: "/tmp", CLAUDE_CONFIG_DIR: "/tmp/claude", CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1" },
        // Sur Vercel (Linux), le programme emporté par next.config.ts ; en local, le SDK le trouve seul.
        pathToClaudeCodeExecutable: process.env.VERCEL
          ? path.join(process.cwd(), "node_modules/@anthropic-ai/claude-agent-sdk-linux-x64/claude")
          : undefined,
      },
    })) {
      if (message.type !== "result") continue;
      subtype = message.subtype;
      tours = message.num_turns;
      dollars = message.total_cost_usd;
      for (const u of Object.values(message.modelUsage)) {
        jetonsEntree += u.inputTokens + u.cacheReadInputTokens + u.cacheCreationInputTokens;
        jetonsSortie += u.outputTokens;
      }
      if (message.subtype === "success") reponse = message.result;
      else erreur = message.errors.join(" ; ") || message.subtype;
    }
  } catch (e) {
    // Le SDK lève une erreur après un résultat en échec (tours, budget) : le résultat lu ci-dessus fait foi.
    if (!subtype) erreur = coupeeParLaDuree ? `coupée après ${MAX_SECONDES} s` : e instanceof Error ? e.message : String(e);
  } finally {
    clearTimeout(minuterie);
  }

  const etat = etatFinal(subtype, coupeeParLaDuree);
  const cout = dollarsEnMillioniemes(dollars);
  const dureeMs = Date.now() - debut;
  try {
    await db.batch([
      db
        .update(executionsAgent)
        .set({ etat, finLe: new Date(), tours, cout, reponse, erreur, etapes: journal })
        .where(eq(executionsAgent.id, executionId)),
      // Comptée avec les autres appels à l'IA : limites du jour, plafond du mois, page /couts.
      db.insert(appelsIa).values({ utilisateurId: utilisateur.id, fonction: "agent", modele, jetonsEntree, jetonsSortie, cout, dureeMs, reussi: etat === "terminee" }),
    ]);
  } catch (e) {
    // Le verrou sera libéré au bout de 3 min.
    console.error(`Agent : journal impossible à écrire (${e instanceof Error ? e.message : e})`);
  }
  console.log(
    `Agent (${porte}) pour ${utilisateur.nom} : ${etat}, ${tours} tours, ${journal.length} appels d'outils, ${dollars.toFixed(4)} $, ${dureeMs} ms`,
  );
  return { ok: true, executionId, etat, reponse, erreur, tours, cout, dureeMs };
}
