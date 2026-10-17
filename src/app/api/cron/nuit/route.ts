import { createHash, timingSafeEqual } from "node:crypto";
import { envoyerRecap } from "@/lib/envoi-recap";
import { rattraper } from "@/lib/import-nuit";

// Appelée chaque matin par Vercel Cron, qui envoie lui-même « Authorization: Bearer <CRON_SECRET> ».
// Le rattrapage enchaîne les nuits : jusqu'à la limite d'une fonction Hobby.
export const maxDuration = 300;

export async function GET(requete: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !egal(requete.headers.get("authorization") ?? "", `Bearer ${secret}`)) {
    console.warn(`Cron du flux de nuit refusé : secret absent ou faux${secret ? "" : " (CRON_SECRET non défini)"}`);
    return Response.json({ erreur: "Non autorisé." }, { status: 401 });
  }

  const resultat = await rattraper("cron");
  // Le récap part même si l'import a échoué : il le dit à l'agent.
  const recap = await envoyerRecap("cron");
  return Response.json({ ...resultat, recap }, { status: resultat.echec || recap.etat === "echec" ? 500 : 200 });
}

// Comparaison en temps constant (sur les empreintes, de même longueur) : le temps de réponse ne trahit pas le secret.
function egal(a: string, b: string) {
  const empreinte = (texte: string) => createHash("sha256").update(texte).digest();
  return timingSafeEqual(empreinte(a), empreinte(b));
}
