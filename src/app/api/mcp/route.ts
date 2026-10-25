import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { executionsAgent, utilisateurs } from "@/db/schema";
import { outilsDeLAgent, type Etape } from "@/lib/agent-outils";
import { jetonValide } from "@/lib/jeton-mcp";

// Le produit vu comme un serveur MCP (docs/semaine-4.md, tranche A5) : Claude Code y trouve les outils de
// l'assistant, écrits une seule fois. Protégé par le jeton MCP_JETON ; on agit au nom du compte de l'agente.
// Sans session : chaque requête recrée le serveur, ce qui convient à une fonction Vercel.
export const maxDuration = 60;

export async function POST(requete: Request) {
  if (!jetonValide(requete.headers.get("authorization"), process.env.MCP_JETON)) {
    console.warn(
      `Accès refusé : serveur MCP sans jeton valable${process.env.MCP_JETON ? "" : " (MCP_JETON non défini)"} ` +
        `(${requete.headers.get("user-agent") ?? "client inconnu"})`,
    );
    return Response.json({ erreur: "Non autorisé." }, { status: 401 });
  }

  const [agente] = await db
    .select({ id: utilisateurs.id, nom: utilisateurs.nom, role: utilisateurs.role })
    .from(utilisateurs)
    .where(eq(utilisateurs.role, "admin"))
    .orderBy(asc(utilisateurs.creeLe))
    .limit(1);
  if (!agente) return Response.json({ erreur: "Aucun compte d'agent." }, { status: 503 });

  const journal: Etape[] = [];
  const serveur = new McpServer({ name: "cm-management", version: "1.0.0" });
  for (const outil of outilsDeLAgent(agente, null, null, journal)) {
    serveur.registerTool(outil.name, { description: outil.description, inputSchema: outil.inputSchema, annotations: outil.annotations }, outil.handler);
  }
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await serveur.connect(transport);
  try {
    return await transport.handleRequest(requete);
  } finally {
    await serveur.close();
    // Chaque appel d'outil par MCP s'inscrit au journal de l'assistant (porte « mcp ») ; rien n'est dépensé ici.
    for (const etape of journal) {
      await db
        .insert(executionsAgent)
        .values({ utilisateurId: agente.id, porte: "mcp", demande: `${etape.outil} ${JSON.stringify(etape.entree)}`, etat: "terminee", finLe: new Date(), tours: 0, cout: 0, etapes: [etape] })
        .catch((e) => console.error(`MCP : journal impossible à écrire (${e instanceof Error ? e.message : e})`));
    }
    if (journal.length) console.log(`MCP pour ${agente.nom} : ${journal.map((e) => e.outil).join(", ")}`);
  }
}

// Sans session, il n'y a ni flux à ouvrir (GET) ni session à fermer (DELETE).
export function GET() {
  return Response.json({ erreur: "Méthode non permise : utilisez POST." }, { status: 405 });
}
export const DELETE = GET;
