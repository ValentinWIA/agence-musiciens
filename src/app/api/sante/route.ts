import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/db";
import { verifierSante } from "@/lib/sante";

// Sondée par UptimeRobot. Publique : ne dit que « ok » ou « en panne », jamais pourquoi.
// Sans paramètre (toutes les 5 min), ne touche pas la base : Neon peut s'endormir et le quota gratuit tient.
// ?base=1 (toutes les heures) vérifie aussi la base.
export async function GET(requete: Request) {
  await connection(); // jamais calculée à l'avance : chaque sonde doit refaire la vérification
  const avecBase = new URL(requete.url).searchParams.get("base") === "1";
  const ok = await verifierSante(avecBase, () => db.execute(sql`select 1`));
  return new Response(ok ? "ok" : "en panne", {
    status: ok ? 200 : 503,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
