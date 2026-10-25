import { eq } from "drizzle-orm";
import Link from "next/link";
import { LienAssistant } from "@/components/lien-assistant";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { demandesRecues } from "@/db/schema";
import { jourLocal } from "@/lib/calendrier";
import { formaterDuree } from "@/lib/dates";
import { LIBELLES_DEMANDE, dateDemandePassee, formaterJourCourt } from "@/lib/demandes";
import { verifierAdmin } from "@/lib/session";
import { lireHistorique, ListeHistorique } from "../historique";
import { BoutonEcart } from "./bouton-ecart";

export default function PageDemande({ params, searchParams }: PageProps<"/demandes/[id]">) {
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-6 p-4">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-md bg-muted" aria-label="Chargement" />}>
        <FicheDemande params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function FicheDemande({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await verifierAdmin("/demandes"); // un musicien ne voit jamais une demande
  const id = z.uuid().safeParse((await params).id);
  if (!id.success) notFound();
  const [demande] = await db.select().from(demandesRecues).where(eq(demandesRecues.id, id.data));
  if (!demande) notFound();

  const historique = await lireHistorique(demande.reference);
  const passee = dateDemandePassee(demande.dateConcert, jourLocal(new Date(), "France"));
  // Retour à l'onglet d'où l'on vient (?vue=toutes), la liste déroulée jusqu'à cette demande.
  const { vue, depuis } = await searchParams;
  const retour = `/demandes?${vue === "toutes" ? "vue=toutes&" : ""}ici=${demande.id}`;

  return (
    <>
      {depuis === "assistant" ? (
        <LienAssistant />
      ) : (
        <Link href={retour} className="text-sm underline">
          ← Demandes reçues
        </Link>
      )}
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
            <div className="grid gap-3">
              {demande.ecarteeLe ? (
                <p className="text-sm">
                  Écartée le{" "}
                  {demande.ecarteeLe.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long" })} :
                  elle n&apos;est plus dans « À traiter ».
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ni musicien, ni heure, ni cachet : c&apos;est l&apos;agent qui les choisit en créant l&apos;engagement.
                  Sans suite ? Écartez-la : elle quitte « À traiter ».
                </p>
              )}
              {!demande.ecarteeLe && (
                <Link href={`/engagements/nouveau?demande=${demande.id}`} className={buttonVariants({ className: "w-fit" })}>
                  Créer l&apos;engagement
                </Link>
              )}
              {/* La clé recrée le bouton (et efface un ancien message) quand l'état change. */}
              <BoutonEcart key={String(!!demande.ecarteeLe)} id={demande.id} ecartee={!!demande.ecarteeLe} />
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Référence du flux : {demande.reference} · catégorie : {demande.categorie.replace("_", "-")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <ListeHistorique historique={historique} />
          <p className="text-xs text-muted-foreground">
            Les messages sont affichés tels qu&apos;ils sont arrivés : l&apos;application n&apos;agit jamais d&apos;après leur contenu.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
