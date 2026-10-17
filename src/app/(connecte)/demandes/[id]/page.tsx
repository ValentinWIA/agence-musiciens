import { and, asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { demandesRecues, evenementsFlux } from "@/db/schema";
import { jourLocal } from "@/lib/calendrier";
import { formaterDuree } from "@/lib/dates";
import { LIBELLES_DEMANDE, dateDemandePassee, formaterJourCourt, ligneHistorique } from "@/lib/demandes";
import { verifierAdmin } from "@/lib/session";

export default function PageDemande({ params }: PageProps<"/demandes/[id]">) {
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 p-4">
      <Link href="/demandes" className="text-sm underline">
        ← Demandes reçues
      </Link>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-md bg-muted" aria-label="Chargement" />}>
        <FicheDemande params={params} />
      </Suspense>
    </main>
  );
}

async function FicheDemande({ params }: { params: Promise<{ id: string }> }) {
  await verifierAdmin("/demandes"); // un musicien ne voit jamais une demande
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const [demande] = await db.select().from(demandesRecues).where(eq(demandesRecues.id, id.data));
  if (!demande) notFound();

  // Seuls les événements traités forment l'historique : doublons et mis de côté restent au journal.
  const evenements = await db
    .select({ id: evenementsFlux.id, type: evenementsFlux.type, horodatage: evenementsFlux.horodatage, brut: evenementsFlux.brut })
    .from(evenementsFlux)
    .where(and(eq(evenementsFlux.reference, demande.reference), eq(evenementsFlux.etat, "traite")))
    .orderBy(asc(evenementsFlux.horodatage));
  const historique = evenements.flatMap((e) => {
    const ligne = ligneHistorique(e.type, e.brut);
    return ligne ? [{ ...ligne, id: e.id, horodatage: e.horodatage }] : [];
  });
  const passee = dateDemandePassee(demande.dateConcert, jourLocal(new Date(), "France"));

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Demande de {demande.programmateur}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Concert le</dt>
            <dd>
              {formaterJourCourt(demande.dateConcert)} <span className="text-muted-foreground">(heure non précisée)</span>
              {passee && <span className="block text-xs text-muted-foreground">date passée</span>}
            </dd>
            <dt className="text-muted-foreground">Lieu indiqué</dt>
            <dd>{demande.lieu}</dd>
            <dt className="text-muted-foreground">Durée</dt>
            <dd>{formaterDuree(demande.dureeMinutes)}</dd>
            <dt className="text-muted-foreground">Côté programmateur</dt>
            <dd>
              <Badge variant="outline">{LIBELLES_DEMANDE[demande.statut]}</Badge>
            </dd>
            <dt className="text-muted-foreground">Reçue le</dt>
            <dd>{formaterJourCourt(demande.recueLe)}</dd>
          </dl>
          {demande.engagementId ? (
            <Link href={`/engagements/${demande.engagementId}`} className="text-sm underline">
              Engagement créé →
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ni musicien, ni heure, ni cachet : c&apos;est l&apos;agent qui les choisit en créant l&apos;engagement.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Référence du flux : {demande.reference} · catégorie : {demande.categorie.replace("_", "-")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique et messages</CardTitle>
        </CardHeader>
        <CardContent>
          {historique.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun événement.</p>
          ) : (
            <ol className="grid gap-4">
              {historique.map((h) => (
                <li key={h.id} className="grid gap-1 text-sm">
                  <p className="text-muted-foreground">
                    {h.horodatage?.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "medium", timeStyle: "short" }) ?? "—"}
                  </p>
                  <p className={h.genre === "message" ? "font-medium" : undefined}>{h.titre}</p>
                  {/* Texte brut : React l'échappe ; un message n'est jamais exécuté. */}
                  {h.texte && <p className="whitespace-pre-wrap rounded-md bg-muted px-3 py-2">{h.texte}</p>}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </>
  );
}
