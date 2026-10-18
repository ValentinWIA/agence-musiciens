import { auth } from "@/auth";
import { appelerModele } from "@/lib/ia";
import { chercherPassages } from "@/lib/indexation";
import { CONSIGNE, NB_PASSAGES, question, resultatDeRecherche, sourcesCitees } from "@/lib/questions";

// Question sur les documents (docs/semaine-3.md, I5). Réponse en streaming, une ligne JSON par message :
// { etape } pendant l'appel, { texte } morceau par morceau, puis { sources } ou { erreur }.
export const maxDuration = 120;

export async function POST(requete: Request) {
  // Une route d'API ne redirige pas : elle refuse. Les droits sont vérifiés ici, côté serveur, comme sur les pages.
  const session = await auth();
  if (session?.user?.role !== "admin") {
    console.warn(`Accès refusé : ${session?.user?.nom ?? "visiteur non connecté"} sur /api/questions`);
    return Response.json({ erreur: "Réservé à l'agent." }, { status: 403 });
  }
  const agent = session.user;

  const corps: unknown = await requete.json().catch(() => null);
  const lu = question.safeParse((corps as { question?: unknown } | null)?.question);
  if (!lu.success) return Response.json({ erreur: lu.error.issues[0].message }, { status: 400 });

  const encodeur = new TextEncoder();
  const flux = new ReadableStream({
    async start(controleur) {
      const envoyer = (message: object) => controleur.enqueue(encodeur.encode(`${JSON.stringify(message)}\n`));
      try {
        envoyer({ etape: "Recherche des passages…" });
        let passages;
        try {
          passages = await chercherPassages(lu.data, NB_PASSAGES);
        } catch (e) {
          console.warn(`Question : recherche en échec (${e instanceof Error ? e.message : e})`);
          envoyer({ erreur: "La recherche dans les documents a échoué. Réessayez dans une minute." });
          return;
        }
        if (passages.length === 0) {
          envoyer({ erreur: "Les documents ne sont pas encore indexés : cliquez sur « Indexer les documents »." });
          return;
        }

        envoyer({ etape: `${passages.length} passages trouvés. Rédaction de la réponse…` });
        const resultat = await appelerModele(
          "question",
          agent.id,
          {
            max_tokens: 4000,
            system: CONSIGNE,
            messages: [{ role: "user", content: [...passages.map(resultatDeRecherche), { type: "text", text: lu.data }] }],
          },
          undefined,
          (morceau) => envoyer({ texte: morceau }),
        );
        if (!resultat.ok) {
          envoyer({ erreur: `Pas de réponse : ${resultat.erreur}.` });
          return;
        }
        const sources = sourcesCitees(resultat.reponse, passages);
        console.log(`Question de ${agent.nom} : ${passages.length} passages fournis, ${sources.length} cités`);
        envoyer({ sources });
      } finally {
        controleur.close();
      }
    },
  });

  return new Response(flux, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
