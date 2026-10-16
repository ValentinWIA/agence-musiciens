import { get } from "@vercel/blob";
import { lireEngagement, lirePieceJointe } from "@/lib/engagements";
import { verifierSession } from "@/lib/session";

// Ouverture d'une pièce jointe. Le stockage est privé : le fichier ne sort que par ici, et les droits sont revérifiés
// à chaque ouverture (l'agent, ou un musicien de l'engagement). Sinon « introuvable », sans dire pourquoi.
export async function GET(_requete: Request, { params }: RouteContext<"/engagements/[id]/pieces/[pieceId]">) {
  const utilisateur = await verifierSession();
  const { id, pieceId } = await params;

  // lireEngagement journalise le refus d'un musicien qui ne fait pas partie de l'engagement.
  const engagement = await lireEngagement(utilisateur, id);
  const piece = engagement ? await lirePieceJointe(engagement.id, pieceId) : null;
  if (!piece) return introuvable();

  const fichier = await get(piece.chemin, { access: "private" }).catch((e) => {
    console.error(`Lecture du stockage échouée : pièce ${pieceId} de ${id} —`, e);
    return null;
  });
  if (!fichier || fichier.statusCode !== 200) {
    console.error(`Fichier absent du stockage : pièce ${pieceId} de ${id}`);
    return introuvable();
  }

  // Le nom choisi par l'agent peut contenir accents et espaces : encodé pour l'en-tête.
  const nom = encodeURIComponent(piece.nomFichier);
  return new Response(fichier.stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(fichier.blob.size),
      "Content-Disposition": `inline; filename*=UTF-8''${nom}`,
      // Rien en cache partagé : un autre visiteur ne doit pas recevoir ce fichier.
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function introuvable() {
  return new Response("Pièce introuvable.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
