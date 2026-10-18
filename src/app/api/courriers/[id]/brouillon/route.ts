import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { courriers } from "@/db/schema";
import { CONSIGNE, messageBrouillon } from "@/lib/brouillon";
import { appelerModele } from "@/lib/ia";

// Brouillon de réponse à un courrier enregistré. Streaming, une ligne JSON par message : { texte } morceau par
// morceau, puis { fin } ou { erreur }. Rien n'est enregistré ni envoyé : l'agent relit, modifie et copie.
export const maxDuration = 120;

export async function POST(_requete: Request, contexte: RouteContext<"/api/courriers/[id]/brouillon">) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    console.warn(`Accès refusé : ${session?.user?.nom ?? "visiteur non connecté"} sur /api/courriers/…/brouillon`);
    return Response.json({ erreur: "Réservé à l'agent." }, { status: 403 });
  }
  const agent = session.user;

  const id = z.uuid().safeParse((await contexte.params).id);
  const [courrier] = id.success ? await db.select({ texte: courriers.texte }).from(courriers).where(eq(courriers.id, id.data)) : [];
  if (!courrier) return Response.json({ erreur: "Courrier introuvable." }, { status: 404 });

  const encodeur = new TextEncoder();
  const flux = new ReadableStream({
    async start(controleur) {
      const envoyer = (message: object) => controleur.enqueue(encodeur.encode(`${JSON.stringify(message)}\n`));
      try {
        const resultat = await appelerModele(
          "brouillon",
          agent.id,
          {
            max_tokens: 2000,
            output_config: { effort: "low" },
            system: CONSIGNE,
            messages: [{ role: "user", content: messageBrouillon(courrier.texte) }],
          },
          undefined,
          (morceau) => envoyer({ texte: morceau }),
        );
        if (!resultat.ok) envoyer({ erreur: `Pas de brouillon : ${resultat.erreur}.` });
        else {
          console.log(`Brouillon de réponse proposé à ${agent.nom}`);
          envoyer({ fin: true });
        }
      } finally {
        controleur.close();
      }
    },
  });

  return new Response(flux, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
