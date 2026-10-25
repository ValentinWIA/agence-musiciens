import { auth } from "@/auth";
import { executerAgent } from "@/lib/agent";
import { verifierDemande } from "@/lib/agent-regles";

// Essai de l'agent par l'adresse (docs/semaine-4.md, tranches A1 et A2) : /api/agent/essai?demande=…
// Provisoire : remplacé par la page /assistant en A3.
export const maxDuration = 150; // 120 s pour l'agent, et la marge pour écrire le journal

export async function GET(requete: Request) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    console.warn(`Accès refusé : ${session?.user?.nom ?? "visiteur non connecté"} sur /api/agent/essai`);
    return Response.json({ erreur: "Réservé à l'agent." }, { status: 403 });
  }
  const lu = verifierDemande(
    new URL(requete.url).searchParams.get("demande") ?? "Quelles options faut-il relancer cette semaine ?",
  );
  if ("erreur" in lu) return Response.json(lu, { status: 400 });

  const { id, nom, role } = session.user;
  const resultat = await executerAgent({ id, nom, role }, "page", lu.demande);
  return Response.json(resultat, { status: resultat.ok ? 200 : 409 });
}
