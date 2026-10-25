import path from "node:path";
import { createSdkMcpServer, query, tool } from "@anthropic-ai/claude-agent-sdk";
import { auth } from "@/auth";
import { jourLocal } from "@/lib/calendrier";
import { lireEngagementsASuivre } from "@/lib/lecture-a-faire";
import { optionsQuiExpirent } from "@/lib/recap";

// Essai du SDK d'agents sur Vercel (docs/semaine-4.md, tranche A1) : un outil de lecture, une réponse.
// Provisoire : remplacé par la page /assistant en A3.
export const maxDuration = 150;

const optionsAExpirer = tool(
  "options_qui_expirent",
  "Liste les options dont l'échéance tombe dans les 7 jours ou est passée (même règle que le récap du matin).",
  {},
  async () => {
    const aSuivre = await lireEngagementsASuivre();
    const options = optionsQuiExpirent(
      aSuivre.filter((e) => e.statut === "option" && e.expireLe !== null).map((e) => ({ ...e, expireLe: e.expireLe! })),
      jourLocal(new Date(), "France"),
    ).map((e) => ({ id: e.id, titre: e.titre, salle: e.salle, ville: e.ville, expireLe: e.expireLe, musiciens: e.musiciens }));
    return { content: [{ type: "text", text: JSON.stringify(options) }] };
  },
  { annotations: { readOnlyHint: true } },
);

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    console.warn(`Accès refusé : ${session?.user?.nom ?? "visiteur non connecté"} sur /api/agent/essai`);
    return Response.json({ erreur: "Réservé à l'agent." }, { status: 403 });
  }

  const debut = Date.now();
  const arret = new AbortController();
  const minuterie = setTimeout(() => arret.abort(), 120_000);
  const etapes: string[] = [];
  try {
    for await (const message of query({
      prompt: "Quelles options faut-il relancer cette semaine ? Réponds en français, en une courte liste.",
      options: {
        model: "claude-haiku-5-5",
        systemPrompt: "Tu es l'assistant d'une agence de musiciens. Tu n'as que les outils fournis.",
        tools: [], // aucun outil intégré de Claude Code (fichiers, terminal…) : seulement les nôtres
        mcpServers: { agence: createSdkMcpServer({ name: "agence", tools: [optionsAExpirer] }) },
        allowedTools: ["mcp__agence__options_qui_expirent"],
        maxTurns: 3,
        maxBudgetUsd: 0.05,
        abortController: arret,
        settingSources: [],
        persistSession: false,
        // Sur Vercel, seul /tmp est inscriptible ; le programme du SDK y range ses fichiers de travail.
        cwd: "/tmp",
        env: { ...process.env, HOME: "/tmp", CLAUDE_CONFIG_DIR: "/tmp/claude", CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1" },
        // Sur Vercel (Linux), on désigne le programme emporté par next.config.ts ; en local, le SDK le trouve seul.
        pathToClaudeCodeExecutable: process.env.VERCEL
          ? path.join(process.cwd(), "node_modules/@anthropic-ai/claude-agent-sdk-linux-x64/claude")
          : undefined,
      },
    })) {
      if (message.type === "assistant") {
        for (const bloc of message.message.content) {
          if (bloc.type === "tool_use") etapes.push(`outil : ${bloc.name}`);
        }
      }
      if (message.type === "result") {
        const resultat = {
          etat: message.subtype,
          reponse: message.subtype === "success" ? message.result : null,
          etapes,
          tours: message.num_turns,
          coutDollars: message.total_cost_usd,
          dureeSecondes: Math.round((Date.now() - debut) / 1000),
        };
        console.log(`Essai de l'agent : ${resultat.etat}, ${resultat.tours} tours, ${resultat.coutDollars} $`);
        return Response.json(resultat);
      }
    }
    return Response.json({ erreur: "Aucun résultat reçu du SDK.", etapes }, { status: 500 });
  } catch (e) {
    const erreur = e instanceof Error ? e.message : String(e);
    console.error(`Essai de l'agent en échec : ${erreur}`);
    return Response.json({ erreur, etapes, dureeSecondes: Math.round((Date.now() - debut) / 1000) }, { status: 500 });
  } finally {
    clearTimeout(minuterie);
  }
}
