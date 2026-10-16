import { get } from "@vercel/blob";
import { lireCheminPhoto } from "@/lib/engagements";
import { verifierSession } from "@/lib/session";

// Photo d'un musicien. Le stockage est privé : l'image ne sort que par ici, et les droits sont revérifiés à chaque
// lecture (l'agent, ou le musicien lui-même). Sinon « introuvable », sans dire pourquoi.
export async function GET(_requete: Request, { params }: RouteContext<"/musiciens/[id]/photo">) {
  const utilisateur = await verifierSession();
  const { id } = await params;

  const chemin = await lireCheminPhoto(utilisateur, id);
  if (!chemin) return introuvable();

  const fichier = await get(chemin, { access: "private" }).catch((e) => {
    console.error(`Lecture du stockage échouée : photo du musicien ${id} —`, e);
    return null;
  });
  if (!fichier || fichier.statusCode !== 200) {
    console.error(`Fichier absent du stockage : photo du musicien ${id}`);
    return introuvable();
  }

  return new Response(fichier.stream, {
    headers: {
      "Content-Type": fichier.blob.contentType,
      "Content-Length": String(fichier.blob.size),
      // Rien en cache partagé : un autre visiteur ne doit pas recevoir cette image.
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function introuvable() {
  return new Response("Photo introuvable.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
