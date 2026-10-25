import { auth } from "@/auth";
import { executerAgent } from "@/lib/agent";
import { verifierDemande } from "@/lib/agent-regles";

// Une demande à l'assistant (docs/semaine-4.md, tranche A3). Réponse en streaming, une ligne JSON par message :
// { etape } à chaque outil appelé, puis { resultat } ou { erreur }.
export const maxDuration = 150; // 120 s pour l'agent, et la marge pour écrire le journal

export async function POST(requete: Request) {
  // Une route d'API ne redirige pas : elle refuse. Les droits sont vérifiés ici, côté serveur, comme sur les pages.
  const session = await auth();
  if (session?.user?.role !== "admin") {
    console.warn(`Accès refusé : ${session?.user?.nom ?? "visiteur non connecté"} sur /api/agent`);
    return Response.json({ erreur: "Réservé à l'agent." }, { status: 403 });
  }
  const { id, nom, role } = session.user;

  const corps: unknown = await requete.json().catch(() => null);
  const lu = verifierDemande((corps as { demande?: unknown } | null)?.demande);
  if ("erreur" in lu) return Response.json(lu, { status: 400 });

  const encodeur = new TextEncoder();
  const flux = new ReadableStream({
    async start(controleur) {
      const envoyer = (message: object) => controleur.enqueue(encodeur.encode(`${JSON.stringify(message)}\n`));
      try {
        const resultat = await executerAgent({ id, nom, role }, "page", lu.demande, (etape) =>
          envoyer({ etape: { outil: etape.outil, refus: etape.sortie.startsWith("refus : ") } }),
        );
        envoyer(resultat.ok ? { resultat } : { erreur: resultat.erreur });
      } finally {
        controleur.close();
      }
    },
  });
  return new Response(flux, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
