import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { evenementsFlux } from "@/db/schema";
import { ligneHistorique } from "@/lib/demandes";

// L'historique d'une demande, montré sur sa fiche et au-dessus du formulaire qui en fait un engagement.

export async function lireHistorique(reference: string) {
  // Seuls les événements traités forment l'historique : doublons et mis de côté restent au journal.
  const evenements = await db
    .select({ id: evenementsFlux.id, type: evenementsFlux.type, horodatage: evenementsFlux.horodatage, brut: evenementsFlux.brut })
    .from(evenementsFlux)
    .where(and(eq(evenementsFlux.reference, reference), eq(evenementsFlux.etat, "traite")))
    .orderBy(asc(evenementsFlux.horodatage));
  return evenements.flatMap((e) => {
    const ligne = ligneHistorique(e.type, e.brut);
    return ligne ? [{ ...ligne, id: e.id, horodatage: e.horodatage }] : [];
  });
}

export function ListeHistorique({ historique }: { historique: Awaited<ReturnType<typeof lireHistorique>> }) {
  if (historique.length === 0) return <p className="text-sm text-muted-foreground">Aucun événement.</p>;
  return (
    <ol className="grid gap-3">
      {historique.map((h) => (
        <li key={h.id} className="grid grid-cols-[6.5rem_1fr] gap-x-3 text-sm">
          <span className="text-muted-foreground">
            {h.horodatage?.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "short", day: "numeric", month: "short" }) ?? "—"}
          </span>
          <div className="grid gap-1">
            <p className={h.genre === "message" ? "font-medium" : undefined}>
              {h.genre === "message" && "✉ "}
              {h.titre}
              {h.genre === "statut" && h.texte && <span className="text-muted-foreground"> — « {h.texte} »</span>}
            </p>
            {/* Texte brut : React l'échappe ; un message n'est jamais exécuté. */}
            {h.genre === "message" && h.texte && <p className="whitespace-pre-wrap rounded-md bg-muted px-3 py-2">« {h.texte} »</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
