import { count, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { propositions } from "@/db/schema";

// Le nombre de relances en attente, pour le menu (« À valider (n) »). Lu par le navigateur à chaque changement de page
// et au retour sur l'onglet : une relance proposée par MCP, depuis le terminal, y apparaît (retour du 26/10).
export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") return Response.json({ erreur: "Réservé à l'agent." }, { status: 403 });
  const [{ n }] = await db.select({ n: count() }).from(propositions).where(eq(propositions.etat, "en_attente"));
  return Response.json({ n }, { headers: { "Cache-Control": "no-store" } });
}
